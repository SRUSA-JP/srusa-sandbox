/**
 * PNG の読み書き（RGBA 8bit のみ）。
 *
 * BlueMap のタイルを切り貼りするためだけの最小実装。
 * 画像ライブラリ（sharp など）はネイティブ依存が重いので入れず、
 * Node 標準の zlib だけで済ませる。
 *
 * 対応するのは「8bit・RGBA・インターレース無し」の PNG だけ。
 * BlueMap の lowres タイルはすべてこの形式で出力される。
 */
import { deflateSync, inflateSync } from 'node:zlib';

/** 画素を並べた画像。data は 1 画素 4 バイト（RGBA）。 */
export interface Rgba {
  width: number;
  height: number;
  data: Buffer;
}

const SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const BYTES_PER_PIXEL = 4;

/* ------------------------------------------------------------------ *
 * CRC32（PNG のチャンクに必要）
 * ------------------------------------------------------------------ */

const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    table[n] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

/* ------------------------------------------------------------------ *
 * 読み込み
 * ------------------------------------------------------------------ */

/** PNG のバイト列を RGBA の画素配列にする。 */
export function decodePng(file: Buffer): Rgba {
  if (!file.subarray(0, 8).equals(SIGNATURE)) throw new Error('PNG ではない');

  let width = 0;
  let height = 0;
  /* 1 画素あたりのバイト数。RGBA なら 4、RGB なら 3 */
  let sourceBytes = BYTES_PER_PIXEL;
  const idat: Buffer[] = [];

  for (let pos = 8; pos < file.length; ) {
    const length = file.readUInt32BE(pos);
    const type = file.toString('ascii', pos + 4, pos + 8);
    const body = file.subarray(pos + 8, pos + 8 + length);
    if (type === 'IHDR') {
      width = body.readUInt32BE(0);
      height = body.readUInt32BE(4);
      const [depth, colorType, , , interlace] = body.subarray(8, 13);
      /* 6 は RGBA、2 は RGB（透過なし）。書き出しは常に RGBA なので、読むときに揃える */
      if (depth !== 8 || (colorType !== 6 && colorType !== 2) || interlace !== 0) {
        throw new Error(`未対応の PNG（depth=${depth} colorType=${colorType} interlace=${interlace}）`);
      }
      sourceBytes = colorType === 6 ? 4 : 3;
    } else if (type === 'IDAT') {
      idat.push(body);
    } else if (type === 'IEND') {
      break;
    }
    pos += 12 + length;
  }

  const stride = width * sourceBytes;
  const raw = inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(height * stride);

  /* 各行の先頭 1 バイトがフィルター種別。前の画素・上の行から復元する */
  for (let y = 0, read = 0; y < height; y++) {
    const filter = raw[read++];
    const line = raw.subarray(read, read + stride);
    read += stride;
    const cur = out.subarray(y * stride, (y + 1) * stride);
    const up = y > 0 ? out.subarray((y - 1) * stride, y * stride) : null;
    for (let i = 0; i < stride; i++) {
      const a = i >= sourceBytes ? cur[i - sourceBytes] : 0;
      const b = up ? up[i] : 0;
      const c = up && i >= sourceBytes ? up[i - sourceBytes] : 0;
      const x = line[i];
      let value: number;
      switch (filter) {
        case 0: value = x; break;
        case 1: value = x + a; break;
        case 2: value = x + b; break;
        case 3: value = x + ((a + b) >> 1); break;
        case 4: value = x + paeth(a, b, c); break;
        default: throw new Error(`未知のフィルター ${filter}`);
      }
      cur[i] = value & 0xff;
    }
  }

  if (sourceBytes === BYTES_PER_PIXEL) return { width, height, data: out };

  /* RGB で来たものは、不透明の RGBA に広げてから返す */
  const rgba = Buffer.alloc(width * height * BYTES_PER_PIXEL);
  for (let index = 0; index < width * height; index += 1) {
    out.copy(rgba, index * BYTES_PER_PIXEL, index * sourceBytes, index * sourceBytes + 3);
    rgba[index * BYTES_PER_PIXEL + 3] = 0xff;
  }
  return { width, height, data: rgba };
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

/* ------------------------------------------------------------------ *
 * 書き出し
 * ------------------------------------------------------------------ */

function chunk(type: string, body: Buffer): Buffer {
  const head = Buffer.alloc(8);
  head.writeUInt32BE(body.length, 0);
  head.write(type, 4, 'ascii');
  const tail = Buffer.alloc(4);
  tail.writeUInt32BE(crc32(Buffer.concat([head.subarray(4), body])), 0);
  return Buffer.concat([head, body, tail]);
}

/**
 * RGBA の画素配列を PNG のバイト列にする。
 *
 * 行ごとに 5 種類のフィルターを試し、差分の絶対値の合計がいちばん小さいものを選ぶ
 * （PNG 仕様が推奨する選び方）。地図は横方向に同じ色が続くので、これだけで
 * フィルター無しに比べてかなり小さくなる。
 */
export function encodePng({ width, height, data }: Rgba): Buffer {
  const stride = width * BYTES_PER_PIXEL;
  const raw = Buffer.alloc(height * (stride + 1));
  const candidate = Buffer.alloc(stride);

  for (let y = 0; y < height; y++) {
    const cur = data.subarray(y * stride, (y + 1) * stride);
    const up = y > 0 ? data.subarray((y - 1) * stride, y * stride) : null;
    let bestFilter = 0;
    let bestScore = Infinity;
    let best = Buffer.alloc(0);

    for (let filter = 0; filter <= 4; filter++) {
      let score = 0;
      for (let i = 0; i < stride; i++) {
        const a = i >= BYTES_PER_PIXEL ? cur[i - BYTES_PER_PIXEL] : 0;
        const b = up ? up[i] : 0;
        const c = up && i >= BYTES_PER_PIXEL ? up[i - BYTES_PER_PIXEL] : 0;
        let value: number;
        switch (filter) {
          case 0: value = cur[i]; break;
          case 1: value = cur[i] - a; break;
          case 2: value = cur[i] - b; break;
          case 3: value = cur[i] - ((a + b) >> 1); break;
          default: value = cur[i] - paeth(a, b, c); break;
        }
        candidate[i] = value & 0xff;
        score += candidate[i] < 128 ? candidate[i] : 256 - candidate[i];
      }
      if (score < bestScore) {
        bestScore = score;
        bestFilter = filter;
        best = Buffer.from(candidate);
      }
    }

    raw[y * (stride + 1)] = bestFilter;
    best.copy(raw, y * (stride + 1) + 1);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.set([8, 6, 0, 0, 0], 8); // 8bit / RGBA / 標準圧縮 / 標準フィルター / インターレース無し

  return Buffer.concat([
    SIGNATURE,
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

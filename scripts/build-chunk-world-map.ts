/**
 * `aws_minecraft` 側で抽出したチャンク一覧 JSON から、調査用の軽量な広域マップ PNG を作る。
 *
 * BlueMap の地形色そのものではなく、生成済みチャンクの分布を 1px = 1chunk で描く。
 * 公開画面のワールドマップには混ぜず、遠方探索の範囲確認だけに使う。
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { encodePng } from './png';

const ROOT = process.cwd();
const CHUNK_SIZE = 16;
const BYTES_PER_PIXEL = 4;
const DIAGNOSTIC_IMAGE_DIR = 'world-map-diagnostics';
const DIAGNOSTIC_METADATA_PATH = 'data/world-map-diagnostics.json';

interface Args {
  source: string;
  id: string;
  dimension: string;
  label?: string;
}

interface ChunkEntry {
  x: number;
  z: number;
}

interface ContainerEntry {
  x: number;
  z: number;
  diamond_equiv?: number;
}

interface ChunkMapDocument {
  generated_on?: string;
  dimension?: string;
  chunks: ChunkEntry[];
  containers?: ContainerEntry[];
}

interface WorldMapEntry {
  id: string;
  dimension?: string;
  label?: string;
  updated_on: string;
  image: string;
  bounds: { minX: number; minZ: number; maxX: number; maxZ: number };
  pixels: { width: number; height: number };
  blocksPerPixel: number;
  bytes: number;
}

function argValue(argv: string[], name: string): string | undefined {
  const index = argv.indexOf(name);
  return index >= 0 ? argv[index + 1] : undefined;
}

function parseArgs(argv: string[]): Args {
  const source = argValue(argv, '--source') ?? 'data/end-2d-map-20260825.json';
  const id = argValue(argv, '--id') ?? 'end-wide-20260825';
  const dimension = argValue(argv, '--dimension') ?? 'end';
  const label = argValue(argv, '--label');
  return { source, id, dimension, label };
}

function dimensionLabel(dimension: string): string {
  if (dimension === 'overworld') return 'オーバーワールド';
  if (dimension === 'nether') return 'ネザー';
  if (dimension === 'end') return 'ジ・エンド';
  if (dimension === 'twilightforest') return '黄昏の森';
  return dimension;
}

function mapLabel(dimension: string, date: string): string {
  return `${dimensionLabel(dimension)}（${date}）`;
}

function put(data: Buffer, width: number, x: number, y: number, rgba: [number, number, number, number]) {
  if (x < 0 || y < 0) return;
  const offset = (y * width + x) * BYTES_PER_PIXEL;
  if (offset < 0 || offset + 3 >= data.length) return;
  data[offset] = rgba[0];
  data[offset + 1] = rgba[1];
  data[offset + 2] = rgba[2];
  data[offset + 3] = rgba[3];
}

function drawSquare(
  data: Buffer,
  width: number,
  height: number,
  x: number,
  y: number,
  radius: number,
  rgba: [number, number, number, number],
) {
  for (let yy = y - radius; yy <= y + radius; yy += 1) {
    for (let xx = x - radius; xx <= x + radius; xx += 1) {
      if (xx >= 0 && yy >= 0 && xx < width && yy < height) put(data, width, xx, yy, rgba);
    }
  }
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const sourcePath = join(ROOT, args.source);
  if (!existsSync(sourcePath)) throw new Error(`チャンクマップJSONがありません: ${args.source}`);

  const doc = JSON.parse(readFileSync(sourcePath, 'utf8')) as ChunkMapDocument;
  if (!Array.isArray(doc.chunks) || doc.chunks.length === 0) {
    throw new Error(`${args.source} に chunks がありません`);
  }

  const minChunkX = Math.min(...doc.chunks.map((chunk) => chunk.x));
  const maxChunkX = Math.max(...doc.chunks.map((chunk) => chunk.x));
  const minChunkZ = Math.min(...doc.chunks.map((chunk) => chunk.z));
  const maxChunkZ = Math.max(...doc.chunks.map((chunk) => chunk.z));
  const width = maxChunkX - minChunkX + 1;
  const height = maxChunkZ - minChunkZ + 1;
  const data = Buffer.alloc(width * height * BYTES_PER_PIXEL);

  const background: [number, number, number, number] = [10, 6, 22, 255];
  const chunkColor: [number, number, number, number] = [123, 109, 226, 255];
  const containerColor: [number, number, number, number] = [244, 194, 93, 255];
  const diamondColor: [number, number, number, number] = [105, 221, 222, 255];

  for (let i = 0; i < data.length; i += BYTES_PER_PIXEL) {
    data[i] = background[0];
    data[i + 1] = background[1];
    data[i + 2] = background[2];
    data[i + 3] = background[3];
  }

  for (const chunk of doc.chunks) {
    put(data, width, chunk.x - minChunkX, chunk.z - minChunkZ, chunkColor);
  }

  for (const container of doc.containers ?? []) {
    const x = Math.floor(container.x / CHUNK_SIZE) - minChunkX;
    const y = Math.floor(container.z / CHUNK_SIZE) - minChunkZ;
    drawSquare(data, width, height, x, y, container.diamond_equiv && container.diamond_equiv > 0 ? 2 : 1, container.diamond_equiv && container.diamond_equiv > 0 ? diamondColor : containerColor);
  }

  const image = `${DIAGNOSTIC_IMAGE_DIR}/${args.id}.png`;
  const outPath = join(ROOT, 'public', image);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, encodePng({ width, height, data }));

  const metadataPath = join(ROOT, DIAGNOSTIC_METADATA_PATH);
  const previous = existsSync(metadataPath)
    ? (JSON.parse(readFileSync(metadataPath, 'utf8')).maps as WorldMapEntry[])
    : [];
  const entry: WorldMapEntry = {
    id: args.id,
    dimension: args.dimension,
    updated_on: (doc.generated_on ?? new Date().toISOString()).slice(0, 10),
    image,
    bounds: {
      minX: minChunkX * CHUNK_SIZE,
      minZ: minChunkZ * CHUNK_SIZE,
      maxX: (maxChunkX + 1) * CHUNK_SIZE,
      maxZ: (maxChunkZ + 1) * CHUNK_SIZE,
    },
    pixels: { width, height },
    blocksPerPixel: CHUNK_SIZE,
    bytes: readFileSync(outPath).length,
  };
  entry.label = args.label ?? mapLabel(args.dimension, entry.updated_on);

  const merged = [
    ...previous.filter((map) => map.id !== entry.id),
    entry,
  ].sort((a, b) => a.id.localeCompare(b.id));
  writeFileSync(
    metadataPath,
    `${JSON.stringify({ generated_on: new Date().toISOString().slice(0, 10), source: 'region chunk summary diagnostic', maps: merged }, null, 2)}\n`,
  );

  console.log(`${args.id}: ${width}x${height}px / X ${entry.bounds.minX}..${entry.bounds.maxX - 1} / Z ${entry.bounds.minZ}..${entry.bounds.maxZ - 1}`);
  console.log(`${DIAGNOSTIC_METADATA_PATH} を更新した（公開ワールドマップには使わない）`);
}

main();

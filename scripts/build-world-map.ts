/**
 * BlueMap の出力から、ブラウザで動く 2D のワールドマップを作る。
 *
 * BlueMap は 1 つのマップにつき 2 種類のタイルを吐く。
 *   tiles/0      3D モデル（hires）。オーバーワールドだけで 308 MB あり、Web には載せられない
 *   tiles/1〜3   真上から見た PNG（lowres）。3 段階の縮尺で合計 3 MB しかない
 *
 * ここでは lowres のいちばん細かい段（tiles/1、1 画素 = 1 ブロック）だけを読み、
 * 1 枚の PNG に貼り合わせて public/ に置く。3D は写真（public/images/）で見せる。
 *
 * lowres タイルは縦に 2 枚分ある。上半分が色、下半分が高さ（3D の陰影用）。
 * 使うのは上半分だけ。横幅も 1 画素だけ多く、末尾の列は隣のタイルの先頭と同じ
 * （補間用の重なり）なので落とす。
 *
 *   npm run build:world-map
 *   npm run build:world-map -- --source ../srusa-portal/bluemap/web --map nether
 *
 * BlueMap の出力自体はこのリポジトリに置かない（数百 MB あるため）。
 * ワールドを再レンダリングしたら、このコマンドを流し直して成果物を差し替える。
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import dataConfig from '../data/data-registry.json';
import { decodePng, encodePng } from './png';

/* npm script から実行する前提。束ねた成果物の位置ではなくリポジトリの根を基準にする */
const ROOT = process.cwd();

/** BlueMap の出力（web/）の既定の場所。レンダリング環境は srusa-portal 側にある。 */
const DEFAULT_SOURCE = dataConfig.paths.blueMapSource;

/** 貼り合わせた PNG の置き場所（public/ からの相対）。 */
const IMAGE_DIR = dataConfig.paths.worldMapImageDir;

/** 地図の位置と縮尺を書き出す先。アプリはこの JSON を読んで座標を計算する。 */
const METADATA_PATH = dataConfig.paths.worldMapMetadata;

/** 指定なしで作り直す BlueMap の代表的なマップ。 */
const DEFAULT_MAPS = dataConfig.worldMaps;

/** 読み込む lowres の段。1 が最も細かい（1 画素 = 1 ブロック）。 */
const LOD = 1;

const BYTES_PER_PIXEL = 4;

interface Args {
  source: string;
  maps: string[];
}

function parseArgs(argv: string[]): Args {
  let source = DEFAULT_SOURCE;
  const maps: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--source') source = argv[++i];
    else if (argv[i] === '--map') maps.push(argv[++i]);
    else throw new Error(`知らない引数: ${argv[i]}`);
  }
  return { source, maps: maps.length > 0 ? maps : DEFAULT_MAPS };
}

function normalizeDimension(value: unknown, fallback: string): string {
  if (typeof value !== 'string' || value.length === 0) return fallback;
  const key = value.split(':').pop() ?? value;
  if (key === 'the_nether') return 'nether';
  if (key === 'the_end') return 'end';
  return key;
}

/** タイルの置き場所（tiles/1/x-2/z3.png）から座標を取り出す。 */
function tileCoordinates(dir: string): { x: number; z: number }[] {
  const tiles: { x: number; z: number }[] = [];
  for (const xDir of readdirSync(dir)) {
    const x = Number(xDir.replace(/^x/, ''));
    if (Number.isNaN(x)) continue;
    for (const file of readdirSync(join(dir, xDir))) {
      const z = Number(file.replace(/^z/, '').replace(/\.png$/, ''));
      if (!Number.isNaN(z)) tiles.push({ x, z });
    }
  }
  return tiles;
}

interface Canvas {
  width: number;
  height: number;
  data: Buffer;
  /** 画素 (0,0) にあたるワールド座標。 */
  originX: number;
  originZ: number;
}

/** タイルを 1 枚の画布に貼り合わせる。 */
function stitch(tilesDir: string, tileSize: number): Canvas {
  const tiles = tileCoordinates(tilesDir);
  if (tiles.length === 0) throw new Error(`タイルが無い: ${tilesDir}`);

  const minTileX = Math.min(...tiles.map((t) => t.x));
  const maxTileX = Math.max(...tiles.map((t) => t.x));
  const minTileZ = Math.min(...tiles.map((t) => t.z));
  const maxTileZ = Math.max(...tiles.map((t) => t.z));

  const width = (maxTileX - minTileX + 1) * tileSize;
  const height = (maxTileZ - minTileZ + 1) * tileSize;
  const canvas: Canvas = {
    width,
    height,
    data: Buffer.alloc(width * height * BYTES_PER_PIXEL),
    originX: minTileX * tileSize,
    originZ: minTileZ * tileSize,
  };

  for (const tile of tiles) {
    const image = decodePng(readFileSync(join(tilesDir, `x${tile.x}`, `z${tile.z}.png`)));
    const left = (tile.x - minTileX) * tileSize;
    const top = (tile.z - minTileZ) * tileSize;
    /* 上半分（色）だけを、重なりの列を除いて写す */
    for (let y = 0; y < tileSize; y++) {
      const from = y * image.width * BYTES_PER_PIXEL;
      const to = ((top + y) * width + left) * BYTES_PER_PIXEL;
      image.data.copy(canvas.data, to, from, from + tileSize * BYTES_PER_PIXEL);
    }
  }

  return canvas;
}

/**
 * 描画されていない範囲（透明）を切り落とす。
 *
 * BlueMap はレンダリング範囲の外を透明のまま残す。タイルは 500 ブロック単位なので、
 * 範囲を絞ってレンダリングすると外周に大きな透明の帯ができる。
 */
function trim(canvas: Canvas): Canvas {
  let minX = canvas.width;
  let minY = canvas.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (canvas.data[(y * canvas.width + x) * BYTES_PER_PIXEL + 3] === 0) continue;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) throw new Error('描画された画素が無い');

  const width = maxX - minX + 1;
  const height = maxY - minY + 1;
  const data = Buffer.alloc(width * height * BYTES_PER_PIXEL);
  for (let y = 0; y < height; y++) {
    const from = ((minY + y) * canvas.width + minX) * BYTES_PER_PIXEL;
    canvas.data.copy(data, y * width * BYTES_PER_PIXEL, from, from + width * BYTES_PER_PIXEL);
  }

  return {
    width,
    height,
    data,
    originX: canvas.originX + minX,
    originZ: canvas.originZ + minY,
  };
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
  /** 書き出した PNG の大きさ（バイト）。画面に「どれだけ軽いか」を出すのに使う。 */
  bytes: number;
}

function buildMap(sourceDir: string, id: string): WorldMapEntry {
  const mapDir = join(sourceDir, 'maps', id);
  if (!existsSync(mapDir)) throw new Error(`マップ '${id}' が無い: ${mapDir}`);

  const settings = JSON.parse(readFileSync(join(mapDir, 'settings.json'), 'utf8'));
  const [tileSize] = settings.lowres.tileSize as [number, number];
  const blocksPerPixel = settings.lowres.lodFactor ** (LOD - 1);

  const canvas = trim(stitch(join(mapDir, 'tiles', String(LOD)), tileSize));
  const image = `${IMAGE_DIR}/${id}.png`;
  const outPath = join(ROOT, 'public', image);
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, encodePng(canvas));

  const bytes = readFileSync(outPath).length;
  console.log(`${id}: ${canvas.width}x${canvas.height} 画素 / ${(bytes / 1024 / 1024).toFixed(2)} MB -> public/${image}`);

  return {
    id,
    dimension: normalizeDimension(settings.dimension, id),
    label: typeof settings.name === 'string' ? settings.name : undefined,
    updated_on: new Date().toISOString().slice(0, 10),
    image,
    bounds: {
      minX: canvas.originX,
      minZ: canvas.originZ,
      maxX: canvas.originX + canvas.width * blocksPerPixel,
      maxZ: canvas.originZ + canvas.height * blocksPerPixel,
    },
    pixels: { width: canvas.width, height: canvas.height },
    blocksPerPixel,
    bytes,
  };
}

function main() {
  const { source, maps } = parseArgs(process.argv.slice(2));
  const sourceDir = resolve(ROOT, source);
  if (!existsSync(join(sourceDir, 'settings.json'))) {
    throw new Error(`BlueMap の出力が無い: ${sourceDir}（先に srusa-portal の bluemap/render.sh を実行する）`);
  }

  const built = maps.map((id) => buildMap(sourceDir, id));

  /* 既にある地図の記述は残し、作り直したものだけ差し替える */
  const metadataPath = join(ROOT, METADATA_PATH);
  const previous = existsSync(metadataPath)
    ? (JSON.parse(readFileSync(metadataPath, 'utf8')).maps as WorldMapEntry[])
    : [];
  const merged = [
    ...previous.filter((entry) => !built.some((next) => next.id === entry.id)),
    ...built,
  ].sort((a, b) => a.id.localeCompare(b.id));

  writeFileSync(
    metadataPath,
    `${JSON.stringify({ generated_on: new Date().toISOString().slice(0, 10), source: `BlueMap lowres LOD${LOD}`, maps: merged }, null, 2)}\n`,
  );
  console.log(`${METADATA_PATH} を更新した`);
}

main();

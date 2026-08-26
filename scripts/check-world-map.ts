import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const ROOT = process.cwd();
const METADATA_PATH = join(ROOT, 'data/world-map.json');
const PUBLIC_MAP_DIR = join(ROOT, 'public/world-map');

interface WorldMapEntry {
  image?: unknown;
}

interface WorldMapDocument {
  maps?: unknown;
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

if (!existsSync(METADATA_PATH)) fail(`地図メタデータがありません: ${METADATA_PATH}`);
if (!existsSync(PUBLIC_MAP_DIR)) fail(`公開地図ディレクトリがありません: ${PUBLIC_MAP_DIR}`);

const document = JSON.parse(readFileSync(METADATA_PATH, 'utf8')) as WorldMapDocument;
if (!Array.isArray(document.maps)) fail('data/world-map.json の maps が配列ではありません');

const referenced = new Set(
  document.maps
    .map((entry: WorldMapEntry) => (typeof entry.image === 'string' ? basename(entry.image) : ''))
    .filter(Boolean),
);
const published = new Set(readdirSync(PUBLIC_MAP_DIR).filter((file) => file.endsWith('.png')));

const missing = [...referenced].filter((file) => !published.has(file)).sort();
const extra = [...published].filter((file) => !referenced.has(file)).sort();

if (missing.length > 0) fail(`data/world-map.json が参照している PNG がありません: ${missing.join(', ')}`);
if (extra.length > 0) fail(`data/world-map.json から参照されていない公開 PNG があります: ${extra.join(', ')}`);

console.log('ワールドマップの公開PNGはメタデータと一致しています');

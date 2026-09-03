import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

const ROOT = process.cwd();
const METADATA_PATH = join(ROOT, 'data/world-map.json');
const PUBLIC_MAP_DIR = join(ROOT, 'public/world-map');
const BLUEMAP_SPAWN_DIR = join(ROOT, 'public/bluemap-spawn');
const BLUEMAP_SPAWN_MAP_DIR = join(BLUEMAP_SPAWN_DIR, 'maps/overworld_spawn');

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

function listFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    return entry.isDirectory() ? listFiles(path) : [path];
  });
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

if (!existsSync(join(BLUEMAP_SPAWN_DIR, 'index.html'))) fail('スポーン3Dの index.html がありません');
if (!existsSync(join(BLUEMAP_SPAWN_DIR, 'settings.json'))) fail('スポーン3Dの settings.json がありません');
if (!existsSync(BLUEMAP_SPAWN_MAP_DIR)) fail('スポーン3Dの overworld_spawn マップがありません');
if (!existsSync(join(BLUEMAP_SPAWN_MAP_DIR, 'settings.json'))) fail('スポーン3Dのマップ設定がありません');
if (!existsSync(join(BLUEMAP_SPAWN_MAP_DIR, 'textures.json.gzraw'))) fail('スポーン3Dの textures.json.gzraw がありません');

const blueMapSettings = JSON.parse(readFileSync(join(BLUEMAP_SPAWN_DIR, 'settings.json'), 'utf8')) as {
  clientDecompression?: unknown;
  maps?: unknown;
};
if (blueMapSettings.clientDecompression !== true) {
  fail('スポーン3Dの clientDecompression は true にしてください');
}
if (!Array.isArray(blueMapSettings.maps) || blueMapSettings.maps.length !== 1 || blueMapSettings.maps[0] !== 'overworld_spawn') {
  fail('スポーン3Dの maps は ["overworld_spawn"] だけにしてください');
}

const blueMapFiles = listFiles(BLUEMAP_SPAWN_MAP_DIR);
const gzipFiles = blueMapFiles.filter((file) => file.endsWith('.gz'));
if (gzipFiles.length > 0) fail(`スポーン3Dに .gz が残っています: ${gzipFiles.slice(0, 5).join(', ')}`);

const compressedTiles = blueMapFiles.filter((file) => file.endsWith('.prbm.gzraw'));
if (compressedTiles.length === 0) fail('スポーン3Dの .prbm.gzraw タイルがありません');

const viewerScripts = listFiles(join(BLUEMAP_SPAWN_DIR, 'assets')).filter((file) => file.endsWith('.js'));
const viewerRequestsGzraw = viewerScripts.some((file) => readFileSync(file, 'utf8').includes('.gzraw'));
if (!viewerRequestsGzraw) fail('スポーン3DのビューアJSが .gzraw を読む設定になっていません');

console.log(`スポーン3Dの限定BlueMapデータは公開可能です（${compressedTiles.length} タイル）`);

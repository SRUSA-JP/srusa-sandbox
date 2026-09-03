import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { gunzipSync } from 'node:zlib';

const ROOT = process.cwd();
const METADATA_PATH = join(ROOT, 'data/world-map.json');
const PUBLIC_MAP_DIR = join(ROOT, 'public/world-map');
const BLUEMAP_SPAWN_DIR = join(ROOT, 'public/bluemap-spawn');

const LIMITED_BLUEMAP_MAPS = [
  {
    id: 'overworld_spawn',
    name: 'スポーン周辺3D',
    requiredTileExtension: '.prbm.gzraw',
    requiredPaths: [] as string[],
    maxTileCount: undefined,
    expectedStartPos: undefined,
    expectedTexturePrefix: undefined,
  },
  {
    id: 'twilightforest_spawn',
    name: '黄昏の森3D',
    requiredTileExtension: '.prbm.gzraw',
    requiredPaths: [
      'tiles/0/x-2/z6.prbm.gzraw',
      'tiles/0/x-2/z7.prbm.gzraw',
      'tiles/1/x-1/z0.png',
    ],
    maxTileCount: 82,
    expectedStartPos: [-50, 200],
    expectedTexturePrefix: 'twilightforest:',
  },
  {
    id: 'before_srusa_spawn',
    name: 'オーバーワールド(旧)',
    requiredTileExtension: '.prbm.gzraw',
    requiredPaths: [] as string[],
    maxTileCount: undefined,
    expectedStartPos: undefined,
    expectedTexturePrefix: undefined,
  },
] as const;

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

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'number');
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

if (!existsSync(join(BLUEMAP_SPAWN_DIR, 'index.html'))) fail('限定3Dの index.html がありません');
if (!existsSync(join(BLUEMAP_SPAWN_DIR, 'settings.json'))) fail('限定3Dの settings.json がありません');

const blueMapSettings = JSON.parse(readFileSync(join(BLUEMAP_SPAWN_DIR, 'settings.json'), 'utf8')) as {
  clientDecompression?: unknown;
  maps?: unknown;
};
if (blueMapSettings.clientDecompression !== true) {
  fail('限定3Dの clientDecompression は true にしてください');
}
const expectedMapIds = LIMITED_BLUEMAP_MAPS.map((map) => map.id);
const actualMapIds = Array.isArray(blueMapSettings.maps) ? blueMapSettings.maps : [];
if (
  actualMapIds.length !== expectedMapIds.length ||
  !expectedMapIds.every((mapId, index) => actualMapIds[index] === mapId)
) {
  fail(`限定3Dの maps は ${JSON.stringify(expectedMapIds)} だけにしてください`);
}
if (existsSync(join(BLUEMAP_SPAWN_DIR, 'maps', 'twilightforest'))) {
  fail('黄昏の森3Dは全域の twilightforest ではなく 16チャンク限定の twilightforest_spawn を使ってください');
}

const mapTileCounts = LIMITED_BLUEMAP_MAPS.map((map) => {
  const mapDir = join(BLUEMAP_SPAWN_DIR, 'maps', map.id);
  if (!existsSync(mapDir)) fail(`${map.name}のマップがありません`);
  if (!existsSync(join(mapDir, 'settings.json'))) fail(`${map.name}のマップ設定がありません`);
  const texturesPath = join(mapDir, 'textures.json.gzraw');
  if (!existsSync(texturesPath)) fail(`${map.name}の textures.json.gzraw がありません`);
  if (map.expectedTexturePrefix) {
    const textures = gunzipSync(readFileSync(texturesPath)).toString('utf8');
    if (!textures.includes(map.expectedTexturePrefix)) {
      fail(`${map.name}の textures.json.gzraw に ${map.expectedTexturePrefix} テクスチャがありません`);
    }
  }

  const mapSettings = JSON.parse(readFileSync(join(mapDir, 'settings.json'), 'utf8')) as { startPos?: unknown };
  const startPos = mapSettings.startPos;
  if (
    map.expectedStartPos &&
    (!isNumberArray(startPos) ||
      startPos.length !== map.expectedStartPos.length ||
      !map.expectedStartPos.every((coordinate, index) => startPos[index] === coordinate))
  ) {
    fail(`${map.name}の startPos は ${JSON.stringify(map.expectedStartPos)} にしてください`);
  }

  const mapFiles = listFiles(mapDir);
  const gzipFiles = mapFiles.filter((file) => file.endsWith('.gz'));
  if (gzipFiles.length > 0) fail(`${map.name}に .gz が残っています: ${gzipFiles.slice(0, 5).join(', ')}`);

  const tiles = mapFiles.filter((file) => file.endsWith(map.requiredTileExtension));
  if (tiles.length === 0) fail(`${map.name}の ${map.requiredTileExtension} タイルがありません`);
  if (map.maxTileCount !== undefined && tiles.length > map.maxTileCount) {
    fail(`${map.name}の公開タイルが多すぎます: ${tiles.length} / ${map.maxTileCount}`);
  }
  const missingRequiredPaths = map.requiredPaths.filter((path) => !existsSync(join(mapDir, path)));
  if (missingRequiredPaths.length > 0) {
    fail(`${map.name}の中心 X -50 / Z 200 周辺タイルがありません: ${missingRequiredPaths.join(', ')}`);
  }
  return `${map.id}: ${tiles.length}`;
});

const viewerScripts = listFiles(join(BLUEMAP_SPAWN_DIR, 'assets')).filter((file) => file.endsWith('.js'));
const viewerRequestsGzraw = viewerScripts.some((file) => readFileSync(file, 'utf8').includes('.gzraw'));
if (!viewerRequestsGzraw) fail('限定3DのビューアJSが .gzraw を読む設定になっていません');

console.log(`限定BlueMapデータは公開可能です（${mapTileCounts.join(', ')}）`);

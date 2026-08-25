import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import registry from '../data/data-registry.json' with { type: 'json' };

const ROOT = process.cwd();
const BLUE_MAP = join(ROOT, registry.paths.blueMapSource);
const AWS_DATA = join(ROOT, registry.paths.awsDataSource);

const CHUNK_SOURCE_BY_MAP = {
  overworld: 'overworld-2d-map-20260825.json',
  end: 'end-2d-map-20260825.json',
};

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

function tileCoverage(mapId) {
  const mapDir = join(BLUE_MAP, 'maps', mapId);
  const settingsPath = join(mapDir, 'settings.json');
  const tilesDir = join(mapDir, 'tiles', '1');
  if (!existsSync(settingsPath) || !existsSync(tilesDir)) return null;

  const settings = readJson(settingsPath);
  const tileSize = settings.lowres.tileSize[0];
  const xs = [];
  const zs = [];

  for (const xDir of readdirSync(tilesDir)) {
    const x = Number(xDir.replace(/^x/, ''));
    if (Number.isNaN(x)) continue;
    xs.push(x);
    for (const file of readdirSync(join(tilesDir, xDir))) {
      const z = Number(file.replace(/^z/, '').replace(/\.png$/, ''));
      if (!Number.isNaN(z)) zs.push(z);
    }
  }
  if (xs.length === 0 || zs.length === 0) return null;

  return {
    minX: Math.min(...xs) * tileSize,
    maxX: (Math.max(...xs) + 1) * tileSize - 1,
    minZ: Math.min(...zs) * tileSize,
    maxZ: (Math.max(...zs) + 1) * tileSize - 1,
  };
}

function chunkCoverage(file) {
  const doc = readJson(join(AWS_DATA, file));
  const xs = doc.chunks.map((chunk) => chunk.x * 16);
  const zs = doc.chunks.map((chunk) => chunk.z * 16);
  return {
    generatedOn: doc.generated_on,
    chunks: doc.chunks.length,
    minX: Math.min(...xs),
    maxX: Math.max(...xs) + 15,
    minZ: Math.min(...zs),
    maxZ: Math.max(...zs) + 15,
  };
}

function covers(outer, inner) {
  return outer.minX <= inner.minX && outer.maxX >= inner.maxX && outer.minZ <= inner.minZ && outer.maxZ >= inner.maxZ;
}

function rangeText(range) {
  return `X ${range.minX}..${range.maxX} / Z ${range.minZ}..${range.maxZ}`;
}

const issues = [];

for (const [mapId, chunkFile] of Object.entries(CHUNK_SOURCE_BY_MAP)) {
  const expectedPath = join(AWS_DATA, chunkFile);
  if (!existsSync(expectedPath)) {
    console.log(`SKIP ${mapId}: ${chunkFile} がありません`);
    continue;
  }

  const rendered = tileCoverage(mapId);
  const expected = chunkCoverage(chunkFile);
  if (!rendered) {
    issues.push(`${mapId}: BlueMap の tiles/1 がありません`);
    continue;
  }

  const ok = covers(rendered, expected);
  console.log(`${ok ? 'OK' : 'NG'} ${mapId}`);
  console.log(`  BlueMap tiles : ${rangeText(rendered)}`);
  console.log(`  chunk summary : ${rangeText(expected)} / ${expected.chunks} chunks / ${expected.generatedOn}`);
  if (!ok) issues.push(`${mapId}: BlueMap tiles が最新チャンク範囲を覆っていません`);
}

if (issues.length > 0) {
  console.error(`\nBlueMap source audit failed:\n- ${issues.join('\n- ')}`);
  process.exit(1);
}

console.log('\nBlueMap source audit passed');

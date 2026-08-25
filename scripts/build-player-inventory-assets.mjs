import fs from 'node:fs';
import path from 'node:path';

const registry = JSON.parse(fs.readFileSync('data/data-registry.json', 'utf8'));
const economy = JSON.parse(fs.readFileSync('data/economy-assets.json', 'utf8'));

const sourceDir = registry.paths.awsDataSource ?? '../aws_minecraft/data';
const date = registry.paths.playerInventoryAssetsDate ?? registry.version;
const playerInventoryPath =
  registry.paths.itemInventoryLatestPlayer ??
  path.join(sourceDir, `item-inventory-stats-${date}-latest-player.json`);
const backpackInventoryPath =
  registry.paths.itemInventoryLatestPlayerBackpacks ??
  path.join(sourceDir, `item-inventory-stats-${date}-latest-player-backpacks.json`);
const outputPath = registry.paths.playerInventoryAssets ?? `data/player-inventory-assets-${date}.json`;

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function stripNamespace(id) {
  return id.includes(':') ? id.split(':').at(-1) : id;
}

function mergeCounts(...countsList) {
  const merged = {};
  for (const counts of countsList) {
    for (const [id, count] of Object.entries(counts ?? {})) {
      merged[id] = (merged[id] ?? 0) + count;
    }
  }
  return merged;
}

function valueFor(counts, entries) {
  const itemCounts = {};
  let value = 0;
  for (const entry of entries) {
    const count = Object.entries(counts).reduce(
      (sum, [id, itemCount]) => (stripNamespace(id) === entry.id ? sum + itemCount : sum),
      0,
    );
    if (count <= 0) continue;
    itemCounts[entry.id] = {
      label: entry.label ?? entry.id,
      count,
      multiplier: entry.multiplier,
      value: count * entry.multiplier,
    };
    value += count * entry.multiplier;
  }
  return { value, itemCounts };
}

function assetValues(counts) {
  return Object.fromEntries(
    economy.assets.map((asset) => {
      const { value, itemCounts } = valueFor(counts, asset.inventoryEntries);
      return [
        asset.id,
        {
          label: asset.label,
          shortLabel: asset.shortLabel,
          unit: asset.unit,
          value,
          items: itemCounts,
        },
      ];
    }),
  );
}

const playerInventory = readJson(playerInventoryPath);
const backpackInventory = fs.existsSync(backpackInventoryPath) ? readJson(backpackInventoryPath) : null;
const players = playerInventory.players?.by_player ?? {};
const backpacksByOwner = backpackInventory?.sophisticated_backpacks?.by_owner ?? {};

const outputPlayers = Object.fromEntries(
  Object.entries(players)
    .map(([name, player]) => {
      const inventory = player.inventory ?? {};
      const enderChest = player.ender_chest ?? {};
      const backpack = backpacksByOwner[name] ?? {};
      const combined = mergeCounts(inventory, enderChest, backpack);
      const assets = assetValues(combined);
      const total = Object.values(assets).reduce((sum, asset) => sum + asset.value, 0);
      return [
        name,
        {
          total,
          assets,
          sources: {
            inventory: assetValues(inventory),
            ender_chest: assetValues(enderChest),
            backpacks: assetValues(backpack),
          },
        },
      ];
    })
    .sort(([aName, a], [bName, b]) => b.total - a.total || aName.localeCompare(bName, 'ja')),
);

const output = {
  generated_on: backpackInventory?.generated_on ?? playerInventory.generated_on,
  source: {
    player_inventory: playerInventoryPath,
    backpack_inventory: fs.existsSync(backpackInventoryPath) ? backpackInventoryPath : '',
    note: '公開用に UUID と生NBTを除き、通常インベントリ・装備・エンダーチェスト・所有者別バックパック集計を資産換算した軽量データ。',
  },
  assets: economy.assets.map(({ id, label, shortLabel, unit, inventoryEntries }) => ({
    id,
    label,
    shortLabel,
    unit,
    entries: inventoryEntries,
  })),
  players: outputPlayers,
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${outputPath} for ${Object.keys(outputPlayers).length} players.`);

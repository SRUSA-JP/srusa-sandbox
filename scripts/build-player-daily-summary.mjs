import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync('data/data-registry.json', 'utf8'));
const sourcePath = config.paths.playerDataByDate;
const outputPath = config.paths.playerDailySummary;
const csvPath = config.paths.playerDailySummaryCsv;
const customMetrics = config.dailyCustomMetrics;

const rowKeys = [
  'from',
  'to',
  'player',
  'uuid',
  'playtime_hours',
  'deaths',
  'mob_kills',
  'player_kills',
  'damage_dealt_hp',
  'damage_taken_hp',
  'distance_km',
  'jumps',
  'sessions_left',
  'blocks_mined',
  'items_crafted',
  'items_used',
  'items_picked_up',
  'items_dropped',
  'tools_broken',
  'advancements',
  'recipes_unlocked',
  ...Object.keys(customMetrics),
];

function valueAt(record, key) {
  return record?.summary?.[key] ?? 0;
}

function customValue(record, keys) {
  return keys.reduce((sum, key) => sum + (record?.stat_categories?.custom?.[key] ?? 0), 0);
}

function advancementCount(record) {
  return record?.advancements?.completed_count ?? 0;
}

function recipeCount(record) {
  return record?.recipes?.unlocked_count ?? 0;
}

function csvCell(value) {
  const text = String(value ?? '');
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const rows = [];

for (const delta of source.daily_deltas ?? []) {
  for (const [player, record] of Object.entries(delta.players ?? {})) {
    rows.push({
      from: delta.from,
      to: delta.to,
      player,
      uuid: record.uuid,
      playtime_hours: valueAt(record, 'playtime_hours'),
      deaths: valueAt(record, 'deaths'),
      mob_kills: valueAt(record, 'mob_kills'),
      player_kills: valueAt(record, 'player_kills'),
      damage_dealt_hp: valueAt(record, 'damage_dealt_hp'),
      damage_taken_hp: valueAt(record, 'damage_taken_hp'),
      distance_km: valueAt(record, 'distance_km'),
      jumps: valueAt(record, 'jumps'),
      sessions_left: valueAt(record, 'sessions_left'),
      blocks_mined: valueAt(record, 'blocks_mined'),
      items_crafted: valueAt(record, 'items_crafted'),
      items_used: valueAt(record, 'items_used'),
      items_picked_up: valueAt(record, 'items_picked_up'),
      items_dropped: valueAt(record, 'items_dropped'),
      tools_broken: valueAt(record, 'tools_broken'),
      advancements: advancementCount(record),
      recipes_unlocked: recipeCount(record),
      chests_opened: customValue(record, customMetrics.chests_opened),
      villager_trades: customValue(record, customMetrics.villager_trades),
      villager_talks: customValue(record, customMetrics.villager_talks),
      animals_bred: customValue(record, customMetrics.animals_bred),
      beds_slept: customValue(record, customMetrics.beds_slept),
      enchantments: customValue(record, customMetrics.enchantments),
      flowers_potted: customValue(record, customMetrics.flowers_potted),
    });
  }
}

fs.writeFileSync(outputPath, `${JSON.stringify({ generated_on: source.generated_on, source: sourcePath, rows }, null, 2)}\n`);
fs.writeFileSync(csvPath, `${rowKeys.join(',')}\n${rows.map((row) => rowKeys.map((key) => csvCell(row[key])).join(',')).join('\n')}\n`);

console.log(`Wrote ${outputPath} and ${csvPath} with ${rows.length} daily rows and ${rowKeys.length - 4} metrics.`);

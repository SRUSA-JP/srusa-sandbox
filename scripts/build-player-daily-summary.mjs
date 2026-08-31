import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync('data/data-registry.json', 'utf8'));
const sourcePath = config.paths.playerDataByDate;
const playLogSourcePath = config.paths.playLogSource;
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

function round(value, digits = 2) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
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

function parseJstInstant(value) {
  return new Date(value.includes('T') ? value : `${value}T00:00:00+09:00`);
}

function eventInstant(day, time) {
  return new Date(`${day}T${time}+09:00`);
}

function logEventsFrom(source) {
  return (source.days ?? [])
    .flatMap((day) =>
      (day.notable_events ?? []).map((event) => ({
        at: eventInstant(day.date, event.time_jst),
        message: event.message,
      })),
    )
    .filter((event) => Number.isFinite(event.at.getTime()))
    .sort((a, b) => a.at.getTime() - b.at.getTime());
}

function logSessions(source) {
  const active = new Map();
  const sessions = [];
  for (const event of logEventsFrom(source)) {
    const join = event.message.match(/^([A-Za-z0-9_]{3,16}) joined the game$/);
    if (join) {
      active.set(join[1], event.at);
      continue;
    }

    const leave = event.message.match(/^([A-Za-z0-9_]{3,16}) left the game$/);
    if (leave) {
      const name = leave[1];
      const start = active.get(name);
      active.delete(name);
      if (start && event.at > start) sessions.push({ player: name, start, end: event.at });
      continue;
    }

    if (event.message.includes('Stopping server') || event.message.includes('Stopping the server')) {
      for (const [player, start] of active) {
        if (event.at > start) sessions.push({ player, start, end: event.at });
      }
      active.clear();
    }
  }
  return sessions;
}

function intersectHours(session, from, to) {
  if (session.end <= from || session.start >= to) return 0;
  const start = Math.max(session.start.getTime(), from.getTime());
  const end = Math.min(session.end.getTime(), to.getTime());
  return Math.max(0, end - start) / 1000 / 60 / 60;
}

function playtimeByInterval(sessions, player, from, to) {
  return round(
    sessions
      .filter((session) => session.player === player)
      .reduce((sum, session) => sum + intersectHours(session, from, to), 0),
  );
}

function suspiciousPlaytimeRows(rowsToCheck) {
  return rowsToCheck.filter((row) => {
    const from = parseJstInstant(row.from);
    const to = parseJstInstant(row.to);
    const intervalHours = Math.max(0, to.getTime() - from.getTime()) / 1000 / 60 / 60;
    return intervalHours <= 30 && row.playtime_hours > 20;
  });
}

const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const playLogSource = fs.existsSync(playLogSourcePath) ? JSON.parse(fs.readFileSync(playLogSourcePath, 'utf8')) : null;
const sessions = playLogSource ? logSessions(playLogSource) : [];
const rows = [];

for (const delta of source.daily_deltas ?? []) {
  const from = parseJstInstant(delta.from);
  const to = parseJstInstant(delta.to);
  for (const [player, record] of Object.entries(delta.players ?? {})) {
    rows.push({
      from: delta.from,
      to: delta.to,
      player,
      uuid: record.uuid,
      playtime_hours: sessions.length > 0 ? playtimeByInterval(sessions, player, from, to) : valueAt(record, 'playtime_hours'),
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

const suspiciousRows = sessions.length > 0 ? suspiciousPlaytimeRows(rows) : [];
if (suspiciousRows.length > 0) {
  const examples = suspiciousRows
    .slice(0, 5)
    .map((row) => `${row.from}->${row.to} ${row.player} ${row.playtime_hours}h`)
    .join('; ');
  throw new Error(`Suspicious single-day playtime rows detected: ${examples}`);
}

fs.writeFileSync(
  outputPath,
  `${JSON.stringify(
    {
      generated_on: source.generated_on,
      source: sourcePath,
      playtime_source: sessions.length > 0 ? playLogSourcePath : sourcePath,
      rows,
    },
    null,
    2,
  )}\n`,
);
fs.writeFileSync(csvPath, `${rowKeys.join(',')}\n${rows.map((row) => rowKeys.map((key) => csvCell(row[key])).join(',')).join('\n')}\n`);

const maxPlaytime = rows.reduce((max, row) => Math.max(max, row.playtime_hours), 0);
console.log(
  `Wrote ${outputPath} and ${csvPath} with ${rows.length} daily rows and ${rowKeys.length - 4} metrics. ` +
    `Playtime source: ${sessions.length > 0 ? playLogSourcePath : sourcePath}; max ${maxPlaytime}h.`,
);

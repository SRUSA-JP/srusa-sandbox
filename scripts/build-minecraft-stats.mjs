import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync('data/data-registry.json', 'utf8'));
const sourcePath = config.paths.playerDataByDate;
const outputPath = config.paths.minecraftStats;
const placeholder = config.redaction.placeholder;
const customMetrics = config.dailyCustomMetrics;

const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const snapshot = source.snapshots?.at(-1);
if (!snapshot) throw new Error(`${sourcePath} に snapshots が無い`);

const stripNamespace = (value) => String(value).replace(/^minecraft:/, '').replace(/^twilightforest:/, '');

function countMap(map = {}) {
  return Object.fromEntries(
    Object.entries(map)
      .filter(([, value]) => typeof value === 'number' && value !== 0)
      .map(([key, value]) => [stripNamespace(key), value])
      .sort(([a], [b]) => a.localeCompare(b)),
  );
}

function sumMap(map = {}) {
  return Object.values(map).reduce((sum, value) => sum + (typeof value === 'number' ? value : 0), 0);
}

function round(value, digits = 2) {
  const scale = 10 ** digits;
  return Math.round(value * scale) / scale;
}

function custom(record, key) {
  return record.stat_categories?.custom?.[key] ?? 0;
}

function customHp(record, key) {
  return round(custom(record, key) / 10, 1);
}

function customHours(record, key) {
  return round(custom(record, key) / 20 / 60 / 60);
}

function activity(record) {
  return Object.fromEntries(
    Object.entries(customMetrics).map(([id, keys]) => [
      id,
      keys.reduce((sum, key) => sum + custom(record, key), 0),
    ]),
  );
}

function movement(record) {
  const cm = {
    walk: custom(record, 'minecraft:walk_one_cm'),
    sprint: custom(record, 'minecraft:sprint_one_cm'),
    crouch: custom(record, 'minecraft:crouch_one_cm'),
    fall: custom(record, 'minecraft:fall_one_cm'),
    climb: custom(record, 'minecraft:climb_one_cm'),
    swim: custom(record, 'minecraft:swim_one_cm'),
    fly: custom(record, 'minecraft:fly_one_cm'),
    aviate: custom(record, 'minecraft:aviate_one_cm'),
    boat: custom(record, 'minecraft:boat_one_cm'),
    horse: custom(record, 'minecraft:horse_one_cm'),
    walk_on_water: custom(record, 'minecraft:walk_on_water_one_cm'),
    walk_under_water: custom(record, 'minecraft:walk_under_water_one_cm'),
  };

  return {
    total_km: record.summary?.distance_km ?? round(sumMap(cm) / 100000),
    by_method_km: Object.fromEntries(Object.entries(cm).map(([key, value]) => [key, round(value / 100000)])),
    by_method_cm: cm,
    jumps: record.summary?.jumps ?? custom(record, 'minecraft:jump'),
  };
}

function playerStats(record) {
  const killedBy = countMap(record.stat_categories?.killed_by);
  const deaths = record.summary?.deaths ?? custom(record, 'minecraft:deaths');
  const killedByTotal = sumMap(killedBy);
  const playtimeHours = record.summary?.playtime_hours ?? customHours(record, 'minecraft:play_time');

  return {
    uuid: placeholder,
    playtime: {
      ticks: record.summary?.playtime_ticks ?? custom(record, 'minecraft:play_time'),
      hours: playtimeHours,
      sneak_hours: customHours(record, 'minecraft:sneak_time'),
      since_last_death_hours: customHours(record, 'minecraft:time_since_death'),
      since_last_rest_hours: customHours(record, 'minecraft:time_since_rest'),
      sessions_left: record.summary?.sessions_left ?? custom(record, 'minecraft:leave_game'),
    },
    deaths: {
      total: deaths,
      per_hour: record.summary?.deaths_per_hour ?? (playtimeHours > 0 ? round(deaths / playtimeHours) : 0),
      by_mob: killedBy,
      other_causes: Math.max(0, deaths - killedByTotal),
    },
    combat: {
      mob_kills: record.summary?.mob_kills ?? custom(record, 'minecraft:mob_kills'),
      mob_kills_per_hour:
        playtimeHours > 0
          ? round((record.summary?.mob_kills ?? custom(record, 'minecraft:mob_kills')) / playtimeHours)
          : 0,
      player_kills: record.summary?.player_kills ?? custom(record, 'minecraft:player_kills'),
      damage_dealt_hp: record.summary?.damage_dealt_hp ?? customHp(record, 'minecraft:damage_dealt'),
      damage_taken_hp: record.summary?.damage_taken_hp ?? customHp(record, 'minecraft:damage_taken'),
      damage_absorbed_hp: customHp(record, 'minecraft:damage_absorbed'),
      damage_dealt_absorbed_hp: customHp(record, 'minecraft:damage_dealt_absorbed'),
      damage_dealt_resisted_hp: customHp(record, 'minecraft:damage_dealt_resisted'),
      kills_by_mob: countMap(record.stat_categories?.killed),
    },
    movement: movement(record),
    production: {
      blocks_mined: record.summary?.blocks_mined ?? sumMap(record.stat_categories?.mined),
      items_crafted: record.summary?.items_crafted ?? sumMap(record.stat_categories?.crafted),
      items_used: record.summary?.items_used ?? sumMap(record.stat_categories?.used),
      items_picked_up: record.summary?.items_picked_up ?? sumMap(record.stat_categories?.picked_up),
      items_dropped: record.summary?.items_dropped ?? sumMap(record.stat_categories?.dropped),
      tools_broken: record.summary?.tools_broken ?? sumMap(record.stat_categories?.broken),
      mined: countMap(record.stat_categories?.mined),
      crafted: countMap(record.stat_categories?.crafted),
      used: countMap(record.stat_categories?.used),
      picked_up: countMap(record.stat_categories?.picked_up),
      dropped: countMap(record.stat_categories?.dropped),
      broken: countMap(record.stat_categories?.broken),
    },
    activity: activity(record),
    twilight_forest: {
      trophy_pedestals_activated: custom(record, 'twilightforest:trophy_pedestals_activated'),
      keeping_charms_activated: custom(record, 'twilightforest:keeping_charms_activated'),
      life_charms_activated: custom(record, 'twilightforest:life_charms_activated'),
      e115_slices_eaten: custom(record, 'twilightforest:e115_slices_eaten'),
    },
    advancements: {
      count: record.advancements?.completed_count ?? 0,
      recipes_unlocked: record.recipes?.unlocked_count ?? 0,
      list: (record.advancements?.completed ?? []).map((entry) => entry.id).sort(),
    },
    raw_custom: countMap(record.stat_categories?.custom),
  };
}

const players = Object.fromEntries(
  Object.entries(snapshot.players ?? {})
    .map(([name, record]) => [name, playerStats(record)])
    .sort(([a], [b]) => a.localeCompare(b, 'ja')),
);

const playerRows = Object.values(players);
const sum = (pick) => round(playerRows.reduce((total, player) => total + pick(player), 0));

const output = {
  generated_on: snapshot.date,
  source: {
    path: placeholder,
    instance_id: placeholder,
    account: placeholder,
    region: placeholder,
    retrieved_via: 'AWS Systems Manager',
    minecraft_version: '1.21.1',
    loader: 'NeoForge 21.1.247',
    difficulty: 'hard',
  },
  units: {
    playtime: 'ticks (20/s); *_hours are derived',
    damage: 'raw values are 1/10 HP; *_hp fields are converted',
    distance: 'raw *_cm are centimetres; *_km fields are converted',
  },
  player_count: Object.keys(players).length,
  totals: {
    playtime_hours: sum((player) => player.playtime.hours),
    deaths: sum((player) => player.deaths.total),
    distance_km: sum((player) => player.movement.total_km),
    mob_kills: sum((player) => player.combat.mob_kills),
    player_kills: sum((player) => player.combat.player_kills),
    damage_dealt_hp: sum((player) => player.combat.damage_dealt_hp),
    damage_taken_hp: sum((player) => player.combat.damage_taken_hp),
    blocks_mined: sum((player) => player.production.blocks_mined),
    items_crafted: sum((player) => player.production.items_crafted),
    jumps: sum((player) => player.movement.jumps),
    advancements: sum((player) => player.advancements.count),
    recipes_unlocked: sum((player) => player.advancements.recipes_unlocked),
  },
  players,
};

fs.writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${outputPath} with ${output.player_count} players from ${sourcePath}.`);

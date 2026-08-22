import type { NamedPlayer, StatsDocument } from '../data/schema';
import { toNamedPlayers } from '../data/parse';
import type { PlayerRow } from './selectors';
import { playerRows, round } from './selectors';

export type DiscoveryKind =
  | 'playtime'
  | 'blocksMined'
  | 'distance'
  | 'deaths'
  | 'mobKills'
  | 'diamonds'
  | 'outlier';

export type PlaystyleId = 'miner' | 'builder' | 'explorer' | 'fighter' | 'farmer' | 'fisher' | 'trader';

export interface InventoryRecord {
  key: string;
  label: string;
  value: string;
  icon: string;
  colorIndex: number;
}

export interface Discovery {
  key: string;
  kind: DiscoveryKind;
  player: string;
  value: string;
  metric: string;
  icon: string;
  colorIndex: number;
}

export interface PlaystyleScore {
  id: PlaystyleId;
  value: number;
}

export interface PlayerStatus {
  name: string;
  level: number;
  primary: PlaystyleId;
  title: PlaystyleId | 'diamond' | 'fallen';
  description: PlaystyleId;
  rarest: PlaystyleId;
  rarestRank: number;
  playtimeHours: number;
  scores: PlaystyleScore[];
}

const DIAMOND_ORES = ['diamond_ore', 'deepslate_diamond_ore'];
const ORE_WORDS = ['ore', 'ancient_debris'];
const CROP_WORDS = ['wheat', 'carrot', 'potato', 'beetroot', 'melon', 'pumpkin', 'cocoa', 'nether_wart'];

function sumKeys(source: Record<string, number>, keys: string[]): number {
  return keys.reduce((acc, key) => acc + (source[key] ?? 0), 0);
}

function sumMatching(source: Record<string, number>, words: string[]): number {
  return Object.entries(source).reduce(
    (acc, [key, value]) => acc + (words.some((word) => key.includes(word)) ? value : 0),
    0,
  );
}

function topRow(rows: PlayerRow[], key: keyof PlayerRow): PlayerRow | null {
  return [...rows].sort((a, b) => Number(b[key]) - Number(a[key]))[0] ?? null;
}

function formatCompactNumber(value: number): string {
  if (value >= 10000) return `${round(value / 10000, 1)}万`;
  return `${Math.round(value).toLocaleString('ja-JP')}`;
}

function diamondOres(player: NamedPlayer): number {
  return sumKeys(player.production.mined, DIAMOND_ORES);
}

function totalActivity(players: NamedPlayer[], key: string): number {
  return players.reduce((acc, player) => acc + (player.activity[key] ?? 0), 0);
}

function totalProduction(players: NamedPlayer[], key: 'items_used'): number {
  return players.reduce((acc, player) => acc + player.production[key], 0);
}

function playerByName(players: NamedPlayer[], name: string): NamedPlayer | undefined {
  return players.find((player) => player.name === name);
}

export function serverInventory(doc: StatsDocument): InventoryRecord[] {
  const players = toNamedPlayers(doc);
  const diamonds = players.reduce((acc, player) => acc + diamondOres(player), 0);
  return [
    {
      key: 'ranking',
      label: 'TIME',
      value: `${formatCompactNumber(doc.totals.playtime_hours)}h`,
      icon: 'XP',
      colorIndex: 5,
    },
    {
      key: 'mining',
      label: 'MINED',
      value: formatCompactNumber(doc.totals.blocks_mined),
      icon: 'PX',
      colorIndex: 3,
    },
    {
      key: 'records',
      label: 'DIA',
      value: formatCompactNumber(diamonds),
      icon: 'DI',
      colorIndex: 2,
    },
    {
      key: 'travel',
      label: 'TRAVEL',
      value: `${formatCompactNumber(doc.totals.distance_km)}km`,
      icon: 'CP',
      colorIndex: 0,
    },
    {
      key: 'collection',
      label: 'CRAFT',
      value: formatCompactNumber(doc.totals.items_crafted),
      icon: 'CH',
      colorIndex: 4,
    },
    {
      key: 'building',
      label: 'USE',
      value: formatCompactNumber(totalProduction(players, 'items_used')),
      icon: 'BR',
      colorIndex: 6,
    },
    {
      key: 'farming',
      label: 'BRED',
      value: formatCompactNumber(totalActivity(players, 'animals_bred')),
      icon: 'WH',
      colorIndex: 1,
    },
    {
      key: 'deaths',
      label: 'DEATHS',
      value: formatCompactNumber(doc.totals.deaths),
      icon: 'SK',
      colorIndex: 7,
    },
    {
      key: 'achievements',
      label: 'ADV',
      value: formatCompactNumber(doc.totals.advancements),
      icon: 'EY',
      colorIndex: 0,
    },
  ];
}

export function serverDiscoveries(doc: StatsDocument, limit = 6): Discovery[] {
  const rows = playerRows(doc);
  const players = toNamedPlayers(doc);
  const discoveries: Discovery[] = [];
  const pushTop = (
    key: keyof PlayerRow,
    kind: DiscoveryKind,
    metric: string,
    value: (row: PlayerRow) => string,
    icon: string,
    colorIndex: number,
  ) => {
    const row = topRow(rows, key);
    if (!row || Number(row[key]) <= 0) return;
    discoveries.push({
      key: kind,
      kind,
      player: row.name,
      value: value(row),
      metric,
      icon,
      colorIndex,
    });
  };

  pushTop('playtime_hours', 'playtime', 'PLAY TIME', (row) => `${formatCompactNumber(row.playtime_hours)}h`, 'XP', 5);
  pushTop('blocks_mined', 'blocksMined', 'BLOCKS MINED', (row) => formatCompactNumber(row.blocks_mined), 'PX', 3);
  pushTop('distance_km', 'distance', 'DISTANCE', (row) => `${formatCompactNumber(row.distance_km)}km`, 'CP', 0);
  pushTop('deaths', 'deaths', 'DEATHS', (row) => `${formatCompactNumber(row.deaths)} deaths`, 'SK', 7);
  pushTop('mob_kills', 'mobKills', 'MOB KILLS', (row) => `${formatCompactNumber(row.mob_kills)} mobs`, 'SW', 1);

  const diamondLeader = [...players]
    .map((player) => ({ player, value: diamondOres(player) }))
    .sort((a, b) => b.value - a.value)[0];
  if (diamondLeader && diamondLeader.value > 0) {
    discoveries.push({
      key: 'diamonds',
      kind: 'diamonds',
      player: diamondLeader.player.name,
      value: `${formatCompactNumber(diamondLeader.value)} ores`,
      metric: 'DIAMOND ORE',
      icon: 'DI',
      colorIndex: 2,
    });
  }

  const outliers = rows
    .flatMap((row) =>
      (['blocks_mined', 'distance_km', 'mob_kills', 'deaths'] as const).map((metric) => {
        const values = rows.map((candidate) => candidate[metric]);
        const average = values.reduce((acc, value) => acc + value, 0) / Math.max(values.length, 1);
        return { row, metric, ratio: average > 0 ? row[metric] / average : 0 };
      }),
    )
    .filter((entry) => entry.ratio >= 3)
    .sort((a, b) => b.ratio - a.ratio)[0];
  if (outliers) {
    discoveries.push({
      key: `outlier-${outliers.metric}`,
      kind: 'outlier',
      player: outliers.row.name,
      value: `${round(outliers.ratio, 1)}x average`,
      metric: outliers.metric.toUpperCase(),
      icon: '!!',
      colorIndex: 6,
    });
  }

  return discoveries.slice(0, limit);
}

function rawPlaystyle(player: NamedPlayer): Record<PlaystyleId, number> {
  const ores = sumMatching(player.production.mined, ORE_WORDS);
  const crops = sumMatching(player.production.picked_up, CROP_WORDS) + sumMatching(player.production.used, CROP_WORDS);
  return {
    miner: player.production.blocks_mined + ores * 8 + diamondOres(player) * 20,
    builder:
      player.production.items_used +
      player.production.items_crafted * 0.5 +
      (player.activity.crafting_table_uses ?? 0) * 12 +
      (player.activity.stonecutter_uses ?? 0) * 16,
    explorer:
      player.movement.total_km * 100 +
      (player.movement.by_method_km.boat ?? 0) * 120 +
      (player.movement.by_method_km.aviate ?? 0) * 140 +
      player.advancements.count * 35,
    fighter: player.combat.mob_kills * 30 + player.combat.player_kills * 80 + player.combat.damage_dealt_hp,
    farmer: crops + (player.activity.animals_bred ?? 0) * 45 + (player.activity.fish_caught ?? 0) * 35,
    fisher: (player.activity.fish_caught ?? 0) * 100 + (player.production.used.fishing_rod ?? 0) * 2,
    trader: (player.activity.villager_trades ?? 0) * 80 + (player.activity.villagers_talked_to ?? 0) * 15,
  };
}

export function playerStatuses(doc: StatsDocument, limit = 6): PlayerStatus[] {
  const players = toNamedPlayers(doc);
  const raw = players.map((player) => ({ player, scores: rawPlaystyle(player) }));
  const maxByStyle = Object.fromEntries(
    (['miner', 'builder', 'explorer', 'fighter', 'farmer', 'fisher', 'trader'] as const).map((style) => [
      style,
      Math.max(...raw.map((entry) => entry.scores[style]), 1),
    ]),
  ) as Record<PlaystyleId, number>;

  const rankMaps = new Map<PlaystyleId, Map<string, number>>();
  for (const style of Object.keys(maxByStyle) as PlaystyleId[]) {
    rankMaps.set(
      style,
      new Map(
        [...raw]
          .sort((a, b) => b.scores[style] - a.scores[style])
          .map((entry, index) => [entry.player.name, index + 1]),
      ),
    );
  }

  return raw
    .map(({ player, scores }) => {
      const normalized = (Object.keys(scores) as PlaystyleId[])
        .map((id) => ({ id, value: Math.round((scores[id] / maxByStyle[id]) * 100) }))
        .sort((a, b) => b.value - a.value);
      const primary = normalized[0]?.id ?? 'explorer';
      const rare = normalized.find((score) => rankMaps.get(score.id)?.get(player.name) === 1) ?? normalized[0];
      const title: PlaystyleId | 'diamond' | 'fallen' =
        diamondOres(player) > 0 && rankMaps.get('miner')?.get(player.name) === 1
          ? 'diamond'
          : player.deaths.total >= 10 && primary !== 'fighter'
            ? 'fallen'
            : primary;
      return {
        name: player.name,
        level: Math.max(1, Math.round(player.playtime.hours / 6)),
        primary,
        title,
        description: primary,
        rarest: rare.id,
        rarestRank: rankMaps.get(rare.id)?.get(player.name) ?? 1,
        playtimeHours: player.playtime.hours,
        scores: normalized.slice(0, 5),
      };
    })
    .sort((a, b) => b.playtimeHours - a.playtimeHours)
    .slice(0, limit);
}

export function namedPlayerForStatus(doc: StatsDocument, status: PlayerStatus): NamedPlayer | undefined {
  return playerByName(toNamedPlayers(doc), status.name);
}

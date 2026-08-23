import { currentPlayerDailySummaryJson } from './current';
import type { StackedSeries } from '../lib/selectors';

export type PlayerDailyMetricKey =
  | 'playtime_hours'
  | 'distance_km'
  | 'damage_dealt_hp'
  | 'damage_taken_hp'
  | 'blocks_mined'
  | 'mob_kills'
  | 'deaths'
  | 'player_kills'
  | 'jumps'
  | 'sessions_left'
  | 'items_crafted'
  | 'items_used'
  | 'items_picked_up'
  | 'items_dropped'
  | 'tools_broken'
  | 'advancements'
  | 'recipes_unlocked'
  | 'chests_opened'
  | 'villager_trades'
  | 'villager_talks'
  | 'animals_bred'
  | 'beds_slept'
  | 'enchantments'
  | 'flowers_potted';

export interface PlayerDailyMetricOption {
  value: PlayerDailyMetricKey;
  label: string;
  unit: string;
}

export interface PlayerDailyDelta {
  from: string;
  to: string;
  player: string;
  uuid: string;
  playtime_hours: number;
  deaths: number;
  mob_kills: number;
  player_kills: number;
  damage_dealt_hp: number;
  damage_taken_hp: number;
  distance_km: number;
  jumps: number;
  sessions_left: number;
  blocks_mined: number;
  items_crafted: number;
  items_used: number;
  items_picked_up: number;
  items_dropped: number;
  tools_broken: number;
  advancements: number;
  recipes_unlocked: number;
  chests_opened: number;
  villager_trades: number;
  villager_talks: number;
  animals_bred: number;
  beds_slept: number;
  enchantments: number;
  flowers_potted: number;
}

export interface PlayerDailyDocument {
  generated_on: string;
  rows: PlayerDailyDelta[];
}

export const PLAYER_DAILY_METRICS: PlayerDailyMetricOption[] = [
  { value: 'playtime_hours', label: 'プレイ時間', unit: ' h' },
  { value: 'distance_km', label: '移動距離', unit: ' km' },
  { value: 'blocks_mined', label: '採掘', unit: ' 個' },
  { value: 'mob_kills', label: 'Mob討伐', unit: ' 体' },
  { value: 'player_kills', label: 'PvP討伐', unit: ' 人' },
  { value: 'deaths', label: '死亡', unit: ' 回' },
  { value: 'damage_dealt_hp', label: '与ダメージ', unit: ' HP' },
  { value: 'damage_taken_hp', label: '被ダメージ', unit: ' HP' },
  { value: 'jumps', label: 'ジャンプ', unit: ' 回' },
  { value: 'sessions_left', label: 'ログアウト', unit: ' 回' },
  { value: 'items_crafted', label: 'クラフト', unit: ' 個' },
  { value: 'items_used', label: '使用', unit: ' 個' },
  { value: 'items_picked_up', label: '拾得', unit: ' 個' },
  { value: 'items_dropped', label: 'ドロップ', unit: ' 個' },
  { value: 'tools_broken', label: '道具破損', unit: ' 本' },
  { value: 'advancements', label: '進捗', unit: ' 件' },
  { value: 'recipes_unlocked', label: 'レシピ', unit: ' 件' },
  { value: 'chests_opened', label: 'チェスト', unit: ' 回' },
  { value: 'villager_trades', label: '村人取引', unit: ' 回' },
  { value: 'villager_talks', label: '村人会話', unit: ' 回' },
  { value: 'animals_bred', label: '繁殖', unit: ' 回' },
  { value: 'beds_slept', label: '睡眠', unit: ' 回' },
  { value: 'enchantments', label: 'エンチャント', unit: ' 回' },
  { value: 'flowers_potted', label: '植木鉢', unit: ' 回' },
];

export const PLAYER_DAILY_CATEGORY_KEY = 'period';

function shortDate(value: string): string {
  const date = value.slice(0, 10);
  const match = date.match(/^\d{4}-(\d{2})-(\d{2})$/);
  return match ? `${match[1]}/${match[2]}` : value;
}

export function loadPlayerDailyDocument(): PlayerDailyDocument {
  return currentPlayerDailySummaryJson as PlayerDailyDocument;
}

export function playerDailyNames(doc: PlayerDailyDocument): string[] {
  return [...new Set(doc.rows.map((row) => row.player))].sort((a, b) => a.localeCompare(b));
}

export function playerDailyMetricOption(metric: PlayerDailyMetricKey): PlayerDailyMetricOption {
  return PLAYER_DAILY_METRICS.find((option) => option.value === metric) ?? PLAYER_DAILY_METRICS[0];
}

export function playerDailyTotals(
  doc: PlayerDailyDocument,
  player: string,
): Record<PlayerDailyMetricKey, number> {
  const rows = doc.rows.filter((row) => row.player === player);
  return Object.fromEntries(
    PLAYER_DAILY_METRICS.map((metric) => [
      metric.value,
      rows.reduce((acc, row) => acc + row[metric.value], 0),
    ]),
  ) as Record<PlayerDailyMetricKey, number>;
}

export function playerDailyTimeline(
  doc: PlayerDailyDocument,
  metric: PlayerDailyMetricKey,
  players: string[],
): StackedSeries {
  const selected = new Set(players);
  const periods = [...new Map(doc.rows.map((row) => [row.to, row])).values()];
  return {
    series: players.map((player) => ({ key: player, label: player })),
    rows: periods.map((period) => {
      const row: Record<string, string | number> = {
        [PLAYER_DAILY_CATEGORY_KEY]: `${shortDate(period.from)}-${shortDate(period.to)}`,
      };
      for (const entry of doc.rows.filter((delta) => delta.to === period.to && selected.has(delta.player))) {
        row[entry.player] = entry[metric];
      }
      return row;
    }),
  };
}

export function lastActivePlayerDailyRow(doc: PlayerDailyDocument, player: string): PlayerDailyDelta | null {
  return (
    [...doc.rows]
      .reverse()
      .find(
        (row) =>
          row.player === player &&
          PLAYER_DAILY_METRICS.some((metric) => row[metric.value] > 0),
      ) ?? null
  );
}

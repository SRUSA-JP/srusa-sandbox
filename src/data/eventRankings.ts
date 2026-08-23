import type { PlayerRow } from '../lib/selectors';

export type EventId = 'mahjong' | 'season_event' | 'community_game';
export type EventMetric = 'points' | 'wins' | 'participations';

export const EVENT_OPTIONS: Array<{ value: EventId; label: string; note: string }> = [
  { value: 'mahjong', label: 'マージャン', note: '対局イベントの通算成績を入れる想定の枠です。' },
  { value: 'season_event', label: '季節イベント', note: '期間イベント、企画参加、ミニゲームなどをまとめる枠です。' },
  { value: 'community_game', label: '交流ゲーム', note: 'Minecraft 外の遊びやDiscord企画の集計枠です。' },
];

export const EVENT_METRIC_OPTIONS: Array<{ value: EventMetric; label: string; unit: string }> = [
  { value: 'points', label: '通算ポイント', unit: ' pt' },
  { value: 'wins', label: '勝利数', unit: ' 勝' },
  { value: 'participations', label: '参加回数', unit: ' 回' },
];

export interface EventRankingRow {
  name: string;
  points: number;
  wins: number;
  participations: number;
  note: string;
}

export interface RankedEventRow extends EventRankingRow {
  rank: number;
}

function seedValue(name: string, eventId: EventId): number {
  return [...`${eventId}:${name}`].reduce((acc, char) => Math.imul(acc ^ char.charCodeAt(0), 16777619), 2166136261) >>> 0;
}

export function eventRankingRows(players: PlayerRow[], eventId: EventId): EventRankingRow[] {
  return players
    .map((player) => {
      const seed = seedValue(player.name, eventId);
      const activity = player.playtime_hours + player.mob_kills / 180 + player.blocks_mined / 900;
      return {
        name: player.name,
        points: Math.round(activity * 12 + (seed % 420)),
        wins: Math.floor(activity / 9 + (seed % 7)),
        participations: Math.max(1, Math.floor(player.playtime_hours / 5) + (seed % 5)),
        note: '仮データ',
      };
    })
    .sort((a, b) => b.points - a.points);
}

export function rankedEventRows(rows: EventRankingRow[], metric: EventMetric): RankedEventRow[] {
  return [...rows]
    .sort((a, b) => b[metric] - a[metric])
    .map((row, index) => ({ ...row, rank: index + 1 }));
}

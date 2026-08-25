/**
 * サーバーログの日別集計（mc-log-daily-summary-*.json）。
 *
 * 統計 JSON が「累計どれだけ遊んだか」を持つのに対し、こちらは
 * 「どの日にサーバーへ入ったか」を日ごとに持つ。連続プレイ日数のように
 * 「日付の並び」でしか出せないものは、こちらからしか作れない。
 *
 * 外から来た JSON なので、必ずこのファイルの検証を通してから使う。
 */
import { currentPlayLogJson } from './current';

/** その日にそのプレイヤーがどう遊んだか。 */
export interface PlayLogPlayerDay {
  joins: number;
  leaves: number;
  deaths: number;
  /** その日いちばん早く見かけた時刻（日本時間）。 */
  first_seen_jst: string;
  /** その日いちばん遅く見かけた時刻（日本時間）。 */
  last_seen_jst: string;
}

/** 1 日分。 */
export interface PlayLogDay {
  /** `YYYY-MM-DD`（日本時間）。 */
  date: string;
  joins: number;
  leaves: number;
  deaths: number;
  /** その日サーバーに入っていたプレイヤー。 */
  players: Record<string, PlayLogPlayerDay>;
}

export interface PlayLog {
  generated_on: string;
  days: PlayLogDay[];
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function numberAt(source: Record<string, unknown>, key: string): number {
  const value = source[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function textAt(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === 'string' ? value : '';
}

function parsePlayerDay(value: unknown): PlayLogPlayerDay | null {
  if (typeof value !== 'object' || value === null) return null;
  const source = value as Record<string, unknown>;
  return {
    joins: numberAt(source, 'joins'),
    leaves: numberAt(source, 'leaves'),
    deaths: numberAt(source, 'deaths'),
    first_seen_jst: textAt(source, 'first_seen_jst'),
    last_seen_jst: textAt(source, 'last_seen_jst'),
  };
}

function parseDay(value: unknown): PlayLogDay | null {
  if (typeof value !== 'object' || value === null) return null;
  const source = value as Record<string, unknown>;
  const date = textAt(source, 'date');
  /* 日付が読めない行は、並べ替えも差分計算もできないので落とす */
  if (!DATE_PATTERN.test(date)) return null;

  const players: Record<string, PlayLogPlayerDay> = {};
  const rawPlayers = source.players;
  if (typeof rawPlayers === 'object' && rawPlayers !== null) {
    for (const [name, raw] of Object.entries(rawPlayers as Record<string, unknown>)) {
      const player = parsePlayerDay(raw);
      if (player) players[name] = player;
    }
  }

  return {
    date,
    joins: numberAt(source, 'joins'),
    leaves: numberAt(source, 'leaves'),
    deaths: numberAt(source, 'deaths'),
    players,
  };
}

/** 壊れた行を落としつつ、日付の昇順に整えて返す。 */
export function parsePlayLog(value: unknown): PlayLog {
  if (typeof value !== 'object' || value === null) return { generated_on: '', days: [] };
  const source = value as Record<string, unknown>;
  const days = Array.isArray(source.days)
    ? source.days
        .map(parseDay)
        .filter((day): day is PlayLogDay => day !== null)
        .sort((a, b) => a.date.localeCompare(b.date))
    : [];
  return { generated_on: textAt(source, 'generated_on'), days };
}

let cached: PlayLog | null = null;

/** ビルド時に取り込んだ日別ログ。 */
export function playLog(): PlayLog {
  cached ??= parsePlayLog(currentPlayLogJson);
  return cached;
}

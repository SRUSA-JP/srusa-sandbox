import { DATA_TEXT } from '../config/messages';
import type { NamedPlayer, StatsDocument, PlayerStats } from './schema';

/** 検証に失敗したときに投げるエラー。どのフィールドで落ちたかを保持する。 */
export class StatsParseError extends Error {
  constructor(
    message: string,
    readonly field: string,
  ) {
    super(`${message} (field: ${field})`);
    this.name = 'StatsParseError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw new StatsParseError(DATA_TEXT.notObject, field);
  return value;
}

function requireNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    throw new StatsParseError(DATA_TEXT.notNumber, field);
  }
  return value;
}

/**
 * 未知の値（fetch した JSON、アップロードされたファイル等）を StatsDocument として検証する。
 *
 * 完全なスキーマ検証ではなく「ビューアが前提にしている構造」だけを確認する。
 * 欠けているセクションはプレイヤー単位で報告するので、部分的に壊れたファイルでも
 * どこが足りないのかが分かる。
 */
export function parseStatsDocument(raw: unknown): StatsDocument {
  const doc = requireRecord(raw, '<root>');
  requireRecord(doc.totals, 'totals');
  const players = requireRecord(doc.players, 'players');

  const requiredSections = [
    'playtime',
    'deaths',
    'movement',
    'combat',
    'production',
    'activity',
    'advancements',
  ] as const;

  for (const [name, value] of Object.entries(players)) {
    const player = requireRecord(value, `players.${name}`);
    if (typeof player.uuid !== 'string') {
      throw new StatsParseError(DATA_TEXT.notStringField('uuid'), `players.${name}.uuid`);
    }
    for (const section of requiredSections) {
      requireRecord(player[section], `players.${name}.${section}`);
    }
    requireNumber((player.playtime as Record<string, unknown>).hours, `players.${name}.playtime.hours`);
  }

  return doc as unknown as StatsDocument;
}

/** JSON 文字列から読み込む（File / fetch のレスポンス向け）。 */
export function parseStatsJson(text: string): StatsDocument {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new StatsParseError(DATA_TEXT.brokenJson((error as Error).message), '<root>');
  }
  return parseStatsDocument(raw);
}

/** `players` を名前付き配列に展開する（並びはプレイ時間の降順）。 */
export function toNamedPlayers(doc: StatsDocument): NamedPlayer[] {
  return Object.entries(doc.players)
    .map(([name, player]) => ({ name, ...(player as PlayerStats) }))
    .sort((a, b) => b.playtime.hours - a.playtime.hours);
}

/**
 * `totals` が players の総和と一致するかを検証する。
 * 不一致のフィールド名と差分を返す（空配列なら整合している）。
 */
export function checkTotals(doc: StatsDocument): Array<{ field: string; stated: number; summed: number }> {
  const players = Object.values(doc.players);
  const sum = (pick: (p: PlayerStats) => number) =>
    Math.round(players.reduce((acc, p) => acc + pick(p), 0) * 100) / 100;

  const summed: Record<string, number> = {
    playtime_hours: sum((p) => p.playtime.hours),
    deaths: sum((p) => p.deaths.total),
    distance_km: sum((p) => p.movement.total_km),
    mob_kills: sum((p) => p.combat.mob_kills),
    player_kills: sum((p) => p.combat.player_kills),
    damage_dealt_hp: sum((p) => p.combat.damage_dealt_hp),
    damage_taken_hp: sum((p) => p.combat.damage_taken_hp),
    blocks_mined: sum((p) => p.production.blocks_mined),
    items_crafted: sum((p) => p.production.items_crafted),
    jumps: sum((p) => p.movement.jumps),
    advancements: sum((p) => p.advancements.count),
    recipes_unlocked: sum((p) => p.advancements.recipes_unlocked),
  };

  return Object.entries(summed)
    .filter(([field, value]) => Math.abs(value - (doc.totals as unknown as Record<string, number>)[field]) > 0.05)
    .map(([field, value]) => ({
      field,
      stated: (doc.totals as unknown as Record<string, number>)[field],
      summed: value,
    }));
}

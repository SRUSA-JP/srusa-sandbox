/**
 * StatsDocument → チャート用データへの純粋な変換関数群。
 *
 * React に依存しないので、Node のスクリプトや将来の tsx からもそのまま使える。
 * すべて「入力を変更しない」「同じ入力なら同じ出力」を守る。
 */
import type { CountMap, ItemMetric, NamedPlayer, StatsDocument } from '../data/schema';
import { toNamedPlayers } from '../data/parse';
import { LIMITS } from '../config/metrics';
import {
  ECONOMY_ASSETS,
  ECONOMY_DEFAULT_SOURCE,
  ECONOMY_INDEX_BASE,
  ECONOMY_ITEM_CATEGORIES,
  type EconomyAsset,
  type EconomyItemCategoryId,
  type EconomyStatsSourceMetric,
  type EconomySourceMetric,
} from '../config/economy';
import {
  DAMAGE_LABELS,
  ENVIRONMENT_ENTRY,
  MOVEMENT_LABELS,
  OTHER_ENTRY,
  TOTAL_SERIES,
} from '../config/labels';
import { labelFor, prettifyId, stripNamespace } from './format';

/** チャート・表で使う汎用の 1 行。 */
export interface Entry {
  /** 元データのキー（色や識別に使う不変の ID）。 */
  key: string;
  /** 表示名。 */
  label: string;
  value: number;
}

/** プレイヤー 1 人分のサマリ行。表・CSV・ランキングの共通ソース。 */
/* index signature を持つ型エイリアスにして、CSV 出力（Row）へそのまま渡せるようにする */
export type PlayerRow = {
  name: string;
  uuid: string;
  playtime_hours: number;
  deaths: number;
  deaths_per_hour: number;
  distance_km: number;
  jumps: number;
  mob_kills: number;
  mob_kills_per_hour: number;
  player_kills: number;
  damage_dealt_hp: number;
  damage_taken_hp: number;
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
};

export function playerRows(doc: StatsDocument): PlayerRow[] {
  return toNamedPlayers(doc).map((p) => ({
    name: p.name,
    uuid: p.uuid,
    playtime_hours: round(p.playtime.hours, 2),
    deaths: p.deaths.total,
    deaths_per_hour: round(p.deaths.per_hour, 2),
    distance_km: round(p.movement.total_km, 2),
    jumps: p.movement.jumps,
    mob_kills: p.combat.mob_kills,
    mob_kills_per_hour: round(p.combat.mob_kills_per_hour, 2),
    player_kills: p.combat.player_kills,
    damage_dealt_hp: round(p.combat.damage_dealt_hp, 1),
    damage_taken_hp: round(p.combat.damage_taken_hp, 1),
    blocks_mined: p.production.blocks_mined,
    items_crafted: p.production.items_crafted,
    items_used: p.production.items_used,
    items_picked_up: p.production.items_picked_up,
    items_dropped: p.production.items_dropped,
    tools_broken: p.production.tools_broken,
    advancements: p.advancements.count,
    recipes_unlocked: p.advancements.recipes_unlocked,
    chests_opened: p.activity.chests_opened ?? 0,
    villager_trades: p.activity.villager_trades ?? 0,
  }));
}

/**
 * 値の基準。
 *
 * - `total`: 集計値そのまま
 * - `per_playtime_hour`: プレイ時間 1 時間あたり
 * - `per_playtime_day`: プレイ時間 24 時間（＝1プレイ日）あたり
 *
 * どちらの換算もプレイ時間が分母で、カレンダー上の経過日数ではない。
 * 元データに集計期間が入っていないため、実日数での換算は行えない。
 */
export type RateBasis = 'total' | 'per_playtime_hour' | 'per_playtime_day';

/** 1プレイ日として扱うプレイ時間。 */
export const HOURS_PER_PLAY_DAY = 24;

/** 基準に対応する分母（プレイ時間から求める）。 */
export function basisDivisor(hours: number, basis: RateBasis): number {
  switch (basis) {
    case 'per_playtime_hour':
      return hours;
    case 'per_playtime_day':
      return hours / HOURS_PER_PLAY_DAY;
    default:
      return 1;
  }
}

/** 0 除算を避けて割る。分母が 0 以下なら 0 とする。 */
export function perUnit(value: number, divisor: number): number {
  return divisor > 0 ? round(value / divisor, 3) : 0;
}

/** 基準に応じて 1 件の値を換算する。換算はすべてこの関数を通す。 */
export function applyBasis(value: number, hours: number, basis: RateBasis): number {
  return basis === 'total' ? value : perUnit(value, basisDivisor(hours, basis));
}

/** 対象プレイヤー（未指定なら全員）の合計プレイ時間。 */
export function totalPlaytimeHours(rows: PlayerRow[], players?: string[]): number {
  return includedRows(rows, players).reduce((acc, row) => acc + row.playtime_hours, 0);
}

/** 対象プレイヤー（未指定なら全員）に絞る。 */
function includedRows(rows: PlayerRow[], players?: string[]): PlayerRow[] {
  return players ? rows.filter((row) => players.includes(row.name)) : rows;
}

/* ------------------------------------------------------------------ *
 * 絞り込み
 *
 * 「どのプレイヤーを対象にするか」はここだけで決める。
 * 各グラフは絞り込み済みの行、または対象プレイヤー名の配列を受け取る。
 * ------------------------------------------------------------------ */

/** 指標の範囲による絞り込み条件。 */
export interface PlayerFilter {
  metric: NumericPlayerRowKey;
  /** 下限（この値を含む）。 */
  min: number;
  /** 上限（この値を含む）。 */
  max: number;
}

/** 指標の取りうる範囲。絞り込みの初期値に使う。 */
export function metricRange(rows: PlayerRow[], metric: NumericPlayerRowKey): { min: number; max: number } {
  if (rows.length === 0) return { min: 0, max: 0 };
  const values = rows.map((row) => row[metric]);
  return { min: Math.min(...values), max: Math.max(...values) };
}

/** 条件に合うプレイヤーだけを残す。 */
export function filterRows(rows: PlayerRow[], filter?: PlayerFilter): PlayerRow[] {
  if (!filter) return rows;
  return rows.filter((row) => row[filter.metric] >= filter.min && row[filter.metric] <= filter.max);
}

/** 積み上げ / グループ棒グラフの行を、対象プレイヤーだけに絞る。 */
export function filterSeriesRows(
  data: StackedSeries,
  players: string[],
  categoryKey = 'name',
): StackedSeries {
  return {
    series: data.series,
    rows: data.rows.filter((row) => players.includes(String(row[categoryKey]))),
  };
}

/** 数値カラムを降順に並べたランキング（グラフ用の Entry 配列）。 */
export function rankBy(
  rows: PlayerRow[],
  metric: NumericPlayerRowKey,
  options: { limit?: number; basis?: RateBasis } = {},
): Entry[] {
  const basis = options.basis ?? 'total';
  const sorted = rows
    .map((row) => ({
      key: row.name,
      label: row.name,
      value: applyBasis(row[metric], row.playtime_hours, basis),
    }))
    .sort((a, b) => b.value - a.value);
  return typeof options.limit === 'number' ? sorted.slice(0, options.limit) : sorted;
}

/** Entry 配列をまとめて換算する（内訳グラフのように分母が 1 つのとき）。 */
export function toRateEntries(entries: Entry[], hours: number, basis: RateBasis): Entry[] {
  if (basis === 'total') return entries;
  const divisor = basisDivisor(hours, basis);
  return entries.map((entry) => ({ ...entry, value: perUnit(entry.value, divisor) }));
}

export type NumericPlayerRowKey = {
  [K in keyof PlayerRow]: PlayerRow[K] extends number ? K : never;
}[keyof PlayerRow];

/** 対象プレイヤー（未指定なら全員）の NamedPlayer を返す。 */
function includedPlayers(doc: StatsDocument, players?: string[]): NamedPlayer[] {
  const all = toNamedPlayers(doc);
  return players ? all.filter((p) => players.includes(p.name)) : all;
}

/** 複数プレイヤーの CountMap を合算する。 */
export function mergeCounts(maps: CountMap[]): CountMap {
  const total: CountMap = {};
  for (const map of maps) {
    for (const [key, value] of Object.entries(map)) {
      total[key] = (total[key] ?? 0) + value;
    }
  }
  return total;
}

/** CountMap を降順の Entry 配列にする。 */
export function toEntries(map: CountMap, label: (key: string) => string = prettifyId): Entry[] {
  return Object.entries(map)
    .map(([key, value]) => ({ key, label: label(key), value }))
    .sort((a, b) => b.value - a.value);
}

/** 上位 n 件 + 「その他」にまとめる（カテゴリ色を 8 色以内に保つため）。 */
export function topWithOther(
  entries: Entry[],
  n: number = LIMITS.breakdownItems,
  otherLabel: string = OTHER_ENTRY.label,
): Entry[] {
  if (entries.length <= n) return entries;
  const head = entries.slice(0, n);
  const rest = entries.slice(n).reduce((acc, e) => acc + e.value, 0);
  return rest > 0 ? [...head, { key: OTHER_ENTRY.key, label: otherLabel, value: rest }] : head;
}

/** アイテム系メトリクス（採掘・クラフト等）の合算ランキング。player 指定で個人分のみ。 */
export function itemRanking(
  doc: StatsDocument,
  metric: ItemMetric,
  options: { players?: string[]; limit?: number } = {},
): Entry[] {
  const players = includedPlayers(doc, options.players);
  const entries = toEntries(mergeCounts(players.map((p) => p.production[metric])));
  return typeof options.limit === 'number' ? entries.slice(0, options.limit) : entries;
}

/** 倒した mob の合算ランキング。 */
export function killRanking(doc: StatsDocument, options: { players?: string[]; limit?: number } = {}): Entry[] {
  const players = includedPlayers(doc, options.players);
  const entries = toEntries(mergeCounts(players.map((p) => p.combat.kills_by_mob)));
  return typeof options.limit === 'number' ? entries.slice(0, options.limit) : entries;
}

/** 死因ランキング。mob 以外の死因（落下・溶岩など）は 1 件にまとめて含める。 */
export function deathCauseRanking(doc: StatsDocument, options: { players?: string[] } = {}): Entry[] {
  const players = includedPlayers(doc, options.players);
  const entries = toEntries(mergeCounts(players.map((p) => p.deaths.by_mob)));
  const other = players.reduce((acc, p) => acc + p.deaths.other_causes, 0);
  return other > 0 ? [...entries, { ...ENVIRONMENT_ENTRY, value: other }] : entries;
}

/* ------------------------------------------------------------------ *
 * SRUSA 鉱物指数
 * ------------------------------------------------------------------ */

export interface EconomyAssetValue {
  id: EconomyAsset['id'];
  label: string;
  shortLabel: string;
  unit: string;
  value: number;
}

/** 資産 1 種類の中で、1 item がどれだけの資産量になっているか。 */
export interface EconomyItemAmount {
  /** item ID（名前空間なし）。 */
  id: string;
  /** 内訳の分類。装備・ツール・原石など。 */
  category: EconomyItemCategoryId;
  /** 所持数（換算前）。 */
  count: number;
  /** 換算後の資産量。 */
  value: number;
}

export interface PlayerEconomyRow {
  name: string;
  diamond: number;
  emerald: number;
  total: number;
  /** 資産 1 種類ごとの item 内訳。分類別の積み上げに使う。 */
  items: Record<EconomyAsset['id'], EconomyItemAmount[]>;
}

export interface EconomySummary {
  assets: EconomyAssetValue[];
  total: number;
  rate: number | null;
  source: EconomySourceMetric;
}

function isStatsEconomySource(source: EconomySourceMetric): source is EconomyStatsSourceMetric {
  return source === 'picked_up' || source === 'mined';
}

/** stats の累計指標から、その資産の item 内訳を作る。0 の item は落とす。 */
function economyAssetItems(
  player: NamedPlayer,
  asset: EconomyAsset,
  source: EconomyStatsSourceMetric,
): EconomyItemAmount[] {
  const counts = player.production[source];
  return asset.statsEntries
    .map((entry) => {
      const count = Object.entries(counts).reduce(
        (acc, [key, value]) => (stripNamespace(key) === entry.id ? acc + value : acc),
        0,
      );
      return {
        id: entry.id,
        category: entry.category,
        count,
        value: count * entry.multiplier,
      };
    })
    .filter((item) => item.value > 0);
}

function sumItemValues(items: EconomyItemAmount[]): number {
  return items.reduce((total, item) => total + item.value, 0);
}

/** プレイヤー別の鉱物資産量。ダイヤ・エメラルドの合計を同じ 1 単位として足す。 */
export function playerEconomyRows(
  doc: StatsDocument,
  options: { players?: string[]; source?: EconomySourceMetric; inventoryRows?: PlayerEconomyRow[] } = {},
): PlayerEconomyRow[] {
  const source = options.source ?? ECONOMY_DEFAULT_SOURCE;
  if (source === 'inventory') {
    const playerSet = options.players && options.players.length > 0 ? new Set(options.players) : null;
    return (options.inventoryRows ?? [])
      .filter((row) => !playerSet || playerSet.has(row.name))
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'ja'));
  }
  const statsSource = isStatsEconomySource(source) ? source : 'picked_up';
  return includedPlayers(doc, options.players)
    .map((player) => {
      const items = {
        diamond: economyAssetItems(player, ECONOMY_ASSETS[0], statsSource),
        emerald: economyAssetItems(player, ECONOMY_ASSETS[1], statsSource),
      };
      const diamond = sumItemValues(items.diamond);
      const emerald = sumItemValues(items.emerald);
      return {
        name: player.name,
        diamond,
        emerald,
        total: diamond + emerald,
        items,
      };
    })
    .sort((a, b) => b.total - a.total);
}

/** 資産の種類（ダイヤ・エメラルド）別の積み上げランキング。 */
export function economyAssetRanking(rows: PlayerEconomyRow[]): StackedSeries {
  return {
    series: ECONOMY_ASSETS.map((asset) => ({ key: asset.id, label: asset.label })),
    rows: [...rows]
      .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'ja'))
      .map((row) => ({
        name: row.name,
        ...Object.fromEntries(ECONOMY_ASSETS.map((asset) => [asset.id, row[asset.id]])),
      })),
  };
}

/**
 * 資産 1 種類の、分類別の積み上げランキング。
 *
 * 「ダイヤ 300 のうち、装備が 80・ツールが 40・原石が 180」のように、
 * 同じ資産量でも中身が違うことを見せるための形。
 * 系列は分類の定義順で固定するので、対象を絞っても色が入れ替わらない。
 */
export function economyCategoryRanking(
  rows: PlayerEconomyRow[],
  assetId: EconomyAsset['id'],
): StackedSeries {
  const totals = new Map<EconomyItemCategoryId, number>();
  for (const row of rows) {
    for (const item of row.items[assetId]) {
      totals.set(item.category, (totals.get(item.category) ?? 0) + item.value);
    }
  }
  const series = ECONOMY_ITEM_CATEGORIES.filter((category) => (totals.get(category.id) ?? 0) > 0).map(
    (category) => ({ key: category.id, label: category.label }),
  );
  return {
    series,
    rows: [...rows]
      .sort((a, b) => b[assetId] - a[assetId] || a.name.localeCompare(b.name, 'ja'))
      .map((row) => {
        const byCategory: Record<string, number> = Object.fromEntries(
          series.map((entry) => [entry.key, 0]),
        );
        for (const item of row.items[assetId]) {
          byCategory[item.category] = (byCategory[item.category] ?? 0) + item.value;
        }
        return { name: row.name, ...byCategory };
      }),
  };
}

/** 対象者全体の鉱物資産サマリ。rate は「1 DI が何 EM 相当か」を供給量から見る簡易レート。 */
export function economySummary(
  doc: StatsDocument,
  options: { players?: string[]; source?: EconomySourceMetric; inventoryRows?: PlayerEconomyRow[] } = {},
): EconomySummary {
  const source = options.source ?? ECONOMY_DEFAULT_SOURCE;
  if (source === 'inventory') {
    const rows = playerEconomyRows(doc, options);
    const assets = ECONOMY_ASSETS.map((asset) => ({
      id: asset.id,
      label: asset.label,
      shortLabel: asset.shortLabel,
      unit: asset.unit,
      value: rows.reduce((total, row) => total + row[asset.id], 0),
    }));
    const diamond = assets.find((asset) => asset.id === 'diamond')?.value ?? 0;
    const emerald = assets.find((asset) => asset.id === 'emerald')?.value ?? 0;
    return {
      assets,
      total: assets.reduce((total, asset) => total + asset.value, 0),
      rate: diamond > 0 ? round(emerald / diamond, 3) : null,
      source,
    };
  }
  const statsSource = isStatsEconomySource(source) ? source : 'picked_up';
  const players = includedPlayers(doc, options.players);
  const assets = ECONOMY_ASSETS.map((asset) => ({
    id: asset.id,
    label: asset.label,
    shortLabel: asset.shortLabel,
    unit: asset.unit,
    value: players.reduce(
      (total, player) => total + sumItemValues(economyAssetItems(player, asset, statsSource)),
      0,
    ),
  }));
  const diamond = assets.find((asset) => asset.id === 'diamond')?.value ?? 0;
  const emerald = assets.find((asset) => asset.id === 'emerald')?.value ?? 0;
  return {
    assets,
    total: assets.reduce((total, asset) => total + asset.value, 0),
    rate: diamond > 0 ? round(emerald / diamond, 3) : null,
    source,
  };
}

/** 最初のスナップショットを 100 とした、日経平均のような指数推移。 */
export function economyIndexTimeline(
  snapshots: Snapshot[],
  options: {
    players?: string[];
    source?: EconomySourceMetric;
    inventoryRows?: PlayerEconomyRow[];
    inventoryLabel?: string;
  } = {},
): StackedSeries {
  const source = options.source ?? ECONOMY_DEFAULT_SOURCE;
  if (source === 'inventory') {
    const playerSet = options.players && options.players.length > 0 ? new Set(options.players) : null;
    const total = (options.inventoryRows ?? [])
      .filter((row) => !playerSet || playerSet.has(row.name))
      .reduce((sum, row) => sum + row.total, 0);
    return {
      series: [{ key: 'index', label: '指数' }],
      rows: [
        {
          [TIMELINE_CATEGORY_KEY]: options.inventoryLabel ?? '現在所有',
          index: total > 0 ? ECONOMY_INDEX_BASE : 0,
        },
      ],
    };
  }
  const summaries = snapshots.map((snapshot) => ({
    label: snapshot.label,
    summary: economySummary(snapshot.doc, { players: options.players, source }),
  }));
  const base = summaries.find((entry) => entry.summary.total > 0)?.summary.total ?? 0;
  return {
    series: [{ key: 'index', label: '指数' }],
    rows: summaries.map(({ label, summary }) => ({
      [TIMELINE_CATEGORY_KEY]: label,
      index: base > 0 ? round((summary.total / base) * ECONOMY_INDEX_BASE, 2) : 0,
    })),
  };
}

/** 積み上げ棒グラフ用: プレイヤー × 移動手段（km）。 */
export interface StackedSeries {
  /** 系列（積み上げの各セグメント）。順序 = 色スロット順。 */
  series: Array<{ key: string; label: string }>;
  /** 1 行 = 1 プレイヤー。`row[series.key]` に数値が入る。 */
  rows: Array<Record<string, string | number>>;
}

export function movementStacked(
  doc: StatsDocument,
  topMethods: number = LIMITS.movementMethods,
): StackedSeries {
  const players = toNamedPlayers(doc);
  const totals = toEntries(mergeCounts(players.map((p) => p.movement.by_method_km)), (key) =>
    labelFor(key, MOVEMENT_LABELS),
  );
  const kept = totals.slice(0, topMethods);
  const keptKeys = new Set(kept.map((e) => e.key));
  const hasOther = totals.length > kept.length;

  const rows = players.map((p) => {
    const row: Record<string, string | number> = { name: p.name };
    let other = 0;
    for (const [key, km] of Object.entries(p.movement.by_method_km)) {
      if (keptKeys.has(key)) row[key] = round(km, 2);
      else other += km;
    }
    for (const entry of kept) if (row[entry.key] === undefined) row[entry.key] = 0;
    if (hasOther) row[OTHER_ENTRY.key] = round(other, 2);
    return row;
  });

  const series = kept.map((e) => ({ key: e.key, label: e.label }));
  if (hasOther) series.push({ key: OTHER_ENTRY.key, label: OTHER_ENTRY.label });
  return { series, rows };
}

/** 与ダメージ / 被ダメージの 2 系列（グループ棒グラフ用）。 */
export function damageSeries(doc: StatsDocument): StackedSeries {
  return {
    series: [
      { key: 'damage_dealt_hp', label: DAMAGE_LABELS.dealt },
      { key: 'damage_taken_hp', label: DAMAGE_LABELS.taken },
    ],
    rows: playerRows(doc).map((row) => ({
      name: row.name,
      damage_dealt_hp: row.damage_dealt_hp,
      damage_taken_hp: row.damage_taken_hp,
    })),
  };
}

/**
 * 積み上げ / グループ棒グラフの各値を、その行のプレイヤーのプレイ時間で割る。
 * カテゴリ列（プレイヤー名）はそのまま残す。
 */
export function toRateSeries(
  data: StackedSeries,
  rows: PlayerRow[],
  basis: RateBasis,
  categoryKey = 'name',
): StackedSeries {
  if (basis === 'total') return data;
  const hoursByName = new Map(rows.map((row) => [row.name, row.playtime_hours]));
  return {
    series: data.series,
    rows: data.rows.map((row) => {
      const hours = hoursByName.get(String(row[categoryKey])) ?? 0;
      const divisor = basisDivisor(hours, basis);
      const converted: Record<string, string | number> = { [categoryKey]: row[categoryKey] };
      for (const series of data.series) {
        converted[series.key] = perUnit(Number(row[series.key] ?? 0), divisor);
      }
      return converted;
    }),
  };
}

/* ------------------------------------------------------------------ *
 * 日付ごとの推移
 * ------------------------------------------------------------------ */

/** 1 日分のスナップショット。 */
export interface Snapshot {
  /** 表示用の日付ラベル（例: "2026-08-18"）。 */
  label: string;
  doc: StatsDocument;
}

/** 推移グラフのカテゴリ列（横軸）に使うキー。 */
export const TIMELINE_CATEGORY_KEY = 'date';

/**
 * 日付を横軸にした系列を作る。
 *
 * - `perPlayer` が false: 対象者の合計を 1 本の線にする
 * - `perPlayer` が true: プレイヤーごとに 1 本ずつ。色は 8 枠までなので上位のみ残す
 *
 * 1時間あたりへの換算は、合計値を合計プレイ時間で割る（各人の率の平均ではない）。
 */
export function metricTimeline(
  snapshots: Snapshot[],
  metric: NumericPlayerRowKey,
  options: { players?: string[]; basis?: RateBasis; perPlayer?: boolean; limit?: number } = {},
): StackedSeries {
  const basis = options.basis ?? 'total';
  const limit = options.limit ?? LIMITS.trendPlayers;
  const perSnapshot = snapshots.map((snapshot) => ({
    label: snapshot.label,
    rows: includedRows(playerRows(snapshot.doc), options.players),
  }));

  if (!options.perPlayer) {
    const rows = perSnapshot.map(({ label, rows: snapshotRows }) => {
      const value = snapshotRows.reduce((acc, row) => acc + row[metric], 0);
      const hours = snapshotRows.reduce((acc, row) => acc + row.playtime_hours, 0);
      return {
        [TIMELINE_CATEGORY_KEY]: label,
        total: basis === 'total' ? value : perUnit(value, basisDivisor(hours, basis)),
      };
    });
    return { series: [{ ...TOTAL_SERIES }], rows };
  }

  /* 最新スナップショットの大きい順に色スロットを割り当てる */
  const latest = perSnapshot[perSnapshot.length - 1]?.rows ?? [];
  const names = [...latest]
    .sort((a, b) => b[metric] - a[metric])
    .slice(0, limit)
    .map((row) => row.name);

  const rows = perSnapshot.map(({ label, rows: snapshotRows }) => {
    const row: Record<string, string | number> = { [TIMELINE_CATEGORY_KEY]: label };
    for (const name of names) {
      const target = snapshotRows.find((r) => r.name === name);
      row[name] = target ? applyBasis(target[metric], target.playtime_hours, basis) : 0;
    }
    return row;
  });

  return { series: names.map((name) => ({ key: name, label: name })), rows };
}

/** 散布図用（任意の指標 × 任意の指標）。 */
export interface ScatterPoint {
  name: string;
  x: number;
  y: number;
}

/** 縦軸・横軸に使う指標をそれぞれ指定して散布図用の点を作る。 */
export function scatterBy(
  rows: PlayerRow[],
  xMetric: NumericPlayerRowKey,
  yMetric: NumericPlayerRowKey,
  basis: RateBasis = 'total',
): ScatterPoint[] {
  return rows.map((row) => ({
    name: row.name,
    x: applyBasis(row[xMetric], row.playtime_hours, basis),
    y: applyBasis(row[yMetric], row.playtime_hours, basis),
  }));
}

/** 実績の達成状況: 実績 ID → 達成したプレイヤー名。 */
export function advancementCoverage(doc: StatsDocument): Array<{ id: string; label: string; players: string[] }> {
  const map = new Map<string, string[]>();
  for (const p of toNamedPlayers(doc)) {
    for (const id of p.advancements.list) {
      const list = map.get(id) ?? [];
      list.push(p.name);
      map.set(id, list);
    }
  }
  return [...map.entries()]
    .map(([id, players]) => ({ id, label: prettifyId(id), players }))
    .sort((a, b) => b.players.length - a.players.length || a.id.localeCompare(b.id));
}

/** 実績の名前空間（minecraft / twilightforest など）ごとの達成数。 */
export function advancementsByNamespace(player: NamedPlayer): Entry[] {
  const counts: CountMap = {};
  for (const id of player.advancements.list) {
    const ns = id.includes(':') ? id.slice(0, id.indexOf(':')) : 'other';
    counts[ns] = (counts[ns] ?? 0) + 1;
  }
  return toEntries(counts, (key) => prettifyId(key));
}

export function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

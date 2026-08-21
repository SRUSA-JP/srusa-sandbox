/**
 * 統計ビューアで扱う指標の一覧と、集計の上限。
 *
 * 「どの指標を出すか」「単位は何か」「何件まで見せるか」はここだけが持つ。
 * 画面（App.tsx）と集計（lib/selectors.ts）は必ずここを参照し、
 * 指標名や件数を直接書かない。指標を増やすときもこのファイルだけを編集する。
 */
import type { ItemMetric } from '../data/schema';
import type { NumericPlayerRowKey, RateBasis } from '../lib/selectors';
import { CATEGORICAL_SLOTS } from '../theme/palette';
import { ENVIRONMENT_ENTRY, OTHER_ENTRY, TOTAL_SERIES } from './labels';

/** プレイヤー単位で比較できる指標。ランキングと散布図の選択肢になる。 */
export interface MetricOption {
  value: NumericPlayerRowKey;
  label: string;
  /** 値に添える単位。先頭の空白は数値との間隔。 */
  unit: string;
  /** 1時間あたりへの換算に意味があるか（既に時間あたりの指標は false）。 */
  ratable: boolean;
}

export const METRICS: MetricOption[] = [
  { value: 'playtime_hours', label: 'プレイ時間', unit: ' h', ratable: false },
  { value: 'distance_km', label: '移動距離', unit: ' km', ratable: true },
  { value: 'deaths', label: '死亡回数', unit: ' 回', ratable: true },
  { value: 'deaths_per_hour', label: '死亡回数（1時間あたり）', unit: ' 回/h', ratable: false },
  { value: 'mob_kills', label: 'mob 撃破数', unit: ' 体', ratable: true },
  { value: 'mob_kills_per_hour', label: 'mob 撃破数（1時間あたり）', unit: ' 体/h', ratable: false },
  { value: 'player_kills', label: 'プレイヤー撃破数', unit: ' 人', ratable: true },
  { value: 'damage_dealt_hp', label: '与ダメージ', unit: ' HP', ratable: true },
  { value: 'damage_taken_hp', label: '被ダメージ', unit: ' HP', ratable: true },
  { value: 'blocks_mined', label: '採掘したブロック', unit: ' 個', ratable: true },
  { value: 'items_crafted', label: 'クラフトしたアイテム', unit: ' 個', ratable: true },
  { value: 'items_used', label: '使用したアイテム', unit: ' 個', ratable: true },
  { value: 'items_picked_up', label: '拾得したアイテム', unit: ' 個', ratable: true },
  { value: 'items_dropped', label: '捨てた・落としたアイテム', unit: ' 個', ratable: true },
  { value: 'tools_broken', label: '壊れた道具', unit: ' 本', ratable: true },
  { value: 'jumps', label: 'ジャンプ回数', unit: ' 回', ratable: true },
  { value: 'advancements', label: '進捗の達成数', unit: ' 件', ratable: true },
  { value: 'recipes_unlocked', label: '解放したレシピ数', unit: ' 件', ratable: true },
  { value: 'chests_opened', label: 'チェストを開けた回数', unit: ' 回', ratable: true },
  { value: 'villager_trades', label: '村人との取引回数', unit: ' 回', ratable: true },
];

/** 値の見せ方。すべてのグラフで同じ選択肢を使う。 */
export interface BasisOption {
  value: RateBasis;
  label: string;
  /** 単位の末尾に足す文字（例: ' 体' → ' 体/h'）。 */
  suffix: string;
}

export const BASIS_OPTIONS: BasisOption[] = [
  { value: 'total', label: '実数', suffix: '' },
  { value: 'per_playtime_hour', label: '1時間あたり', suffix: '/h' },
  { value: 'per_playtime_day', label: '1プレイ日あたり', suffix: '/日' },
];

/** 1時間あたり表示に切り替えたとき、換算できない指標から移す先。 */
export const FALLBACK_RATABLE_METRIC: NumericPlayerRowKey = 'mob_kills';

/**
 * 同時に見せる項目数の上限。
 *
 * 色スロットの数を超えると同じ色が回ってしまうので、上限は配色に合わせる。
 * 数値を直接書かず、theme/palette.ts のスロット数から決める。
 */
export const LIMITS = {
  /** 内訳グラフで色を割り当てる件数（残りは「その他」に畳む）。 */
  breakdownItems: CATEGORICAL_SLOTS,
  /** 推移グラフでプレイヤー別に線を引く人数。 */
  trendPlayers: CATEGORICAL_SLOTS,
  /** 移動手段の内訳で色を割り当てる手段の数。 */
  movementMethods: 5,
} as const;

/** 内訳グラフで選べる集計軸。`kind` が 'item' のものは production 配下の CountMap。 */
export type BreakdownId = 'kills' | 'death_causes' | ItemMetric;

export interface BreakdownOption {
  value: BreakdownId;
  label: string;
  unit: string;
  /** グラフに添える注記。無ければ空文字。 */
  note: string;
}

export const BREAKDOWNS: BreakdownOption[] = [
  {
    value: 'kills',
    label: '倒した mob',
    unit: ' 体',
    note: '直接倒した分のみ。落下や溶岩による撃破は含まれません。',
  },
  {
    value: 'death_causes',
    label: '死因',
    unit: ' 回',
    note: `mob 以外の死因は「${ENVIRONMENT_ENTRY.label}」にまとめています。`,
  },
  { value: 'mined', label: '採掘したブロック', unit: ' 個', note: '' },
  { value: 'crafted', label: 'クラフトしたアイテム', unit: ' 個', note: '' },
  { value: 'used', label: '使用したアイテム', unit: ' 個', note: '' },
  { value: 'picked_up', label: '拾得したアイテム', unit: ' 個', note: '' },
  { value: 'dropped', label: '捨てたアイテム', unit: ' 個', note: '' },
  { value: 'broken', label: '壊れた道具', unit: ' 個', note: '' },
];

/** 複数系列グラフで選べる比較軸。 */
export type SeriesId = 'movement' | 'damage';

export interface SeriesOption {
  value: SeriesId;
  label: string;
  unit: string;
  /** 積み上げ（true）か横並び（false）か。 */
  stacked: boolean;
  note: string;
}

export const SERIES_OPTIONS: SeriesOption[] = [
  {
    value: 'movement',
    label: '移動手段の内訳',
    unit: ' km',
    stacked: true,
    note: `上位${LIMITS.movementMethods}手段のみ色を割り当て、残りは「${OTHER_ENTRY.label}」に畳んでいます。`,
  },
  {
    value: 'damage',
    label: '与ダメージと被ダメージ',
    unit: ' HP',
    stacked: false,
    note: '',
  },
];

/** 推移グラフの表示単位。 */
export type TrendScope = 'total' | 'per_player';

export const TREND_SCOPE_OPTIONS: Array<{ value: TrendScope; label: string }> = [
  { value: 'total', label: TOTAL_SERIES.label },
  { value: 'per_player', label: 'プレイヤー別' },
];

/** 表の左端に置くプレイヤー列。 */
export const PLAYER_COLUMN = { key: 'player', label: 'プレイヤー', align: 'left' } as const;

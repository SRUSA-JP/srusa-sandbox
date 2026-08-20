/**
 * 表示のための関数（統計ビューア）。
 *
 * 「何をどう見せるか」の決定はここに集約する。コンポーネントと App.tsx は
 * ここが返した値をそのまま渡すだけで、単位・文言・寸法を自分で決めない。
 *
 * - 指標・件数の設定 → config/metrics.ts
 * - グラフの寸法・書体 → config/charts.ts
 * - 文言           → config/messages.ts
 * - 数値の整形      → lib/format.ts
 *
 * このファイルは上を組み合わせるだけで、独自の数値や日本語を持たない。
 * 相関図側の同じ役割は map/display.ts。
 */
import type { BarRowSetting } from '../config/charts';
import { STATS_TEXT } from '../config/messages';
import {
  BASIS_OPTIONS,
  BREAKDOWNS,
  FALLBACK_RATABLE_METRIC,
  METRICS,
  SERIES_OPTIONS,
  type BreakdownId,
  type BreakdownOption,
  type MetricOption,
  type SeriesId,
  type SeriesOption,
} from '../config/metrics';
import type { NumericPlayerRowKey, RateBasis } from './selectors';
import { formatDecimal, formatInt } from './format';

/* ------------------------------------------------------------------ *
 * 値の表示
 * ------------------------------------------------------------------ */

/**
 * 数値の既定表示。
 *
 * 整数はそのまま、小数は桁数を値の大きさで調整する。グラフ・表・
 * ツールチップのどこでも同じ見え方にするため、必ずこの関数を通す。
 */
export function formatValue(value: number): string {
  return Number.isInteger(value) ? formatInt(value) : formatDecimal(value);
}

/** 単位付きの表示。値と単位のつなぎ方はここだけで決める。 */
export function formatWithUnit(value: number, unit = ''): string {
  return `${formatValue(value)}${unit}`;
}

/** 軸のタイトル。単位があれば括弧で添える。 */
export function axisTitle(label: string, unit: string): string {
  const trimmed = unit.trim();
  return trimmed ? `${label}（${trimmed}）` : label;
}

/** 注記を 1 つの文につなぐ。空の項目は落とす。 */
export function joinNotes(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join('');
}

/* ------------------------------------------------------------------ *
 * 指標と基準
 * ------------------------------------------------------------------ */

/** 指標の設定を引く唯一の入口。見つからなければ先頭の指標に落とす。 */
export function metricOption(metric: NumericPlayerRowKey): MetricOption {
  return METRICS.find((option) => option.value === metric) ?? METRICS[0];
}

export function breakdownOption(breakdown: BreakdownId): BreakdownOption {
  return BREAKDOWNS.find((option) => option.value === breakdown) ?? BREAKDOWNS[0];
}

export function seriesOption(series: SeriesId): SeriesOption {
  return SERIES_OPTIONS.find((option) => option.value === series) ?? SERIES_OPTIONS[0];
}

/** 基準に応じた単位（例: ' 体' → ' 体/h'）。単位の組み立てはここだけで行う。 */
export function unitFor(unit: string, basis: RateBasis): string {
  return `${unit}${BASIS_OPTIONS.find((option) => option.value === basis)?.suffix ?? ''}`;
}

/** 基準で選べる指標の一覧。換算に意味がない指標は落とす。 */
export function metricsFor(basis: RateBasis): MetricOption[] {
  return basis === 'total' ? METRICS : METRICS.filter((metric) => metric.ratable);
}

export function isRatable(metric: NumericPlayerRowKey): boolean {
  return metricOption(metric).ratable;
}

/** 換算できない指標を選んだまま基準を切り替えないよう、選択を寄せる。 */
export function keepRatable(metric: NumericPlayerRowKey, basis: RateBasis): NumericPlayerRowKey {
  return basis !== 'total' && !isRatable(metric) ? FALLBACK_RATABLE_METRIC : metric;
}

/** 換算後の分母の説明。実数表示のときは注記なし。 */
export function basisNote(basis: RateBasis, subject: string): string {
  switch (basis) {
    case 'per_playtime_hour':
      return STATS_TEXT.basisNote.perHour(subject);
    case 'per_playtime_day':
      return STATS_TEXT.basisNote.perDay(subject);
    default:
      return '';
  }
}

/** 基準の表示名（表の列見出しなど）。 */
export function basisLabel(basis: RateBasis): string {
  return BASIS_OPTIONS.find((option) => option.value === basis)?.label ?? '';
}

/** 指標を表の列見出しにする（単位込み）。 */
export function metricColumnLabel(metric: NumericPlayerRowKey, basis: RateBasis): string {
  const option = metricOption(metric);
  return `${option.label}${unitFor(option.unit, basis)}`;
}

/* ------------------------------------------------------------------ *
 * 寸法
 * ------------------------------------------------------------------ */

/**
 * 件数に応じた横棒グラフの高さ。棒が増えても 1 本の太さを保つ。
 *
 * 1 本あたりの高さは画面の広さで変わるので、設定は呼び出し側が
 * hooks/useChartMetrics.ts から受け取って渡す。
 */
export function barChartHeight(count: number, setting: BarRowSetting): number {
  return Math.max(setting.minHeight, count * setting.rowHeight);
}

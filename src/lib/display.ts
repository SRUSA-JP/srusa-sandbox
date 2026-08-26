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
import { PLAYSTYLE_IDS, type PlaystyleScore } from './statsExperience';
import { STREAK_TEXT, ZUKAN_TEXT } from '../config/messages';
import { ZUKAN_ATTRIBUTE_LIMIT, ZUKAN_PRIORITY_ATTRIBUTES } from '../config/dataRegistry';
import type { PlayStreak } from './playStreak';
import type { TimelineDay } from './timeline';
import { roleColors } from '../config/colors';
import { CONTRAST_MIN_LARGE, ensureContrast, type VizTheme } from '../theme/palette';

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

/* ------------------------------------------------------------------ *
 * 遊び方のレーダーチャート
 * ------------------------------------------------------------------ */

/**
 * レーダーチャートの軸に並べる順番。
 *
 * PlayerStatus.scores は「強い順」で持っている（一覧と代表値のため）。
 * そのまま角に割り当てるとプレイヤーごとに軸が入れ替わり、
 * 「右上が戦闘」といった読み方ができない。ここで必ず固定順に並べ直す。
 */
export function playstyleAxisOrder(scores: PlaystyleScore[]): PlaystyleScore[] {
  return PLAYSTYLE_IDS.map((id) => scores.find((score) => score.id === id)).filter(
    (score): score is PlaystyleScore => Boolean(score),
  );
}

/* ------------------------------------------------------------------ *
 * 連続プレイ日数
 * ------------------------------------------------------------------ */

/**
 * 連続プレイ日数の見せ方。
 *
 * 数え方は lib/playStreak.ts、色は config/colors.ts が持つ。ここは
 * 「どの数字にどの見出しを付け、続いているかをどう言うか」だけを決める。
 */
export function playStreakSummary(streak: PlayStreak): {
  tiles: Array<{ label: string; value: string }>;
  state: string;
  hasRecord: boolean;
} {
  return {
    tiles: [
      /* 途切れている人の連なりを「現在」と呼ぶと、いまも続いていると読めてしまう */
      {
        label: streak.active ? STREAK_TEXT.current : STREAK_TEXT.lastRun,
        value: STREAK_TEXT.days(streak.current),
      },
      { label: STREAK_TEXT.longest, value: STREAK_TEXT.days(streak.longest) },
      { label: STREAK_TEXT.totalDays, value: STREAK_TEXT.days(streak.totalDays) },
      { label: STREAK_TEXT.lastPlayed, value: streak.lastPlayed },
    ],
    state: streak.active ? STREAK_TEXT.active : STREAK_TEXT.broken,
    hasRecord: streak.totalDays > 0,
  };
}

/* ------------------------------------------------------------------ *
 * 図鑑
 * ------------------------------------------------------------------ */

/**
 * 図鑑のカード 1 枚に出すもの。
 *
 * 誰を出すかは lib/playerDirectory.ts、色は config/colors.ts が持つ。
 * ここは「所属を何個まで並べ、どんな札を付けるか」だけを決める。
 */
export function playerCardContent(input: {
  /** その人の所属。多いときは先頭から順に採る。 */
  attributes: string[];
  hasStats: boolean;
  hasDaily: boolean;
  /** 連続プレイ日数。ログに記録が無ければ null。 */
  streak: PlayStreak | null;
}): { attributes: string[]; overflow: string; badges: string[] } {
  const priority = input.attributes.filter((attribute) => ZUKAN_PRIORITY_ATTRIBUTES.includes(attribute));
  const rest = input.attributes.filter((attribute) => !ZUKAN_PRIORITY_ATTRIBUTES.includes(attribute));
  const shown = [...priority, ...rest].slice(0, ZUKAN_ATTRIBUTE_LIMIT);
  const hidden = input.attributes.length - shown.length;
  const badges: string[] = [];
  /* 続いている人だけ日数を出す。途切れた日数を並べても比べる意味がない */
  if (input.streak?.active && input.streak.current > 0) {
    badges.push(ZUKAN_TEXT.badge.streak(input.streak.current));
  }
  if (input.hasStats) badges.push(ZUKAN_TEXT.badge.stats);
  if (input.hasDaily) badges.push(ZUKAN_TEXT.badge.daily);

  return {
    attributes: shown,
    overflow: hidden > 0 ? ZUKAN_TEXT.moreAttributes(hidden) : '',
    badges,
  };
}

/* ------------------------------------------------------------------ *
 * サーバーのあゆみ（年表）
 * ------------------------------------------------------------------ */

/**
 * 年表の 1 日の色。
 *
 * 出来事のある日だけ強調色にして、それ以外は目盛りの色に落とす。
 * 全部に色を付けると、どの日が節目なのか分からなくなる。
 */
export function timelineDayAccent(day: TimelineDay, theme: VizTheme): string {
  const roles = roleColors(theme);
  if (day.marks.length === 0) return roles.border;
  return ensureContrast(roles.accent, roles.surface, CONTRAST_MIN_LARGE);
}

/**
 * 前の日との空き（日数）。
 *
 * 誰も入らなかった日はログに残らないので、日付が飛ぶ。飛んだことを
 * 出さないと、連なって見えて「毎日遊んでいた」ように読めてしまう。
 */
export function timelineGapDays(previous: string | undefined, current: string): number {
  if (!previous) return 0;
  const day = 24 * 60 * 60 * 1000;
  const gap = Math.round((Date.parse(current) - Date.parse(previous)) / day) - 1;
  return Number.isFinite(gap) && gap > 0 ? gap : 0;
}

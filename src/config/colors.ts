/**
 * 色の割り当て。
 *
 * 「どの部品にどの色を使うか」は、この 1 ファイルだけが決める。
 * グラフの軸・棒・点も、背景・ヘッダー・プルダウンといった画面部品も、
 * ここの 1 行を書き換えれば全画面の色が変わる。
 *
 * 色そのもの（実際の色コード）とコントラストの計算は theme/palette.ts。
 * このファイルは palette が用意した色を部品に結びつけるだけで、
 * 色コードを持たない。
 *
 * 同じ色を何度も書かないよう、間に「役割」を挟む。
 *   色（theme） → 役割（ROLE） → 部品（PART_COLORS / figureColors）
 * 部品を増やすときは PART_COLORS に 1 行足すだけでよく、
 * 配色を変えるときは theme/palette.ts だけを触ればよい。
 *
 * - グラフ・相関図 → `figureColors()` が返す色をコンポーネントが使う
 * - 画面部品      → `uiCssVariables()` が CSS カスタムプロパティとして流し込み、
 *                   Tailwind の色ユーティリティ（`bg-surface` など）が参照する
 */
import { cssVar } from '../theme/tokens';
import {
  CONTRAST_MIN_LARGE,
  CONTRAST_MIN_TEXT,
  chartText,
  ensureContrast,
  colorScale,
  cursorFill,
  mutedFill,
  readableTextOn,
  tooltipSurface,
  withAlpha,
  type TooltipSurfaceStyle,
  type VizTheme,
} from '../theme/palette';

/* ------------------------------------------------------------------ *
 * 役割
 * ------------------------------------------------------------------ */

/**
 * 色の役割。
 *
 * 画面に出る色はすべてこのどれかに属する。部品は色ではなく役割を指す。
 */
export type ColorRole =
  /* --- 面 --- */
  /** ページの地。 */
  | 'background'
  /** カード・グラフの面。 */
  | 'surface'
  /** ボタンや入力欄など、面から一段持ち上げるもの。 */
  | 'raised'
  /** 表の見出し行など、面から一段沈めるもの。 */
  | 'sunken'
  /** 指したときに敷く面。 */
  | 'hover'
  /** ツールチップなど、面の上に浮かせるもの。 */
  | 'overlay'
  /* --- 線 --- */
  /** 枠線・区切り線。 */
  | 'border'
  /** 強調したい枠線。 */
  | 'borderStrong'
  /** グラフの目盛り線。 */
  | 'grid'
  /* --- 文字 --- */
  /** 本文の文字。 */
  | 'text'
  /** 補足の文字。 */
  | 'muted'
  /** 件数や単位など、添え物の文字。 */
  | 'subtle'
  /* --- 強調 --- */
  /** 選択状態・強調。 */
  | 'accent'
  /** 指したときの強調色。 */
  | 'accentHover'
  /** 強調色を薄く敷いた面。 */
  | 'accentSubtle'
  /** 強調色の上に載る文字。 */
  | 'onAccent'
  /* --- 状態 --- */
  /** エラー表示。 */
  | 'danger';

/**
 * 役割 → 色。役割ごとの実際の色はここだけが決める。
 *
 * 文字の 3 段は、そのまま返さず「いちばん条件の厳しい面」でも読める色まで
 * 寄せてから返す。厳しいのは、明るい配色なら最も暗い面、暗い配色なら最も
 * 明るい面で、どちらも「指したときの面」がそれにあたる。
 *
 * こうしておくと、スキンが地の色を差し替えても（config/skins.ts）、
 * 手で色を選び直さずにコントラスト基準を保てる。
 */
export function roleColors(theme: VizTheme): Record<ColorRole, string> {
  const readable = (color: string) => ensureContrast(color, theme.surfaceHover, CONTRAST_MIN_TEXT);
  return {
    background: theme.background,
    surface: theme.surface,
    raised: theme.surfaceRaised,
    sunken: theme.surfaceSunken,
    hover: theme.surfaceHover,
    overlay: theme.surfaceOverlay,
    border: theme.border,
    borderStrong: theme.borderStrong,
    grid: theme.grid,
    text: readable(theme.textPrimary),
    muted: readable(theme.textSecondary),
    subtle: readable(theme.textTertiary),
    accent: theme.accent,
    accentHover: theme.accentHover,
    accentSubtle: theme.accentSubtle,
    onAccent: readableTextOn(theme.accent, theme, CONTRAST_MIN_TEXT),
    danger: theme.danger,
  };
}

/* ------------------------------------------------------------------ *
 * 画面部品の色
 * ------------------------------------------------------------------ */

/**
 * 部品 → 役割。
 *
 * src/styles/index.css の `@theme inline` は、ここに並ぶ名前を
 * Tailwind の色ユーティリティに割り当てる。
 * 部品の色を変えたいときは、その行の役割を差し替える。
 * 役割そのものの色を変えたいときは theme/palette.ts を触る。
 */
export const PART_COLORS: Record<string, ColorRole> = {
  /* ページ全体 */
  'page-background': 'background',
  'page-text': 'text',
  'muted-text': 'muted',
  'subtle-text': 'subtle',
  divider: 'border',
  'error-text': 'danger',

  /* 面（奥から手前へ、そして沈む方向） */
  surface: 'surface',
  'surface-raised': 'raised',
  'surface-sunken': 'sunken',
  'surface-hover': 'hover',
  'surface-overlay': 'overlay',
  'surface-overlay-border': 'borderStrong',

  /* 見出し */
  'heading-text': 'text',

  /* 操作部品（プルダウン・ボタン・数値入力） */
  'control-background': 'raised',
  'control-background-hover': 'hover',
  'control-text': 'text',
  'control-border': 'border',
  'control-border-hover': 'accentHover',
  'control-selected': 'accent',
  'control-selected-text': 'onAccent',
  'control-selected-subtle': 'accentSubtle',
  'focus-ring': 'accent',

  /* タブ */
  'tab-text': 'muted',
  'tab-text-active': 'text',
  'tab-marker': 'accent',
  'tab-background-active': 'accentSubtle',

  /* 表 */
  'table-border': 'border',
  'table-header-background': 'sunken',
  'table-header-text': 'muted',
  'table-row-hover': 'hover',

  /* 相関図の凡例 */
  'legend-background': 'raised',
  'legend-border': 'border',
  'legend-active-border': 'accent',
};

/**
 * 部品ごとの色を CSS カスタムプロパティにする。
 *
 * 対応表（PART_COLORS）から機械的に作るので、部品が増えても
 * ここを直す必要はない。
 */
export function uiCssVariables(theme: VizTheme): Record<string, string> {
  const colors = roleColors(theme);
  return Object.fromEntries(
    Object.entries(PART_COLORS).map(([part, role]) => [cssVar(part), colors[role]]),
  );
}

/* ------------------------------------------------------------------ *
 * 図（グラフ・相関図）の色
 * ------------------------------------------------------------------ */

/**
 * カテゴリ配色の使い方。
 *
 * 系列が 1 つのグラフや強調表示は、毎回同じスロットを使って色を固定する。
 * ランキング順で色を付け替えない（色は実体に固定する）。
 */
export const COLOR_SLOTS = {
  /** 単一系列のグラフ・強調表示。 */
  primary: 0,
  /** プレイヤーデータでトップ級の値を示す色。 */
  playerTop: 3,
  /** プレイヤーデータで目立つ値を示す色。 */
  playerNotable: 1,
} as const;

export type PlayerDataHighlightLevel = 'normal' | 'notable' | 'top';

export const PLAYER_DATA_HIGHLIGHT = {
  topRank: 1,
  notableRank: 3,
  notableAverageRatio: 1.5,
  scatterTopShare: 0.82,
  topFillAlpha: 0.18,
  notableFillAlpha: 0.12,
} as const;

/**
 * 連続プレイ日数の帯の 1 マスの色。
 *
 * 3 段階だけにする。いま続いている連なりを強調色、それ以外のログインした日を
 * 薄く、ログインしていない日は沈んだ背景。図形なので下限は 3:1。
 */
export function playStreakMarkColors(
  theme: VizTheme,
  accent: string,
): { current: string; played: string; missed: string; border: string } {
  return {
    current: ensureContrast(accent, theme.surface, CONTRAST_MIN_LARGE),
    played: withAlpha(accent, PLAY_STREAK_MARK.playedAlpha),
    missed: theme.surfaceHover,
    border: theme.border,
  };
}

/** 帯の 1 マスの見た目。 */
export const PLAY_STREAK_MARK = {
  /** ログインはしたが、いまの連なりには入っていない日の濃さ。 */
  playedAlpha: 0.42,
} as const;

export function playerDataHighlightLevel({
  rank,
  averageRatio,
  maxShare,
}: {
  rank?: number;
  averageRatio?: number;
  maxShare?: number;
}): PlayerDataHighlightLevel {
  if (rank !== undefined && rank <= PLAYER_DATA_HIGHLIGHT.topRank) return 'top';
  if (rank !== undefined && rank <= PLAYER_DATA_HIGHLIGHT.notableRank) return 'notable';
  if (averageRatio !== undefined && averageRatio >= PLAYER_DATA_HIGHLIGHT.notableAverageRatio) return 'notable';
  if (maxShare !== undefined && maxShare >= PLAYER_DATA_HIGHLIGHT.scatterTopShare) return 'notable';
  return 'normal';
}

export function playerDataHighlightColors(
  theme: VizTheme,
  level: PlayerDataHighlightLevel,
  fallback: string = theme.accent,
): { border: string; fill: string; bar: string; text: string } {
  const roles = roleColors(theme);
  if (level === 'top') {
    const color = theme.categorical[COLOR_SLOTS.playerTop % theme.categorical.length];
    return {
      border: color,
      fill: withAlpha(color, PLAYER_DATA_HIGHLIGHT.topFillAlpha),
      bar: color,
      text: ensureContrast(color, theme.surfaceHover, CONTRAST_MIN_TEXT),
    };
  }
  if (level === 'notable') {
    const color = theme.categorical[COLOR_SLOTS.playerNotable % theme.categorical.length];
    return {
      border: color,
      fill: withAlpha(color, PLAYER_DATA_HIGHLIGHT.notableFillAlpha),
      bar: color,
      text: ensureContrast(color, theme.surfaceHover, CONTRAST_MIN_TEXT),
    };
  }
  return {
    border: roles.border,
    fill: roles.sunken,
    bar: fallback,
    text: roles.text,
  };
}

export interface FigureColors {
  /** 軸・目盛り・凡例・データラベルの文字。 */
  axis: string;
  /** 主役の文字（強調した要素のラベル）。 */
  strongText: string;
  /** 目盛り線・軸線。 */
  grid: string;
  /** ホバー中のカテゴリを示す薄い帯。 */
  cursor: string;
  /** 単一系列の塗り・強調。 */
  primary: string;
  /** 対象から外した要素。 */
  dimmed: string;
  /**
   * 図の下地。文字色のコントラストはこの面を基準に判定する。
   * 記事に埋め込んだときは記事の地の色になる。
   */
  background: string;
  /**
   * 図形どうしを切り分ける線（積み上げの隙間・点や線の縁取り）。
   * 下地と同じ色で描くことで、隣り合う図形の境目を作る。
   */
  separator: string;
  /** 系列キー → 色。登録順で固定するので、絞り込んでも色が変わらない。 */
  series: (keys: string[]) => (key: string) => string;
  /** 分類ごとのスロット色（相関図のグループなど）。 */
  slot: (index: number) => string;
  /** 色の面の上に載せる文字・図形。読める色まで寄せて返す。 */
  labelOn: (background: string, minRatio?: number) => string;
  /** ツールチップの面。 */
  tooltip: TooltipSurfaceStyle;
}

/**
 * 図の各部の色。
 *
 * コンポーネントはここが返した色だけを使い、テーマの色を直接読まない。
 * 面と文字は画面部品と同じ役割を使うので、配色を変えれば両方に効く。
 */
export function figureColors(theme: VizTheme): FigureColors {
  const roles = roleColors(theme);
  return {
    axis: chartText(theme),
    strongText: chartText(theme, 'primary'),
    grid: roles.grid,
    cursor: cursorFill(theme),
    primary: theme.categorical[COLOR_SLOTS.primary % theme.categorical.length],
    dimmed: mutedFill(theme),
    background: roles.surface,
    separator: roles.surface,
    series: (keys) => colorScale(keys, theme),
    slot: (index) => theme.categorical[index % theme.categorical.length],
    labelOn: (background, minRatio = CONTRAST_MIN_TEXT) => readableTextOn(background, theme, minRatio),
    tooltip: tooltipSurface(theme),
  };
}

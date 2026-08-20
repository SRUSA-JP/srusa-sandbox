/**
 * 色以外のデザイントークン（書体・余白・角丸・寸法）。
 *
 * 画面に出る数値と書体はここだけが持つ。Tailwind のユーティリティも、
 * src/styles/index.css の `@theme inline` を通してこのファイルが作る
 * カスタムプロパティを参照する。
 * 色は theme/palette.ts が持つ（役割を分けて、どちらも単一の出どころにする）。
 *
 * 長さは単位なしの数値（px）で持つ。CSS には `px` を付けて流し込み、
 * SVG やグラフ（Recharts）には数値のまま渡せるようにするため。
 */

/**
 * 実行時に流し込むカスタムプロパティの接頭辞。
 *
 * Tailwind v4 は `--color-*` `--spacing-*` `--radius-*` などを自分の
 * 名前空間として使う。同じ名前を実行時に上書きすると、どちらの定義が
 * 効いているのか追えなくなるので、このアプリが作る変数は必ず接頭辞で分ける。
 */
export const VAR_PREFIX = '--sr-';

/** トークン名をカスタムプロパティ名にする唯一の入口。 */
export function cssVar(name: string): string {
  return `${VAR_PREFIX}${name}`;
}

/** 書体。 */
export const FONT_FAMILY = {
  /** 本文と UI の書体。 */
  base: "system-ui, -apple-system, 'Segoe UI', 'Hiragino Sans', 'Noto Sans JP', sans-serif",
  /** 数字を並べて比べる箇所（表・グラフの値）。 */
  numeric: "ui-monospace, SFMono-Regular, Menlo, 'Hiragino Sans', 'Noto Sans JP', monospace",
} as const;

/**
 * 文字の大きさ（px）。
 *
 * グラフの中の文字（xxs〜sm）は数が多く重なりやすいので、本文より小さい。
 * 全体を大きく／小さくしたいときは、この表だけを書き換える
 * （ページごとの調整は config/skins.ts の fontScale）。
 */
export const FONT_SIZE = {
  /** 図中の添え字（点の名前など、最小の注記）。 */
  xxs: 11,
  /** 補足・データラベル。 */
  xs: 12,
  /** ラベル・凡例・軸。 */
  sm: 13,
  /** 表・小見出し。 */
  md: 14,
  /** 本文。 */
  base: 16,
  /** 節の見出し（グラフ 1 枚ごとの見出し）。 */
  lg: 18,
  /** 画面の見出し。 */
  xl: 22,
  /** 指標の数値。 */
  display: 26,
} as const;

/** 文字の太さ。 */
export const FONT_WEIGHT = {
  normal: 400,
  medium: 600,
  bold: 650,
} as const;

/** 行の高さ。 */
export const LINE_HEIGHT = {
  tight: 1.3,
  base: 1.6,
} as const;

/** 字間。 */
export const LETTER_SPACING = {
  tight: '-0.01em',
  base: '0',
} as const;

/** 余白（px）。 */
export const SPACE = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  xxxl: 24,
  /** 節と節の間。 */
  section: 40,
  page: 64,
} as const;

/** 角丸（px）。 */
export const RADIUS = {
  /** 凡例ドットなど、ごく小さい四角。 */
  xs: 2,
  sm: 4,
  md: 8,
  lg: 12,
  pill: 999,
} as const;

/** 線の太さ（px）。 */
export const BORDER = {
  hairline: 1,
  thick: 2,
} as const;

/** 画面の寸法（px。CSS の単位が必要なものだけ文字列）。 */
export const LAYOUT = {
  /** 本文の最大幅。 */
  maxWidth: 1180,
  /** 指標タイルの最小幅（この幅を下回ると折り返す）。 */
  tileMinWidth: 170,
  /** 2 段組みの最小幅。 */
  columnMinWidth: 420,
  /** 読み物の 1 行の最大幅（長すぎる行は読みにくい）。 */
  proseMaxWidth: 760,
  /** 表を縦スクロールさせる高さ。 */
  tableMaxHeight: 520,
  /** アイコンなどの小さな四角。 */
  swatchSize: 12,
  /** 数値入力欄の幅（文字数で決めるので em）。 */
  numberInputWidth: '7em',
} as const;

/** 状態を表す効果。 */
export const EFFECT = {
  /** 押せないボタンの薄さ。 */
  disabledOpacity: 0.5,
} as const;

/** キャメルケースのキーを CSS カスタムプロパティ向けのケバブケースにする。 */
function kebab(value: string): string {
  return value.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/**
 * トークン表を CSS カスタムプロパティの一覧にする。
 *
 * `unit` を渡すと数値にその単位を付ける。文字列で持っている値
 * （`7em` など）はそのまま使う。
 */
function flatten(
  prefix: string,
  source: Record<string, string | number>,
  unit: 'px' | '' = '',
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(source).map(([key, value]) => [
      cssVar(`${prefix}-${kebab(key)}`),
      typeof value === 'number' ? `${value}${unit}` : value,
    ]),
  );
}

/**
 * トークンを CSS カスタムプロパティの一覧にする。
 * CSS 側はここで作られた名前だけを使う。
 */
export function tokenCssVariables(): Record<string, string> {
  return {
    [cssVar('font-family')]: FONT_FAMILY.base,
    [cssVar('font-family-numeric')]: FONT_FAMILY.numeric,
    ...flatten('font-size', FONT_SIZE, 'px'),
    ...flatten('font-weight', FONT_WEIGHT),
    ...flatten('line-height', LINE_HEIGHT),
    ...flatten('letter-spacing', LETTER_SPACING),
    ...flatten('space', SPACE, 'px'),
    ...flatten('radius', RADIUS, 'px'),
    ...flatten('border', BORDER, 'px'),
    ...flatten('layout', LAYOUT, 'px'),
    ...flatten('effect', EFFECT),
  };
}

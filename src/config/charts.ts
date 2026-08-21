/**
 * グラフの表示設定。
 *
 * Recharts に渡す寸法・書体・線の太さは、この 1 ファイルだけが持つ。
 * 各グラフのコンポーネントは必ずここを参照し、数値を直接書かない。
 * ここを編集すれば全てのグラフの見た目が変わる。
 *
 * 色は持たない。色は theme/palette.ts が唯一の出どころ。
 * 共通の書体・余白・角丸は theme/tokens.ts から取り、値を重複させない。
 */
import { BORDER, FONT_SIZE, RADIUS, SPACE } from '../theme/tokens';

/** グラフ本体の高さ。 */
export const CHART_HEIGHT = {
  /** 件数の少ない横棒グラフ。 */
  compact: 320,
  /** 折れ線・散布図。 */
  base: 340,
  /** 系列の多い棒グラフ（凡例と斜めラベルの分だけ高い）。 */
  tall: 380,
} as const;

/**
 * 件数に応じて高さを伸ばす横棒グラフの設定。
 * 棒が増えても 1 本あたりの太さを保つため、行数 × 行の高さで決める。
 */
export const BAR_ROW = {
  /** プレイヤー比較（1 人 = 1 行）。 */
  ranking: { minHeight: 280, rowHeight: 26 },
  /** 内訳（1 項目 = 1 行）。項目名が長いので広めに取る。 */
  breakdown: { minHeight: 240, rowHeight: 32 },
} as const;

/** 軸まわり。 */
export const AXIS = {
  fontSize: FONT_SIZE.sm,
  /** カテゴリ名を斜めに倒す角度（度）。名前が長くても重ならないようにする。 */
  tickAngle: -35,
  /** 斜めラベルのために確保する高さ。 */
  tickHeight: 72,
  /** 横棒グラフでラベル列に取る幅。 */
  categoryWidth: 132,
  /** 軸タイトルを軸から離す距離。 */
  titleOffset: -18,
  /** 縦軸のタイトルを回す角度（度）。 */
  titleAngleY: -90,
} as const;

/** 棒・点・線に添える数値ラベル。 */
export const VALUE_LABEL = {
  fontSize: FONT_SIZE.xs,
  /** 点の名前など、値より小さく出す添え字。 */
  captionFontSize: FONT_SIZE.xxs,
  /** ラベルと図形の距離。 */
  offset: SPACE.md,
} as const;

/** 凡例。 */
export const LEGEND = {
  fontSize: FONT_SIZE.sm,
  /** グラフ本体との距離。 */
  paddingTop: SPACE.md,
} as const;

/** グラフ枠の内側の余白。グラフごとに軸ラベルの出方が違うので分けて持つ。 */
export const CHART_MARGIN = {
  /** 横棒グラフ。右端に値ラベルと単位を出すので右を広く取る。 */
  bar: { top: SPACE.xs, right: 56, bottom: SPACE.xs, left: SPACE.md },
  /** 系列棒グラフ。下に斜めのカテゴリ名が入る。 */
  series: { top: SPACE.xxl, right: SPACE.xl, bottom: 56, left: SPACE.md },
  /** 折れ線グラフ。上に値ラベルが出る。 */
  line: { top: SPACE.xxl, right: SPACE.xxxl, bottom: SPACE.xl, left: SPACE.md },
  /** 散布図。下に軸タイトルと点の名前が入る。 */
  scatter: { top: SPACE.xxl, right: SPACE.xxxl, bottom: 48, left: SPACE.lg },
} as const;

/** 棒グラフ。 */
export const BAR = {
  /** 棒同士の間隔（カテゴリ幅に対する比率）。 */
  categoryGap: { horizontal: '28%', vertical: '24%', series: '22%' },
  /** 棒の先端の角丸。 */
  radius: RADIUS.sm,
  /** 積み上げの区切りに入れる隙間（枠線ではなく背景色で描く）。 */
  stackGap: BORDER.thick,
} as const;

/** 折れ線グラフ。 */
export const LINE = {
  width: BORDER.thick,
  /** 点が 1 つしかない系列でも見えるよう、点は常に描く。 */
  dotRadius: 3,
  /** ホバー中の点。 */
  activeDotRadius: 5,
  dotStrokeWidth: BORDER.hairline,
} as const;

/** 散布図。 */
export const SCATTER = {
  /** 点の面積（Recharts の ZAxis に渡す値）。 */
  pointArea: 90,
  /** 点の縁取り。背景色で描いて、重なった点を切り分ける。 */
  strokeWidth: BORDER.thick,
} as const;

/** ツールチップ。 */
export const TOOLTIP = {
  fontSize: FONT_SIZE.sm,
  borderWidth: BORDER.hairline,
  radius: RADIUS.md,
  padding: { y: SPACE.sm, x: SPACE.lg },
  /** 行の間隔。 */
  rowGap: SPACE.xxs,
  /** 行の中（ドットと文字）の間隔。 */
  itemGap: SPACE.xs,
  /** 系列色のドット。 */
  swatch: { size: SPACE.xs, radius: RADIUS.xs },
} as const;

/** 目盛り線。実線のまま描く（破線にすると数字と干渉する）。 */
export const GRID_DASH = '0';

/* ------------------------------------------------------------------ *
 * 狭い画面
 *
 * スマートフォンでは、軸のラベル列や枠の余白がグラフ本体を押し潰す。
 * 「狭いときはこの値に差し替える」だけをここに置き、判断は
 * hooks/useChartMetrics.ts が行う。境目は theme/tokens.ts の BREAKPOINT。
 * ------------------------------------------------------------------ */

/** 狭い画面での差し替え値。 */
export const COMPACT = {
  height: { compact: 260, base: 280, tall: 320 },
  /** 横棒グラフのラベル列。名前が長いと折り返さず切れるので、広く取りすぎない。 */
  axisCategoryWidth: 88,
  /** 斜めのカテゴリ名に取る高さ。 */
  axisTickHeight: 56,
  /** 棒 1 本あたりの行の高さ。 */
  barRowHeight: { ranking: 22, breakdown: 26 },
  /** 枠の内側の余白。値ラベルの分だけ右を空ける。 */
  margin: {
    bar: { top: SPACE.xs, right: 32, bottom: SPACE.xs, left: SPACE.xs },
    series: { top: SPACE.lg, right: SPACE.xs, bottom: 48, left: SPACE.xs },
    line: { top: SPACE.lg, right: SPACE.md, bottom: SPACE.md, left: SPACE.xs },
    scatter: { top: SPACE.lg, right: SPACE.md, bottom: 40, left: SPACE.xs },
  },
} as const;

/** グラフ枠の内側の余白。 */
export interface ChartMargin {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

/** 件数に応じて高さを伸ばす横棒グラフの設定。 */
export interface BarRowSetting {
  minHeight: number;
  rowHeight: number;
}

/** 画面の広さに応じたグラフの寸法。コンポーネントはこの形だけを見る。 */
export interface ChartMetrics {
  height: { compact: number; base: number; tall: number };
  axisCategoryWidth: number;
  axisTickHeight: number;
  barRow: { ranking: BarRowSetting; breakdown: BarRowSetting };
  margin: { bar: ChartMargin; series: ChartMargin; line: ChartMargin; scatter: ChartMargin };
}

/** 広さから寸法を決める唯一の入口。 */
export function chartMetrics(compact: boolean): ChartMetrics {
  if (!compact) {
    return {
      height: CHART_HEIGHT,
      axisCategoryWidth: AXIS.categoryWidth,
      axisTickHeight: AXIS.tickHeight,
      barRow: BAR_ROW,
      margin: CHART_MARGIN,
    };
  }
  return {
    height: COMPACT.height,
    axisCategoryWidth: COMPACT.axisCategoryWidth,
    axisTickHeight: COMPACT.axisTickHeight,
    barRow: {
      ranking: { ...BAR_ROW.ranking, rowHeight: COMPACT.barRowHeight.ranking },
      breakdown: { ...BAR_ROW.breakdown, rowHeight: COMPACT.barRowHeight.breakdown },
    },
    margin: COMPACT.margin,
  };
}

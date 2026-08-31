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
 * 隣り合う段が 1〜2px ずつ上がる、ゆるやかなモジュラースケール。
 * 段の差を小さく取っているのは、この画面が「同じくらいの重みの文字」を
 * たくさん並べる情報量の多い画面で、段を大きく開けると見出しだけが浮くため。
 *
 * 本文（base）は 15px。一般的な読み物では 16px 以上が推奨されるが、
 * この画面は表とグラフが主役で、1 画面に入る情報量を優先している
 * （GitHub や Linear のようなデータ密度の高い画面と同じ考え方）。
 * その代わり行の高さ（LINE_HEIGHT.base）と余白（SPACE）を広めに取る。
 *
 * グラフの中の文字（xxs〜sm）は数が多く重なりやすいので、本文より小さい。
 * 全体を大きく／小さくしたいときは、この表だけを書き換える
 * （ページごとの調整は config/skins.ts の fontScale）。
 */
export const FONT_SIZE = {
  /**
   * 図中の添え字（散布図の点の名前など）。
   * 読ませる文には使わない。可読性の下限として扱う。
   */
  xxs: 10,
  /** 補足・データラベル。 */
  xs: 11,
  /** ラベル・凡例・軸。 */
  sm: 12,
  /** 表・小見出し。 */
  md: 13,
  /** 本文。 */
  base: 15,
  /** 節の見出し（グラフ 1 枚ごとの見出し）。 */
  lg: 17,
  /** 画面の見出し。 */
  xl: 20,
  /** 指標の数値。 */
  display: 24,
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

/**
 * 余白（px）。
 *
 * 4px を 1 目盛りとするグリッド。小さい側だけ 2px の半段（sm = 10）を許す
 * （Tailwind の既定の刻みと同じ考え方）。目盛りから外れた値を足さないこと。
 *
 * 「近いものほど近くに置く」（近接の原則）で意味のまとまりを作るので、
 * 段の差ははっきり付ける。1 段違いが見分けられない刻みにしない。
 *
 * `none`（0）の段は置かない。Tailwind は `--spacing-*` の名前を
 * `max-w-*` や `rounded-*` などにも配る。`none` を段にすると
 * `max-w-none`（＝制限しない）が `max-width: 0` になり、要素が消える。
 * 余白を 0 にしたいときは、その余白のクラスを付けないこと。
 */
export const SPACE = {
  /** 文字と文字（ラベルとその値）。 */
  xxs: 4,
  /** ごく近いもの同士（箇条書きの行、凡例の項目）。 */
  xs: 8,
  /** 操作部品の内側・上下。ボタンの高さがここで決まる。 */
  sm: 10,
  /** 入力欄の内側・左右、小さな並びのすき間。 */
  md: 12,
  /** 操作部品の内側・左右、部品どうしのすき間。 */
  lg: 16,
  /** ひとまとまりの中のブロック間。 */
  xl: 24,
  /** まとまりとまとまりの間。 */
  xxl: 32,
  /** 画面の左右の余白。 */
  xxxl: 40,
  /** 節と節の間。ここだけ大きく空けて、節の切れ目を余白で示す。 */
  section: 64,
  /** ページ下端の余白。 */
  page: 96,
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
  /** ログイン画面のフォーム幅。スマートフォンでは画面幅に合わせて縮む。 */
  authFormWidth: 384,
  /** ヘッダーとログイン画面に置くサイトロゴの一辺。 */
  logoSize: 32,
  /** スマートフォン下部ナビの高さ。 */
  mobileNavHeight: 72,
  /** スマートフォンで下部ナビに本文が隠れないためのページ下余白。 */
  mobileNavPagePadding: 'calc(var(--sr-space-page) + var(--sr-layout-mobile-nav-height))',
  /** iOS が入力時に画面を拡大しないためのログイン入力欄の文字サイズ。 */
  authInputFontSize: 16,
  /** 相関図を縮めずに読める最小の幅。これより狭い画面では横スクロールさせる。 */
  mapMinWidth: 720,
  /** 表を縦スクロールさせる高さ。 */
  tableMaxHeight: 520,
  /**
   * 掴んで動かす図（ワールドマップ・相関図）の表示枠の高さ。
   *
   * 図の中を動かせるので、全体が入る必要は無い。画面の縦の半分ほどを占め、
   * 上の見出しと下の説明が同時に見えるところで止める。
   */
  viewportHeight: 640,
  /** 狭い画面での表示枠の高さ。境目は BREAKPOINT.compact。 */
  viewportCompactHeight: 420,
  /** 図に重ねる吹き出しの最小幅。座標が桁変わりしても幅が跳ねないようにする。 */
  tooltipMinWidth: 180,
  /** BlueMap の 3D ビューアを埋め込む高さ。 */
  worldMap3dHeight: 'min(1180px,92dvh)',
  /** 狭い画面での BlueMap の 3D ビューア高さ。 */
  worldMap3dCompactHeight: '90dvh',
  /** BlueMap の 3D ビューアを全画面にしたときの高さ。 */
  worldMap3dFullscreenHeight: 'calc(100dvh - 40px)',
  /** BlueMap の 3D ビューアを埋め込む最小高さ。 */
  worldMap3dMinHeight: 760,
  /**
   * 人物の吹き出しの最大幅。
   *
   * 所属をいくつも持つ人でも 2〜3 行に収まる幅にする。
   * ここを Tailwind の `max-w-xs` で書いてはいけない（下の「規格化」を見ること）。
   */
  personTooltipMaxWidth: 320,
  /**
   * プレイスタイルの多角形レーダーの一辺。
   *
   * この図の中の文字は SVG の座標で描くので、枠を引き伸ばすと文字も一緒に
   * 伸び縮みして大きさが読めなくなる。**表示もこの大きさで止める**こと。
   * 置き場所（列）の最小幅もこの値に合わせる。
   */
  playstyleRadarSize: 260,
  /** アイコンなどの小さな四角。 */
  swatchSize: 12,
  /** 数値入力欄の幅（文字数で決めるので em）。 */
  numberInputWidth: '7em',
  /** 読み物の表のセルの最小幅（文字数で決めるので ch）。狭い画面で 1 文字ずつ折り返さないため。 */
  proseCellMinWidth: '16ch',
} as const;

/**
 * 画面の幅の境目（px）。
 *
 * ここだけが「狭い画面」の定義を持つ。JS 側（hooks/useMediaQuery.ts）は
 * この値からメディアクエリを組み立てる。
 *
 * 注意: CSS のメディアクエリはカスタムプロパティを読めないので、Tailwind の
 * `sm:` `md:` `lg:` は Tailwind 既定の境目（640 / 768 / 1024px）をそのまま使う。
 * `compact` は Tailwind の `sm` と同じ値にしておくこと。
 */
export const BREAKPOINT = {
  /** これ未満はスマートフォン相当として扱う。Tailwind の `sm:` と同じ値。 */
  compact: 640,
  /** これ未満は 2 段組みをやめる。Tailwind の `md:` と同じ値。 */
  narrow: 768,
} as const;

/**
 * アイコン。
 *
 * 図形は一辺 `gridSize` の座標系で描き、表示は `size` に縮める。
 * 線の太さも座標系の値なので、大きさを変えても見た目の太さが揃う。
 */
export const ICON = {
  /** 文字と並べるときの一辺（px）。本文の文字の高さに合わせる。 */
  size: 16,
  /** 図形を描く座標系の一辺。 */
  gridSize: 24,
  /** 線の太さ（座標系の値）。 */
  strokeWidth: 2,
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
    ...flatten('icon', ICON, 'px'),
    ...flatten('effect', EFFECT),
  };
}

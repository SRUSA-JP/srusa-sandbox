/**
 * データビジュアライゼーション用の配色。
 *
 * light / dark それぞれ検証済みのカテゴリ配色（隣接ペアの色覚差 ΔE >= 8、
 * 明度帯・彩度下限をクリア）。系列には必ず「スロット順」で割り当てる。
 * ランキング順で色を付け替えない（色は実体に固定）。
 */
export type ThemeMode = 'light' | 'dark';

/**
 * 画面で使う色の全て。
 *
 * グラフだけでなく、ページ背景・カード・枠線・ボタンの色もここが持つ。
 * Tailwind 側は theme/cssVariables.ts が流し込むカスタムプロパティを
 * 参照するだけで、色の定義を持たない。
 *
 * 並びは「面 → 線 → 文字 → 強調 → 状態 → 系列」の順。
 * どれも実際に使う場所があるものだけを置く（使い道の無い色は作らない）。
 */
export interface VizTheme {
  mode: ThemeMode;

  /* --- 面。奥から手前へ、そして沈む方向 --- */
  /** ページの地の色。いちばん奥。 */
  background: string;
  /** カード・グラフの面。文字色のコントラストはこの面を基準に判定する。 */
  surface: string;
  /** ボタンや入力欄など、面から一段持ち上げるもの。 */
  surfaceRaised: string;
  /** 表の見出し行など、面から一段沈めるもの。 */
  surfaceSunken: string;
  /** 指したときに敷く面（ボタン・タブ・表の行）。 */
  surfaceHover: string;
  /** ツールチップなど、面の上に浮かせるもの。 */
  surfaceOverlay: string;

  /* --- 線 --- */
  /** 枠線・区切り線。 */
  border: string;
  /** 強調したい枠線（浮いているものの輪郭）。 */
  borderStrong: string;
  /** グラフの目盛り線。 */
  grid: string;

  /* --- 文字。3 段とも背景に対して AA を満たす --- */
  /** 本文・見出し。 */
  textPrimary: string;
  /** 補足・ラベル・軸。 */
  textSecondary: string;
  /** 件数や単位など、拾い読みされる添え物。 */
  textTertiary: string;

  /* --- 強調 --- */
  /** 選択状態・強調に使う色。 */
  accent: string;
  /** 指したときの強調色。 */
  accentHover: string;
  /** 強調色を薄く敷いた面（選択中のタブなど）。 */
  accentSubtle: string;

  /* --- 状態 --- */
  /** エラー表示。 */
  danger: string;

  /** カテゴリ系列の色。順番に使う（9 色目は作らず「その他」に畳む）。 */
  categorical: string[];

  /** Minecraft 資産の意味色。 */
  economyAssets: {
    diamond: string;
    emerald: string;
  };
}

/**
 * 明るい配色。
 *
 * 地は少し暖かい灰色に寄せ、面を白にして「紙の上のカード」に見せる。
 * 文字は 3 段とも白地に対して 4.5:1 以上（段の違いは強さの表現であって、
 * コントラスト基準を下げる口実にはしない）。
 */
export const LIGHT_THEME: VizTheme = {
  mode: 'light',
  background: '#fbfbfa',
  surface: '#ffffff',
  surfaceRaised: '#ffffff',
  surfaceSunken: '#f6f6f4',
  surfaceHover: '#f1f1ee',
  surfaceOverlay: '#ffffff',
  border: '#e4e3de',
  borderStrong: '#cbcac3',
  grid: '#e4e3de',
  textPrimary: '#141412',
  textSecondary: '#55554f',
  textTertiary: '#6d6d66',
  accent: '#2a78d6',
  accentHover: '#1f5fae',
  accentSubtle: '#eaf1fb',
  danger: '#c8322f',
  categorical: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
  economyAssets: {
    diamond: '#008fbd',
    emerald: '#168a52',
  },
};

/**
 * 暗い配色。
 *
 * 手前にあるものほど明るくする（影が使えないので、明度が奥行きを表す）。
 * 文字は真っ白にせず、わずかに落として長時間見てもまぶしくないようにする。
 */
export const DARK_THEME: VizTheme = {
  mode: 'dark',
  background: '#131312',
  surface: '#1a1a19',
  surfaceRaised: '#232322',
  surfaceSunken: '#151514',
  surfaceHover: '#2b2b29',
  surfaceOverlay: '#262624',
  border: '#333331',
  borderStrong: '#474743',
  grid: '#333331',
  textPrimary: '#f4f4ef',
  textSecondary: '#c3c2b7',
  textTertiary: '#a3a299',
  accent: '#3987e5',
  accentHover: '#63a1ec',
  accentSubtle: '#182838',
  danger: '#e66767',
  categorical: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
  economyAssets: {
    diamond: '#4cc9f0',
    emerald: '#32c978',
  },
};

export function themeFor(mode: ThemeMode): VizTheme {
  return mode === 'dark' ? DARK_THEME : LIGHT_THEME;
}

/**
 * カテゴリ色の枠数。
 *
 * 同時に見せる系列・分類の上限はこの数で決まる（超えた分は「その他」へ畳む）。
 * 上限を数値で書かず、必ずここを参照する。
 */
export const CATEGORICAL_SLOTS = LIGHT_THEME.categorical.length;

/**
 * 系列キー → 色。並び順ではなくキーの登録順で固定するので、
 * フィルタで系列が減っても残った系列の色は変わらない。
 */
export function colorScale(keys: string[], theme: VizTheme): (key: string) => string {
  const assignment = new Map<string, string>();
  keys.forEach((key, index) => {
    assignment.set(key, theme.categorical[index % theme.categorical.length]);
  });
  return (key) => assignment.get(key) ?? theme.textSecondary;
}

/* ------------------------------------------------------------------ *
 * 色の計算
 *
 * 画面に出す色はここで計算し、コンポーネント側に生の色コードを書かない。
 * 文字色は必ず `readableTextOn` / `ensureContrast` を通してから使う。
 * ------------------------------------------------------------------ */

/** WCAG 2.1 の本文コントラスト比の下限。 */
export const CONTRAST_MIN_TEXT = 4.5;

/** WCAG 2.1 の大きい文字・図形のコントラスト比の下限。 */
export const CONTRAST_MIN_LARGE = 3;

/** どの候補も条件を満たさなかったときの最終手段。ここ以外に白黒を書かない。 */
const ABSOLUTE_TEXT = ['#ffffff', '#000000'];

const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;

type Rgb = [number, number, number];

function parseHex(color: string): Rgb {
  const matched = HEX_PATTERN.exec(color.trim());
  if (!matched) throw new Error(`色コードとして解釈できません: ${color}`);
  const hex =
    matched[1].length === 3
      ? matched[1]
          .split('')
          .map((c) => c + c)
          .join('')
      : matched[1].slice(0, 6);
  return [0, 2, 4].map((i) => Number.parseInt(hex.slice(i, i + 2), 16)) as Rgb;
}

function toHex(rgb: Rgb): string {
  return `#${rgb.map((v) => Math.round(clamp(v, 0, 255)).toString(16).padStart(2, '0')).join('')}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const RGB_PATTERN = /^rgba?\(([^)]+)\)$/i;

/**
 * ブラウザが返す色（`rgb(...)` / `rgba(...)` / `#rrggbb`）を hex に直す。
 *
 * 埋め込み先の地の色を読むときに使う。解釈できない場合と、透明で
 * 「色が無い」場合は null を返し、呼び出し側が既定の配色へ落とす。
 */
export function parseCssColor(value: string): string | null {
  const text = value.trim();
  if (HEX_PATTERN.test(text)) return toHex(parseHex(text));

  const matched = RGB_PATTERN.exec(text);
  if (!matched) return null;
  const parts = matched[1].split(/[,/\s]+/).filter(Boolean).map(Number);
  if (parts.length < 3 || parts.slice(0, 3).some(Number.isNaN)) return null;
  if (parts.length >= 4 && parts[3] === 0) return null;
  return toHex(parts.slice(0, 3) as Rgb);
}

/** WCAG 2.1 の相対輝度（0 = 黒、1 = 白）。 */
export function relativeLuminance(color: string): number {
  const [r, g, b] = parseHex(color).map((channel) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** WCAG 2.1 のコントラスト比（1〜21）。 */
export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** 2 色を線形補間する（t = 0 で a、t = 1 で b）。 */
export function mix(a: string, b: string, t: number): string {
  const from = parseHex(a);
  const to = parseHex(b);
  const ratio = clamp(t, 0, 1);
  return toHex(from.map((v, i) => v + (to[i] - v) * ratio) as Rgb);
}

/** 色に不透明度を付ける（0〜1）。塗りつぶしの薄い重ね色に使う。 */
export function withAlpha(color: string, alpha: number): string {
  const hex = toHex(parseHex(color));
  const a = Math.round(clamp(alpha, 0, 1) * 255)
    .toString(16)
    .padStart(2, '0');
  return `${hex}${a}`;
}

/**
 * 背景に対してコントラスト比を満たすまで、色を明るい側 / 暗い側へ寄せる。
 * 系列色のように「色みは保ちたいが読めないと困る」ものに使う。
 */
export function ensureContrast(color: string, background: string, minRatio = CONTRAST_MIN_TEXT): string {
  if (contrastRatio(color, background) >= minRatio) return color;
  const target = relativeLuminance(background) > 0.5 ? ABSOLUTE_TEXT[1] : ABSOLUTE_TEXT[0];
  for (let t = 0.05; t <= 1; t += 0.05) {
    const candidate = mix(color, target, t);
    if (contrastRatio(candidate, background) >= minRatio) return candidate;
  }
  return target;
}

/**
 * 背景に対して読める文字色を返す。
 * テーマの文字色を優先し、どれも足りなければ白または黒へ落とす。
 */
export function readableTextOn(background: string, theme: VizTheme, minRatio = CONTRAST_MIN_TEXT): string {
  const candidates = [theme.textPrimary, theme.textSecondary, ...ABSOLUTE_TEXT];
  const readable = candidates.find((color) => contrastRatio(color, background) >= minRatio);
  if (readable) return readable;
  return candidates.reduce((best, color) =>
    contrastRatio(color, background) > contrastRatio(best, background) ? color : best,
  );
}

/** グラフ面（軸ラベル・直接ラベル）の文字色。 */
export function chartText(theme: VizTheme, level: 'primary' | 'secondary' = 'secondary'): string {
  const preferred = level === 'primary' ? theme.textPrimary : theme.textSecondary;
  return ensureContrast(preferred, theme.surface, CONTRAST_MIN_TEXT);
}

/** ツールチップの見た目。背景と文字のコントラストはここで担保する。 */
export interface TooltipSurfaceStyle {
  background: string;
  border: string;
  /** 見出し（系列名・カテゴリ名）の色。 */
  titleColor: string;
  /** 本文（数値）の色。 */
  textColor: string;
  /** 系列色を背景に載せても読める形に補正して返す。 */
  seriesColor: (color: string) => string;
}

export function tooltipSurface(theme: VizTheme): TooltipSurfaceStyle {
  /* 面の上に浮くものなので、専用の面と強めの枠線で境界を出す */
  const background = theme.surfaceOverlay;
  return {
    background,
    border: theme.borderStrong,
    titleColor: readableTextOn(background, theme, CONTRAST_MIN_TEXT),
    textColor: readableTextOn(background, theme, CONTRAST_MIN_TEXT),
    seriesColor: (color) => ensureContrast(color, background, CONTRAST_MIN_LARGE),
  };
}

/**
 * 地の色を差し替えて、面の family を組み直す。
 *
 * スキン（config/skins.ts）が地の色を上書きしたときに使う。面ごとに
 * 決め打ちの色を持たせると、地だけ緑に変えたときに表の見出しや
 * ホバーの面だけ元の灰色が残ってしまう。
 *
 * 明暗どちらでも「手前＝明るい / 沈む＝暗い」で揃える。影が使えないので、
 * 奥行きは明度だけで表す。
 */
export function withBackground(theme: VizTheme, background: string): VizTheme {
  const lighter = (amount: number) => mix(background, ABSOLUTE_TEXT[0], amount);
  const darker = (amount: number) => mix(background, ABSOLUTE_TEXT[1], amount);
  const dark = theme.mode === 'dark';
  /** 手前へ持ち上げる方向。どちらの配色でも「手前ほど明るい」。 */
  const raise = lighter;
  /** 目立たせる方向。明るい配色では暗く、暗い配色では明るくすると差が出る。 */
  const emphasize = dark ? lighter : darker;

  return {
    ...theme,
    background,
    /* 地とカードの面は同じにして、記事とグラフを地続きに見せる */
    surface: background,
    surfaceRaised: raise(dark ? 0.06 : 0.5),
    /* 沈める方向は、どちらの配色でも暗い側 */
    surfaceSunken: darker(0.04),
    surfaceHover: emphasize(0.07),
    surfaceOverlay: raise(dark ? 0.08 : 0.6),
  };
}

/** ホバー中のカテゴリを示す薄い塗り。 */
export function cursorFill(theme: VizTheme): string {
  return withAlpha(theme.textPrimary, 0.06);
}

/** 強調表示していない要素の塗り（選択中以外の棒など）。 */
export function mutedFill(theme: VizTheme): string {
  return mix(theme.textSecondary, theme.surface, 0.62);
}

/**
 * バイオームの色。
 *
 * 相関図のグループを「その場所らしい風景」の色で塗り分けるために持つ。
 * 分類ごとの通し番号（categorical）で塗ると、隣り合った囲いが
 * ただの色違いにしか見えない。海・山岳・洞窟のように場所の性格が色に出ると、
 * どのまとまりがどこかを色だけで思い出せる。
 *
 * ここにあるのは基準の色で、実際に描く色は背景に対して
 * `ensureContrast` を通してから使う（明るい配色でも暗い配色でも読めるように）。
 */
export const BIOME_COLORS = {
  ocean: '#1f6fb8',
  coral_reef: '#e0655f',
  windswept_hills: '#6e7f8d',
  lush_caves: '#4a8f3c',
  dripstone_caves: '#9a6b4a',
  deep_dark: '#3b4a5e',
  desert: '#c9a44e',
  plains: '#7cae4b',
  meadow: '#86b04a',
  flower_forest: '#d1568f',
  birch_forest: '#9fbf6a',
  forest: '#3f7a34',
  taiga: '#2f6b5a',
  jungle: '#38a05a',
  savanna: '#b3944a',
  badlands: '#c2643a',
  dark_forest: '#46592f',
  cherry_grove: '#e08cb4',
  the_end: '#7d6bb0',
  stony_shore: '#8a8d90',
} as const;

export type BiomeId = keyof typeof BIOME_COLORS;

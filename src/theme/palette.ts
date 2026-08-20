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
 * CSS 側は theme/cssVariables.ts が流し込むカスタムプロパティを参照するだけで、
 * 色の定義を持たない。
 */
export interface VizTheme {
  mode: ThemeMode;
  /** ページの地の色。 */
  background: string;
  /** カード・グラフの下地。文字色のコントラストはこの面を基準に判定する。 */
  surface: string;
  /** ボタンや入力欄の面。 */
  surfaceRaised: string;
  /** 枠線・区切り線。 */
  border: string;
  textPrimary: string;
  textSecondary: string;
  /** 選択状態・強調に使う色。 */
  accent: string;
  /** エラー表示。 */
  danger: string;
  /** グラフの目盛り線。 */
  grid: string;
  /** カテゴリ系列の色。順番に使う（9 色目は作らず「その他」に畳む）。 */
  categorical: string[];
}

export const LIGHT_THEME: VizTheme = {
  mode: 'light',
  background: '#fcfcfb',
  surface: '#ffffff',
  surfaceRaised: '#ffffff',
  border: '#e6e4de',
  textPrimary: '#0b0b0b',
  textSecondary: '#52514e',
  accent: '#2a78d6',
  danger: '#c8322f',
  grid: '#e6e4de',
  categorical: ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7', '#e34948'],
};

export const DARK_THEME: VizTheme = {
  mode: 'dark',
  background: '#131312',
  surface: '#1a1a19',
  surfaceRaised: '#222221',
  border: '#333331',
  textPrimary: '#ffffff',
  textSecondary: '#c3c2b7',
  accent: '#3987e5',
  danger: '#e66767',
  grid: '#333331',
  categorical: ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'],
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
  /* 面の上にもう一段重ねるので、背景をわずかに持ち上げて境界を出す */
  const background = mix(theme.surface, theme.mode === 'dark' ? ABSOLUTE_TEXT[0] : ABSOLUTE_TEXT[1], 0.04);
  return {
    background,
    border: theme.grid,
    titleColor: readableTextOn(background, theme, CONTRAST_MIN_TEXT),
    textColor: readableTextOn(background, theme, CONTRAST_MIN_TEXT),
    seriesColor: (color) => ensureContrast(color, background, CONTRAST_MIN_LARGE),
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

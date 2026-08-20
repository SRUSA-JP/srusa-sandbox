/**
 * テーマとトークンを CSS カスタムプロパティとして流し込む。
 *
 * Tailwind のユーティリティに実際の色・寸法を届けるための橋渡し。
 * src/styles/index.css の `@theme inline` は、ここで作られた名前だけを
 * Tailwind のトークン（`bg-surface` `p-lg` `text-sm` など）に割り当てる。
 *
 * 色は 2 段階で流し込む。
 *   `--sr-viz-*` : 生の配色（theme/palette.ts の値そのもの）
 *   部品ごとの名前: どの部品に何色を使うかの割り当て（config/colors.ts）
 * Tailwind に割り当てるのは後者だけで、生の配色は直接使わない。
 *
 * 最後に、そのページのスキン（config/skins.ts）による差し替えを重ねる。
 */
import { uiCssVariables } from '../config/colors';
import { DEFAULT_SKIN, skinCssVariables, type Skin } from '../config/skins';
import { CONTRAST_MIN_TEXT, readableTextOn, type VizTheme } from './palette';
import { cssVar, tokenCssVariables } from './tokens';

/** テーマの色を CSS カスタムプロパティ名に対応させる。 */
export function themeCssVariables(theme: VizTheme): Record<string, string> {
  const variables: Record<string, string> = {
    [cssVar('viz-background')]: theme.background,
    [cssVar('viz-surface')]: theme.surface,
    [cssVar('viz-surface-raised')]: theme.surfaceRaised,
    [cssVar('viz-border')]: theme.border,
    [cssVar('viz-text-primary')]: theme.textPrimary,
    [cssVar('viz-text-secondary')]: theme.textSecondary,
    [cssVar('viz-accent')]: theme.accent,
    [cssVar('viz-danger')]: theme.danger,
    [cssVar('viz-grid')]: theme.grid,
    /* 強調色の上に載る文字。コントラストを満たす色を計算して渡す */
    [cssVar('viz-on-accent')]: readableTextOn(theme.accent, theme, CONTRAST_MIN_TEXT),
  };
  theme.categorical.forEach((color, index) => {
    variables[cssVar(`viz-categorical-${index + 1}`)] = color;
  });
  return variables;
}

/**
 * スキンが指定する書体を読み込む。
 *
 * 同じ読み込み先を二重に足さない。読み込めない環境では、書体の指定に
 * 並べた代替の書体が使われる。
 */
function loadSkinFont(skin: Skin): void {
  const url = skin.font.url;
  if (!url || typeof document === 'undefined') return;
  if (document.querySelector(`link[href="${url}"]`)) return;

  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = url;
  document.head.appendChild(link);
}

/**
 * 文書にテーマ・トークン・スキンを適用する。
 *
 * `color-scheme` も合わせて設定し、スクロールバーやフォーム部品の
 * 既定の見た目をテーマに追随させる。スキンの名前は `data-skin` として
 * 立てるので、CSS 側からも見た目を切り替えられる。
 */
export function applyDesignTokens(
  theme: VizTheme,
  skin: Skin = DEFAULT_SKIN,
  root: HTMLElement | null = document.documentElement,
): void {
  if (!root) return;
  loadSkinFont(skin);

  const variables = {
    ...tokenCssVariables(),
    ...themeCssVariables(theme),
    ...uiCssVariables(theme),
    ...skinCssVariables(skin),
  };
  for (const [name, value] of Object.entries(variables)) {
    root.style.setProperty(name, value);
  }
  root.style.colorScheme = theme.mode;
  root.dataset.skin = skin.id;
}

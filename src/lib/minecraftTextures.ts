import { withAlpha, type VizTheme } from '../theme/palette';

/** Minecraft 風のピクセル質感を CSS だけで作る。公式テクスチャは同梱しない。 */
export function stoneTexture(theme: VizTheme): Record<string, string> {
  return {
    backgroundColor: theme.surfaceSunken,
    backgroundImage: [
      `linear-gradient(90deg, ${withAlpha(theme.borderStrong, 0.28)} 1px, transparent 1px)`,
      `linear-gradient(${withAlpha(theme.borderStrong, 0.22)} 1px, transparent 1px)`,
      `linear-gradient(135deg, ${withAlpha(theme.surfaceRaised, 0.38)} 0 25%, transparent 25% 50%, ${withAlpha(
        theme.border,
        0.26,
      )} 50% 75%, transparent 75%)`,
    ].join(', '),
    backgroundSize: 'var(--sr-space-xl) var(--sr-space-xl), var(--sr-space-xl) var(--sr-space-xl), var(--sr-space-xxl) var(--sr-space-xxl)',
  };
}

/** Inventory Slot 風に、左上を明るく右下を暗くする。 */
export function slotSurface(theme: VizTheme, tint?: string): Record<string, string> {
  const base = tint ? withAlpha(tint, 0.14) : theme.surface;
  return {
    backgroundColor: base,
    backgroundImage: [
      `linear-gradient(135deg, ${withAlpha(theme.surfaceRaised, 0.72)} 0 12%, transparent 12% 100%)`,
      `linear-gradient(315deg, ${withAlpha(theme.surfaceSunken, 0.9)} 0 12%, transparent 12% 100%)`,
      `linear-gradient(90deg, ${withAlpha(theme.border, 0.28)} 1px, transparent 1px)`,
      `linear-gradient(${withAlpha(theme.border, 0.22)} 1px, transparent 1px)`,
    ].join(', '),
    backgroundSize: '100% 100%, 100% 100%, var(--sr-space-md) var(--sr-space-md), var(--sr-space-md) var(--sr-space-md)',
    boxShadow: `inset var(--sr-border-thick) var(--sr-border-thick) ${withAlpha(
      theme.surfaceRaised,
      0.9,
    )}, inset calc(var(--sr-border-thick) * -1) calc(var(--sr-border-thick) * -1) ${withAlpha(
      theme.surfaceSunken,
      0.95,
    )}`,
  };
}

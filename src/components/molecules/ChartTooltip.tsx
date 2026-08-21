import { TOOLTIP } from '../../config/charts';
import { Swatch } from '../atoms';
import { figureColors } from '../../config/colors';
import { skinnedFontSize, skinnedRadius } from '../../config/skins';
import { FONT_WEIGHT } from '../../theme/tokens';
import type { VizTheme } from '../../theme/palette';

export interface TooltipRow {
  /** 行の見出し（系列名・軸名）。単一系列では省略できる。 */
  label?: string;
  /** 整形済みの値（単位込み）。 */
  value: string;
  /** 系列色。読める色へ補正してから凡例ドットに使う。 */
  color?: string;
}

export interface ChartTooltipProps {
  theme: VizTheme;
  /** 見出し（カテゴリ名・プレイヤー名）。 */
  title?: string;
  rows: TooltipRow[];
}

/**
 * すべてのグラフで共用するツールチップ。
 *
 * 色は config/colors.ts の割り当てだけが決める。ここでも呼び出し側でも色コードを書かない。
 * 寸法は config/charts.ts の TOOLTIP を参照する。
 * Recharts の既定ツールチップは系列色をそのまま文字色に使い、色が無いときは黒に
 * なるため、背景とのコントラストが保証できない。そのため描画ごと差し替えている。
 */
export function ChartTooltip({ theme, title, rows }: ChartTooltipProps) {
  const surface = figureColors(theme).tooltip;

  return (
    <div
      style={{
        background: surface.background,
        border: `${TOOLTIP.borderWidth}px solid ${surface.border}`,
        borderRadius: skinnedRadius(TOOLTIP.radius),
        padding: `${TOOLTIP.padding.y}px ${TOOLTIP.padding.x}px`,
        fontSize: skinnedFontSize(TOOLTIP.fontSize),
        color: surface.textColor,
        display: 'grid',
        gap: TOOLTIP.rowGap,
      }}
    >
      {title && (
        <strong style={{ color: surface.titleColor, fontWeight: FONT_WEIGHT.medium }}>{title}</strong>
      )}
      {rows.map((row, index) => (
        <div
          key={row.label ?? index}
          style={{
            color: surface.textColor,
            display: 'flex',
            alignItems: 'center',
            gap: TOOLTIP.itemGap,
          }}
        >
          {row.color && (
            <Swatch
              size={TOOLTIP.swatch.size}
              radius={skinnedRadius(TOOLTIP.swatch.radius)}
              background={surface.seriesColor(row.color)}
            />
          )}
          {row.label && <span>{row.label}</span>}
          <strong style={{ marginLeft: 'auto', fontWeight: FONT_WEIGHT.medium }}>{row.value}</strong>
        </div>
      ))}
    </div>
  );
}

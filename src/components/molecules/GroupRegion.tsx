import { groupLabel, groupTooltip, regionLabelPlacement, regionPath, regionStyle } from '../../map/display';
import type { RegionPlacement } from '../../map/layout';
import type { VizTheme } from '../../theme/palette';

export interface GroupRegionProps {
  region: RegionPlacement;
  theme: VizTheme;
  highlighted: boolean;
  showTooltip?: boolean;
}

/**
 * グループを囲う領域 1 つ。見た目の決定は display.ts に任せる。
 *
 * 持ち場がそのグループにある人が 1 人もいないときは、囲う場所が無いので
 * 何も描かない（そのグループの繋がりは、所属の線が色で見せる）。
 */
export function GroupRegion({ region, theme, highlighted, showTooltip = true }: GroupRegionProps) {
  if (region.polygon.length === 0) return null;

  const style = regionStyle(region.group, theme, highlighted);
  const label = regionLabelPlacement(region.polygon, style);

  return (
    <g>
      <path
        d={regionPath(region.polygon, style)}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      <text
        x={label.x}
        y={label.y}
        textAnchor={label.anchor}
        fill={style.labelColor}
        fontSize={style.labelFontSize}
        fontWeight={style.labelFontWeight}
      >
        {groupLabel(region.group)}
        {showTooltip && <title>{groupTooltip(region.group, region.memberIds.length)}</title>}
      </text>
    </g>
  );
}

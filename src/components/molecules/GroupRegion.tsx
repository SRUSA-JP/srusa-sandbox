import { roundedPolygonPath } from '../../map/geometry';
import { groupLabel, groupTooltip, regionStyle } from '../../map/display';
import type { RegionPlacement } from '../../map/layout';
import type { VizTheme } from '../../theme/palette';

export interface GroupRegionProps {
  region: RegionPlacement;
  theme: VizTheme;
  highlighted: boolean;
  showTooltip?: boolean;
}

/** グループを囲う領域 1 つ。見た目の決定は display.ts に任せる。 */
export function GroupRegion({ region, theme, highlighted, showTooltip = true }: GroupRegionProps) {
  const style = regionStyle(region.group, theme, highlighted);
  const path = roundedPolygonPath(region.polygon, style.cornerRadius);
  const anchor = region.polygon.reduce((best, point) => (point.y < best.y ? point : best), region.polygon[0]);

  return (
    <g>
      <path
        d={path}
        fill={style.fill}
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        vectorEffect="non-scaling-stroke"
      />
      <text
        x={anchor.x}
        y={anchor.y + style.labelOffsetY}
        textAnchor="middle"
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

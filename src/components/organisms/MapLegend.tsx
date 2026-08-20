import { skinnedFontSize } from '../../config/skins';
import { Swatch } from '../atoms';
import { LEGEND } from '../../map/config';
import { groupLabel, groupTypeLabel, regionStyle } from '../../map/display';
import type { RegionPlacement } from '../../map/layout';
import type { VizTheme } from '../../theme/palette';

export interface MapLegendProps {
  regions: RegionPlacement[];
  theme: VizTheme;
  highlightedGroupId: string;
  onHighlight: (groupId: string) => void;
}

const ITEM =
  'inline-flex cursor-pointer items-center gap-sm rounded-pill border-hairline bg-legend px-lg py-xs';

/** 分類ごとにまとめた凡例。クリックでその領域を強調する。 */
export function MapLegend({ regions, theme, highlightedGroupId, onHighlight }: MapLegendProps) {
  const byType = new Map<string, RegionPlacement[]>();
  for (const region of regions) {
    const list = byType.get(region.group.type) ?? [];
    list.push(region);
    byType.set(region.group.type, list);
  }

  return (
    <div className="grid gap-lg">
      {[...byType.entries()].map(([type, group]) => (
        <div key={type} className="grid gap-sm">
          <span className="font-medium text-muted" style={{ fontSize: skinnedFontSize(LEGEND.fontSize) }}>
            {groupTypeLabel(type)}
          </span>
          <div className="flex flex-wrap gap-sm">
            {group.map((region) => {
              const active = region.group.id === highlightedGroupId;
              const style = regionStyle(region.group, theme, active);
              return (
                <button
                  key={region.group.id}
                  type="button"
                  className={`${ITEM} ${active ? 'border-legend-active' : 'border-legend-line'}`}
                  aria-pressed={active}
                  onClick={() => onHighlight(active ? '' : region.group.id)}
                  style={{ fontSize: skinnedFontSize(LEGEND.fontSize), color: style.labelColor }}
                >
                  <Swatch
                    className="inline-block rounded-sm border-hairline"
                    size={LEGEND.swatchSize}
                    background={style.fill}
                    borderColor={style.stroke}
                  />
                  {groupLabel(region.group)}
                  <span className="text-muted">{region.memberIds.length}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

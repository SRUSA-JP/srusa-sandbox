import { WORLD_MAP_TEXT } from '../../config/messages';
import { worldMapLogRows } from '../../world/display';
import type { WorldMap } from '../../world/schema';

export interface WorldMapLogProps {
  maps: WorldMap[];
  fallbackDate?: string;
  latestDate?: string;
}

/** 作り手向けの地図生成ログ。 */
export function WorldMapLog({ maps, fallbackDate, latestDate }: WorldMapLogProps) {
  return (
    <div className="grid gap-xs">
      {worldMapLogRows(maps, fallbackDate, latestDate).map((row) => (
        <div
          key={row.map.id}
          className="grid gap-xs border-hairline border-divider bg-surface p-sm text-sm sm:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]"
        >
          <p className="truncate font-bold text-heading">{row.label}</p>
          <p className="font-mono text-muted">
            {WORLD_MAP_TEXT.log.dimension} {row.dimension}
          </p>
          <p className="font-mono text-muted">
            {WORLD_MAP_TEXT.log.area} {row.area}
          </p>
          <p className="font-mono text-muted">
            {WORLD_MAP_TEXT.log.bounds} X {row.bounds.minX}..{row.bounds.maxX} / Z {row.bounds.minZ}..{row.bounds.maxZ}
          </p>
          <p className="font-mono text-muted">
            {WORLD_MAP_TEXT.log.pixels} {row.pixels}
          </p>
          <p className="font-mono text-muted">
            {WORLD_MAP_TEXT.log.size} {row.bytes}
          </p>
          <p className="font-mono text-muted">
            {WORLD_MAP_TEXT.log.updated} {row.updatedOn}
          </p>
        </div>
      ))}
    </div>
  );
}

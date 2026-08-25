import { WORLD_LABELS } from '../../config/labels';
import { WORLD_MAP_TEXT } from '../../config/messages';
import {
  coordinateBounds,
  coverage,
  mapDimension,
  mapLabel,
  mapOptionsForDimension,
} from '../../world/display';
import type { WorldMap } from '../../world/schema';
import type { VizTheme } from '../../theme/palette';
import { Picker } from '../atoms';
import { WorldMapViewer } from './WorldMapViewer';

export interface WorldMapGalleryProps {
  maps: WorldMap[];
  selectedMaps: WorldMap[];
  selectedMapIds: Record<string, string>;
  fallbackDate?: string;
  latestDate?: string;
  showTooltips: boolean;
  theme: VizTheme;
  onSelectMap: (dimension: string, mapId: string) => void;
}

/** ワールドごとの地図ビュー。過去版があるワールドだけ、その場で切り替えられる。 */
export function WorldMapGallery({
  maps,
  selectedMaps,
  selectedMapIds,
  fallbackDate,
  latestDate,
  showTooltips,
  theme,
  onSelectMap,
}: WorldMapGalleryProps) {
  return (
    <div className="grid gap-md">
      {selectedMaps.map((map) => {
        const size = coverage(map);
        const dimension = mapDimension(map);
        const mapOptions = mapOptionsForDimension(maps, dimension, fallbackDate, latestDate);

        return (
          <section key={map.id} className="min-w-0">
            <div className="mb-xs flex flex-wrap items-center justify-between gap-sm">
              <h3 className="text-sm font-bold text-heading">{WORLD_LABELS[dimension] ?? dimension}</h3>
              {mapOptions.length > 1 && (
                <Picker
                  label={WORLD_MAP_TEXT.picker.map}
                  value={selectedMapIds[dimension] ?? map.id}
                  options={mapOptions}
                  onChange={(mapId) => onSelectMap(dimension, mapId)}
                />
              )}
            </div>

            <WorldMapViewer map={map} theme={theme} showTooltips={showTooltips} />
            <p className="mt-sm text-xs text-muted">
              {WORLD_MAP_TEXT.summary(
                mapLabel(map, fallbackDate, latestDate),
                size.width,
                size.height,
                map.bytes,
                coordinateBounds(map),
              )}
            </p>
          </section>
        );
      })}
    </div>
  );
}

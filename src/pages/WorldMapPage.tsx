import { useMemo, useState } from 'react';
import { AppLayout, ChartCard, Note, NoticePanel, Picker, ProsePanel, WorldMapViewer } from '../components';
import { APP_TEXT, WORLD_MAP_TEXT } from '../config/messages';
import { WORLD_LABELS } from '../config/labels';
import { WORLD_MAP_CONTENT } from '../content';
import type { VizTheme } from '../theme/palette';
import { coverage } from '../world/display';
import { loadWorldMaps } from '../world/data';
import type { WorldMap } from '../world/schema';

export interface WorldMapPageProps {
  theme: VizTheme;
}

type ViewId = `dimension:${string}` | 'log';

const EMPTY_MAPS: WorldMap[] = [];

function mapDimension(map: WorldMap): string {
  return map.dimension ?? map.id;
}

function mapLabel(map: WorldMap): string {
  return map.label ?? WORLD_LABELS[mapDimension(map)] ?? WORLD_LABELS[map.id] ?? map.id;
}

function logRows(maps: WorldMap[]) {
  return maps.map((map) => {
    const size = coverage(map);
    return {
      map,
      label: mapLabel(map),
      dimension: WORLD_LABELS[mapDimension(map)] ?? mapDimension(map),
      area: `${size.width} x ${size.height}`,
      pixels: `${map.pixels.width} x ${map.pixels.height}`,
      bytes: `${(map.bytes / 1024 / 1024).toFixed(2)} MB`,
      updatedOn: map.updated_on ?? '-',
    };
  });
}

function WorldMapLog({ maps }: { maps: WorldMap[] }) {
  return (
    <div className="grid gap-xs">
      {logRows(maps).map((row) => (
        <div
          key={row.map.id}
          className="grid gap-xs border-hairline border-divider bg-sunken p-sm text-sm sm:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]"
        >
          <p className="truncate font-bold text-heading">{row.label}</p>
          <p className="font-mono text-muted">
            {WORLD_MAP_TEXT.log.dimension} {row.dimension}
          </p>
          <p className="font-mono text-muted">
            {WORLD_MAP_TEXT.log.area} {row.area}
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

/**
 * ワールドマップの画面。
 *
 * 主役は操作できる 2D の地図なので先頭に置き、3D のスクリーンショットと
 * 経緯の説明はその下に回す（DESIGN.md の「主役を先に見せる」）。
 * 3D の出力そのもの（数百 MB）はこのリポジトリに持たない。
 */
export function WorldMapPage({ theme }: WorldMapPageProps) {
  const document = useMemo(() => loadWorldMaps(), []);
  const maps = document?.maps ?? EMPTY_MAPS;
  const dimensions = useMemo(() => [...new Set(maps.map(mapDimension))], [maps]);
  const [selectedView, setSelectedView] = useState<ViewId>(() =>
    dimensions[0] ? `dimension:${dimensions[0]}` : 'log',
  );
  const selectedDimension = selectedView.startsWith('dimension:') ? selectedView.slice('dimension:'.length) : null;
  const dimensionMaps = selectedDimension ? maps.filter((entry) => mapDimension(entry) === selectedDimension) : [];
  const [selectedMapIds, setSelectedMapIds] = useState<Record<string, string>>({});
  const selectedMapId = selectedDimension ? selectedMapIds[selectedDimension] : undefined;
  const map = dimensionMaps.find((entry) => entry.id === selectedMapId) ?? dimensionMaps[0] ?? null;

  const size = map ? coverage(map) : null;
  const selectedMapLabel = map ? mapLabel(map) : '';

  return (
    <AppLayout
      title={WORLD_MAP_CONTENT.title}
      note={
        map && size
          ? `${WORLD_MAP_TEXT.summary(selectedMapLabel, size.width, size.height, map.bytes)} / 更新 ${map.updated_on ?? document?.generated_on ?? '-'}`
          : undefined
      }
      lead={WORLD_MAP_CONTENT.lead}
      footnotes={
        WORLD_MAP_CONTENT.disclaimer ? (
          <NoticePanel title={APP_TEXT.disclaimer}>{WORLD_MAP_CONTENT.disclaimer}</NoticePanel>
        ) : undefined
      }
    >
      <ChartCard
        title={selectedView === 'log' ? WORLD_MAP_TEXT.log.title : WORLD_MAP_TEXT.card.title}
        note={WORLD_MAP_TEXT.card.note}
        actions={
          maps.length > 0 ? (
            <>
              <Picker
                label={WORLD_MAP_TEXT.picker.view}
                value={selectedView}
                options={[
                  ...dimensions.map((dimension) => ({
                    value: `dimension:${dimension}` as ViewId,
                    label: WORLD_LABELS[dimension] ?? dimension,
                  })),
                  { value: 'log' as ViewId, label: WORLD_MAP_TEXT.picker.log },
                ]}
                onChange={setSelectedView}
              />
              {selectedView !== 'log' && dimensionMaps.length > 1 && selectedDimension && (
                <Picker
                  label={WORLD_MAP_TEXT.picker.map}
                  value={map?.id ?? ''}
                  options={dimensionMaps.map((entry) => ({
                    value: entry.id,
                    label: mapLabel(entry),
                  }))}
                  onChange={(value) =>
                    setSelectedMapIds((previous) => ({
                      ...previous,
                      [selectedDimension]: value,
                    }))
                  }
                />
              )}
            </>
          ) : undefined
        }
      >
        {selectedView === 'log' ? (
          <WorldMapLog maps={maps} />
        ) : map ? (
          <WorldMapViewer key={map.id} map={map} theme={theme} />
        ) : (
          <Note tone="error">{WORLD_MAP_TEXT.noData}</Note>
        )}
      </ChartCard>

      <ProsePanel sections={WORLD_MAP_CONTENT.sections} />
    </AppLayout>
  );
}

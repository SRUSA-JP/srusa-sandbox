import { useMemo, useState } from 'react';
import { AppLayout, ChartCard, Note, NoticePanel, Picker, ProsePanel, WorldMapViewer } from '../components';
import { APP_TEXT, WORLD_MAP_TEXT } from '../config/messages';
import { WORLD_LABELS } from '../config/labels';
import { WORLD_MAP_CONTENT } from '../content';
import type { VizTheme } from '../theme/palette';
import { coordinateBounds, coverage } from '../world/display';
import { loadWorldMaps } from '../world/data';
import type { WorldMap } from '../world/schema';

export interface WorldMapPageProps {
  theme: VizTheme;
}

const EMPTY_MAPS: WorldMap[] = [];

function mapDimension(map: WorldMap): string {
  return map.dimension ?? map.id;
}

function mapLabel(map: WorldMap): string {
  return map.label ?? WORLD_LABELS[mapDimension(map)] ?? WORLD_LABELS[map.id] ?? map.id;
}

function mapArea(map: WorldMap): number {
  const size = coverage(map);
  return size.width * size.height;
}

function mapFreshness(map: WorldMap): string {
  return map.updated_on ?? '';
}

function mapDate(map: WorldMap, fallbackDate = ''): string {
  return map.updated_on ?? fallbackDate;
}

function sortMapsForDisplay(maps: WorldMap[]): WorldMap[] {
  return [...maps].sort(
    (a, b) =>
      mapFreshness(b).localeCompare(mapFreshness(a)) ||
      mapArea(b) - mapArea(a) ||
      mapLabel(a).localeCompare(mapLabel(b), 'ja'),
  );
}

function sortMapsForDate(maps: WorldMap[]): WorldMap[] {
  return [...maps].sort(
    (a, b) =>
      mapDimension(a).localeCompare(mapDimension(b), 'ja') ||
      mapArea(b) - mapArea(a) ||
      mapLabel(a).localeCompare(mapLabel(b), 'ja'),
  );
}

function logRows(maps: WorldMap[]) {
  return sortMapsForDisplay(maps).map((map) => {
    const size = coverage(map);
    return {
      map,
      label: mapLabel(map),
      dimension: WORLD_LABELS[mapDimension(map)] ?? mapDimension(map),
      area: `${size.width} x ${size.height}`,
      bounds: coordinateBounds(map),
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
  const mapDates = useMemo(
    () =>
      [...new Set(maps.map((entry) => mapDate(entry, document?.generated_on)).filter(Boolean))].sort((a, b) =>
        b.localeCompare(a),
      ),
    [document?.generated_on, maps],
  );
  const [selectedDate, setSelectedDate] = useState(mapDates[0] ?? '');
  const effectiveDate = mapDates.includes(selectedDate) ? selectedDate : mapDates[0] ?? '';
  const dateMaps = useMemo(
    () => sortMapsForDate(maps.filter((entry) => mapDate(entry, document?.generated_on) === effectiveDate)),
    [document?.generated_on, effectiveDate, maps],
  );

  return (
    <AppLayout
      title={WORLD_MAP_CONTENT.title}
      note={effectiveDate ? WORLD_MAP_TEXT.dateSummary(effectiveDate, dateMaps.length) : undefined}
      lead={WORLD_MAP_CONTENT.lead}
      footnotes={
        WORLD_MAP_CONTENT.disclaimer ? (
          <NoticePanel title={APP_TEXT.disclaimer}>{WORLD_MAP_CONTENT.disclaimer}</NoticePanel>
        ) : undefined
      }
    >
      <ChartCard
        title={WORLD_MAP_TEXT.card.title}
        note={WORLD_MAP_TEXT.card.note}
        actions={
          mapDates.length > 0 ? (
            <Picker
              label={WORLD_MAP_TEXT.picker.map}
              value={effectiveDate}
              options={mapDates.map((date) => ({ value: date, label: date }))}
              onChange={setSelectedDate}
            />
          ) : undefined
        }
      >
        {document?.issues && document.issues.length > 0 && (
          <div className="mb-md">
            <NoticePanel title={APP_TEXT.disclaimer}>{WORLD_MAP_TEXT.partialData(document.issues.length)}</NoticePanel>
          </div>
        )}
        {dateMaps.length > 0 ? (
          <div className="grid gap-md">
            {dateMaps.map((map) => {
              const size = coverage(map);
              return (
                <section key={map.id} className="min-w-0">
                  <h3 className="mb-xs text-sm font-bold text-heading">{mapLabel(map)}</h3>
                  <p className="mb-sm text-xs text-muted">
                    {WORLD_MAP_TEXT.summary(mapLabel(map), size.width, size.height, map.bytes, coordinateBounds(map))}
                  </p>
                  <WorldMapViewer map={map} theme={theme} />
                </section>
              );
            })}
          </div>
        ) : (
          <Note tone="error">{WORLD_MAP_TEXT.noData}</Note>
        )}
      </ChartCard>

      {maps.length > 0 && (
        <ChartCard title={WORLD_MAP_TEXT.log.title}>
          <WorldMapLog maps={maps} />
        </ChartCard>
      )}

      <ProsePanel sections={WORLD_MAP_CONTENT.sections} />
    </AppLayout>
  );
}

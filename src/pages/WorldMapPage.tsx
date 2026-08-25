import { useMemo, useState } from 'react';
import {
  AppLayout,
  ChartCard,
  Note,
  NoticePanel,
  Picker,
  ProsePanel,
  TechnicalDetails,
  WorldMapViewer,
} from '../components';
import { APP_TEXT, MAP_TEXT, TECHNICAL_TEXT, WORLD_MAP_TEXT } from '../config/messages';
import { WORLD_LABELS } from '../config/labels';
import { WORLD_MAP_CONTENT, builderSections, readerSections } from '../content';
import type { VizTheme } from '../theme/palette';
import { coordinateBounds, coverage } from '../world/display';
import { loadWorldMaps } from '../world/data';
import type { WorldMap } from '../world/schema';

export interface WorldMapPageProps {
  theme: VizTheme;
}

const EMPTY_MAPS: WorldMap[] = [];
const ALL_DIMENSIONS = '*';
const LATEST_SELECTION = 'latest';

type TooltipMode = 'on' | 'off';
type DimensionSelection = typeof ALL_DIMENSIONS | string;
type DateSelection = typeof LATEST_SELECTION | string;

const TOOLTIP_OPTIONS: Array<{ value: TooltipMode; label: string }> = [
  { value: 'on', label: MAP_TEXT.picker.tooltipOn },
  { value: 'off', label: MAP_TEXT.picker.tooltipOff },
];

function mapDimension(map: WorldMap): string {
  return map.dimension ?? map.id;
}

function dateLabel(date: string, latestDate = ''): string {
  return latestDate && date === latestDate ? `最新 ${date}` : date;
}

function datePickerLabel(date: string, latestDate = ''): string {
  return latestDate && date === latestDate ? `最新（${date}）` : date;
}

function mapLabel(map: WorldMap, fallbackDate = '', latestDate = ''): string {
  const dimension = mapDimension(map);
  const base = WORLD_LABELS[dimension] ?? WORLD_LABELS[map.id] ?? map.label ?? map.id;
  const date = mapDate(map, fallbackDate);
  return date ? `${base}（${dateLabel(date, latestDate)}）` : base;
}

function mapArea(map: WorldMap): number {
  const size = coverage(map);
  return size.width * size.height;
}

function mapFreshness(map: WorldMap, fallbackDate = ''): string {
  return mapDate(map, fallbackDate);
}

function mapDate(map: WorldMap, fallbackDate = ''): string {
  return map.updated_on ?? fallbackDate;
}

function sortMapsForDisplay(maps: WorldMap[], fallbackDate = '', latestDate = ''): WorldMap[] {
  return [...maps].sort(
    (a, b) =>
      mapFreshness(b, fallbackDate).localeCompare(mapFreshness(a, fallbackDate)) ||
      mapArea(b) - mapArea(a) ||
      mapLabel(a, fallbackDate, latestDate).localeCompare(mapLabel(b, fallbackDate, latestDate), 'ja'),
  );
}

function sortMapsForDate(maps: WorldMap[], fallbackDate = '', latestDate = ''): WorldMap[] {
  return [...maps].sort(
    (a, b) =>
      mapDimension(a).localeCompare(mapDimension(b), 'ja') ||
      mapArea(b) - mapArea(a) ||
      mapLabel(a, fallbackDate, latestDate).localeCompare(mapLabel(b, fallbackDate, latestDate), 'ja'),
  );
}

function latestMapsByDimension(maps: WorldMap[], fallbackDate = '', latestDate = ''): WorldMap[] {
  const byDimension = new Map<string, WorldMap[]>();
  for (const map of maps) {
    const dimension = mapDimension(map);
    const list = byDimension.get(dimension) ?? [];
    list.push(map);
    byDimension.set(dimension, list);
  }

  return [...byDimension.values()]
    .map((entries) => sortMapsForDisplay(entries, fallbackDate, latestDate)[0])
    .filter((map): map is WorldMap => map !== undefined)
    .sort(
      (a, b) =>
        mapDimension(a).localeCompare(mapDimension(b), 'ja') ||
        mapLabel(a, fallbackDate, latestDate).localeCompare(mapLabel(b, fallbackDate, latestDate), 'ja'),
    );
}

function logRows(maps: WorldMap[], fallbackDate = '', latestDate = '') {
  return sortMapsForDisplay(maps, fallbackDate, latestDate).map((map) => {
    const size = coverage(map);
    return {
      map,
      label: mapLabel(map, fallbackDate, latestDate),
      dimension: WORLD_LABELS[mapDimension(map)] ?? mapDimension(map),
      area: `${size.width} x ${size.height}`,
      bounds: coordinateBounds(map),
      pixels: `${map.pixels.width} x ${map.pixels.height}`,
      bytes: `${(map.bytes / 1024 / 1024).toFixed(2)} MB`,
      updatedOn: map.updated_on ?? '-',
    };
  });
}

function WorldMapLog({ maps, fallbackDate, latestDate }: { maps: WorldMap[]; fallbackDate?: string; latestDate?: string }) {
  return (
    <div className="grid gap-xs">
      {logRows(maps, fallbackDate, latestDate).map((row) => (
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

/**
 * ワールドマップの画面。
 *
 * 主役は操作できる 2D の地図なので先頭に置き、3D のスクリーンショットと
 * 経緯の説明はその下に回す（DESIGN.md の「主役を先に見せる」）。
 * 生成ログ（PNG の画素数やファイルの大きさ）は作り手向けなので、
 * ページのいちばん下でたたんでおく。
 * 3D の出力そのもの（数百 MB）はこのリポジトリに持たない。
 */
export function WorldMapPage({ theme }: WorldMapPageProps) {
  const document = useMemo(() => loadWorldMaps(), []);
  const maps = document?.maps ?? EMPTY_MAPS;
  const latestDate = useMemo(
    () =>
      [...new Set(maps.map((entry) => mapDate(entry, document?.generated_on)).filter(Boolean))].sort((a, b) =>
        b.localeCompare(a),
      )[0] ?? '',
    [document?.generated_on, maps],
  );
  const [selectedDimension, setSelectedDimension] = useState<DimensionSelection>(ALL_DIMENSIONS);
  const [selectedDate, setSelectedDate] = useState<DateSelection>(LATEST_SELECTION);
  const [tooltipMode, setTooltipMode] = useState<TooltipMode>('on');
  const dimensionMaps = useMemo(
    () =>
      selectedDimension === ALL_DIMENSIONS
        ? maps
        : maps.filter((entry) => mapDimension(entry) === selectedDimension),
    [maps, selectedDimension],
  );
  const mapDates = useMemo(
    () =>
      [...new Set(dimensionMaps.map((entry) => mapDate(entry, document?.generated_on)).filter(Boolean))].sort((a, b) =>
        b.localeCompare(a),
      ),
    [dimensionMaps, document?.generated_on],
  );
  const effectiveDate = selectedDate === LATEST_SELECTION || mapDates.includes(selectedDate)
    ? selectedDate
    : LATEST_SELECTION;
  const dateMaps = useMemo(
    () => {
      if (effectiveDate === LATEST_SELECTION) {
        return latestMapsByDimension(dimensionMaps, document?.generated_on, latestDate);
      }
      return sortMapsForDate(
        dimensionMaps.filter((entry) => mapDate(entry, document?.generated_on) === effectiveDate),
        document?.generated_on,
        latestDate,
      );
    },
    [dimensionMaps, document?.generated_on, effectiveDate, latestDate],
  );
  const dimensionOptions = useMemo(
    () => [
      { value: ALL_DIMENSIONS, label: WORLD_MAP_TEXT.picker.allDimensions },
      ...[...new Set(maps.map(mapDimension))]
        .sort((a, b) => (WORLD_LABELS[a] ?? a).localeCompare(WORLD_LABELS[b] ?? b, 'ja'))
        .map((dimension) => ({ value: dimension, label: WORLD_LABELS[dimension] ?? dimension })),
    ],
    [maps],
  );
  const dateOptions = useMemo(
    () => [
      { value: LATEST_SELECTION, label: WORLD_MAP_TEXT.picker.latestMaps },
      ...mapDates.map((date) => ({ value: date, label: datePickerLabel(date, latestDate) })),
    ],
    [latestDate, mapDates],
  );
  const note =
    effectiveDate === LATEST_SELECTION
      ? WORLD_MAP_TEXT.latestSummary(dateMaps.length)
      : WORLD_MAP_TEXT.dateSummary(effectiveDate, dateMaps.length);

  return (
    <AppLayout
      title={WORLD_MAP_CONTENT.title}
      note={note}
      lead={WORLD_MAP_CONTENT.lead}
      footnotes={
        WORLD_MAP_CONTENT.disclaimer ? (
          <NoticePanel title={APP_TEXT.disclaimer}>{WORLD_MAP_CONTENT.disclaimer}</NoticePanel>
        ) : undefined
      }
      technical={
        maps.length > 0 ? (
          <TechnicalDetails
            title={TECHNICAL_TEXT.worldMap.title}
            note={TECHNICAL_TEXT.worldMap.note(maps.length)}
          >
            <WorldMapLog maps={maps} fallbackDate={document?.generated_on} latestDate={latestDate} />
            <ProsePanel sections={builderSections(WORLD_MAP_CONTENT.sections)} />
          </TechnicalDetails>
        ) : undefined
      }
    >
      <ChartCard
        title={WORLD_MAP_TEXT.card.title}
        note={WORLD_MAP_TEXT.card.note}
        actions={
          <>
            {dimensionOptions.length > 1 && (
              <Picker
                label={WORLD_MAP_TEXT.picker.dimension}
                value={selectedDimension}
                options={dimensionOptions}
                onChange={setSelectedDimension}
              />
            )}
            {dateOptions.length > 0 && (
              <Picker
                label={WORLD_MAP_TEXT.picker.map}
                value={effectiveDate}
                options={dateOptions}
                onChange={setSelectedDate}
              />
            )}
            <Picker
              label={WORLD_MAP_TEXT.picker.tooltips}
              value={tooltipMode}
              options={TOOLTIP_OPTIONS}
              onChange={setTooltipMode}
            />
          </>
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
                  <h3 className="mb-xs text-sm font-bold text-heading">{mapLabel(map, document?.generated_on, latestDate)}</h3>
                  {/* 地図そのものを先に見せ、寸法や座標の範囲は見終わったあとに読めればよい */}
                  <WorldMapViewer map={map} theme={theme} showTooltips={tooltipMode === 'on'} />
                  <p className="mt-sm text-xs text-muted">
                    {WORLD_MAP_TEXT.summary(
                      mapLabel(map, document?.generated_on, latestDate),
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
        ) : (
          <Note tone="error">{WORLD_MAP_TEXT.noData}</Note>
        )}
      </ChartCard>

      <ProsePanel sections={readerSections(WORLD_MAP_CONTENT.sections)} />
    </AppLayout>
  );
}

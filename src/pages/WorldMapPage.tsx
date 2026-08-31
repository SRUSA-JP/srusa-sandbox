import { useMemo, useState } from 'react';
import {
  AppLayout,
  ChartCard,
  Note,
  NoticePanel,
  Picker,
  ProsePanel,
  TechnicalDetails,
  WorldMap3dViewer,
  WorldMapGallery,
  WorldMapLog,
} from '../components';
import { APP_TEXT, MAP_TEXT, TECHNICAL_TEXT, WORLD_MAP_TEXT } from '../config/messages';
import { WORLD_LABELS } from '../config/labels';
import { WORLD_MAP_CONTENT, builderSections, readerSections } from '../content';
import type { VizTheme } from '../theme/palette';
import {
  latestWorldMapDate,
  mapById,
  mapDate,
  mapDimension,
  mapOptionsForDimension,
  sortDimensions,
  worldMapDates,
} from '../world/display';
import { loadWorldMaps } from '../world/data';
import type { WorldMap } from '../world/schema';

export interface WorldMapPageProps {
  theme: VizTheme;
}

const EMPTY_MAPS: WorldMap[] = [];
const ALL_DIMENSIONS = '*';
const LATEST_MAPS = 'latest';

type TooltipMode = 'on' | 'off';
type DimensionSelection = typeof ALL_DIMENSIONS | string;
type SnapshotSelection = typeof LATEST_MAPS | string;

const TOOLTIP_OPTIONS: Array<{ value: TooltipMode; label: string }> = [
  { value: 'on', label: MAP_TEXT.picker.tooltipOn },
  { value: 'off', label: MAP_TEXT.picker.tooltipOff },
];

/**
 * ワールドマップの画面。
 *
 * 主役はスポーン周辺 3D と操作できる 2D の地図なので、その順に置く。
 * 生成ログ（PNG の画素数やファイルの大きさ）は作り手向けなので、
 * ページのいちばん下でたたんでおく。
 * 3D の出力そのもの（数百 MB）はこのリポジトリに持たない。
 */
export function WorldMapPage({ theme }: WorldMapPageProps) {
  const document = useMemo(() => loadWorldMaps(), []);
  const maps = document?.maps ?? EMPTY_MAPS;
  const latestDate = useMemo(
    () => latestWorldMapDate(maps, document?.generated_on),
    [document?.generated_on, maps],
  );
  const [selectedSnapshot, setSelectedSnapshot] = useState<SnapshotSelection>(LATEST_MAPS);
  const [selectedDimension, setSelectedDimension] = useState<DimensionSelection>(ALL_DIMENSIONS);
  const [selectedMapIds, setSelectedMapIds] = useState<Record<string, string>>({});
  /*
   * 吹き出しは既定で出さない。座標は左下に常に出ているので、
   * 地図の上に重ねる分は「もっと大きく読みたい人」向けの追加にする。
   */
  const [tooltipMode, setTooltipMode] = useState<TooltipMode>('off');
  const snapshotOptions = useMemo(
    () => [
      { value: LATEST_MAPS, label: WORLD_MAP_TEXT.picker.latestMaps },
      ...worldMapDates(maps, document?.generated_on).map((date) => ({ value: date, label: date })),
    ],
    [document?.generated_on, maps],
  );
  const dimensionMaps = useMemo(
    () => {
      const snapshotMaps =
        selectedSnapshot === LATEST_MAPS
          ? maps
          : maps.filter((entry) => mapDate(entry, document?.generated_on) === selectedSnapshot);
      return selectedDimension === ALL_DIMENSIONS
        ? snapshotMaps
        : snapshotMaps.filter((entry) => mapDimension(entry) === selectedDimension);
    },
    [document?.generated_on, maps, selectedDimension, selectedSnapshot],
  );
  const dimensions = useMemo(
    () => sortDimensions([...new Set(dimensionMaps.map(mapDimension))]),
    [dimensionMaps],
  );
  const selectedMaps = useMemo(
    () =>
      dimensions
        .map((dimension) => {
          const options = mapOptionsForDimension(dimensionMaps, dimension, document?.generated_on, latestDate);
          const selected = mapById(dimensionMaps, selectedMapIds[dimension]);
          return selected && mapDimension(selected) === dimension
            ? selected
            : mapById(dimensionMaps, options[0]?.value ?? '');
        })
        .filter((map): map is WorldMap => Boolean(map)),
    [dimensionMaps, dimensions, document?.generated_on, latestDate, selectedMapIds],
  );
  const dimensionOptions = useMemo(
    () => [
      { value: ALL_DIMENSIONS, label: WORLD_MAP_TEXT.picker.allDimensions },
      ...sortDimensions([...new Set(maps.map(mapDimension))]).map((dimension) => ({
        value: dimension,
        label: WORLD_LABELS[dimension] ?? dimension,
      })),
    ],
    [maps],
  );
  const note = WORLD_MAP_TEXT.mapSelectionSummary(selectedMaps.length, dimensionMaps.length);

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
      <ChartCard title={WORLD_MAP_TEXT.threeD.title} note={WORLD_MAP_TEXT.threeD.note}>
        <WorldMap3dViewer src={`${import.meta.env.BASE_URL}bluemap-spawn/index.html#overworld_spawn:0:80:0:1100:0:0.85:0:0:perspective`} />
      </ChartCard>

      <ChartCard
        title={WORLD_MAP_TEXT.card.title}
        note={WORLD_MAP_TEXT.card.note}
        actions={
          <details className="rounded-md border-hairline border-divider bg-sunken">
            <summary className="cursor-pointer px-lg py-xs text-md font-medium text-heading hover:bg-hover">
              {WORLD_MAP_TEXT.picker.mapSettings}
            </summary>
            <div className="flex flex-wrap items-center gap-md border-t-hairline border-divider p-md">
              {dimensionOptions.length > 1 && (
                <Picker
                  label={WORLD_MAP_TEXT.picker.dimension}
                  value={selectedDimension}
                  options={dimensionOptions}
                  onChange={setSelectedDimension}
                />
              )}
              {snapshotOptions.length > 2 && (
                <Picker
                  label={WORLD_MAP_TEXT.picker.snapshot}
                  value={selectedSnapshot}
                  options={snapshotOptions}
                  onChange={setSelectedSnapshot}
                />
              )}
              <Picker
                label={WORLD_MAP_TEXT.picker.tooltips}
                value={tooltipMode}
                options={TOOLTIP_OPTIONS}
                onChange={setTooltipMode}
              />
            </div>
          </details>
        }
      >
        {document?.issues && document.issues.length > 0 && (
          <div className="mb-md">
            <NoticePanel title={APP_TEXT.disclaimer}>{WORLD_MAP_TEXT.partialData(document.issues.length)}</NoticePanel>
          </div>
        )}
        {selectedMaps.length > 0 ? (
          <WorldMapGallery
            maps={dimensionMaps}
            selectedMaps={selectedMaps}
            selectedMapIds={selectedMapIds}
            fallbackDate={document?.generated_on}
            latestDate={latestDate}
            showTooltips={tooltipMode === 'on'}
            theme={theme}
            onSelectMap={(dimension, mapId) => {
              setSelectedMapIds((previous) => ({ ...previous, [dimension]: mapId }));
            }}
          />
        ) : (
          <Note tone="error">{WORLD_MAP_TEXT.noData}</Note>
        )}
      </ChartCard>

      <ProsePanel sections={readerSections(WORLD_MAP_CONTENT.sections)} />
    </AppLayout>
  );
}

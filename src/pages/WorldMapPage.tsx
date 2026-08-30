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
  mapDimension,
  mapOptionsForDimension,
  sortDimensions,
} from '../world/display';
import { loadWorldMaps } from '../world/data';
import type { WorldMap } from '../world/schema';

export interface WorldMapPageProps {
  theme: VizTheme;
}

const EMPTY_MAPS: WorldMap[] = [];
const ALL_DIMENSIONS = '*';

type TooltipMode = 'on' | 'off';
type WorldMapViewMode = '2d' | 'spawn-3d';
type DimensionSelection = typeof ALL_DIMENSIONS | string;

const VIEW_OPTIONS: Array<{ value: WorldMapViewMode; label: string }> = [
  { value: '2d', label: WORLD_MAP_TEXT.picker.view2d },
  { value: 'spawn-3d', label: WORLD_MAP_TEXT.picker.view3d },
];

const TOOLTIP_OPTIONS: Array<{ value: TooltipMode; label: string }> = [
  { value: 'on', label: MAP_TEXT.picker.tooltipOn },
  { value: 'off', label: MAP_TEXT.picker.tooltipOff },
];

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
    () => latestWorldMapDate(maps, document?.generated_on),
    [document?.generated_on, maps],
  );
  const [viewMode, setViewMode] = useState<WorldMapViewMode>('spawn-3d');
  const [selectedDimension, setSelectedDimension] = useState<DimensionSelection>(ALL_DIMENSIONS);
  const [selectedMapIds, setSelectedMapIds] = useState<Record<string, string>>({});
  /*
   * 吹き出しは既定で出さない。座標は左下に常に出ているので、
   * 地図の上に重ねる分は「もっと大きく読みたい人」向けの追加にする。
   */
  const [tooltipMode, setTooltipMode] = useState<TooltipMode>('off');
  const dimensionMaps = useMemo(
    () =>
      selectedDimension === ALL_DIMENSIONS
        ? maps
        : maps.filter((entry) => mapDimension(entry) === selectedDimension),
    [maps, selectedDimension],
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
      <ChartCard
        title={viewMode === '2d' ? WORLD_MAP_TEXT.card.title : WORLD_MAP_TEXT.threeD.title}
        note={viewMode === '2d' ? WORLD_MAP_TEXT.card.note : WORLD_MAP_TEXT.threeD.note}
        actions={
          <>
            <Picker
              label={WORLD_MAP_TEXT.picker.view}
              value={viewMode}
              options={VIEW_OPTIONS}
              onChange={setViewMode}
            />
            {viewMode === '2d' && dimensionOptions.length > 1 && (
              <Picker
                label={WORLD_MAP_TEXT.picker.dimension}
                value={selectedDimension}
                options={dimensionOptions}
                onChange={setSelectedDimension}
              />
            )}
            {viewMode === '2d' && (
              <Picker
                label={WORLD_MAP_TEXT.picker.tooltips}
                value={tooltipMode}
                options={TOOLTIP_OPTIONS}
                onChange={setTooltipMode}
              />
            )}
          </>
        }
      >
        {viewMode === '2d' ? (
          <>
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
          </>
        ) : (
          <WorldMap3dViewer src={`${import.meta.env.BASE_URL}bluemap-spawn/index.html#overworld_spawn:0:80:0:700:0:0.85:0:0:perspective`} />
        )}
      </ChartCard>

      <ProsePanel sections={readerSections(WORLD_MAP_CONTENT.sections)} />
    </AppLayout>
  );
}

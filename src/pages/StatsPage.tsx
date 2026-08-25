import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listDatasets, loadAllDatasets, loadDataset } from '../data/datasets';
import { checkTotals, parseStatsJson } from '../data/parse';
import type { StatsDocument } from '../data/schema';
import {
  AppLayout,
  Button,
  ChartCard,
  DiscoveryBoard,
  EconomyIndexPanel,
  FeaturedItemUseColumns,
  FilterPanel,
  KpiGrid,
  KpiTile,
  MetricScatter,
  MinecraftHero,
  NoticePanel,
  Note,
  Picker,
  PlayerDailyTimeline,
  PlayerStatusGallery,
  ProsePanel,
  RankBarChart,
  SeriesBarChart,
  TrendLineChart,
} from '../components';
import { MINECRAFT_CONTENT } from '../content';
import { APP_TEXT } from '../config/messages';
import {
  BASIS_OPTIONS,
  BREAKDOWNS,
  LIMITS,
  PLAYER_COLUMN,
  SCATTER_POINT_DISPLAY_OPTIONS,
  SERIES_OPTIONS,
  STATS_DEFAULTS,
  STATS_TEXT,
  TREND_SCOPE_OPTIONS,
  type BreakdownId,
  type ScatterPointDisplay,
  type SeriesId,
  type TrendScope,
} from '../config';
import {
  barChartHeight,
  basisLabel,
  basisNote,
  breakdownOption,
  joinNotes,
  keepRatable,
  metricColumnLabel,
  metricOption,
  metricsFor,
  seriesOption,
  unitFor,
} from '../lib/display';
import {
  damageSeries,
  deathCauseRanking,
  filterRows,
  filterSeriesRows,
  itemRanking,
  killRanking,
  metricRange,
  metricTimeline,
  movementStacked,
  playerRows,
  rankBy,
  scatterBy,
  toRateEntries,
  toRateSeries,
  topWithOther,
  totalPlaytimeHours,
  TIMELINE_CATEGORY_KEY,
  type NumericPlayerRowKey,
  type PlayerFilter,
  type RateBasis,
  type Snapshot,
} from '../lib/selectors';
import { playerStatuses, serverDiscoveries, serverInventory } from '../lib/statsExperience';
import { loadPlayerDailyDocument } from '../data/playerDaily';
import { playerPath } from '../data/playerProfiles';
import { downloadJson, type Row } from '../lib/export';
import { formatDecimal, formatHours } from '../lib/format';
import { useChartMetrics } from '../hooks/useChartMetrics';
import type { VizTheme } from '../theme/palette';

export interface StatsPageProps {
  theme: VizTheme;
}

/** Minecraft サーバー統計の画面。 */
export function StatsPage({ theme }: StatsPageProps) {
  const chart = useChartMetrics();
  const datasets = useMemo(() => listDatasets(), []);
  const [datasetId, setDatasetId] = useState(datasets[0]?.id ?? '');
  const [doc, setDoc] = useState<StatsDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  // 全グラフ共通の絞り込み
  const [filterMetric, setFilterMetric] = useState<NumericPlayerRowKey>(STATS_DEFAULTS.filterMetric);
  /** 利用者が動かした範囲。null なら指標の全範囲（＝絞り込みなし）。 */
  const [filterBounds, setFilterBounds] = useState<{ min: number; max: number } | null>(null);

  // 各グラフのパラメータ
  const [rankMetric, setRankMetric] = useState<NumericPlayerRowKey>(STATS_DEFAULTS.rankMetric);
  const [rankBasis, setRankBasis] = useState<RateBasis>(STATS_DEFAULTS.rankBasis);
  const [breakdown, setBreakdown] = useState<BreakdownId>(STATS_DEFAULTS.breakdown);
  const [breakdownPlayer, setBreakdownPlayer] = useState('');
  const [breakdownBasis, setBreakdownBasis] = useState<RateBasis>(STATS_DEFAULTS.breakdownBasis);
  const [seriesId, setSeriesId] = useState<SeriesId>(STATS_DEFAULTS.seriesId);
  const [seriesBasis, setSeriesBasis] = useState<RateBasis>(STATS_DEFAULTS.seriesBasis);
  const [statusBasis, setStatusBasis] = useState<RateBasis>(STATS_DEFAULTS.statusBasis);
  const [statusPlayerName, setStatusPlayerName] = useState('');
  const [scatterX, setScatterX] = useState<NumericPlayerRowKey>(STATS_DEFAULTS.scatterX);
  const [scatterY, setScatterY] = useState<NumericPlayerRowKey>(STATS_DEFAULTS.scatterY);
  const [scatterBasis, setScatterBasis] = useState<RateBasis>(STATS_DEFAULTS.scatterBasis);
  const [scatterPointDisplay, setScatterPointDisplay] = useState<ScatterPointDisplay>(STATS_DEFAULTS.scatterPointDisplay);
  const [trendMetric, setTrendMetric] = useState<NumericPlayerRowKey>(STATS_DEFAULTS.trendMetric);
  const [trendBasis, setTrendBasis] = useState<RateBasis>(STATS_DEFAULTS.trendBasis);
  const [trendScope, setTrendScope] = useState<TrendScope>(STATS_DEFAULTS.trendScope);
  /** 日付ごとの推移に使う全スナップショット。 */
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);

  const changeTrendBasis = useCallback((basis: RateBasis) => {
    setTrendBasis(basis);
    setTrendMetric((metric) => keepRatable(metric, basis));
  }, []);

  /* 1時間あたりに切り替えたとき、換算できない指標を選んだままにしない */
  const changeRankBasis = useCallback((basis: RateBasis) => {
    setRankBasis(basis);
    setRankMetric((metric) => keepRatable(metric, basis));
  }, []);

  const changeScatterBasis = useCallback((basis: RateBasis) => {
    setScatterBasis(basis);
    setScatterX((metric) => keepRatable(metric, basis));
    setScatterY((metric) => keepRatable(metric, basis));
  }, []);

  const openPlayerProfile = useCallback((name: string) => {
    window.location.hash = playerPath(name);
  }, []);

  useEffect(() => {
    if (!datasetId) return;
    let cancelled = false;
    loadDataset(datasetId)
      .then((loaded) => {
        if (cancelled) return;
        setDoc(loaded);
        setSourceLabel(STATS_TEXT.file.dataset(datasetId));
        setError(null);
      })
      .catch((cause: Error) => !cancelled && setError(cause.message));
    return () => {
      cancelled = true;
    };
  }, [datasetId]);

  useEffect(() => {
    let cancelled = false;
    loadAllDatasets()
      .then((loaded) => {
        if (cancelled) return;
        setSnapshots(loaded.map((entry) => ({ label: entry.label, doc: entry.doc })));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const importFile = useCallback(async (file: File) => {
    try {
      const loaded = parseStatsJson(await file.text());
      setDoc(loaded);
      setSourceLabel(STATS_TEXT.importedFile(file.name));
      setBreakdownPlayer('');
      setFilterBounds(null);
      setError(null);
    } catch (cause) {
      setError((cause as Error).message);
    }
  }, []);

  const allRows = useMemo(() => (doc ? playerRows(doc) : []), [doc]);
  const filterRange = useMemo(() => metricRange(allRows, filterMetric), [allRows, filterMetric]);
  /* 中身が同じなら同じ値を返す。毎回作り直すと、これを見ている計算がすべてやり直しになる */
  const filter: PlayerFilter = useMemo(
    () => ({
      metric: filterMetric,
      min: filterBounds?.min ?? filterRange.min,
      max: filterBounds?.max ?? filterRange.max,
    }),
    [filterMetric, filterBounds, filterRange],
  );
  const rows = useMemo(() => filterRows(allRows, filter), [allRows, filter]);
  const playerNames = useMemo(() => rows.map((row) => row.name), [rows]);
  const filtered = rows.length !== allRows.length;
  const mismatches = useMemo(() => (doc ? checkTotals(doc) : []), [doc]);

  /* 指標を変えたら範囲は全範囲に戻す（前の指標の値をそのまま使わない） */
  const changeFilterMetric = useCallback((metric: NumericPlayerRowKey) => {
    setFilterMetric(metric);
    setFilterBounds(null);
  }, []);

  /* 絞り込みで対象外になったプレイヤーを内訳グラフで選んだままにしない */
  const effectivePlayer = playerNames.includes(breakdownPlayer) ? breakdownPlayer : '';

  const kpi = useMemo(
    () => ({
      players: rows.length,
      playtime: rows.reduce((acc, row) => acc + row.playtime_hours, 0),
      distance: rows.reduce((acc, row) => acc + row.distance_km, 0),
      deaths: rows.reduce((acc, row) => acc + row.deaths, 0),
      blocksMined: rows.reduce((acc, row) => acc + row.blocks_mined, 0),
      mobKills: rows.reduce((acc, row) => acc + row.mob_kills, 0),
    }),
    [rows],
  );
  const inventoryRecords = useMemo(() => (doc ? serverInventory(doc) : []), [doc]);
  const discoveries = useMemo(() => (doc ? serverDiscoveries(doc) : []), [doc]);
  const statusCards = useMemo(() => (doc ? playerStatuses(doc, undefined, statusBasis) : []), [doc, statusBasis]);
  const playerDaily = useMemo(() => loadPlayerDailyDocument(), []);

  const rankOption = metricOption(rankMetric);
  const scatterXOption = metricOption(scatterX);
  const scatterYOption = metricOption(scatterY);
  const trendMetricOption = metricOption(trendMetric);
  const currentBreakdown = breakdownOption(breakdown);
  const currentSeries = seriesOption(seriesId);
  const statsDataDate = doc?.generated_on ?? '';
  const trendDataDate = snapshots.length > 0
    ? `${snapshots[0].label} - ${snapshots[snapshots.length - 1].label}`
    : statsDataDate;

  const rankData = useMemo(
    () => rankBy(rows, rankMetric, { basis: rankBasis }),
    [rows, rankMetric, rankBasis],
  );

  /* 内訳は分母が 1 つ（選択中プレイヤー、または全員の合計プレイ時間） */
  const breakdownHours = useMemo(
    () => totalPlaytimeHours(rows, effectivePlayer ? [effectivePlayer] : undefined),
    [rows, effectivePlayer],
  );

  const breakdownData = useMemo(() => {
    if (!doc) return [];
    const options = { players: effectivePlayer ? [effectivePlayer] : playerNames };
    const entries =
      breakdown === 'kills'
        ? killRanking(doc, options)
        : breakdown === 'death_causes'
          ? deathCauseRanking(doc, options)
          : itemRanking(doc, breakdown, options);
    return toRateEntries(topWithOther(entries, LIMITS.breakdownItems), breakdownHours, breakdownBasis);
  }, [doc, breakdown, effectivePlayer, playerNames, breakdownHours, breakdownBasis]);

  const seriesData = useMemo(() => {
    if (!doc) return { series: [], rows: [] };
    const raw = seriesId === 'movement' ? movementStacked(doc) : damageSeries(doc);
    return toRateSeries(filterSeriesRows(raw, playerNames), rows, seriesBasis);
  }, [doc, seriesId, rows, playerNames, seriesBasis]);

  const trendData = useMemo(
    () =>
      metricTimeline(snapshots, trendMetric, {
        players: playerNames,
        basis: trendBasis,
        perPlayer: trendScope === 'per_player',
      }),
    [snapshots, trendMetric, playerNames, trendBasis, trendScope],
  );

  const scatterPoints = useMemo(
    () => scatterBy(rows, scatterX, scatterY, scatterBasis),
    [rows, scatterX, scatterY, scatterBasis],
  );

  return (
    <AppLayout
      title={STATS_TEXT.title}
      note={
        doc
          ? STATS_TEXT.source({ generatedOn: doc.generated_on, players: allRows.length })
          : undefined
      }
      actions={
        <>
          {datasets.length > 1 && (
            <Picker
              label={STATS_TEXT.action.dataset}
              value={datasetId}
              options={datasets.map((dataset) => ({ value: dataset.id, label: dataset.label }))}
              onChange={setDatasetId}
            />
          )}
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void importFile(file);
              event.target.value = '';
            }}
          />
          <Button
            label={STATS_TEXT.action.importJson}
            icon="upload"
            onClick={() => fileInput.current?.click()}
          />
          <Button
            label={STATS_TEXT.action.exportSummary}
            icon="download"
            disabled={!doc}
            onClick={() =>
              doc && downloadJson(STATS_TEXT.file.summary(doc.generated_on), playerRows(doc))
            }
          />
        </>
      }
      messages={
        <>
          {error && <Note tone="error">{STATS_TEXT.error.load(error)}</Note>}
          {mismatches.length > 0 && (
            <Note tone="error">{STATS_TEXT.error.totalsMismatch(mismatches.map((m) => m.field))}</Note>
          )}
        </>
      }
      footnotes={
        MINECRAFT_CONTENT.disclaimer ? (
          <NoticePanel title={APP_TEXT.disclaimer}>{MINECRAFT_CONTENT.disclaimer}</NoticePanel>
        ) : undefined
      }
      footer={
        doc && (
          <>
            <span>
              {STATS_TEXT.footer.dataset({
                version: doc.source.minecraft_version,
                loader: doc.source.loader,
                difficulty: doc.source.difficulty,
                file: sourceLabel,
              })}
            </span>
            <span>
              {STATS_TEXT.footer.source(
                doc.source.path,
                doc.source.retrieved_via,
                doc.source.instance_id,
              )}
            </span>
            <span>{doc.units.playtime}</span>
          </>
        )
      }
    >
        {!doc && !error && datasets.length === 0 && (
          <Note>{STATS_TEXT.empty.noDataset}</Note>
        )}
        {!doc && !error && datasets.length > 0 && <Note>{STATS_TEXT.empty.loading}</Note>}

        {doc && (
          <>
            <MinecraftHero
              text={STATS_TEXT.experience.hero}
              records={inventoryRecords}
              theme={theme}
            />

            <KpiGrid>
              <KpiTile
                label={STATS_TEXT.kpi.players}
                value={STATS_TEXT.kpi.playersValue(kpi.players)}
                sub={filtered ? STATS_TEXT.kpi.playersSub(allRows.length) : undefined}
              />
              <KpiTile label={STATS_TEXT.kpi.playtime} value={formatHours(kpi.playtime)} />
              <KpiTile
                label={STATS_TEXT.kpi.distance}
                value={`${formatDecimal(kpi.distance)}${metricOption('distance_km').unit}`}
              />
              <KpiTile label={STATS_TEXT.kpi.deaths} value={STATS_TEXT.kpi.deathsValue(kpi.deaths)} />
              <KpiTile
                label={STATS_TEXT.kpi.blocksMined}
                value={`${formatDecimal(kpi.blocksMined)}${metricOption('blocks_mined').unit}`}
              />
              <KpiTile
                label={STATS_TEXT.kpi.mobKills}
                value={`${formatDecimal(kpi.mobKills)}${metricOption('mob_kills').unit}`}
              />
            </KpiGrid>

            <EconomyIndexPanel
              doc={doc}
              snapshots={snapshots}
              players={playerNames}
              theme={theme}
            />

            <FeaturedItemUseColumns theme={theme} />

            <DiscoveryBoard
              discoveries={discoveries}
              text={STATS_TEXT.experience.discovery}
              theme={theme}
            />

            <div>
              <PlayerStatusGallery
                players={statusCards}
                text={{
                  ...STATS_TEXT.experience.playstyle,
                  note: joinNotes(
                    STATS_TEXT.experience.playstyle.note,
                    basisNote(statusBasis, STATS_TEXT.basisNote.subject.each),
                  ),
                  achievementTitles: STATS_TEXT.experience.achievement.titles,
                }}
                theme={theme}
                basis={statusBasis}
                onBasisChange={setStatusBasis}
                selectedName={statusPlayerName}
                onSelectedNameChange={setStatusPlayerName}
                profileHref={playerPath}
              />
            </div>

            <PlayerDailyTimeline
              doc={playerDaily}
              text={{
                ...STATS_TEXT.experience.daily,
                skinAlt: STATS_TEXT.experience.playstyle.skinAlt,
              }}
              theme={theme}
              profileHref={playerPath}
            />

            <FilterPanel
              metric={filterMetric}
              onMetricChange={changeFilterMetric}
              min={filter.min}
              max={filter.max}
              onBoundsChange={setFilterBounds}
              onClear={() => setFilterBounds(null)}
              shown={rows.length}
              total={allRows.length}
            />

            <ChartCard
              title={STATS_TEXT.card.ranking.title}
              note={joinNotes(
                basisNote(rankBasis, STATS_TEXT.basisNote.subject.each) || STATS_TEXT.card.ranking.note,
                ` 更新 ${statsDataDate}`,
              )}
              actions={
                <>
                  <Picker
                    label={STATS_TEXT.picker.metric}
                    value={rankMetric}
                    options={metricsFor(rankBasis)}
                    onChange={setRankMetric}
                  />
                  <Picker
                    label={STATS_TEXT.picker.basis}
                    value={rankBasis}
                    options={BASIS_OPTIONS}
                    onChange={changeRankBasis}
                  />
                </>
              }
              tableRows={rankData.map<Row>((entry) => ({
                player: entry.label,
                value: entry.value,
              }))}
              tableColumns={[
                PLAYER_COLUMN,
                { key: 'value', label: metricColumnLabel(rankMetric, rankBasis) },
              ]}
              csvName={STATS_TEXT.file.ranking(rankMetric, rankBasis)}
            >
              {rankData.length > 0 ? (
                <RankBarChart
                  data={rankData}
                  theme={theme}
                  unit={unitFor(rankOption.unit, rankBasis)}
                  height={barChartHeight(rankData.length, chart.barRow.ranking)}
                />
              ) : (
                <Note>{STATS_TEXT.empty.noPlayers}</Note>
              )}
            </ChartCard>

            <ChartCard
              title={STATS_TEXT.card.breakdown.title}
              note={joinNotes(
                STATS_TEXT.card.breakdown.note(LIMITS.breakdownItems),
                currentBreakdown.note,
                breakdownBasis !== 'total' &&
                  STATS_TEXT.card.breakdown.basisHours(
                    basisNote(breakdownBasis, STATS_TEXT.basisNote.subject.target),
                    formatDecimal(breakdownHours),
                  ),
                ` 更新 ${statsDataDate}`,
              )}
              actions={
                <>
                  <Picker
                    label={STATS_TEXT.picker.breakdown}
                    value={breakdown}
                    options={BREAKDOWNS}
                    onChange={setBreakdown}
                  />
                  <Picker
                    label={STATS_TEXT.picker.player}
                    value={effectivePlayer}
                    options={[
                      { value: '', label: STATS_TEXT.picker.allPlayers },
                      ...playerNames.map((name) => ({ value: name, label: name })),
                    ]}
                    onChange={setBreakdownPlayer}
                  />
                  <Picker
                    label={STATS_TEXT.picker.basis}
                    value={breakdownBasis}
                    options={BASIS_OPTIONS}
                    onChange={setBreakdownBasis}
                  />
                </>
              }
              tableRows={breakdownData.map<Row>((entry) => ({
                item: entry.label,
                value: entry.value,
              }))}
              tableColumns={[
                { key: 'item', label: currentBreakdown.label, align: 'left' },
                {
                  key: 'value',
                  label:
                    breakdownBasis === 'total'
                      ? STATS_TEXT.card.breakdown.valueColumn
                      : basisLabel(breakdownBasis),
                },
              ]}
              csvName={STATS_TEXT.file.breakdown(breakdown, breakdownBasis)}
            >
              {breakdownData.length > 0 ? (
                <RankBarChart
                  data={breakdownData}
                  theme={theme}
                  unit={unitFor(currentBreakdown.unit, breakdownBasis)}
                  height={barChartHeight(breakdownData.length, chart.barRow.breakdown)}
                />
              ) : (
                <Note>{STATS_TEXT.empty.noBreakdown}</Note>
              )}
            </ChartCard>

            <ChartCard
              title={STATS_TEXT.card.series.title}
              note={joinNotes(
                currentSeries.note || STATS_TEXT.card.series.note,
                basisNote(seriesBasis, STATS_TEXT.basisNote.subject.each),
                ` 更新 ${statsDataDate}`,
              )}
              actions={
                <>
                  <Picker
                    label={STATS_TEXT.picker.series}
                    value={seriesId}
                    options={SERIES_OPTIONS}
                    onChange={setSeriesId}
                  />
                  <Picker
                    label={STATS_TEXT.picker.basis}
                    value={seriesBasis}
                    options={BASIS_OPTIONS}
                    onChange={setSeriesBasis}
                  />
                </>
              }
              tableRows={seriesData.rows as Row[]}
              tableColumns={[
                { key: 'name', label: PLAYER_COLUMN.label, align: 'left' },
                ...seriesData.series.map((s) => ({ key: s.key, label: s.label })),
              ]}
              csvName={STATS_TEXT.file.series(seriesId, seriesBasis)}
            >
              {seriesData.rows.length > 0 ? (
                <SeriesBarChart
                  data={seriesData}
                  theme={theme}
                  stacked={currentSeries.stacked}
                  unit={unitFor(currentSeries.unit, seriesBasis)}
                />
              ) : (
                <Note>{STATS_TEXT.empty.noPlayers}</Note>
              )}
            </ChartCard>

            <ChartCard
              title={STATS_TEXT.card.trend.title}
              note={joinNotes(
                STATS_TEXT.card.trend.note(snapshots.length),
                snapshots.length < 2 && STATS_TEXT.card.trend.singleSnapshot,
                trendScope === 'per_player' && STATS_TEXT.card.trend.perPlayer(LIMITS.trendPlayers),
                basisNote(trendBasis, STATS_TEXT.basisNote.subject.audience),
                ` 更新 ${trendDataDate}`,
              )}
              actions={
                <>
                  <Picker
                    label={STATS_TEXT.picker.metric}
                    value={trendMetric}
                    options={metricsFor(trendBasis)}
                    onChange={setTrendMetric}
                  />
                  <Picker
                    label={STATS_TEXT.picker.trendScope}
                    value={trendScope}
                    options={TREND_SCOPE_OPTIONS}
                    onChange={setTrendScope}
                  />
                  <Picker
                    label={STATS_TEXT.picker.basis}
                    value={trendBasis}
                    options={BASIS_OPTIONS}
                    onChange={changeTrendBasis}
                  />
                </>
              }
              tableRows={trendData.rows as Row[]}
              tableColumns={[
                { key: TIMELINE_CATEGORY_KEY, label: STATS_TEXT.card.trend.dateColumn, align: 'left' },
                ...trendData.series.map((series) => ({ key: series.key, label: series.label })),
              ]}
              csvName={STATS_TEXT.file.trend(trendMetric, trendBasis)}
            >
              {trendData.rows.length > 0 ? (
                <TrendLineChart
                  data={trendData}
                  theme={theme}
                  categoryKey={TIMELINE_CATEGORY_KEY}
                  unit={unitFor(trendMetricOption.unit, trendBasis)}
                />
              ) : (
                <Note>{STATS_TEXT.empty.noSnapshots}</Note>
              )}
            </ChartCard>

            <ChartCard
              title={STATS_TEXT.card.scatter.title}
              note={
                scatterBasis === 'total'
                  ? joinNotes(STATS_TEXT.card.scatter.note, ` 更新 ${statsDataDate}`)
                  : joinNotes(
                      STATS_TEXT.card.scatter.bothAxes(
                        basisNote(scatterBasis, STATS_TEXT.basisNote.subject.each),
                      ),
                      ` 更新 ${statsDataDate}`,
                    )
              }
              actions={
                <>
                  <Picker
                    label={STATS_TEXT.picker.xAxis}
                    value={scatterX}
                    options={metricsFor(scatterBasis)}
                    onChange={setScatterX}
                  />
                  <Picker
                    label={STATS_TEXT.picker.yAxis}
                    value={scatterY}
                    options={metricsFor(scatterBasis)}
                    onChange={setScatterY}
                  />
                  <Picker
                    label={STATS_TEXT.picker.basis}
                    value={scatterBasis}
                    options={BASIS_OPTIONS}
                    onChange={changeScatterBasis}
                  />
                  <Picker
                    label={STATS_TEXT.picker.pointDisplay}
                    value={scatterPointDisplay}
                    options={SCATTER_POINT_DISPLAY_OPTIONS}
                    onChange={setScatterPointDisplay}
                  />
                </>
              }
              tableRows={scatterPoints.map<Row>((point) => ({
                player: point.name,
                x: point.x,
                y: point.y,
              }))}
              tableColumns={[
                PLAYER_COLUMN,
                { key: 'x', label: metricColumnLabel(scatterX, scatterBasis) },
                { key: 'y', label: metricColumnLabel(scatterY, scatterBasis) },
              ]}
              csvName={STATS_TEXT.file.scatter(scatterX, scatterY, scatterBasis)}
            >
              {scatterPoints.length === 0 && <Note>{STATS_TEXT.empty.noPlayers}</Note>}
              <MetricScatter
                points={scatterPoints}
                theme={theme}
                xLabel={scatterXOption.label}
                yLabel={scatterYOption.label}
                xUnit={unitFor(scatterXOption.unit, scatterBasis)}
                yUnit={unitFor(scatterYOption.unit, scatterBasis)}
                pointDisplay={scatterPointDisplay}
                onPointClick={(point) => openPlayerProfile(point.name)}
              />
            </ChartCard>
          </>
        )}

        <ProsePanel sections={MINECRAFT_CONTENT.sections} />
    </AppLayout>
  );
}

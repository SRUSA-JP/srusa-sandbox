import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { listDatasets, loadAllDatasets, loadDataset } from '../data/datasets';
import { checkTotals, parseStatsJson } from '../data/parse';
import type { StatsDocument } from '../data/schema';
import {
  AppLayout,
  Button,
  ChartCard,
  FilterPanel,
  KpiGrid,
  KpiTile,
  MetricScatter,
  Note,
  Picker,
  ProsePanel,
  RankBarChart,
  SeriesBarChart,
  TrendLineChart,
} from '../components';
import { MINECRAFT_CONTENT } from '../content';
import {
  BASIS_OPTIONS,
  BREAKDOWNS,
  LIMITS,
  PLAYER_COLUMN,
  SERIES_OPTIONS,
  STATS_TEXT,
  TREND_SCOPE_OPTIONS,
  type BreakdownId,
  type SeriesId,
  type TrendScope,
} from '../config';
import {
  basisLabel,
  basisNote,
  breakdownChartHeight,
  breakdownOption,
  joinNotes,
  keepRatable,
  metricColumnLabel,
  metricOption,
  metricsFor,
  rankingChartHeight,
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
import { downloadJson, type Row } from '../lib/export';
import { formatDecimal, formatHours } from '../lib/format';
import type { VizTheme } from '../theme/palette';

export interface StatsPageProps {
  theme: VizTheme;
}

/** Minecraft サーバー統計の画面。 */
export function StatsPage({ theme }: StatsPageProps) {
  const datasets = useMemo(() => listDatasets(), []);
  const [datasetId, setDatasetId] = useState(datasets[0]?.id ?? '');
  const [doc, setDoc] = useState<StatsDocument | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sourceLabel, setSourceLabel] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  // 全グラフ共通の絞り込み
  const [filterMetric, setFilterMetric] = useState<NumericPlayerRowKey>('playtime_hours');
  /** 利用者が動かした範囲。null なら指標の全範囲（＝絞り込みなし）。 */
  const [filterBounds, setFilterBounds] = useState<{ min: number; max: number } | null>(null);

  // 各グラフのパラメータ
  const [rankMetric, setRankMetric] = useState<NumericPlayerRowKey>('playtime_hours');
  const [rankBasis, setRankBasis] = useState<RateBasis>('total');
  const [breakdown, setBreakdown] = useState<BreakdownId>('kills');
  const [breakdownPlayer, setBreakdownPlayer] = useState('');
  const [breakdownBasis, setBreakdownBasis] = useState<RateBasis>('total');
  const [seriesId, setSeriesId] = useState<SeriesId>('movement');
  const [seriesBasis, setSeriesBasis] = useState<RateBasis>('total');
  const [scatterX, setScatterX] = useState<NumericPlayerRowKey>('playtime_hours');
  const [scatterY, setScatterY] = useState<NumericPlayerRowKey>('mob_kills');
  const [scatterBasis, setScatterBasis] = useState<RateBasis>('total');
  const [trendMetric, setTrendMetric] = useState<NumericPlayerRowKey>('playtime_hours');
  const [trendBasis, setTrendBasis] = useState<RateBasis>('total');
  const [trendScope, setTrendScope] = useState<TrendScope>('total');
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
  const filter: PlayerFilter = {
    metric: filterMetric,
    min: filterBounds?.min ?? filterRange.min,
    max: filterBounds?.max ?? filterRange.max,
  };
  const rows = useMemo(() => filterRows(allRows, filter), [allRows, filter.metric, filter.min, filter.max]);
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
    }),
    [rows],
  );

  const rankOption = metricOption(rankMetric);
  const scatterXOption = metricOption(scatterX);
  const scatterYOption = metricOption(scatterY);
  const trendMetricOption = metricOption(trendMetric);
  const currentBreakdown = breakdownOption(breakdown);
  const currentSeries = seriesOption(seriesId);

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
          ? STATS_TEXT.source({
            generatedOn: doc.generated_on,
            version: doc.source.minecraft_version,
            loader: doc.source.loader,
            difficulty: doc.source.difficulty,
            file: sourceLabel,
          })
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
          <Button label={STATS_TEXT.action.importJson} onClick={() => fileInput.current?.click()} />
          <Button
            label={STATS_TEXT.action.exportSummary}
            disabled={!doc}
            onClick={() =>
              doc && downloadJson(STATS_TEXT.file.summary(doc.generated_on), playerRows(doc))
            }
          />
        </>
      }
      messages={
        <>
          {MINECRAFT_CONTENT.disclaimer && <Note tone="error">{MINECRAFT_CONTENT.disclaimer}</Note>}
          {error && <Note tone="error">{STATS_TEXT.error.load(error)}</Note>}
          {mismatches.length > 0 && (
            <Note tone="error">{STATS_TEXT.error.totalsMismatch(mismatches.map((m) => m.field))}</Note>
          )}
        </>
      }
      footer={
        doc && (
          <>
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
        <p className="mb-section max-w-[var(--sr-layout-prose-max-width)] leading-base">
          {MINECRAFT_CONTENT.lead}
        </p>

        {!doc && !error && datasets.length === 0 && (
          <Note>{STATS_TEXT.empty.noDataset}</Note>
        )}
        {!doc && !error && datasets.length > 0 && <Note>{STATS_TEXT.empty.loading}</Note>}

        {doc && (
          <>
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
            </KpiGrid>

            <ChartCard
              title={STATS_TEXT.card.ranking.title}
              note={basisNote(rankBasis, STATS_TEXT.basisNote.subject.each) || STATS_TEXT.card.ranking.note}
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
                  height={rankingChartHeight(rankData.length)}
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
                  height={breakdownChartHeight(breakdownData.length)}
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
                  ? STATS_TEXT.card.scatter.note
                  : STATS_TEXT.card.scatter.bothAxes(
                      basisNote(scatterBasis, STATS_TEXT.basisNote.subject.each),
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
              />
            </ChartCard>
          </>
        )}

        <ProsePanel sections={MINECRAFT_CONTENT.sections} />
    </AppLayout>
  );
}

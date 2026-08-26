import { useMemo, useState } from 'react';
import {
  ECONOMY_DEFAULT_SOURCE,
  ECONOMY_INDEX_BASE,
  ECONOMY_INDEX_NAME,
  ECONOMY_SOURCE_OPTIONS,
  STATS_TEXT,
  type EconomySourceMetric,
} from '../../config';
import {
  economyIndexTimeline,
  economySummary,
  playerEconomyRows,
  TIMELINE_CATEGORY_KEY,
  type Snapshot,
} from '../../lib/selectors';
import { joinNotes } from '../../lib/display';
import { formatDecimal, formatInt } from '../../lib/format';
import { useChartMetrics } from '../../hooks/useChartMetrics';
import type { Row } from '../../lib/export';
import type { StatsDocument } from '../../data/schema';
import { playerInventoryAssetRows, playerInventoryAssetsGeneratedOn } from '../../data/playerInventoryAssets';
import type { VizTheme } from '../../theme/palette';
import { Picker } from '../atoms';
import { KpiTile, SectionHeader } from '../molecules';
import { SECTION } from '../classes';
import { ChartCard } from './ChartCard';
import { EconomyRankingCard, type EconomyRankingMode } from './EconomyRankingCard';
import { KpiGrid } from './KpiGrid';
import { TrendLineChart } from './TrendLineChart';

export interface EconomyIndexPanelProps {
  doc: StatsDocument;
  snapshots: Snapshot[];
  players: string[];
  theme: VizTheme;
}

function sourceNote(source: EconomySourceMetric): string {
  return ECONOMY_SOURCE_OPTIONS.find((option) => option.value === source)?.note ?? '';
}

/** ダイヤ・エメラルドから作る、サーバー内の簡易経済指標。 */
export function EconomyIndexPanel({ doc, snapshots, players, theme }: EconomyIndexPanelProps) {
  const chart = useChartMetrics();
  const [source, setSource] = useState<EconomySourceMetric>(ECONOMY_DEFAULT_SOURCE);
  const [rankingMode, setRankingMode] = useState<EconomyRankingMode>('total');
  const inventoryGeneratedOn = playerInventoryAssetsGeneratedOn();
  const inventoryRows = useMemo(() => playerInventoryAssetRows(players), [players]);
  const summary = useMemo(
    () => economySummary(doc, { players, source, inventoryRows }),
    [doc, players, source, inventoryRows],
  );
  const economyRows = useMemo(
    () => playerEconomyRows(doc, { players, source, inventoryRows }),
    [doc, players, source, inventoryRows],
  );
  const trend = useMemo(
    () =>
      economyIndexTimeline(snapshots, {
        players,
        source,
        inventoryRows,
        inventoryLabel: inventoryGeneratedOn.slice(0, 10),
      }),
    [snapshots, players, source, inventoryRows, inventoryGeneratedOn],
  );
  const latestIndex = Number(trend.rows[trend.rows.length - 1]?.index ?? 0);
  const diamond = summary.assets.find((asset) => asset.id === 'diamond')?.value ?? 0;
  const emerald = summary.assets.find((asset) => asset.id === 'emerald')?.value ?? 0;
  const dataDate = source === 'inventory' ? inventoryGeneratedOn.slice(0, 10) : doc.generated_on;
  const updatedNote = ` 更新 ${dataDate}`;

  return (
    <section className={SECTION}>
      <SectionHeader
        title={ECONOMY_INDEX_NAME}
        note={joinNotes(STATS_TEXT.card.economy.note, sourceNote(source), updatedNote)}
        actions={
          <Picker
            label={STATS_TEXT.card.economy.source}
            value={source}
            options={ECONOMY_SOURCE_OPTIONS}
            onChange={setSource}
          />
        }
      />

      <KpiGrid>
        <KpiTile
          label={STATS_TEXT.card.economy.total}
          value={`${formatInt(summary.total)} pt`}
          sub={`${STATS_TEXT.card.economy.diamond} ${formatInt(diamond)} / ${STATS_TEXT.card.economy.emerald} ${formatInt(emerald)}`}
        />
        <KpiTile
          label={STATS_TEXT.card.economy.rate}
          value={summary.rate === null ? STATS_TEXT.card.economy.noRate : STATS_TEXT.card.economy.rateValue(formatDecimal(summary.rate))}
          sub={STATS_TEXT.card.economy.rateNote}
        />
        <KpiTile
          label={STATS_TEXT.card.economy.index}
          value={formatDecimal(latestIndex)}
          sub={STATS_TEXT.card.economy.base(ECONOMY_INDEX_BASE)}
        />
      </KpiGrid>

      <EconomyRankingCard
        rows={economyRows}
        mode={rankingMode}
        onModeChange={setRankingMode}
        theme={theme}
        note={updatedNote}
      />

      <ChartCard
        title={STATS_TEXT.card.economy.trend}
        note={joinNotes(STATS_TEXT.card.economy.trendNote, updatedNote)}
        tableRows={trend.rows.map<Row>((row) => ({
          date: String(row[TIMELINE_CATEGORY_KEY] ?? ''),
          index: Number(row.index ?? 0),
        }))}
        tableColumns={[
          { key: 'date', label: STATS_TEXT.card.economy.trendColumn, align: 'left' },
          { key: 'index', label: STATS_TEXT.card.economy.index },
        ]}
        csvName={STATS_TEXT.file.economyIndex(source)}
      >
        <TrendLineChart
          data={trend}
          theme={theme}
          categoryKey={TIMELINE_CATEGORY_KEY}
          unit=""
          height={chart.height.base}
          showValueLabels={snapshots.length <= 4}
        />
      </ChartCard>
    </section>
  );
}

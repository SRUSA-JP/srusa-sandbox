import { PLAYER_COLUMN, STATS_TEXT } from '../../config';
import { useChartMetrics } from '../../hooks/useChartMetrics';
import { barChartHeight, joinNotes } from '../../lib/display';
import { formatDecimal, formatHours, formatInt } from '../../lib/format';
import {
  serviceCostChartRows,
  serviceCostSummary,
  type ServiceCostOptions,
} from '../../lib/serviceCost';
import type { PlayerRow } from '../../lib/selectors';
import type { Row } from '../../lib/export';
import type { VizTheme } from '../../theme/palette';
import { Note, NumberField } from '../atoms';
import { KpiTile } from '../molecules';
import { ChartCard } from './ChartCard';
import { KpiGrid } from './KpiGrid';
import { RankBarChart } from './RankBarChart';

export interface ServiceCostPanelProps {
  rows: PlayerRow[];
  options: ServiceCostOptions;
  onOptionsChange: (options: ServiceCostOptions) => void;
  theme: VizTheme;
  note?: string;
}

/** プレイ時間に応じた Minecraft サーバー維持費の試算。 */
export function ServiceCostPanel({ rows, options, onOptionsChange, theme, note }: ServiceCostPanelProps) {
  const chart = useChartMetrics();
  const summary = serviceCostSummary(rows, options);
  const chartRows = serviceCostChartRows(summary.rows);
  const tableRows = summary.rows.map<Row>((row) => ({
    player: row.name,
    playtime_hours: row.playtime_hours,
    share_percent: row.share_percent,
    base_cost_yen: row.base_cost_yen,
    usage_cost_yen: row.usage_cost_yen,
    cost_yen: row.cost_yen,
    yen_per_hour: row.yen_per_hour,
  }));

  return (
    <ChartCard
      title={STATS_TEXT.card.serviceCost.title}
      note={joinNotes(
        STATS_TEXT.card.serviceCost.note,
        STATS_TEXT.card.serviceCost.basis(options.basePercent, options.slope),
        note,
      )}
      actions={
        <>
          <NumberField
            label={STATS_TEXT.card.serviceCost.totalCost}
            ariaLabel={STATS_TEXT.card.serviceCost.totalCostLabel}
            value={options.totalCost}
            onChange={(totalCost) => onOptionsChange({ ...options, totalCost })}
          />
          <NumberField
            label={STATS_TEXT.card.serviceCost.basePercent}
            ariaLabel={STATS_TEXT.card.serviceCost.basePercentLabel}
            value={options.basePercent}
            onChange={(basePercent) => onOptionsChange({ ...options, basePercent })}
          />
          <NumberField
            label={STATS_TEXT.card.serviceCost.slope}
            ariaLabel={STATS_TEXT.card.serviceCost.slopeLabel}
            value={options.slope}
            onChange={(slope) => onOptionsChange({ ...options, slope })}
          />
        </>
      }
      tableRows={tableRows}
      tableColumns={[
        PLAYER_COLUMN,
        { key: 'playtime_hours', label: STATS_TEXT.kpi.playtime },
        { key: 'share_percent', label: STATS_TEXT.card.serviceCost.shareColumn },
        { key: 'base_cost_yen', label: STATS_TEXT.card.serviceCost.baseColumn },
        { key: 'usage_cost_yen', label: STATS_TEXT.card.serviceCost.usageColumn },
        { key: 'cost_yen', label: STATS_TEXT.card.serviceCost.costColumn },
        { key: 'yen_per_hour', label: STATS_TEXT.card.serviceCost.yenPerHourColumn },
      ]}
      csvName={STATS_TEXT.file.serviceCost}
    >
      {summary.rows.length > 0 ? (
        <div className="grid gap-xl">
          <KpiGrid>
            <KpiTile
              compact
              label={STATS_TEXT.card.serviceCost.participants}
              value={`${formatInt(summary.players)} 人`}
              sub={formatHours(summary.totalHours)}
            />
            <KpiTile
              compact
              label={STATS_TEXT.card.serviceCost.baseCost}
              value={`${formatInt(summary.baseCost)}${STATS_TEXT.card.serviceCost.yen}`}
              sub={`${formatInt(options.basePercent)}%`}
            />
            <KpiTile
              compact
              label={STATS_TEXT.card.serviceCost.usageCost}
              value={`${formatInt(summary.usageCost)}${STATS_TEXT.card.serviceCost.yen}`}
              sub={`傾斜 ${formatDecimal(options.slope)}`}
            />
            <KpiTile
              compact
              label={STATS_TEXT.card.serviceCost.averageCost}
              value={`${formatInt(summary.averageCost)}${STATS_TEXT.card.serviceCost.yen}`}
              sub={STATS_TEXT.card.serviceCost.costColumn}
            />
          </KpiGrid>
          <RankBarChart
            data={chartRows}
            theme={theme}
            unit={STATS_TEXT.card.serviceCost.yen}
            height={barChartHeight(chartRows.length, chart.barRow.ranking)}
            showUnitOnAllLabels
          />
        </div>
      ) : (
        <Note>{STATS_TEXT.card.serviceCost.noPlayers}</Note>
      )}
    </ChartCard>
  );
}

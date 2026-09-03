import { useState } from 'react';
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
import { Button, Note, NumberField, Picker } from '../atoms';
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
  const [customPlayer, setCustomPlayer] = useState('');
  const chart = useChartMetrics();
  const summary = serviceCostSummary(rows, options);
  const chartRows = serviceCostChartRows(summary.rows);
  const customPlayerOptions = summary.rows.map((row) => ({ value: row.name, label: row.name }));
  const effectiveCustomPlayer = customPlayerOptions.some((option) => option.value === customPlayer)
    ? customPlayer
    : customPlayerOptions[0]?.value ?? '';
  const selectedCustomRow = summary.rows.find((row) => row.name === effectiveCustomPlayer);
  const customCost = options.customCosts[effectiveCustomPlayer] ?? 0;
  const tableRows = summary.rows.map<Row>((row) => ({
    player: row.name,
    playtime_hours: row.playtime_hours,
    share_percent: row.share_percent,
    custom_cost_yen: row.custom_cost_yen,
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
        STATS_TEXT.card.serviceCost.basis(options.basePercent, options.slope, options.roundingUnit),
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
          <NumberField
            label={STATS_TEXT.card.serviceCost.roundingUnit}
            ariaLabel={STATS_TEXT.card.serviceCost.roundingUnitLabel}
            value={options.roundingUnit}
            onChange={(roundingUnit) => onOptionsChange({ ...options, roundingUnit })}
          />
          {effectiveCustomPlayer && (
            <>
              <Picker
                label={STATS_TEXT.card.serviceCost.customPlayer}
                value={effectiveCustomPlayer}
                options={customPlayerOptions}
                onChange={setCustomPlayer}
              />
              <NumberField
                label={STATS_TEXT.card.serviceCost.customCost}
                ariaLabel={STATS_TEXT.card.serviceCost.customCostLabel(effectiveCustomPlayer)}
                value={customCost}
                onChange={(value) =>
                  onOptionsChange({
                    ...options,
                    customCosts: { ...options.customCosts, [effectiveCustomPlayer]: value },
                  })
                }
              />
              <Button
                label={STATS_TEXT.card.serviceCost.clearCustom}
                icon="reset"
                disabled={!options.customCosts[effectiveCustomPlayer]}
                onClick={() => {
                  const customCosts = { ...options.customCosts };
                  delete customCosts[effectiveCustomPlayer];
                  onOptionsChange({ ...options, customCosts });
                }}
              />
              {selectedCustomRow && (
                <span className="w-full text-sm text-muted sm:w-auto">
                  {STATS_TEXT.card.serviceCost.selectedPlaytime(
                    selectedCustomRow.name,
                    formatHours(selectedCustomRow.playtime_hours),
                  )}
                </span>
              )}
            </>
          )}
        </>
      }
      tableRows={tableRows}
      tableColumns={[
        PLAYER_COLUMN,
        { key: 'playtime_hours', label: STATS_TEXT.kpi.playtime },
        { key: 'share_percent', label: STATS_TEXT.card.serviceCost.shareColumn },
        { key: 'custom_cost_yen', label: STATS_TEXT.card.serviceCost.customColumn },
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
              label={STATS_TEXT.card.serviceCost.customTotal}
              value={`${formatInt(summary.customCost)}${STATS_TEXT.card.serviceCost.yen}`}
              sub={STATS_TEXT.card.serviceCost.customCost}
            />
            <KpiTile
              compact
              label={STATS_TEXT.card.serviceCost.usageCost}
              value={`${formatInt(summary.usageCost)}${STATS_TEXT.card.serviceCost.yen}`}
              sub={`傾斜 ${formatDecimal(options.slope)}`}
            />
            <KpiTile
              compact
              label={STATS_TEXT.card.serviceCost.baseCost}
              value={`${formatInt(summary.baseCost)}${STATS_TEXT.card.serviceCost.yen}`}
              sub={`${formatInt(options.basePercent)}%`}
            />
          </KpiGrid>
          {summary.customLimited && <Note tone="error">{STATS_TEXT.card.serviceCost.customLimited}</Note>}
          <section className="grid gap-sm">
            <h3 className="text-md font-bold text-heading">{STATS_TEXT.card.serviceCost.playerPlaytime}</h3>
            <div className="grid gap-xs sm:grid-cols-2 lg:grid-cols-3">
              {summary.rows.map((row) => (
                <div
                  key={row.name}
                  className="flex min-w-0 items-center justify-between gap-md border-b-hairline border-divider py-xs"
                >
                  <span className="min-w-0 truncate text-md text-ink">{row.name}</span>
                  <span className="shrink-0 font-numeric text-md text-muted">{formatHours(row.playtime_hours)}</span>
                </div>
              ))}
            </div>
          </section>
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

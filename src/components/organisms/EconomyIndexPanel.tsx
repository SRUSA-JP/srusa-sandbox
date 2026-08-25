import { useMemo, useState } from 'react';
import {
  ECONOMY_DEFAULT_SOURCE,
  ECONOMY_INDEX_BASE,
  ECONOMY_INDEX_NAME,
  ECONOMY_SOURCE_OPTIONS,
  STATS_TEXT,
  type EconomySourceMetric,
} from '../../config';
import { figureColors } from '../../config/colors';
import {
  economyIndexTimeline,
  economySummary,
  playerEconomyRows,
  TIMELINE_CATEGORY_KEY,
  type Snapshot,
} from '../../lib/selectors';
import { formatDecimal, formatInt } from '../../lib/format';
import type { StatsDocument } from '../../data/schema';
import type { VizTheme } from '../../theme/palette';
import { Picker } from '../atoms';
import { KpiTile, SectionHeader } from '../molecules';
import { SECTION } from '../classes';
import { RankBarChart } from './RankBarChart';
import { SeriesBarChart } from './SeriesBarChart';
import { TrendLineChart } from './TrendLineChart';

export interface EconomyIndexPanelProps {
  doc: StatsDocument;
  snapshots: Snapshot[];
  players: string[];
  theme: VizTheme;
}

const RANKING_LIMIT = 8;
const RANKING_ROW_HEIGHT = 26;
const RANKING_MIN_HEIGHT = 178;
const TREND_HEIGHT = 190;
type RankingMode = 'total' | 'diamond' | 'emerald';

function sourceNote(source: EconomySourceMetric): string {
  return ECONOMY_SOURCE_OPTIONS.find((option) => option.value === source)?.note ?? '';
}

/** ダイヤ・エメラルドから作る、サーバー内の簡易経済指標。 */
export function EconomyIndexPanel({ doc, snapshots, players, theme }: EconomyIndexPanelProps) {
  const [source, setSource] = useState<EconomySourceMetric>(ECONOMY_DEFAULT_SOURCE);
  const [rankingMode, setRankingMode] = useState<RankingMode>('total');
  const assetColors = useMemo(() => {
    const colors = figureColors(theme);
    return {
      diamond: colors.economyAsset('diamond'),
      emerald: colors.economyAsset('emerald'),
    };
  }, [theme]);
  const summary = useMemo(() => economySummary(doc, { players, source }), [doc, players, source]);
  const economyRows = useMemo(
    () => playerEconomyRows(doc, { players, source }),
    [doc, players, source],
  );
  const ranking = useMemo(
    () => {
      const rows = [...economyRows].sort((a, b) => b.total - a.total).slice(0, RANKING_LIMIT);
      return {
        series: [
          { key: 'diamond', label: STATS_TEXT.card.economy.diamond },
          { key: 'emerald', label: STATS_TEXT.card.economy.emerald },
        ],
        rows: rows.map((row) => ({
          name: row.name,
          diamond: row.diamond,
          emerald: row.emerald,
        })),
      };
    },
    [economyRows],
  );
  const singleRanking = useMemo(
    () =>
      [...economyRows]
        .sort((a, b) => b[rankingMode] - a[rankingMode])
        .slice(0, RANKING_LIMIT)
        .map((row) => ({ key: row.name, label: row.name, value: row[rankingMode] })),
    [economyRows, rankingMode],
  );
  const trend = useMemo(
    () => economyIndexTimeline(snapshots, { players, source }),
    [snapshots, players, source],
  );
  const latestIndex = Number(trend.rows[trend.rows.length - 1]?.index ?? 0);
  const diamond = summary.assets.find((asset) => asset.id === 'diamond')?.value ?? 0;
  const emerald = summary.assets.find((asset) => asset.id === 'emerald')?.value ?? 0;

  return (
    <section className={SECTION}>
      <SectionHeader
        title={ECONOMY_INDEX_NAME}
        note={`${STATS_TEXT.card.economy.note} ${sourceNote(source)}`}
        actions={
          <Picker
            label={STATS_TEXT.card.economy.source}
            value={source}
            options={ECONOMY_SOURCE_OPTIONS}
            onChange={setSource}
          />
        }
      />

      <div className="mb-md grid gap-sm grid-cols-[repeat(auto-fit,minmax(160px,1fr))]">
        <KpiTile
          label={STATS_TEXT.card.economy.total}
          value={`${formatInt(summary.total)} pt`}
          sub={`${STATS_TEXT.card.economy.diamond} ${formatInt(diamond)} / ${STATS_TEXT.card.economy.emerald} ${formatInt(emerald)}`}
          compact
        />
        <KpiTile
          label={STATS_TEXT.card.economy.rate}
          value={summary.rate === null ? STATS_TEXT.card.economy.noRate : STATS_TEXT.card.economy.rateValue(formatDecimal(summary.rate))}
          sub={STATS_TEXT.card.economy.rateNote}
          compact
        />
        <KpiTile
          label={STATS_TEXT.card.economy.index}
          value={formatDecimal(latestIndex)}
          sub={STATS_TEXT.card.economy.base(ECONOMY_INDEX_BASE)}
          compact
        />
      </div>

      <div className="grid gap-md lg:grid-cols-2">
        <div className="min-w-0">
          <div className="mb-xs flex min-w-0 flex-wrap items-center justify-between gap-sm">
            <h3 className="text-sm font-bold text-heading">{STATS_TEXT.card.economy.ranking}</h3>
            <Picker
              label={STATS_TEXT.card.economy.rankingMode}
              value={rankingMode}
              options={[
                { value: 'total', label: STATS_TEXT.card.economy.rankingModes.total },
                { value: 'diamond', label: STATS_TEXT.card.economy.rankingModes.diamond },
                { value: 'emerald', label: STATS_TEXT.card.economy.rankingModes.emerald },
              ]}
              onChange={setRankingMode}
            />
          </div>
          {rankingMode === 'total' ? (
            <SeriesBarChart
              data={ranking}
              theme={theme}
              unit="個"
              stacked
              horizontal
              seriesColors={assetColors}
              height={Math.max(RANKING_MIN_HEIGHT, ranking.rows.length * RANKING_ROW_HEIGHT)}
            />
          ) : (
            <RankBarChart
              data={singleRanking}
              theme={theme}
              color={assetColors[rankingMode]}
              unit="個"
              height={Math.max(RANKING_MIN_HEIGHT, singleRanking.length * RANKING_ROW_HEIGHT)}
            />
          )}
        </div>
        <div className="min-w-0">
          <h3 className="mb-xs text-sm font-bold text-heading">{STATS_TEXT.card.economy.trend}</h3>
          <TrendLineChart
            data={trend}
            theme={theme}
            categoryKey={TIMELINE_CATEGORY_KEY}
            unit=""
            height={TREND_HEIGHT}
            showValueLabels={snapshots.length <= 4}
          />
        </div>
      </div>
    </section>
  );
}

import { useMemo } from 'react';
import { ECONOMY_ASSETS, PLAYER_COLUMN, STATS_TEXT, type EconomyItemCategoryId } from '../../config';
import { figureColors } from '../../config/colors';
import { useChartMetrics } from '../../hooks/useChartMetrics';
import { barChartHeight, joinNotes } from '../../lib/display';
import {
  economyAssetRanking,
  economyCategoryRanking,
  type PlayerEconomyRow,
} from '../../lib/selectors';
import type { Row } from '../../lib/export';
import type { VizTheme } from '../../theme/palette';
import { Note, Picker } from '../atoms';
import { ChartCard } from './ChartCard';
import { SeriesBarChart } from './SeriesBarChart';

/** ランキングの見せ方。合計は資産の種類別、それ以外は 1 資産の分類別に積み上げる。 */
export type EconomyRankingMode = 'total' | (typeof ECONOMY_ASSETS)[number]['id'];

export interface EconomyRankingCardProps {
  /** 対象プレイヤーの資産行。並び替えはこの中で行う。 */
  rows: PlayerEconomyRow[];
  /** 表示中の見せ方。 */
  mode: EconomyRankingMode;
  onModeChange: (mode: EconomyRankingMode) => void;
  theme: VizTheme;
  /** 注記の末尾に足す文言（更新日など）。 */
  note?: string;
}

const MODE_OPTIONS: Array<{ value: EconomyRankingMode; label: string }> = [
  { value: 'total', label: STATS_TEXT.card.economy.rankingModes.total },
  { value: 'diamond', label: STATS_TEXT.card.economy.rankingModes.diamond },
  { value: 'emerald', label: STATS_TEXT.card.economy.rankingModes.emerald },
];

/** 素材そのものではなく、加工して持っている分類。注記の出し分けに使う。 */
const CRAFTED_CATEGORIES: EconomyItemCategoryId[] = ['armor', 'tool'];

function assetLabel(mode: EconomyRankingMode): string {
  return ECONOMY_ASSETS.find((asset) => asset.id === mode)?.label ?? '';
}

/**
 * プレイヤー別の資産ランキング。
 *
 * 合計のときはダイヤとエメラルドを積み上げ、1 資産だけを見るときは
 * 「装備・ツール・原石」のように中身の分類で積み上げる。同じ資産量でも
 * 装備に化けているのか原石のまま持っているのかで意味が違うため。
 */
export function EconomyRankingCard({ rows, mode, onModeChange, theme, note }: EconomyRankingCardProps) {
  const chart = useChartMetrics();
  const data = useMemo(
    () => (mode === 'total' ? economyAssetRanking(rows) : economyCategoryRanking(rows, mode)),
    [rows, mode],
  );
  const seriesColors = useMemo(() => {
    if (mode !== 'total') return undefined;
    const colors = figureColors(theme);
    return Object.fromEntries(
      ECONOMY_ASSETS.map((asset) => [asset.id, colors.economyAsset(asset.id)]),
    );
  }, [mode, theme]);
  /* 注記は実際に出ている分類だけを並べる。エメラルドのように装備が無い資産もあるため。 */
  const categoryNames = data.series.map((series) => series.label).join('・');
  const hasCrafted = data.series.some((series) =>
    CRAFTED_CATEGORIES.includes(series.key as EconomyItemCategoryId),
  );
  const tableRows = useMemo<Row[]>(
    () =>
      data.rows.map((row) => ({
        ...row,
        total: data.series.reduce((sum, series) => sum + Number(row[series.key] ?? 0), 0),
      })),
    [data],
  );

  return (
    <ChartCard
      title={STATS_TEXT.card.economy.ranking}
      note={joinNotes(
        mode === 'total'
          ? STATS_TEXT.card.economy.rankingNote
          : STATS_TEXT.card.economy.categoryNote(assetLabel(mode), categoryNames),
        hasCrafted && STATS_TEXT.card.economy.craftedNote,
        note,
      )}
      actions={
        <Picker
          label={STATS_TEXT.card.economy.rankingMode}
          value={mode}
          options={MODE_OPTIONS}
          onChange={onModeChange}
        />
      }
      tableRows={tableRows}
      tableColumns={[
        { key: 'name', label: PLAYER_COLUMN.label, align: 'left' },
        ...data.series.map((series) => ({ key: series.key, label: series.label })),
        { key: 'total', label: STATS_TEXT.card.economy.totalColumn },
      ]}
      csvName={STATS_TEXT.file.economyRanking(mode)}
    >
      {data.rows.length > 0 && data.series.length > 0 ? (
        <SeriesBarChart
          data={data}
          theme={theme}
          unit={STATS_TEXT.card.economy.unit}
          stacked
          horizontal
          seriesColors={seriesColors}
          height={barChartHeight(data.rows.length, chart.barRow.ranking)}
        />
      ) : (
        <Note>{STATS_TEXT.empty.noPlayers}</Note>
      )}
    </ChartCard>
  );
}

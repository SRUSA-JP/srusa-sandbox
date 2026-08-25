import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AXIS, BAR, GRID_DASH, LEGEND, VALUE_LABEL } from '../../config/charts';
import { useChartMetrics } from '../../hooks/useChartMetrics';
import { figureColors } from '../../config/colors';
import { CHART_TEXT } from '../../config/messages';
import { skinnedFontSize, skinnedRadius } from '../../config/skins';
import type { StackedSeries } from '../../lib/selectors';
import { formatValue, formatWithUnit } from '../../lib/display';
import { formatCompact } from '../../lib/format';
import type { VizTheme } from '../../theme/palette';
import { ChartTooltip } from '../molecules/ChartTooltip';

export interface SeriesBarChartProps {
  data: StackedSeries;
  theme: VizTheme;
  /** 積み上げ（true, 既定）か横並び（false）か。 */
  stacked?: boolean;
  /** カテゴリ軸に使う列。既定は `name`。 */
  categoryKey?: string;
  unit?: string;
  height?: number;
  /** 横棒にする場合は true。 */
  horizontal?: boolean;
  /** 系列キーに意味色がある場合だけ渡す。未指定の系列は登録順の配色を使う。 */
  seriesColors?: Partial<Record<string, string>>;
}

/**
 * 複数系列の棒グラフ（積み上げ / 横並び）。
 *
 * 系列の色は登録順で固定するので、系列を絞っても残りの色は変わらない。
 *
 * 積み上げのときは、セグメントの中に数字を書かない。細い帯に数字が重なって
 * 読めないうえ、色の面の上に載るので文字色も安定しない。積み上げで読み取れる
 * のは「全体の大きさ」と「割合」までにして、正確な値はツールチップに任せる。
 * 横並びのときは棒の上に余白があるので、そのまま数字を出す。
 */
export function SeriesBarChart({
  data,
  theme,
  stacked = true,
  categoryKey = 'name',
  unit = '',
  height,
  horizontal = false,
  seriesColors,
}: SeriesBarChartProps) {
  const metrics = useChartMetrics();
  const colors = figureColors(theme);
  const color = colors.series(data.series.map((s) => s.key));

  return (
    <ResponsiveContainer width="100%" height={height ?? metrics.height.tall}>
      <BarChart
        data={data.rows}
        layout={horizontal ? 'vertical' : 'horizontal'}
        margin={metrics.margin.series}
        barCategoryGap={horizontal ? BAR.categoryGap.horizontal : BAR.categoryGap.series}
      >
        <CartesianGrid
          stroke={colors.grid}
          strokeDasharray={GRID_DASH}
          horizontal={!horizontal}
          vertical={horizontal}
        />
        {horizontal ? (
          <>
            <XAxis
              type="number"
              tickFormatter={formatCompact}
              stroke={colors.grid}
              tick={{ fill: colors.axis, fontSize: skinnedFontSize(AXIS.fontSize) }}
            />
            <YAxis
              type="category"
              dataKey={categoryKey}
              width={metrics.axisCategoryWidth}
              interval={0}
              stroke={colors.grid}
              tick={{ fill: colors.axis, fontSize: skinnedFontSize(AXIS.fontSize) }}
            />
          </>
        ) : (
          <>
            <XAxis
              type="category"
              dataKey={categoryKey}
              stroke={colors.grid}
              tick={{ fill: colors.axis, fontSize: skinnedFontSize(AXIS.fontSize) }}
              interval={0}
              angle={AXIS.tickAngle}
              textAnchor="end"
              height={metrics.axisTickHeight}
            />
            <YAxis
              type="number"
              tickFormatter={formatCompact}
              stroke={colors.grid}
              tick={{ fill: colors.axis, fontSize: skinnedFontSize(AXIS.fontSize) }}
            />
          </>
        )}
        <Tooltip
          cursor={{ fill: colors.cursor }}
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null;
            const rows = payload.map((item) => ({
              label: String(item.name),
              value: formatWithUnit(Number(item.value), unit),
              color: typeof item.color === 'string' ? item.color : undefined,
            }));
            /* 積み上げは中に数字を書かないので、全体の大きさはここで読ませる */
            if (stacked && rows.length > 1) {
              const total = payload.reduce((sum, item) => sum + Number(item.value ?? 0), 0);
              rows.push({
                label: CHART_TEXT.stackTotal,
                value: formatWithUnit(total, unit),
                color: undefined,
              });
            }
            return <ChartTooltip theme={theme} title={String(label)} rows={rows} />;
          }}
        />
        <Legend
          wrapperStyle={{ color: colors.axis, fontSize: skinnedFontSize(LEGEND.fontSize), paddingTop: LEGEND.paddingTop }}
        />
        {data.series.map((series, index) => (
          <Bar
            key={series.key}
            dataKey={series.key}
            name={series.label}
            stackId={stacked ? 'total' : undefined}
            fill={seriesColors?.[series.key] ?? color(series.key)}
            /* 隣接セグメントの間に背景色の隙間を作る（枠線ではなく余白として） */
            stroke={stacked ? colors.separator : undefined}
            strokeWidth={stacked ? BAR.stackGap : 0}
            radius={
              stacked && index === data.series.length - 1
                ? horizontal
                  ? [0, skinnedRadius(BAR.radius), skinnedRadius(BAR.radius), 0]
                  : [skinnedRadius(BAR.radius), skinnedRadius(BAR.radius), 0, 0]
                : undefined
            }
            isAnimationActive={false}
          >
            {/* 積み上げの中には数字を置かない（詳しい値はツールチップで見せる） */}
            {!stacked && (
              <LabelList
                dataKey={series.key}
                position={horizontal ? 'right' : 'top'}
                fill={colors.axis}
                fontSize={skinnedFontSize(VALUE_LABEL.fontSize)}
                formatter={(value) => (Number(value) ? formatValue(Number(value)) : '')}
              />
            )}
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

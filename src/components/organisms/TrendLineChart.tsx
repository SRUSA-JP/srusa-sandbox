import {
  CartesianGrid,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { AXIS, GRID_DASH, LEGEND, LINE, VALUE_LABEL } from '../../config/charts';
import { useChartMetrics } from '../../hooks/useChartMetrics';
import { figureColors } from '../../config/colors';
import { skinnedFontSize } from '../../config/skins';
import type { StackedSeries } from '../../lib/selectors';
import { formatValue, formatWithUnit } from '../../lib/display';
import { formatCompact } from '../../lib/format';
import type { VizTheme } from '../../theme/palette';
import { ChartTooltip } from '../molecules/ChartTooltip';

export interface TrendLineChartProps {
  data: StackedSeries;
  theme: VizTheme;
  /** 横軸に使う列。既定は日付列。 */
  categoryKey?: string;
  unit?: string;
  height?: number;
  /** 点が 1 つしかない系列でも見えるように、点は常に描く。 */
  showValueLabels?: boolean;
}

/** 日付など順序のあるカテゴリを横軸にした折れ線グラフ。 */
export function TrendLineChart({
  data,
  theme,
  categoryKey = 'date',
  unit = '',
  height,
  showValueLabels = true,
}: TrendLineChartProps) {
  const metrics = useChartMetrics();
  const colors = figureColors(theme);
  const color = colors.series(data.series.map((s) => s.key));
  const multiSeries = data.series.length > 1;
  /* 点が多い軸は、日付も値ラベルも全部は出さない（重なって読めなくなる） */
  const dense = data.rows.length > AXIS.denseCategoryCount;

  return (
    <ResponsiveContainer width="100%" height={height ?? metrics.height.base}>
      <LineChart data={data.rows} margin={metrics.margin.line}>
        <CartesianGrid stroke={colors.grid} strokeDasharray={GRID_DASH} vertical={false} />
        <XAxis
          dataKey={categoryKey}
          stroke={colors.grid}
          tick={{ fill: colors.axis, fontSize: skinnedFontSize(AXIS.fontSize) }}
          interval={dense ? 'preserveStartEnd' : 0}
        />
        <YAxis
          tickFormatter={formatCompact}
          stroke={colors.grid}
          tick={{ fill: colors.axis, fontSize: skinnedFontSize(AXIS.fontSize) }}
        />
        <Tooltip
          cursor={{ stroke: colors.grid, fill: colors.cursor }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <ChartTooltip
                theme={theme}
                title={String(label)}
                rows={payload.map((item) => ({
                  label: multiSeries ? String(item.name) : undefined,
                  value: formatWithUnit(Number(item.value), unit),
                  color: typeof item.color === 'string' ? item.color : undefined,
                }))}
              />
            ) : null
          }
        />
        {multiSeries && (
          <Legend
            wrapperStyle={{ color: colors.axis, fontSize: skinnedFontSize(LEGEND.fontSize), paddingTop: LEGEND.paddingTop }}
          />
        )}
        {data.series.map((series) => (
          <Line
            key={series.key}
            type="monotone"
            dataKey={series.key}
            name={series.label}
            stroke={color(series.key)}
            strokeWidth={LINE.width}
            dot={{
              r: LINE.dotRadius,
              fill: color(series.key),
              stroke: colors.separator,
              strokeWidth: LINE.dotStrokeWidth,
            }}
            activeDot={{ r: LINE.activeDotRadius }}
            isAnimationActive={false}
          >
            {showValueLabels && !multiSeries && !dense && (
              <LabelList
                dataKey={series.key}
                position="top"
                offset={VALUE_LABEL.offset}
                fill={colors.axis}
                fontSize={skinnedFontSize(VALUE_LABEL.fontSize)}
                formatter={(value) => formatValue(Number(value))}
              />
            )}
          </Line>
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

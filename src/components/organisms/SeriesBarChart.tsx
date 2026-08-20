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
import {
  AXIS,
  BAR,
  CHART_HEIGHT,
  CHART_MARGIN,
  GRID_DASH,
  LEGEND,
  VALUE_LABEL,
} from '../../config/charts';
import { figureColors } from '../../config/colors';
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
  /**
   * 積み上げ時に値ラベルを出す下限（棒全体の最大値に対する比率）。
   * 細いセグメントに数字が重なるのを防ぐ。
   */
  labelThreshold?: number;
}

/**
 * 複数系列の棒グラフ（積み上げ / 横並び）。
 * 系列の色は登録順で固定するので、系列を絞っても残りの色は変わらない。
 */
export function SeriesBarChart({
  data,
  theme,
  stacked = true,
  categoryKey = 'name',
  unit = '',
  height = CHART_HEIGHT.tall,
  labelThreshold = VALUE_LABEL.minRatio,
}: SeriesBarChartProps) {
  const colors = figureColors(theme);
  const color = colors.series(data.series.map((s) => s.key));

  /* 積み上げの各セグメントに数字を置くので、細すぎる分だけ間引く基準を作る */
  const maxTotal = data.rows.reduce((acc, row) => {
    const total = data.series.reduce((sum, s) => sum + Number(row[s.key] ?? 0), 0);
    return Math.max(acc, total);
  }, 0);
  const minLabelValue = maxTotal * labelThreshold;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data.rows} margin={CHART_MARGIN.series} barCategoryGap={BAR.categoryGap.series}>
        <CartesianGrid stroke={colors.grid} strokeDasharray={GRID_DASH} vertical={false} />
        <XAxis
          dataKey={categoryKey}
          stroke={colors.grid}
          tick={{ fill: colors.axis, fontSize: skinnedFontSize(AXIS.fontSize) }}
          interval={0}
          angle={AXIS.tickAngle}
          textAnchor="end"
          height={AXIS.tickHeight}
        />
        <YAxis
          tickFormatter={formatCompact}
          stroke={colors.grid}
          tick={{ fill: colors.axis, fontSize: skinnedFontSize(AXIS.fontSize) }}
        />
        <Tooltip
          cursor={{ fill: colors.cursor }}
          content={({ active, payload, label }) =>
            active && payload?.length ? (
              <ChartTooltip
                theme={theme}
                title={String(label)}
                rows={payload.map((item) => ({
                  label: String(item.name),
                  value: formatWithUnit(Number(item.value), unit),
                  color: typeof item.color === 'string' ? item.color : undefined,
                }))}
              />
            ) : null
          }
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
            fill={color(series.key)}
            /* 隣接セグメントの間に背景色の隙間を作る（枠線ではなく余白として） */
            stroke={stacked ? colors.separator : undefined}
            strokeWidth={stacked ? BAR.stackGap : 0}
            radius={
              stacked && index === data.series.length - 1
                ? [skinnedRadius(BAR.radius), skinnedRadius(BAR.radius), 0, 0]
                : undefined
            }
            isAnimationActive={false}
          >
            <LabelList
              dataKey={series.key}
              position={stacked ? 'center' : 'top'}
              /* 積み上げは色面の上に載るので、その塗りに対して読める色を都度求める */
              fill={stacked ? colors.labelOn(color(series.key)) : colors.axis}
              fontSize={skinnedFontSize(VALUE_LABEL.fontSize)}
              formatter={(value) => {
                const numeric = Number(value);
                if (!numeric) return '';
                if (stacked && numeric < minLabelValue) return '';
                return formatValue(numeric);
              }}
            />
          </Bar>
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

import {
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
  ZAxis,
} from 'recharts';
import { AXIS, GRID_DASH, SCATTER, VALUE_LABEL } from '../../config/charts';
import { useChartMetrics } from '../../hooks/useChartMetrics';
import { figureColors } from '../../config/colors';
import { skinnedFontSize } from '../../config/skins';
import type { ScatterPoint } from '../../lib/selectors';
import { axisTitle } from '../../lib/display';
import { formatCompact, formatDecimal } from '../../lib/format';
import type { VizTheme } from '../../theme/palette';
import { ChartTooltip } from '../molecules/ChartTooltip';

export interface MetricScatterProps {
  points: ScatterPoint[];
  theme: VizTheme;
  /** 横軸の指標名。 */
  xLabel: string;
  /** 縦軸の指標名。 */
  yLabel: string;
  /** 軸ラベルとツールチップに添える単位（例: ' h'）。 */
  xUnit?: string;
  yUnit?: string;
  /** 点に値ラベルを出すか。点が多くて重なるときは false にする。 */
  showValueLabels?: boolean;
  height?: number;
}

/** 軸の指標を呼び出し側が決める散布図。単一系列なので凡例は不要（軸名が系列名）。 */
export function MetricScatter({
  points,
  theme,
  xLabel,
  yLabel,
  xUnit = '',
  yUnit = '',
  showValueLabels = true,
  height,
}: MetricScatterProps) {
  const metrics = useChartMetrics();
  const colors = figureColors(theme);

  return (
    <ResponsiveContainer width="100%" height={height ?? metrics.height.base}>
      <ScatterChart margin={metrics.margin.scatter}>
        <CartesianGrid stroke={colors.grid} strokeDasharray={GRID_DASH} />
        <XAxis
          type="number"
          dataKey="x"
          name={xLabel}
          stroke={colors.grid}
          tick={{ fill: colors.axis, fontSize: skinnedFontSize(AXIS.fontSize) }}
          tickFormatter={formatCompact}
          label={{
            value: axisTitle(xLabel, xUnit),
            position: 'insideBottom',
            offset: AXIS.titleOffset,
            fill: colors.axis,
            fontSize: skinnedFontSize(AXIS.fontSize),
          }}
        />
        <YAxis
          type="number"
          dataKey="y"
          name={yLabel}
          stroke={colors.grid}
          tick={{ fill: colors.axis, fontSize: skinnedFontSize(AXIS.fontSize) }}
          tickFormatter={formatCompact}
          label={{
            value: axisTitle(yLabel, yUnit),
            angle: AXIS.titleAngleY,
            position: 'insideLeft',
            fill: colors.axis,
            fontSize: skinnedFontSize(AXIS.fontSize),
          }}
        />
        <ZAxis range={[SCATTER.pointArea, SCATTER.pointArea]} />
        <Tooltip
          cursor={{ stroke: colors.grid, fill: colors.cursor }}
          content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const point = payload[0].payload as ScatterPoint;
            return (
              <ChartTooltip
                theme={theme}
                title={point.name}
                rows={[
                  { label: xLabel, value: `${formatDecimal(point.x)}${xUnit}` },
                  { label: yLabel, value: `${formatDecimal(point.y)}${yUnit}` },
                ]}
              />
            );
          }}
        />
        <Scatter
          data={points}
          fill={colors.primary}
          stroke={colors.separator}
          strokeWidth={SCATTER.strokeWidth}
          isAnimationActive={false}
        >
          {/* 点の上に縦軸の値、下に名前。どちらもグラフ面の上なので軸と同じ文字色を使う */}
          {showValueLabels && (
            <LabelList
              dataKey="y"
              position="top"
              offset={VALUE_LABEL.offset}
              fill={colors.axis}
              fontSize={skinnedFontSize(VALUE_LABEL.fontSize)}
              formatter={(value) => formatDecimal(Number(value))}
            />
          )}
          <LabelList
            dataKey="name"
            position="bottom"
            offset={VALUE_LABEL.offset}
            fill={colors.axis}
            fontSize={skinnedFontSize(VALUE_LABEL.captionFontSize)}
          />
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}

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
import { playerDataHighlightColors, playerDataHighlightLevel, type PlayerDataHighlightLevel } from '../../config/colors';
import { playerIconImage } from '../../config/playerIcons';
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
  pointDisplay?: 'name' | 'icon' | 'icon_name';
  onPointClick?: (point: ScatterPoint) => void;
  height?: number;
}

interface ScatterShapeProps {
  cx?: number;
  cy?: number;
  fill?: string;
  stroke?: string;
  payload?: ScatterPoint & { highlight?: PlayerDataHighlightLevel };
  theme?: VizTheme;
  useIcon?: boolean;
}

function PlayerScatterShape({ cx = 0, cy = 0, fill, stroke, payload, theme, useIcon = true }: ScatterShapeProps) {
  const icon = useIcon && payload ? playerIconImage(payload.name) : undefined;
  const highlight = theme
    ? playerDataHighlightColors(theme, payload?.highlight ?? 'normal', fill ?? theme.accent)
    : { border: stroke, fill, bar: fill, text: fill };
  const size = 24;
  const x = cx - size / 2;
  const y = cy - size / 2;

  if (!icon) {
    return (
      <circle
        cx={cx}
        cy={cy}
        r={5}
        fill={highlight.fill}
        stroke={highlight.border}
        strokeWidth={SCATTER.strokeWidth}
      />
    );
  }

  return (
    <g>
      <rect
        x={x - 1}
        y={y - 1}
        width={size + 2}
        height={size + 2}
        fill={highlight.border}
      />
      <image
        href={`${import.meta.env.BASE_URL}${icon}`}
        x={x}
        y={y}
        width={size}
        height={size}
        preserveAspectRatio="xMidYMid slice"
      />
    </g>
  );
}

function clickedPoint(source: unknown): ScatterPoint | null {
  if (!source || typeof source !== 'object') return null;
  const record = source as { payload?: unknown; name?: unknown; x?: unknown; y?: unknown };
  const payload = record.payload && typeof record.payload === 'object'
    ? (record.payload as { name?: unknown; x?: unknown; y?: unknown })
    : record;
  return typeof payload.name === 'string' && typeof payload.x === 'number' && typeof payload.y === 'number'
    ? { name: payload.name, x: payload.x, y: payload.y }
    : null;
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
  pointDisplay = 'name',
  onPointClick,
  height,
}: MetricScatterProps) {
  const metrics = useChartMetrics();
  const colors = figureColors(theme);
  const maxX = Math.max(...points.map((point) => point.x), 1);
  const maxY = Math.max(...points.map((point) => point.y), 1);
  const highlightedPoints = points.map((point) => ({
    ...point,
    highlight: playerDataHighlightLevel({ maxShare: Math.max(point.x / maxX, point.y / maxY) }),
  }));

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
          offset={0}
          isAnimationActive={false}
          wrapperStyle={{ pointerEvents: 'none' }}
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
          data={highlightedPoints}
          fill={colors.primary}
          stroke={colors.separator}
          strokeWidth={SCATTER.strokeWidth}
          className={onPointClick ? 'cursor-pointer' : undefined}
          onClick={(data: unknown) => {
            const point = clickedPoint(data);
            if (point) onPointClick?.(point);
          }}
          shape={(props: unknown) => (
            <PlayerScatterShape
              {...(props as ScatterShapeProps)}
              theme={theme}
              useIcon={pointDisplay !== 'name'}
            />
          )}
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
          {pointDisplay !== 'icon' && (
            <LabelList
              dataKey="name"
              position="bottom"
              offset={pointDisplay === 'name' ? VALUE_LABEL.offset : VALUE_LABEL.offset + 10}
              fill={colors.axis}
              fontSize={skinnedFontSize(VALUE_LABEL.captionFontSize)}
            />
          )}
        </Scatter>
      </ScatterChart>
    </ResponsiveContainer>
  );
}

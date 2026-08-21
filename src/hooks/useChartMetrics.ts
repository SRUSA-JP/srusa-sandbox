import { useMemo } from 'react';
import { chartMetrics, type ChartMetrics } from '../config/charts';
import { useIsCompact } from './useMediaQuery';

/**
 * 表示中の画面幅に合ったグラフの寸法。
 *
 * 「狭いときにどの値を差し替えるか」は config/charts.ts が持ち、
 * ここは幅を見て選ぶだけ。グラフのコンポーネントはこのフックだけを見る。
 */
export function useChartMetrics(): ChartMetrics {
  const compact = useIsCompact();
  return useMemo(() => chartMetrics(compact), [compact]);
}

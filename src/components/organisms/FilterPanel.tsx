import { METRICS, STATS_TEXT } from '../../config';
import { metricOption } from '../../lib/display';
import type { NumericPlayerRowKey } from '../../lib/selectors';
import { SECTION } from '../classes';
import { Button, NumberField, Picker } from '../atoms';
import { SectionHeader } from '../molecules/SectionHeader';

export interface FilterPanelProps {
  /** 絞り込みに使う指標。 */
  metric: NumericPlayerRowKey;
  onMetricChange: (metric: NumericPlayerRowKey) => void;
  min: number;
  max: number;
  onBoundsChange: (bounds: { min: number; max: number }) => void;
  /** 絞り込みを解除する。 */
  onClear: () => void;
  /** 表示中の人数と全体の人数。注記に出す。 */
  shown: number;
  total: number;
}

/**
 * 全グラフに効く絞り込み。
 *
 * 指標を 1 つ選び、その下限・上限で対象を絞る。ここで絞った結果が
 * 以降のすべてのグラフと指標タイルの計算対象になる。
 */
export function FilterPanel({
  metric,
  onMetricChange,
  min,
  max,
  onBoundsChange,
  onClear,
  shown,
  total,
}: FilterPanelProps) {
  const option = metricOption(metric);
  const filtered = shown !== total;

  return (
    <section className={SECTION}>
      <SectionHeader
        title={STATS_TEXT.filter.title}
        note={STATS_TEXT.filter.note(shown, total)}
        actions={
          <>
            <Picker
              label={STATS_TEXT.filter.metricPicker}
              value={metric}
              options={METRICS}
              onChange={onMetricChange}
            />
            <NumberField
              label={STATS_TEXT.filter.min}
              ariaLabel={STATS_TEXT.filter.minLabel(option.label)}
              value={min}
              onChange={(value) => onBoundsChange({ min: value, max })}
            />
            <NumberField
              label={STATS_TEXT.filter.max}
              ariaLabel={STATS_TEXT.filter.maxLabel(option.label)}
              value={max}
              onChange={(value) => onBoundsChange({ min, max: value })}
            />
            <span className="text-sm text-muted">{option.unit.trim()}</span>
            <Button label={STATS_TEXT.filter.clear} onClick={onClear} disabled={!filtered} />
          </>
        }
      />
    </section>
  );
}

import { TimelineDayRow } from '../molecules/TimelineDayRow';
import { timelineDayAccent, timelineGapDays } from '../../lib/display';
import type { Timeline } from '../../lib/timeline';
import type { VizTheme } from '../../theme/palette';

export interface TimelineListProps {
  timeline: Timeline;
  theme: VizTheme;
}

/**
 * 年表。古い日から順に並べる。
 *
 * 何色にするか・記録の空きが何日かは lib/display.ts が決める。
 * ここは並べるだけで、色も日付の計算も持たない。
 */
export function TimelineList({ timeline, theme }: TimelineListProps) {
  return (
    <ol className="flex flex-col">
      {timeline.days.map((day, index) => (
        <TimelineDayRow
          key={day.date}
          day={day}
          accent={timelineDayAccent(day, theme)}
          marked={day.marks.length > 0}
          gapDays={timelineGapDays(timeline.days[index - 1]?.date, day.date)}
        />
      ))}
    </ol>
  );
}

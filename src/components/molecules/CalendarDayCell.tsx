import { CALENDAR_TEXT } from '../../config/messages';
import type { CalendarCell } from '../../lib/calendar';
import type { TimelineDay } from '../../lib/timeline';

export interface CalendarDayCellProps {
  cell: CalendarCell<TimelineDay>;
  /** その日の濃さ。人が多い日ほど濃い。決めるのは lib/display.ts。 */
  background: string;
  /** 出来事のあった日に付ける印の色。無い日は undefined。 */
  markColor?: string;
  /** 数字の色。濃い面の上でも読める色を受け取る。 */
  textColor: string;
}

/**
 * 暦の 1 枠。
 *
 * 面の濃さでその日の人数を、右上の印で「何かあった日」を表す。
 * 何色にするかは display.ts が決め、ここは受け取って置くだけ。
 */
export function CalendarDayCell({ cell, background, markColor, textColor }: CalendarDayCellProps) {
  if (cell.outside) return <div aria-hidden />;

  const day = cell.value;
  const title = day
    ? CALENDAR_TEXT.day.tooltip(cell.date, day.people, day.joins, day.deaths)
    : CALENDAR_TEXT.day.empty(cell.date);

  return (
    <div
      className="grid aspect-square place-items-center rounded-sm border-hairline border-divider text-xs tabular-nums"
      style={{ backgroundColor: background, color: textColor }}
      title={title}
    >
      <span className="relative">
        {cell.day}
        {markColor && (
          /* 出来事のあった日の印。数字の右上に小さく置く */
          <span
            className="absolute -top-xxs -right-sm size-xs rounded-full"
            style={{ backgroundColor: markColor }}
            aria-hidden
          />
        )}
      </span>
    </div>
  );
}

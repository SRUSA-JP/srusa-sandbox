import { CALENDAR_TEXT } from '../../config/messages';
import type { CalendarCell } from '../../lib/calendar';
import type { TimelineDay } from '../../lib/timeline';

export interface CalendarDayCellProps {
  cell: CalendarCell<TimelineDay>;
  /** その日の濃さ。人が多い日ほど濃い。決めるのは lib/display.ts。 */
  background: string;
  /** 数字の色。濃い面の上でも読める色を受け取る。 */
  textColor: string;
  /** いま開いている日か。 */
  selected: boolean;
  onSelect: (date: string) => void;
}

/**
 * 暦の 1 枠。
 *
 * 面の濃さでその日の人数を表す。押すとその日いた人が出る。
 * 何色にするかは display.ts が決め、ここは受け取って置くだけ。
 */
export function CalendarDayCell({ cell, background, textColor, selected, onSelect }: CalendarDayCellProps) {
  if (cell.outside) return <div aria-hidden />;

  const day = cell.value;
  const title = day
    ? CALENDAR_TEXT.day.tooltip(cell.date, day.people, day.joins, day.deaths)
    : CALENDAR_TEXT.day.empty(cell.date);

  return (
    <button
      type="button"
      className={`grid aspect-square cursor-pointer place-items-center rounded-sm text-xs tabular-nums transition-colors ${
        selected ? 'border-thick border-selected' : 'border-hairline border-divider hover:border-control-line-hover'
      }`}
      style={{ backgroundColor: background, color: textColor }}
      title={title}
      aria-label={title}
      aria-pressed={selected}
      onClick={() => onSelect(cell.date)}
    >
      {cell.day}
    </button>
  );
}

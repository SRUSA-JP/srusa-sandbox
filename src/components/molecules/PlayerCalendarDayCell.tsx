import { STREAK_TEXT } from '../../config/messages';
import type { PlayerDayEntry } from '../../lib/playerCalendar';
import type { CalendarCell } from '../../lib/calendar';

export interface PlayerCalendarDayCellProps {
  cell: CalendarCell<PlayerDayEntry>;
  background: string;
  textColor: string;
}

/** その人の暦の 1 枠。来ていた日だけ濃く塗る（2 色だけの表現）。 */
export function PlayerCalendarDayCell({ cell, background, textColor }: PlayerCalendarDayCellProps) {
  if (cell.outside) return <div aria-hidden />;

  const played = cell.value?.played ?? false;
  const title = STREAK_TEXT.markAlt(cell.date, played);

  return (
    <div
      className="grid aspect-square place-items-center rounded-sm border-hairline border-divider text-xs tabular-nums"
      style={{ backgroundColor: background, color: textColor }}
      title={title}
      aria-label={title}
    >
      {cell.day}
    </div>
  );
}

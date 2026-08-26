import { CALENDAR_TEXT } from '../../config/messages';
import { calendarDayColors } from '../../lib/display';
import type { CalendarMonth } from '../../lib/calendar';
import type { TimelineDay } from '../../lib/timeline';
import type { VizTheme } from '../../theme/palette';
import { CalendarDayCell } from '../molecules/CalendarDayCell';

export interface ActivityCalendarProps {
  months: Array<CalendarMonth<TimelineDay>>;
  /** 濃さを決めるための、いちばん人が多かった日の人数。 */
  busiest: number;
  theme: VizTheme;
}

/**
 * 月ごとの暦。
 *
 * 一覧で縦に並べると「何日に何があったか」しか読めないが、暦に置くと
 * 空いている日と混んでいる日の並びがそのまま形になる。
 *
 * 何色にするかは lib/display.ts が決め、ここは並べるだけ。
 */
export function ActivityCalendar({ months, busiest, theme }: ActivityCalendarProps) {
  return (
    <div className="flex flex-col gap-xxl">
      {months.map((month) => (
        <section key={`${month.year}-${month.month}`} className="flex flex-col gap-sm">
          <h3 className="text-md text-heading">{CALENDAR_TEXT.month(month.year, month.month)}</h3>

          <div className="grid grid-cols-7 gap-xxs">
            {CALENDAR_TEXT.weekdays.map((weekday) => (
              <div key={weekday} className="text-center text-xs text-subtle">
                {weekday}
              </div>
            ))}
            {month.weeks.flat().map((cell, index) => {
              const colors = calendarDayColors(cell.value, busiest, theme);
              return (
                <CalendarDayCell
                  key={cell.date || `blank-${index}`}
                  cell={cell}
                  background={colors.background}
                  markColor={colors.mark}
                  textColor={colors.text}
                />
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}

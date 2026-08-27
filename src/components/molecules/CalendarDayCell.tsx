import { CALENDAR_DAY_AVATAR_LIMIT } from '../../config/dataRegistry';
import { CALENDAR_TEXT } from '../../config/messages';
import type { CalendarCell } from '../../lib/calendar';
import type { TimelineDay } from '../../lib/timeline';
import { PlayerIconPlaceholder } from './PlayerIconPlaceholder';

export interface CalendarDayCellProps {
  cell: CalendarCell<TimelineDay>;
  /** その日の濃さ。人が多い日ほど濃い。決めるのは lib/display.ts。 */
  background: string;
  /** 数字の色。濃い面の上でも読める色を受け取る。 */
  textColor: string;
  /** 顔の枠線。カレンダーの外に並べる出来事の札と同じ色で揃える。 */
  avatarAccent: string;
  /** いま開いている日か。 */
  selected: boolean;
  onSelect: (date: string) => void;
}

/**
 * 暦の 1 枠。
 *
 * 面の濃さでその日の人数を表し、その下にその日いた人の顔を並べる。
 * 枠が狭いので顔は上限までしか出さず、あふれたぶんは人数だけ添える。
 * 押すとその日いた人が詳しく出る。何色にするかは display.ts が決め、ここは受け取って置くだけ。
 */
export function CalendarDayCell({
  cell,
  background,
  textColor,
  avatarAccent,
  selected,
  onSelect,
}: CalendarDayCellProps) {
  if (cell.outside) return <div aria-hidden />;

  const day = cell.value;
  const players = day?.players ?? [];
  const visible = players.slice(0, CALENDAR_DAY_AVATAR_LIMIT);
  const overflow = players.length - visible.length;
  const title = day
    ? CALENDAR_TEXT.day.tooltip(cell.date, day.people, day.joins, day.deaths, players)
    : CALENDAR_TEXT.day.empty(cell.date);

  return (
    <button
      type="button"
      className={`flex min-h-0 flex-col items-center justify-start gap-xxs rounded-sm p-xxs text-xs tabular-nums transition-colors ${
        selected ? 'border-thick border-selected' : 'border-hairline border-divider hover:border-control-line-hover'
      }`}
      style={{ backgroundColor: background, color: textColor }}
      title={title}
      aria-label={title}
      aria-pressed={selected}
      onClick={() => onSelect(cell.date)}
    >
      <span>{cell.day}</span>
      {players.length > 0 && (
        <span className="flex flex-wrap items-center justify-center gap-xxs">
          {visible.map((name) => (
            <PlayerIconPlaceholder key={name} name={name} accent={avatarAccent} alt="" size="tiny" />
          ))}
          {overflow > 0 && <span className="text-xxs leading-none">{CALENDAR_TEXT.day.more(overflow)}</span>}
        </span>
      )}
    </button>
  );
}

import { STREAK_TEXT } from '../../config/messages';
import { playerCalendarDayColor } from '../../lib/display';
import { buildCalendar } from '../../lib/calendar';
import type { PlayStreak } from '../../lib/playStreak';
import type { PlayerDayEntry } from '../../lib/playerCalendar';
import type { VizTheme } from '../../theme/palette';
import { SECTION } from '../classes';
import { Note } from '../atoms';
import { PlayerCalendarDayCell, SectionHeader } from '../molecules';

export interface PlayerCalendarPanelProps {
  streak: PlayStreak;
  entries: PlayerDayEntry[];
  theme: VizTheme;
}

/**
 * ログイン日のカレンダー。
 *
 * 直近だけの帯（連続プレイ日数の見せ方）だと「先月は来ていたか」が
 * 読み取れない。月ごとの暦に置くと、記録の全期間でどの日に来ていたかが
 * ひと目で分かる。数の集計（現在の連続・最長・総日数）はそのまま添える。
 */
export function PlayerCalendarPanel({ streak, entries, theme }: PlayerCalendarPanelProps) {
  const months = buildCalendar(entries);

  const tiles: Array<{ label: string; value: string }> = [
    { label: STREAK_TEXT.totalDays, value: STREAK_TEXT.days(streak.totalDays) },
    {
      label: streak.active ? STREAK_TEXT.current : STREAK_TEXT.lastRun,
      value: STREAK_TEXT.days(streak.current),
    },
    { label: STREAK_TEXT.longest, value: STREAK_TEXT.days(streak.longest) },
    { label: STREAK_TEXT.lastPlayed, value: streak.lastPlayed || '—' },
  ];

  return (
    <section className={SECTION}>
      <SectionHeader title={STREAK_TEXT.calendarTitle} note={STREAK_TEXT.calendarNote} />

      {streak.totalDays === 0 ? (
        <Note>{STREAK_TEXT.empty}</Note>
      ) : (
        <div className="grid gap-lg border-thick border-divider bg-surface p-lg">
          <div className="grid grid-cols-[repeat(auto-fit,minmax(112px,1fr))] gap-xs">
            {tiles.map((tile) => (
              <div key={tile.label} className="grid min-w-0 gap-xxs border-hairline border-divider bg-sunken p-xs">
                <p className="truncate text-xs font-bold leading-tight text-muted">{tile.label}</p>
                <p className="truncate font-mono text-md font-bold leading-tight text-heading">{tile.value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-col gap-lg">
            {months.map((month) => (
              <div key={`${month.year}-${month.month}`} className="flex flex-col gap-sm">
                <h4 className="text-sm font-bold text-heading">{`${month.year}年 ${month.month}月`}</h4>
                <div className="grid grid-cols-7 gap-xxs">
                  {month.weeks.flat().map((cell, index) => {
                    const colors = playerCalendarDayColor(cell.value?.played ?? false, theme);
                    return (
                      <PlayerCalendarDayCell
                        key={cell.date || `blank-${index}`}
                        cell={cell}
                        background={colors.background}
                        textColor={colors.text}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

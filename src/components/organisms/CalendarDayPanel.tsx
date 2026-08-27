import { Button } from '../atoms';
import { PlayerChip } from '../molecules';
import { CALENDAR_TEXT } from '../../config/messages';
import { dayPlayers } from '../../lib/dayPlayers';
import { calendarMarkAccent } from '../../lib/display';
import type { PlayLogDay } from '../../data/playLog';
import type { VizTheme } from '../../theme/palette';

export interface CalendarDayPanelProps {
  /** 押された日。記録の無い日は null。 */
  date: string;
  day: PlayLogDay | null;
  onClose: () => void;
  theme: VizTheme;
}

/**
 * 押した日にいた人の一覧。
 *
 * 顔と名前を並べ、最初と最後のあいだの幅を添える。ログにあるのは
 * 最初と最後に見かけた時刻だけなので、その幅には途中で抜けていた時間も入る。
 * 「プレイ時間」とは書かない。
 */
export function CalendarDayPanel({ date, day, onClose, theme }: CalendarDayPanelProps) {
  const text = CALENDAR_TEXT.players;
  const accent = calendarMarkAccent(theme);
  const players = day ? dayPlayers(day) : [];

  return (
    <div className="flex flex-col gap-md">
      <div className="flex flex-wrap items-center justify-between gap-md">
        <h3 className="text-md text-heading">{text.title(date)}</h3>
        <Button label={text.close} icon="reset" onClick={onClose} />
      </div>

      {players.length === 0 ? (
        <p className="text-sm text-muted">{text.empty(date)}</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-sm">
            {players.map((player) => (
              <PlayerChip
                key={player.name}
                name={player.name}
                accent={accent}
                detail={
                  player.spanMinutes === null
                    ? text.spanUnknown
                    : `${text.span(player.spanMinutes)}（${text.range(player.firstSeen, player.lastSeen)}）`
                }
              />
            ))}
          </div>
          <p className="text-xs text-subtle">{text.note}</p>
        </>
      )}
    </div>
  );
}

/**
 * 特定の 1 人ぶんの、日ごとの記録。
 *
 * 活動カレンダー（lib/calendar.ts）は「その日 何人来たか」を数えるが、
 * ここは「その人が来たかどうか」だけを見る。同じ暦の仕組みに乗せられるよう、
 * `date` を持つ配列にして返す。
 */
import type { PlayLog } from '../data/playLog';
import { dayPlayers, type DayPlayer } from './dayPlayers';

export interface PlayerDayEntry {
  date: string;
  played: boolean;
  /** 来ていた日だけ持つ、その日の詳しい記録。 */
  detail: DayPlayer | null;
}

/** ログに残っている全ての日について、その人が来ていたかを並べる。 */
export function playerDayEntries(log: PlayLog, name: string): PlayerDayEntry[] {
  return log.days.map((day) => {
    const detail = dayPlayers(day).find((entry) => entry.name === name) ?? null;
    return { date: day.date, played: detail !== null, detail };
  });
}

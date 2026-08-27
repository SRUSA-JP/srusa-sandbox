/**
 * サーバーのあゆみ（日別ログから作る年表）。
 *
 * 日別ログは「その日に誰が入ったか」しか持っていない。そこから
 * 「はじめて来た日」「いちばん人が集まった日」のような、日付の並びを
 * 見ないと分からないことを作る。
 *
 * ここが扱うのはログに実際に残っている日だけで、記録の無い日のことは作らない。
 * サーバーがいつ建ったかはログからは分からないので、この年表は
 * 「記録が残っているいちばん古い日」から始まる。
 */
import type { PlayLog, PlayLogDay } from '../data/playLog';
import { dayPlayers } from './dayPlayers';

/** 年表に出す、その日の出来事の種類。 */
export type TimelineMarkKind =
  /** ログに残っているいちばん古い日。 */
  | 'first'
  /** その日はじめて記録に出た人がいる。 */
  | 'newcomer'
  /** その日までで、いちばん人が集まった。 */
  | 'peopleRecord'
  /** その日までで、いちばん多く亡くなった。 */
  | 'deathRecord';

export interface TimelineMark {
  kind: TimelineMarkKind;
  /** 人の名前が絡む出来事だけが持つ。 */
  names?: string[];
  /** 記録の出来事だけが持つ、そのときの数。 */
  value?: number;
}

export interface TimelineDay {
  date: string;
  /** その日サーバーに入っていた人数。 */
  people: number;
  joins: number;
  deaths: number;
  /** その日いちばん早い時刻（日本時間）。誰も居ない日は空。 */
  firstSeen: string;
  /** その日いた人。長くいた順（dayPlayers と同じ並び）。 */
  players: string[];
  marks: TimelineMark[];
}

export interface Timeline {
  days: TimelineDay[];
  /** 記録が残っているいちばん古い日と新しい日。 */
  from: string;
  to: string;
  /** 期間に一度でも記録に出た人数。 */
  people: number;
  totalJoins: number;
  totalDeaths: number;
}

/**
 * 記録を年表にする。
 *
 * 記録（いちばん人が集まった日など）は、その日までを見て決める。
 * 全期間の最大だけを印にすると 1 日しか光らないが、そこまでの最大なら
 * 「ここで記録が伸びた」という並びが出て、読み進める意味が出る。
 */
export function buildTimeline(log: PlayLog): Timeline {
  const days = [...log.days].sort((a, b) => a.date.localeCompare(b.date));

  const seen = new Set<string>();
  let mostPeople = 0;
  let mostDeaths = 0;

  const entries = days.map((day, index): TimelineDay => {
    const names = Object.keys(day.players);
    const marks: TimelineMark[] = [];

    if (index === 0) marks.push({ kind: 'first' });

    const newcomers = names.filter((name) => !seen.has(name));
    for (const name of names) seen.add(name);
    /* 初日は全員がはじめてなので、印を重ねない */
    if (index > 0 && newcomers.length > 0) {
      marks.push({ kind: 'newcomer', names: newcomers.sort((a, b) => a.localeCompare(b)) });
    }

    if (names.length > mostPeople) {
      mostPeople = names.length;
      if (index > 0) marks.push({ kind: 'peopleRecord', value: names.length });
    }
    if (day.deaths > mostDeaths) {
      mostDeaths = day.deaths;
      if (index > 0 && day.deaths > 0) marks.push({ kind: 'deathRecord', value: day.deaths });
    }

    return {
      date: day.date,
      people: names.length,
      joins: day.joins,
      deaths: day.deaths,
      firstSeen: earliestTime(day),
      players: dayPlayers(day).map((player) => player.name),
      marks,
    };
  });

  return {
    days: entries,
    from: entries[0]?.date ?? '',
    to: entries[entries.length - 1]?.date ?? '',
    people: seen.size,
    totalJoins: entries.reduce((sum, day) => sum + day.joins, 0),
    totalDeaths: entries.reduce((sum, day) => sum + day.deaths, 0),
  };
}

/** その日いちばん早くサーバーに入った時刻。 */
function earliestTime(day: PlayLogDay): string {
  const times = Object.values(day.players)
    .map((player) => player.first_seen_jst)
    .filter((time) => time !== '');
  if (times.length === 0) return '';
  return times.reduce((earliest, time) => (time < earliest ? time : earliest));
}

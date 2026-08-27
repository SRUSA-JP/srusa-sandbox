/**
 * その日サーバーにいた人の一覧を作る。
 *
 * ログが持っているのは「その日いちばん早く見た時刻」と「いちばん遅く見た時刻」だけ。
 * その差は **いた時間そのものではなく、最初と最後のあいだの幅** で、途中で
 * 抜けていた時間も含まれる。名前もそう呼ぶ（プレイ時間とは書かない）。
 *
 * React にもデータの取り方にも依存しない。
 */
import type { PlayLogDay } from '../data/playLog';

export interface DayPlayer {
  /** ログに出てくる名前。 */
  name: string;
  joins: number;
  deaths: number;
  firstSeen: string;
  lastSeen: string;
  /** 最初と最後のあいだ（分）。時刻が読めないときは null。 */
  spanMinutes: number | null;
}

/** `HH:MM:SS` を、その日の 0 時からの分にする。読めなければ null。 */
function minutesOf(time: string): number | null {
  const matched = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(time.trim());
  if (!matched) return null;
  return Number(matched[1]) * 60 + Number(matched[2]);
}

/**
 * その日いた人を、長くいた順に並べる。
 *
 * 同じ幅なら名前順にして、開くたびに並びが変わらないようにする。
 */
export function dayPlayers(day: PlayLogDay): DayPlayer[] {
  return Object.entries(day.players)
    .map(([name, entry]): DayPlayer => {
      const from = minutesOf(entry.first_seen_jst);
      const to = minutesOf(entry.last_seen_jst);
      /* 日をまたいだ記録は幅が負になる。そのときは分からないものとして扱う */
      const span = from !== null && to !== null && to >= from ? to - from : null;
      return {
        name,
        joins: entry.joins,
        deaths: entry.deaths,
        firstSeen: entry.first_seen_jst,
        lastSeen: entry.last_seen_jst,
        spanMinutes: span,
      };
    })
    .sort((a, b) => (b.spanMinutes ?? -1) - (a.spanMinutes ?? -1) || a.name.localeCompare(b.name));
}

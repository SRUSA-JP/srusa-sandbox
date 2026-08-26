/**
 * 年表を横軸（時間）に置くための計算。
 *
 * 縦に並べた一覧では「いつからいつまでの話か」「どのくらい間が空いたか」が
 * 読めない。横軸に置くと、出来事の間隔と人数の増え方が同じ物差しの上に乗る。
 *
 * React にも SVG にも依存しない。月の文字列（`YYYY-MM`）だけを扱う。
 */
import type { HistoryEntry } from '../data/history';
import type { MemberGrowth } from './srusaReach';

/** `YYYY-MM` / `YYYY` / `YYYY-MM-DD` を `YYYY-MM` に揃える。読めなければ null。 */
export function monthOf(value: string): string | null {
  const matched = /^(\d{4})(?:-(\d{2}))?/.exec(value.trim());
  if (!matched) return null;
  return `${matched[1]}-${matched[2] ?? '01'}`;
}

function shiftMonth(month: string, step: number): string {
  const [year, index] = month.split('-').map(Number);
  const date = new Date(Date.UTC(year, index - 1 + step, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

/** from から to までの月を並べる（両端を含む）。 */
export function monthsBetween(from: string, to: string): string[] {
  if (from > to) return [from];
  const months: string[] = [];
  for (let month = from; month <= to; month = shiftMonth(month, 1)) months.push(month);
  return months;
}

export interface HistoryAxis {
  /** 横軸に並ぶ月。 */
  months: string[];
  /** 目盛りを打つ月（年の変わり目）。 */
  ticks: string[];
}

/**
 * 横軸を作る。
 *
 * いちばん古い出来事から、いちばん新しい出来事までを並べる。
 * 時期が分かっていない出来事は軸に乗らない（乗せると位置を作ってしまう）。
 */
export function historyAxis(entries: HistoryEntry[], growth: MemberGrowth, until: string): HistoryAxis {
  const dated = entries
    .map((entry) => monthOf(entry.date))
    .filter((month): month is string => month !== null);
  const known = [...dated, ...growth.points.map((point) => point.month)].sort();
  if (known.length === 0) return { months: [], ticks: [] };

  const months = monthsBetween(known[0], until > known[known.length - 1] ? until : known[known.length - 1]);
  /* 目盛りは年の変わり目だけ。毎月打つと軸が文字で埋まる */
  const ticks = months.filter((month) => month.endsWith('-01') || month === months[0]);
  return { months, ticks };
}

/** その月までに入っている人数。 */
export function membersAt(growth: MemberGrowth, month: string): number {
  let count = 0;
  for (const point of growth.points) {
    if (point.month > month) break;
    count = point.members;
  }
  return count;
}

/** その月までに起きた出来事（時期が分かっているものだけ）。 */
export function entriesUntil(entries: HistoryEntry[], month: string): HistoryEntry[] {
  return entries.filter((entry) => {
    const entryMonth = monthOf(entry.date);
    return entryMonth !== null && entryMonth <= month;
  });
}

/** その出来事が横軸のどこに来るか（0〜1）。軸に乗らないものは null。 */
export function positionOf(axis: HistoryAxis, date: string): number | null {
  const month = monthOf(date);
  if (!month || axis.months.length < 2) return month ? 0 : null;
  const index = axis.months.indexOf(month);
  if (index < 0) return null;
  return index / (axis.months.length - 1);
}

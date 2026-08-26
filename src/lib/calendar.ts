/**
 * 日別の記録を、月ごとの暦の形に並べ替える。
 *
 * 一覧で縦に並べると「何日に何があったか」は読めるが、「どのくらいの
 * 間隔で遊んでいたか」「どの週に集まっていたか」は読み取れない。
 * 暦に置くと、空いている日と混んでいる日の並びがそのまま形になる。
 *
 * React にもデータの取り方にも依存しない。入れるのは日付の付いた値なら何でもよい。
 */

/** 週の始まりを日曜にする（日本の暦に合わせる）。 */
const WEEK_LENGTH = 7;

export interface CalendarCell<T> {
  /** `YYYY-MM-DD`。前後の月にはみ出す枠は空。 */
  date: string;
  /** その月の日。はみ出す枠は 0。 */
  day: number;
  /** その日の記録。記録が無い日は null。 */
  value: T | null;
  /** その月の外（前後の月の枠）か。 */
  outside: boolean;
}

export interface CalendarMonth<T> {
  year: number;
  month: number;
  /** 週ごとの 7 枠。前後は空の枠で埋める。 */
  weeks: Array<Array<CalendarCell<T>>>;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * 記録のある月ぶんの暦を作る。
 *
 * 記録の無い日も枠としては作る。空いた日が並んでいることこそが
 * 「その週は遊んでいなかった」という読み取りになるので、飛ばさない。
 */
export function buildCalendar<T extends { date: string }>(entries: T[]): Array<CalendarMonth<T>> {
  if (entries.length === 0) return [];

  const byDate = new Map(entries.map((entry) => [entry.date, entry]));
  const dates = [...byDate.keys()].sort();
  const first = new Date(`${dates[0]}T00:00:00Z`);
  const last = new Date(`${dates[dates.length - 1]}T00:00:00Z`);

  const months: Array<CalendarMonth<T>> = [];
  const cursor = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), 1));
  const end = new Date(Date.UTC(last.getUTCFullYear(), last.getUTCMonth(), 1));

  while (cursor <= end) {
    const year = cursor.getUTCFullYear();
    const month = cursor.getUTCMonth() + 1;
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const leading = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();

    const cells: Array<CalendarCell<T>> = [];
    /* 月の頭が週の途中から始まるぶんを空の枠で埋める */
    for (let index = 0; index < leading; index += 1) {
      cells.push({ date: '', day: 0, value: null, outside: true });
    }
    for (let day = 1; day <= daysInMonth; day += 1) {
      const date = `${year}-${pad(month)}-${pad(day)}`;
      cells.push({ date, day, value: byDate.get(date) ?? null, outside: false });
    }
    /* 最後の週も 7 枠に揃える */
    while (cells.length % WEEK_LENGTH !== 0) {
      cells.push({ date: '', day: 0, value: null, outside: true });
    }

    const weeks: Array<Array<CalendarCell<T>>> = [];
    for (let index = 0; index < cells.length; index += WEEK_LENGTH) {
      weeks.push(cells.slice(index, index + WEEK_LENGTH));
    }
    months.push({ year, month, weeks });

    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  return months;
}

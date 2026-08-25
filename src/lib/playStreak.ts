/**
 * 連続プレイ日数の集計。
 *
 * 入力は「その日サーバーに入っていたか」の並びだけ。React にも SVG にも
 * 依存しない純関数で、同じ入力なら同じ出力を返す。
 * 見せ方（色・文言・何日ぶんの帯を出すか）は lib/display.ts と config が決める。
 */
import type { PlayLog, PlayLogDay } from '../data/playLog';

/** 帯に出す 1 日分。 */
export interface PlayDayMark {
  /** `YYYY-MM-DD`。 */
  date: string;
  /** その日サーバーに入っていたか。 */
  played: boolean;
  /** 現在続いている連なりに含まれる日か。 */
  inCurrentStreak: boolean;
}

export interface PlayStreak {
  /** いま続いている連続日数。最後に遊んだ日で途切れていれば、その連なりの長さ。 */
  current: number;
  /** 記録の中でいちばん長かった連続日数。 */
  longest: number;
  /** 遊んだ日の総数（連続でなくてもよい）。 */
  totalDays: number;
  /** 最後に遊んだ日。一度も無ければ空。 */
  lastPlayed: string;
  /** 最初に遊んだ日。一度も無ければ空。 */
  firstPlayed: string;
  /**
   * いまも続いているか。
   *
   * 記録の最終日か、その前日まで遊んでいれば続いていると見なす。
   * 最終日は集計した時点までしか含まないので、当日まだ遊んでいないだけの人を
   * 「途切れた」と出さないための猶予。
   */
  active: boolean;
  /** 記録のうち新しいほうから並べた日ごとの印。 */
  marks: PlayDayMark[];
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** `YYYY-MM-DD` を日数に直す。時差の影響を受けないよう UTC で扱う。 */
function dayNumber(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

/** 日数を `YYYY-MM-DD` に戻す。 */
function dayString(value: number): string {
  return new Date(value * DAY_MS).toISOString().slice(0, 10);
}

const EMPTY: PlayStreak = {
  current: 0,
  longest: 0,
  totalDays: 0,
  lastPlayed: '',
  firstPlayed: '',
  active: false,
  marks: [],
};

/**
 * ひとりぶんの連続プレイ日数。
 *
 * `windowDays` は帯に並べる日数。記録が無い日も「遊んでいない日」として
 * 埋めるので、休んだ日が抜け落ちて詰まって見えることはない。
 */
export function playStreakOf(log: PlayLog, name: string, windowDays: number): PlayStreak {
  if (log.days.length === 0) return EMPTY;

  const playedDays = log.days.filter((day) => name in day.players).map((day) => day.date);
  if (playedDays.length === 0) return { ...EMPTY, marks: emptyMarks(log.days, windowDays) };

  const played = new Set(playedDays.map(dayNumber));
  const sorted = [...played].sort((a, b) => a - b);

  /* 連なりの長さを順に測る。1 日空いたらそこで切れる */
  let longest = 0;
  let run = 0;
  let previous: number | null = null;
  for (const day of sorted) {
    run = previous !== null && day === previous + 1 ? run + 1 : 1;
    if (run > longest) longest = run;
    previous = day;
  }

  /* いま続いている連なりは、最後に遊んだ日から遡って測る */
  const last = sorted[sorted.length - 1];
  let current = 0;
  while (played.has(last - current)) current += 1;

  const latest = dayNumber(log.days[log.days.length - 1].date);
  const active = last >= latest - 1;

  const streakFrom = last - current + 1;
  const marks: PlayDayMark[] = [];
  for (let offset = windowDays - 1; offset >= 0; offset--) {
    const day = latest - offset;
    marks.push({
      date: dayString(day),
      played: played.has(day),
      inCurrentStreak: active && day >= streakFrom && day <= last,
    });
  }

  return {
    current,
    longest,
    totalDays: played.size,
    lastPlayed: dayString(last),
    firstPlayed: dayString(sorted[0]),
    active,
    marks,
  };
}

/** 一度も遊んでいない人にも、同じ長さの空の帯を返す。 */
function emptyMarks(days: PlayLogDay[], windowDays: number): PlayDayMark[] {
  const latest = dayNumber(days[days.length - 1].date);
  return Array.from({ length: windowDays }, (_, index) => ({
    date: dayString(latest - (windowDays - 1 - index)),
    played: false,
    inCurrentStreak: false,
  }));
}

/** 連続日数の順位表。同じ日数なら遊んだ日の多い人を上にする。 */
export function playStreakRanking(
  log: PlayLog,
  windowDays: number,
): Array<{ name: string; streak: PlayStreak }> {
  const names = new Set(log.days.flatMap((day) => Object.keys(day.players)));
  return [...names]
    .map((name) => ({ name, streak: playStreakOf(log, name, windowDays) }))
    .sort(
      (a, b) =>
        b.streak.current - a.streak.current ||
        b.streak.longest - a.streak.longest ||
        b.streak.totalDays - a.streak.totalDays ||
        a.name.localeCompare(b.name, 'ja'),
    );
}

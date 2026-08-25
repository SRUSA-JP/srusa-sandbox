/**
 * `YYYY-MM-DD` の日付を数えるための最小限の道具。
 *
 * 時差で 1 日ずれると連続日数も日ごとの平均も狂うので、**必ず UTC で扱う**。
 * 表示用の整形は lib/format.ts、日付の意味づけ（いつからいつまでか）は
 * 呼び出し側が持つ。
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/** `YYYY-MM-DD` を日数に直す。 */
export function dayNumber(date: string): number {
  const [year, month, day] = date.split('-').map(Number);
  return Date.UTC(year, month - 1, day) / DAY_MS;
}

/** 日数を `YYYY-MM-DD` に戻す。 */
export function dayString(value: number): string {
  return new Date(value * DAY_MS).toISOString().slice(0, 10);
}

/** `YYYY-MM-DD` として読めるか。読めない文字列を日付として数えないための門番。 */
export function isDayString(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(dayNumber(value));
}

/** 2 つの日付の間の日数（後ろ − 前）。 */
export function daysBetween(from: string, to: string): number {
  return dayNumber(to) - dayNumber(from);
}

/** その日から n 日後の `YYYY-MM-DD`。 */
export function addDays(date: string, days: number): string {
  return dayString(dayNumber(date) + days);
}

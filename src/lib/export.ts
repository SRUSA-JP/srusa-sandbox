/** 表示中のデータを CSV / JSON として書き出すユーティリティ。 */

export type Row = Record<string, string | number | null | undefined>;

function escapeCsv(value: string | number | null | undefined): string {
  const text = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/** 行配列 → CSV 文字列。columns 未指定なら 1 行目のキー順。 */
export function toCsv(rows: Row[], columns?: string[]): string {
  if (rows.length === 0) return '';
  const cols = columns ?? Object.keys(rows[0]);
  const lines = [cols.join(',')];
  for (const row of rows) lines.push(cols.map((col) => escapeCsv(row[col])).join(','));
  return lines.join('\n');
}

/** ブラウザでファイルとして保存させる。 */
export function download(filename: string, content: string, mime: string): void {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

/** Excel が UTF-8 と判定できるように先頭へ付ける印。 */
const UTF8_BOM = '\ufeff';

export function downloadCsv(filename: string, rows: Row[], columns?: string[]): void {
  download(filename, `${UTF8_BOM}${toCsv(rows, columns)}`, 'text/csv');
}

export function downloadJson(filename: string, value: unknown): void {
  download(filename, JSON.stringify(value, null, 2), 'application/json');
}

/** File 入力 → テキスト（インポート用）。 */
export function readFileAsText(file: File): Promise<string> {
  return file.text();
}

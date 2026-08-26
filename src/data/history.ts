/**
 * SRUSA というサークルそのもののあゆみ（data/srusa-history-*.json）。
 *
 * Minecraft サーバーのログから作る活動カレンダーとは別で、こちらは
 * 人が書いて残すもの。ログには「サークルがいつ始まったか」は残らない。
 *
 * 分かっていないことは `status: 'todo'` のまま置き、画面にもそのまま出す。
 * 埋まっていない年表を、それらしい文で埋めてしまわないため。
 */
import historyJson from '../../data/srusa-history-v0.1.json';

export type HistoryStatus = 'confirmed' | 'todo';

export interface HistoryEntry {
  id: string;
  /** `YYYY` / `YYYY-MM` / `YYYY-MM-DD`。分からないうちは空。 */
  date: string;
  title: string;
  detail: string;
  status: HistoryStatus;
  /** 日付が「〜ごろ」のとき。画面でもそう見せる。 */
  approximate: boolean;
  /** 同じ催しを何回やったか。1 回なら 1。 */
  count: number;
  /** 参加した人（相関図の人物 ID）。分かっているものだけ。 */
  participants: string[];
}

export interface HistoryDocument {
  entries: HistoryEntry[];
}

function textAt(source: Record<string, unknown>, key: string): string {
  const value = source[key];
  return typeof value === 'string' ? value : '';
}

function parseEntry(value: unknown): HistoryEntry | null {
  if (typeof value !== 'object' || value === null) return null;
  const source = value as Record<string, unknown>;
  const id = textAt(source, 'id');
  const title = textAt(source, 'title');
  if (!id || !title) return null;

  const count = source.count;
  const participants = Array.isArray(source.participants) ? source.participants : [];

  return {
    id,
    date: textAt(source, 'date'),
    title,
    detail: textAt(source, 'detail'),
    /* 知らない値は todo 側に倒す。確かめられていないものを confirmed にしない */
    status: textAt(source, 'status') === 'confirmed' ? 'confirmed' : 'todo',
    approximate: source.approximate === true,
    count: typeof count === 'number' && Number.isFinite(count) && count > 0 ? Math.round(count) : 1,
    participants: participants.filter((entry): entry is string => typeof entry === 'string'),
  };
}

let cached: HistoryDocument | null = null;

export function srusaHistory(): HistoryDocument {
  if (cached) return cached;

  const source = historyJson as Record<string, unknown>;
  const raw = Array.isArray(source.entries) ? source.entries : [];
  const entries = raw
    .map(parseEntry)
    .filter((entry): entry is HistoryEntry => entry !== null)
    /* 日付のあるものを古い順に、日付の無いもの（未記入）は後ろへ */
    .sort((a, b) => {
      if (a.date && b.date) return a.date.localeCompare(b.date);
      if (a.date) return -1;
      if (b.date) return 1;
      return 0;
    });

  cached = { entries };
  return cached;
}

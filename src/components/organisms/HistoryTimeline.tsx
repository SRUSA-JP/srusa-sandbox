import { TAG } from '../classes';
import { HISTORY_TEXT } from '../../config/messages';
import type { HistoryEntry } from '../../data/history';

export interface HistoryTimelineProps {
  entries: HistoryEntry[];
  /** 未記入の項目として出すか。出し方だけが変わる。 */
  pending?: boolean;
  /** 人物 ID を表示名にする。相関図と同じ名前を出すために外から渡す。 */
  nameOf?: (personId: string) => string;
}

/** 日付の見せ方。はっきりしない時期は「ごろ」を付ける。 */
function dateLabel(entry: HistoryEntry): string {
  if (!entry.date) return HISTORY_TEXT.undated;
  return entry.approximate ? HISTORY_TEXT.entry.approximate(entry.date) : entry.date;
}

/**
 * サークルの年表の並び。
 *
 * 確かめられた出来事と、まだ分かっていない項目を同じ形で並べる。
 * 分かっていないものを消してしまうと「調べる先がある」ことまで消えるので、
 * 札を付けたうえでそのまま出す。
 */
export function HistoryTimeline({ entries, pending = false, nameOf }: HistoryTimelineProps) {
  return (
    <ol className="flex flex-col gap-lg">
      {entries.map((entry) => (
        <li key={entry.id} className="flex flex-col gap-xxs">
          <div className="flex flex-wrap items-baseline gap-md">
            <time
              className="text-md font-bold text-heading tabular-nums"
              dateTime={entry.date || undefined}
            >
              {dateLabel(entry)}
            </time>
            <span className="text-md">{entry.title}</span>
            {entry.count > 1 && <span className={TAG}>{HISTORY_TEXT.entry.count(entry.count)}</span>}
            {pending && <span className={TAG}>{HISTORY_TEXT.todo.badge}</span>}
          </div>
          {entry.detail && <p className="text-sm text-muted">{entry.detail}</p>}
          {entry.participants.length > 0 && nameOf && (
            <p className="text-sm text-subtle">
              {HISTORY_TEXT.entry.participants(entry.participants.map(nameOf))}
            </p>
          )}
        </li>
      ))}
    </ol>
  );
}

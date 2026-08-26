import { TAG } from '../classes';
import { HISTORY_TEXT } from '../../config/messages';
import type { HistoryEntry } from '../../data/history';

export interface HistoryTimelineProps {
  entries: HistoryEntry[];
  /** 未記入の項目として出すか。出し方だけが変わる。 */
  pending?: boolean;
}

/**
 * サークルのあゆみの並び。
 *
 * 確かめられた出来事と、まだ分かっていない項目を同じ形で並べる。
 * 分かっていないものを消してしまうと「調べる先がある」ことまで消えるので、
 * 札を付けたうえでそのまま出す。
 */
export function HistoryTimeline({ entries, pending = false }: HistoryTimelineProps) {
  return (
    <ol className="flex flex-col gap-lg">
      {entries.map((entry) => (
        <li key={entry.id} className="flex flex-col gap-xxs">
          <div className="flex flex-wrap items-baseline gap-md">
            <time className="text-md font-bold text-heading tabular-nums" dateTime={entry.date || undefined}>
              {entry.date || HISTORY_TEXT.undated}
            </time>
            <span className="text-md">{entry.title}</span>
            {pending && <span className={TAG}>{HISTORY_TEXT.todo.badge}</span>}
          </div>
          {entry.detail && <p className="text-sm text-muted">{entry.detail}</p>}
        </li>
      ))}
    </ol>
  );
}

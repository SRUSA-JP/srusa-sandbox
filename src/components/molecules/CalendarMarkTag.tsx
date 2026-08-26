import { TAG } from '../classes';
import { CALENDAR_TEXT } from '../../config/messages';
import type { TimelineMark } from '../../lib/timeline';

export interface CalendarMarkTagProps {
  mark: TimelineMark;
  /** その日の色。同じ日の札は同じ色で揃える。 */
  accent: string;
}

/** その日にあったこと 1 つぶんの札。文言は messages.ts が持つ。 */
export function CalendarMarkTag({ mark, accent }: CalendarMarkTagProps) {
  return (
    <span className={TAG} style={{ borderColor: accent, color: accent }}>
      {markText(mark)}
    </span>
  );
}

function markText(mark: TimelineMark): string {
  const text = CALENDAR_TEXT.mark;
  if (mark.kind === 'first') return text.first;
  if (mark.kind === 'newcomer') return text.newcomer(mark.names ?? []);
  if (mark.kind === 'peopleRecord') return text.peopleRecord(mark.value ?? 0);
  return text.deathRecord(mark.value ?? 0);
}

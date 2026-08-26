import { TIMELINE_TEXT } from '../../config/messages';
import type { TimelineDay } from '../../lib/timeline';
import { TimelineMarkTag } from './TimelineMarkTag';

export interface TimelineDayRowProps {
  day: TimelineDay;
  /** この日の色。出来事のある日だけ強調色が来る。 */
  accent: string;
  /** 印になる出来事がある日か。線の上の丸を大きくする。 */
  marked: boolean;
  /** 前の日との空き。記録の無い日があったことを伝える。 */
  gapDays: number;
}

/**
 * 年表の 1 日。
 *
 * 左に縦線と丸、右に日付・その日の数・出来事の札を並べる。
 * 何を書くか（文言）と何色にするかは、渡された値をそのまま使う。
 */
export function TimelineDayRow({ day, accent, marked, gapDays }: TimelineDayRowProps) {
  const text = TIMELINE_TEXT.day;

  return (
    <li className="grid grid-cols-[auto_1fr] gap-lg">
      {/* 縦線と丸。線は行の高さいっぱいに引いて、日が連なって見えるようにする */}
      <div className="relative flex w-lg justify-center" aria-hidden>
        <span className="absolute inset-y-0 w-hairline bg-divider" />
        <span
          className={`relative mt-xs rounded-full ${marked ? 'size-sm' : 'size-xs'}`}
          style={{ backgroundColor: accent }}
        />
      </div>

      <div className="flex flex-col gap-xs pb-lg">
        {gapDays > 0 && <span className="text-xs text-subtle">{text.gap(gapDays)}</span>}
        <div className="flex flex-wrap items-baseline gap-md">
          <time className="text-md font-bold text-heading" dateTime={day.date}>
            {day.date}
          </time>
          <span className="text-sm text-muted">{text.people(day.people)}</span>
          <span className="text-xs text-subtle">{text.joins(day.joins)}</span>
          <span className="text-xs text-subtle">{text.deaths(day.deaths)}</span>
          {day.firstSeen && <span className="text-xs text-subtle">{text.firstSeen(day.firstSeen)}</span>}
        </div>
        {day.marks.length > 0 && (
          <div className="flex flex-wrap gap-xs">
            {day.marks.map((mark) => (
              <TimelineMarkTag key={`${day.date}-${mark.kind}`} mark={mark} accent={accent} />
            ))}
          </div>
        )}
      </div>
    </li>
  );
}

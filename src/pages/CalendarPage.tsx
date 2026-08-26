import { useMemo } from 'react';
import { ActivityCalendar, AppLayout, ChartCard, KpiGrid, KpiTile, Note } from '../components';
import { CalendarMarkTag } from '../components/molecules';
import { CALENDAR_TEXT } from '../config/messages';
import { playLog } from '../data/playLog';
import { buildCalendar } from '../lib/calendar';
import { calendarMarkAccent } from '../lib/display';
import { formatInt } from '../lib/format';
import { buildTimeline } from '../lib/timeline';
import type { VizTheme } from '../theme/palette';

export interface CalendarPageProps {
  theme: VizTheme;
}

/**
 * Minecraft の活動カレンダー。
 *
 * 日別ログに残っている日を暦に並べる。出来事は記録から拾うだけで、
 * ここで足したり言い換えたりはしない。記録より前のことは分からないので、
 * そう読めてしまう言い方をしない（messages.ts の disclaimer）。
 */
export function CalendarPage({ theme }: CalendarPageProps) {
  const timeline = useMemo(() => buildTimeline(playLog()), []);
  const months = useMemo(() => buildCalendar(timeline.days), [timeline]);
  const busiest = useMemo(
    () => timeline.days.reduce((most, day) => Math.max(most, day.people), 0),
    [timeline],
  );
  const kpi = CALENDAR_TEXT.kpi;
  /* 一覧はページの面に載るので、暦の枠の中とは別の濃さが要る */
  const markAccent = calendarMarkAccent(theme);

  if (timeline.days.length === 0) {
    return <Note tone="error">{CALENDAR_TEXT.disclaimer}</Note>;
  }

  /* 出来事は暦の枠に入りきらないので、印の付いた日だけを下に並べる */
  const marked = timeline.days.filter((day) => day.marks.length > 0);

  return (
    <AppLayout
      title={CALENDAR_TEXT.title}
      lead={CALENDAR_TEXT.lead}
      note={CALENDAR_TEXT.note(timeline.from, timeline.to)}
    >
      <KpiGrid>
        <KpiTile label={kpi.span} value={formatInt(timeline.days.length)} sub={kpi.spanUnit} />
        <KpiTile label={kpi.people} value={formatInt(timeline.people)} sub={kpi.peopleUnit} />
        <KpiTile label={kpi.joins} value={formatInt(timeline.totalJoins)} sub={kpi.joinsUnit} />
        <KpiTile label={kpi.deaths} value={formatInt(timeline.totalDeaths)} sub={kpi.deathsUnit} />
      </KpiGrid>

      <ChartCard title={CALENDAR_TEXT.daysTitle} note={CALENDAR_TEXT.disclaimer}>
        <ActivityCalendar months={months} busiest={busiest} theme={theme} />
      </ChartCard>

      <ChartCard title={CALENDAR_TEXT.marksTitle}>
        <ol className="flex flex-col gap-md">
          {marked.map((day) => (
            <li key={day.date} className="flex flex-wrap items-baseline gap-md">
              <time className="text-md font-bold text-heading tabular-nums" dateTime={day.date}>
                {day.date}
              </time>
              <div className="flex flex-wrap gap-xs">
                {day.marks.map((mark) => (
                  <CalendarMarkTag
                    key={`${day.date}-${mark.kind}`}
                    mark={mark}
                    accent={markAccent}
                  />
                ))}
              </div>
            </li>
          ))}
        </ol>
      </ChartCard>
    </AppLayout>
  );
}

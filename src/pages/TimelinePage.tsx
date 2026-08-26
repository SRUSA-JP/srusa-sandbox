import { useMemo } from 'react';
import { AppLayout, ChartCard, KpiGrid, KpiTile, Note, TimelineList } from '../components';
import { TIMELINE_TEXT } from '../config/messages';
import { playLog } from '../data/playLog';
import { formatInt } from '../lib/format';
import { buildTimeline } from '../lib/timeline';
import type { VizTheme } from '../theme/palette';

export interface TimelinePageProps {
  theme: VizTheme;
}

/**
 * サーバーのあゆみ。
 *
 * 日別ログに残っている日を古いほうから並べる。出来事は記録から拾うだけで、
 * ここで足したり言い換えたりはしない。記録より前のことは分からないので、
 * そう読めてしまう言い方をしない（messages.ts の disclaimer）。
 */
export function TimelinePage({ theme }: TimelinePageProps) {
  const timeline = useMemo(() => buildTimeline(playLog()), []);
  const kpi = TIMELINE_TEXT.kpi;

  if (timeline.days.length === 0) {
    return <Note tone="error">{TIMELINE_TEXT.disclaimer}</Note>;
  }

  return (
    <AppLayout
      title={TIMELINE_TEXT.title}
      lead={TIMELINE_TEXT.lead}
      note={TIMELINE_TEXT.note(timeline.from, timeline.to)}
    >
      <KpiGrid>
        <KpiTile label={kpi.span} value={formatInt(timeline.days.length)} sub={kpi.spanUnit} />
        <KpiTile label={kpi.people} value={formatInt(timeline.people)} sub={kpi.peopleUnit} />
        <KpiTile label={kpi.joins} value={formatInt(timeline.totalJoins)} sub={kpi.joinsUnit} />
        <KpiTile label={kpi.deaths} value={formatInt(timeline.totalDeaths)} sub={kpi.deathsUnit} />
      </KpiGrid>

      <ChartCard title={TIMELINE_TEXT.daysTitle} note={TIMELINE_TEXT.disclaimer}>
        <TimelineList timeline={timeline} theme={theme} />
      </ChartCard>
    </AppLayout>
  );
}

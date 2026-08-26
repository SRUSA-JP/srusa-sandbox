import { useMemo } from 'react';
import {
  AppLayout,
  ChartCard,
  HistoryTimeline,
  KpiGrid,
  KpiTile,
  Note,
  TrendLineChart,
} from '../components';
import { HISTORY_TEXT } from '../config/messages';
import { srusaHistory } from '../data/history';
import { loadRelationshipData } from '../map/data';
import { personLabel } from '../map/display';
import { formatInt } from '../lib/format';
import { memberGrowth, srusaReach } from '../lib/srusaReach';
import type { StackedSeries } from '../lib/selectors';
import type { VizTheme } from '../theme/palette';

export interface HistoryPageProps {
  theme: VizTheme;
}

/** 推移グラフに渡せる形にする。横軸の列名は TrendLineChart の既定に合わせる。 */
const GROWTH_SERIES_KEY = 'members';

/**
 * SRUSA というサークルそのものの年表。
 *
 * Minecraft のログからは「サークルがいつ始まったか」は出てこないので、
 * この画面は人が書いて残したもの（data/srusa-history-*.json）を出す。
 * 分かっていないことは分かっていないと書き、それらしい文で埋めない。
 */
export function HistoryPage({ theme }: HistoryPageProps) {
  const history = useMemo(() => srusaHistory(), []);
  const source = useMemo(() => loadRelationshipData(), []);
  const data = source?.data ?? null;

  const reach = useMemo(() => (data ? srusaReach(data) : null), [data]);
  const growth = useMemo(() => (data ? memberGrowth(data) : null), [data]);

  /* 人物 ID を、相関図と同じ表示名にする */
  const nameOf = useMemo(() => {
    const byId = new Map((data?.people ?? []).map((person) => [person.id, person]));
    return (personId: string) => {
      const person = byId.get(personId);
      return person ? personLabel(person, data?.project.nameMode ?? 'online') : personId;
    };
  }, [data]);

  const growthSeries: StackedSeries | null = growth
    ? {
        series: [{ key: GROWTH_SERIES_KEY, label: HISTORY_TEXT.growth.seriesLabel }],
        rows: growth.points.map((point) => ({
          date: point.month,
          [GROWTH_SERIES_KEY]: point.members,
        })),
      }
    : null;

  const confirmed = history.entries.filter((entry) => entry.status === 'confirmed');
  const pending = history.entries.filter((entry) => entry.status === 'todo');
  const text = HISTORY_TEXT;

  return (
    <AppLayout title={text.title} lead={text.lead}>
      {reach && (
        <ChartCard title={text.reach.title} note={text.reach.note}>
          <KpiGrid>
            <KpiTile
              label={text.reach.universities}
              value={formatInt(reach.universities.length)}
              sub={text.reach.universityList(reach.universities)}
            />
            <KpiTile
              label={text.reach.known}
              value={formatInt(reach.known)}
              sub={`${text.reach.knownUnit} / ${formatInt(reach.total)}${text.reach.knownUnit}`}
            />
            <KpiTile
              label={text.reach.bridging}
              value={formatInt(reach.bridging)}
              sub={text.reach.bridgingUnit}
            />
          </KpiGrid>
        </ChartCard>
      )}

      {growth && (
        <ChartCard
          title={text.growth.title}
          note={growth.points.length > 1 ? text.growth.note(growth.known, growth.total) : undefined}
        >
          {/*
           * 点が 1 つしかないと線にならない。無理に描くと「増えていない」ように
           * 見えてしまうので、何を足せば線になるかを書いて待つ。
           */}
          {growthSeries && growth.points.length > 1 ? (
            <TrendLineChart data={growthSeries} theme={theme} unit={text.growth.unit} />
          ) : (
            <Note>{text.growth.tooFew(growth.known, growth.total)}</Note>
          )}
        </ChartCard>
      )}

      <ChartCard title={text.timeline.title}>
        {confirmed.length > 0 ? (
          <HistoryTimeline entries={confirmed} nameOf={nameOf} />
        ) : (
          <Note>{text.timeline.empty}</Note>
        )}
      </ChartCard>

      {pending.length > 0 && (
        <ChartCard title={text.todo.title} note={text.todo.note}>
          <HistoryTimeline entries={pending} pending nameOf={nameOf} />
        </ChartCard>
      )}
    </AppLayout>
  );
}

import { useMemo } from 'react';
import { AppLayout, ChartCard, HistoryTimeline, KpiGrid, KpiTile, Note } from '../components';
import { HISTORY_TEXT } from '../config/messages';
import { srusaHistory } from '../data/history';
import { loadRelationshipData } from '../map/data';
import { formatInt } from '../lib/format';
import { srusaReach } from '../lib/srusaReach';

/**
 * SRUSA というサークルそのもののあゆみ。
 *
 * Minecraft のログからは「サークルがいつ始まったか」は出てこないので、
 * この画面は人が書いて残したもの（data/srusa-history-*.json）を出す。
 * 分かっていないことは分かっていないと書き、それらしい文で埋めない。
 *
 * 図を描かないので配色は受け取らない（他の画面と入口の形が違うのはそのため）。
 */
export function HistoryPage() {
  const history = useMemo(() => srusaHistory(), []);
  const source = useMemo(() => loadRelationshipData(), []);
  const reach = useMemo(() => (source ? srusaReach(source.data) : null), [source]);

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

      <ChartCard title={text.timeline.title}>
        {confirmed.length > 0 ? (
          <HistoryTimeline entries={confirmed} />
        ) : (
          <Note>{text.timeline.empty}</Note>
        )}
      </ChartCard>

      {pending.length > 0 && (
        <ChartCard title={text.todo.title} note={text.todo.note}>
          <HistoryTimeline entries={pending} pending />
        </ChartCard>
      )}
    </AppLayout>
  );
}

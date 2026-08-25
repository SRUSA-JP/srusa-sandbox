import { useEffect, useMemo, useState } from 'react';
import { AppLayout, ChartCard, DataTable, Note, Picker, RankBarChart } from '../components';
import { RankingPreviewCard } from '../components/molecules';
import {
  EVENT_RANKING_CHART_LIMIT,
  EVENT_RANKING_DEFAULT_EVENT_ID,
  EVENT_RANKING_DEFAULT_METRIC,
  EVENT_RANKING_HIGHLIGHT_LIMIT,
} from '../config/dataRegistry';
import { listDatasets, loadDataset } from '../data/datasets';
import {
  EVENT_METRIC_OPTIONS,
  EVENT_OPTIONS,
  eventRankingRows,
  rankedEventRows,
  type EventId,
  type EventMetric,
} from '../data/eventRankings';
import { playerPath } from '../data/playerProfiles';
import { playerRows, type PlayerRow } from '../lib/selectors';
import type { VizTheme } from '../theme/palette';

export interface EventRankingsPageProps {
  theme: VizTheme;
}

/** イベント通算ランキングの雛形。実データ接続前でも画面構成を確認できる。 */
export function EventRankingsPage({ theme }: EventRankingsPageProps) {
  const [players, setPlayers] = useState<PlayerRow[]>([]);
  const [error, setError] = useState('');
  const [eventId, setEventId] = useState<EventId>(EVENT_RANKING_DEFAULT_EVENT_ID);
  const [metric, setMetric] = useState<EventMetric>(EVENT_RANKING_DEFAULT_METRIC);
  const dataset = useMemo(() => listDatasets()[0], []);

  useEffect(() => {
    if (!dataset) return;
    let cancelled = false;
    loadDataset(dataset.id)
      .then((doc) => {
        if (!cancelled) setPlayers(playerRows(doc));
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : String(err));
      });
    return () => {
      cancelled = true;
    };
  }, [dataset]);

  const event = EVENT_OPTIONS.find((entry) => entry.value === eventId) ?? EVENT_OPTIONS[0];
  const metricOption = EVENT_METRIC_OPTIONS.find((entry) => entry.value === metric) ?? EVENT_METRIC_OPTIONS[0];
  const rows = useMemo(() => eventRankingRows(players, eventId), [players, eventId]);
  const ranked = useMemo(() => rankedEventRows(rows, metric), [metric, rows]);
  const chartRows = ranked.slice(0, EVENT_RANKING_CHART_LIMIT).map((row) => ({
    key: row.name,
    label: row.name,
    value: row[metric],
  }));

  if (error) return <Note tone="error">{error}</Note>;

  return (
    <AppLayout
      title="イベントランキング"
      note={dataset ? `登場人物: Minecraft 統計 ${dataset.label} から仮配置` : undefined}
      lead="マージャンやイベントの通算成績を集計するページの雛形です。実イベントデータを接続する前提で、まず一覧・ランキング・表の形を置いています。"
    >
      <ChartCard
        title={`${event.label} 通算ランキング`}
        note={`${event.note} 現在の数値は画面確認用の仮データです。`}
        actions={
          <>
            <Picker showLabel label="イベント" value={eventId} options={EVENT_OPTIONS} onChange={setEventId} />
            <Picker showLabel label="指標" value={metric} options={EVENT_METRIC_OPTIONS} onChange={setMetric} />
          </>
        }
      >
        {chartRows.length > 0 ? (
          <RankBarChart data={chartRows} theme={theme} unit={metricOption.unit} height={320} />
        ) : (
          <Note>表示できるプレイヤーがまだありません。</Note>
        )}
      </ChartCard>

      <section className="grid gap-md lg:grid-cols-3">
        {ranked.slice(0, EVENT_RANKING_HIGHLIGHT_LIMIT).map((row, index) => {
          const accent = theme.categorical[index % theme.categorical.length] ?? theme.accent;
          return (
            <RankingPreviewCard
              key={row.name}
              title={row.name}
              subtitle={`${event.label} #${row.rank}`}
              value={row[metric]}
              unit={metricOption.unit.trim()}
              rank={row.rank}
              playerName={row.name}
              href={playerPath(row.name)}
              accent={accent}
            />
          );
        })}
      </section>

      <ChartCard title="通算データ表" note="実データ接続時は、この表にイベントログ由来の累計値を入れる想定です。">
        <DataTable
          rows={ranked.map((row) => ({
            rank: row.rank,
            name: row.name,
            points: row.points,
            wins: row.wins,
            participations: row.participations,
            note: row.note,
          }))}
          columns={[
            { key: 'rank', label: '順位', align: 'right' },
            { key: 'name', label: '名前', align: 'left' },
            { key: 'points', label: '通算ポイント', align: 'right' },
            { key: 'wins', label: '勝利数', align: 'right' },
            { key: 'participations', label: '参加回数', align: 'right' },
            { key: 'note', label: '状態', align: 'left' },
          ]}
          csvName={`event-ranking-${eventId}.csv`}
          initialSort={metric}
        />
      </ChartCard>
    </AppLayout>
  );
}

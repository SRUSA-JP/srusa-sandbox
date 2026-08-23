import { useState } from 'react';
import { PLAYER_RANKING_DEFAULT_BREAKDOWN } from '../../config/dataRegistry';
import { BREAKDOWNS, type BreakdownId } from '../../config';
import type { ItemMetric, NamedPlayer, StatsDocument } from '../../data/schema';
import { joinNotes } from '../../lib/display';
import { deathCauseRanking, itemRanking, killRanking, type Entry } from '../../lib/selectors';
import type { VizTheme } from '../../theme/palette';
import { Note, Picker } from '../atoms';
import { ChartCard } from './ChartCard';
import { RankBarChart } from './RankBarChart';

function topEntries(entries: Entry[], count = 8): Entry[] {
  return entries.filter((entry) => entry.value > 0).slice(0, count);
}

function playerRankingData(doc: StatsDocument, playerName: string, ranking: BreakdownId): Entry[] {
  if (ranking === 'kills') return topEntries(killRanking(doc, { players: [playerName] }));
  if (ranking === 'death_causes') return topEntries(deathCauseRanking(doc, { players: [playerName] }));
  return topEntries(itemRanking(doc, ranking as ItemMetric, { players: [playerName] }));
}

export interface PlayerRankingPanelProps {
  doc: StatsDocument;
  player: NamedPlayer;
  theme: VizTheme;
  generatedOn: string;
}

/** プレイヤー単体の内訳ランキングを1つのプルダウンで切り替えるパネル。 */
export function PlayerRankingPanel({ doc, player, theme, generatedOn }: PlayerRankingPanelProps) {
  const [ranking, setRanking] = useState<BreakdownId>(PLAYER_RANKING_DEFAULT_BREAKDOWN);
  const option = BREAKDOWNS.find((entry) => entry.value === ranking) ?? BREAKDOWNS[0];
  const data = playerRankingData(doc, player.name, ranking);

  return (
    <ChartCard
      title={`${option.label}ランキング`}
      note={joinNotes('このプレイヤー単体のランキングです。', option.note, ` 更新 ${generatedOn}`)}
      actions={
        <Picker
          label="ランキング"
          value={ranking}
          options={BREAKDOWNS.map((entry) => ({ value: entry.value, label: entry.label }))}
          onChange={setRanking}
        />
      }
    >
      {data.length > 0 ? (
        <RankBarChart data={data} theme={theme} unit={option.unit} height={320} />
      ) : (
        <Note>このランキングに表示できるデータはありません。</Note>
      )}
    </ChartCard>
  );
}

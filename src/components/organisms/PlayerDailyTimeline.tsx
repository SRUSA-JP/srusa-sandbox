import { useMemo, useState } from 'react';
import { PLAYER_DAILY_DEFAULT_METRIC, PLAYER_DAILY_RANKING_LIMIT } from '../../config/dataRegistry';
import {
  lastActivePlayerDailyRow,
  PLAYER_DAILY_CATEGORY_KEY,
  PLAYER_DAILY_METRICS,
  playerDailyMetricOption,
  playerDailyNames,
  playerDailyTimeline,
  playerDailyTotals,
  type PlayerDailyDocument,
  type PlayerDailyMetricKey,
} from '../../data/playerDaily';
import { playerDataHighlightColors, playerDataHighlightLevel } from '../../config/colors';
import { joinNotes } from '../../lib/display';
import { formatCompact, formatDecimal, formatHours, formatInt } from '../../lib/format';
import { SECTION } from '../classes';
import { Picker } from '../atoms';
import { PlayerIconPlaceholder, SectionHeader } from '../molecules';
import type { VizTheme } from '../../theme/palette';
import { TrendLineChart } from './TrendLineChart';

export interface PlayerDailyTimelineText {
  title: string;
  note: string;
  player: string;
  metric: string;
  lastActive: string;
  total: string;
  empty: string;
  playerList: string;
  skinAlt: (name: string) => string;
}

export interface PlayerDailyTimelineProps {
  doc: PlayerDailyDocument;
  text: PlayerDailyTimelineText;
  theme: VizTheme;
  profileHref?: (name: string) => string;
}

function metricValue(metric: PlayerDailyMetricKey, value: number): string {
  switch (metric) {
    case 'playtime_hours':
      return formatHours(value);
    case 'distance_km':
      return `${formatDecimal(value)} km`;
    case 'damage_dealt_hp':
    case 'damage_taken_hp':
      return `${formatDecimal(value)} HP`;
    case 'blocks_mined':
    case 'items_crafted':
    case 'items_used':
    case 'items_picked_up':
    case 'items_dropped':
      return formatCompact(value);
    default:
      return formatInt(value);
  }
}

function periodLabel(from: string, to: string): string {
  return `${from.slice(5, 10)} -> ${to.slice(5, 10)}`;
}

/** 日付別の増分データを、プレイヤー単位で追えるパーソナルビュー。 */
export function PlayerDailyTimeline({ doc, text, theme, profileHref }: PlayerDailyTimelineProps) {
  const players = useMemo(() => playerDailyNames(doc), [doc]);
  const [selectedPlayer, setSelectedPlayer] = useState(players[0] ?? '');
  const [metric, setMetric] = useState<PlayerDailyMetricKey>(PLAYER_DAILY_DEFAULT_METRIC);
  const effectivePlayer = players.includes(selectedPlayer) ? selectedPlayer : players[0];
  const metricOption = playerDailyMetricOption(metric);
  const totals = effectivePlayer ? playerDailyTotals(doc, effectivePlayer) : null;
  const lastActive = effectivePlayer ? lastActivePlayerDailyRow(doc, effectivePlayer) : null;
  const chartData = effectivePlayer ? playerDailyTimeline(doc, metric, [effectivePlayer]) : { series: [], rows: [] };
  const playerTotals = useMemo(
    () =>
      players
        .map((player) => ({ player, value: playerDailyTotals(doc, player)[metric] }))
        .sort((a, b) => b.value - a.value),
    [doc, players, metric],
  );

  if (!effectivePlayer || !totals) return null;

  const accent = theme.categorical[Math.max(0, players.indexOf(effectivePlayer)) % theme.categorical.length] ?? theme.accent;
  const topValue = Math.max(...playerTotals.map((entry) => entry.value), 1);
  const averageValue = playerTotals.reduce((sum, entry) => sum + entry.value, 0) / Math.max(playerTotals.length, 1);
  const href = profileHref?.(effectivePlayer);

  return (
    <section className={SECTION}>
      <SectionHeader
        title={text.title}
        note={joinNotes(
          `${text.note} 更新 ${doc.generated_on}`,
          doc.playtime_source ? `プレイ時間はログの入退室から再計算しています（${doc.playtime_source}）。` : undefined,
        )}
        actions={
          <>
            <Picker
              label={text.player}
              value={effectivePlayer}
              options={players.map((player) => ({ value: player, label: player }))}
              onChange={setSelectedPlayer}
            />
            <Picker
              label={text.metric}
              value={metric}
              options={PLAYER_DAILY_METRICS}
              onChange={setMetric}
            />
          </>
        }
      />

      <div className="grid gap-lg lg:grid-cols-[minmax(220px,0.48fr)_minmax(0,1fr)]">
        <div className="grid min-w-0 gap-sm">
          <div className="flex min-w-0 items-center gap-md border-thick border-divider bg-surface p-md">
            <PlayerIconPlaceholder name={effectivePlayer} accent={accent} alt={text.skinAlt(effectivePlayer)} size="large" />
            <div className="min-w-0">
              <h3 className="truncate text-xl font-bold leading-tight text-heading">
                {href ? <a href={href} className="hover:underline">{effectivePlayer}</a> : effectivePlayer}
              </h3>
              <p className="font-mono text-sm font-bold text-muted">
                {text.total} {metricValue(metric, totals[metric])}
              </p>
              <p className="mt-xxs truncate text-sm text-muted">
                {lastActive ? `${text.lastActive} ${periodLabel(lastActive.from, lastActive.to)}` : text.empty}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-[repeat(auto-fit,minmax(96px,1fr))] gap-xs">
            {(['playtime_hours', 'distance_km', 'blocks_mined', 'mob_kills', 'items_used', 'chests_opened'] as const).map((key) => {
              const option = playerDailyMetricOption(key);
              const allValues = players.map((player) => playerDailyTotals(doc, player)[key]);
              const rank = [...allValues].sort((a, b) => b - a).findIndex((value) => value === totals[key]) + 1;
              const average = allValues.reduce((sum, value) => sum + value, 0) / Math.max(allValues.length, 1);
              const level = playerDataHighlightLevel({ rank, averageRatio: average > 0 ? totals[key] / average : 0 });
              const highlight = playerDataHighlightColors(theme, level, accent);
              return (
                <div
                  key={key}
                  className="min-w-0 border-hairline p-xs"
                  style={{ borderColor: highlight.border, backgroundColor: highlight.fill }}
                >
                  <p className="truncate text-xs font-bold text-muted">{option.label}</p>
                  <p className="truncate font-mono text-md font-bold leading-tight text-heading">
                    {metricValue(key, totals[key])}
                  </p>
                </div>
              );
            })}
          </div>

          <details className="border-hairline border-divider bg-surface">
            <summary className="cursor-pointer px-sm py-xs text-sm font-bold text-muted hover:bg-hover">
              {text.playerList}
            </summary>
            <div className="grid gap-xs border-t-hairline border-divider p-xs">
              {playerTotals.slice(0, PLAYER_DAILY_RANKING_LIMIT).map((entry, index) => {
                const rowAccent = theme.categorical[players.indexOf(entry.player) % theme.categorical.length] ?? theme.accent;
                const selected = entry.player === effectivePlayer;
                const level = playerDataHighlightLevel({
                  rank: index + 1,
                  averageRatio: averageValue > 0 ? entry.value / averageValue : 0,
                });
                const highlight = playerDataHighlightColors(theme, level, rowAccent);
                return (
                  <button
                    key={entry.player}
                    type="button"
                    className={`grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-sm border-hairline p-xs text-left ${
                      selected ? 'border-focus' : 'border-divider hover:bg-hover'
                    }`}
                    style={{
                      borderColor: selected ? undefined : highlight.border,
                      backgroundColor: highlight.fill,
                    }}
                    onClick={() => setSelectedPlayer(entry.player)}
                  >
                    <PlayerIconPlaceholder name={entry.player} accent={rowAccent} alt={text.skinAlt(entry.player)} />
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-heading">{entry.player}</span>
                      <span className="mt-xxs block h-[calc(var(--sr-border-thick)*2)] bg-sunken" aria-hidden>
                        <span
                          className="block h-full"
                          style={{ width: `${(entry.value / topValue) * 100}%`, backgroundColor: highlight.bar }}
                        />
                      </span>
                    </span>
                    <span className="font-mono text-sm font-bold" style={{ color: highlight.text }}>
                      #{index + 1}
                    </span>
                  </button>
                );
              })}
            </div>
          </details>
        </div>

        <div className="min-w-0 border-thick border-divider bg-surface p-md">
          <TrendLineChart
            data={chartData}
            theme={theme}
            categoryKey={PLAYER_DAILY_CATEGORY_KEY}
            unit={metricOption.unit}
          />
        </div>
      </div>
    </section>
  );
}

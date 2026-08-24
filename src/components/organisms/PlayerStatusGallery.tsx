import { useState } from 'react';
import { BASIS_OPTIONS } from '../../config';
import { playerDataHighlightColors, playerDataHighlightLevel } from '../../config/colors';
import type { PlayerMetricId, PlayerStatus, PlayerStatusMetric, PlaystyleId } from '../../lib/statsExperience';
import type { RateBasis } from '../../lib/selectors';
import { playstyleAxisOrder, unitFor } from '../../lib/display';
import { formatCompact, formatDecimal, formatHours, formatInt } from '../../lib/format';
import { withAlpha, type VizTheme } from '../../theme/palette';
import { SECTION } from '../classes';
import { Picker } from '../atoms';
import { PlayerIconPlaceholder, SectionHeader } from '../molecules';

export interface PlayerStatusText {
  title: string;
  note: string;
  primary: string;
  rarest: string;
  level: (level: number) => string;
  skinAlt: (name: string) => string;
  selectPlayer: string;
  selectPlayerAlt: (name: string) => string;
  basis: string;
  styles: Record<PlaystyleId, string>;
  descriptions: Record<PlaystyleId, string>;
  achievementTitles: Record<PlaystyleId | 'diamond' | 'fallen', string>;
  metrics: Record<PlayerMetricId, string>;
}

export interface PlayerStatusGalleryProps {
  players: PlayerStatus[];
  text: PlayerStatusText;
  theme: VizTheme;
  basis: RateBasis;
  onBasisChange: (basis: RateBasis) => void;
  selectedName?: string;
  onSelectedNameChange?: (name: string) => void;
  profileHref?: (name: string) => string;
}

const RADAR_CENTER = 60;
const RADAR_RADIUS = 34;
const RADAR_LABEL_RADIUS = 53;
const RADAR_RINGS = [0.25, 0.5, 0.75, 1] as const;

function radarPoint(index: number, total: number, radius: number) {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / total;
  return {
    x: RADAR_CENTER + Math.cos(angle) * radius,
    y: RADAR_CENTER + Math.sin(angle) * radius,
  };
}

function radarPoints(total: number, radius: number): string {
  return Array.from({ length: total }, (_, index) => {
    const point = radarPoint(index, total, radius);
    return `${point.x},${point.y}`;
  }).join(' ');
}

function radarLabelAnchor(x: number): 'start' | 'middle' | 'end' {
  const delta = x - RADAR_CENTER;
  if (delta > 8) return 'start';
  if (delta < -8) return 'end';
  return 'middle';
}

function PlaystyleRadar({
  player,
  text,
  accent,
  theme,
}: {
  player: PlayerStatus;
  text: PlayerStatusText;
  accent: string;
  theme: VizTheme;
}) {
  /* 軸はプレイヤーによらず同じ順番。強弱は形と順位の数字で読ませる */
  const axisScores = playstyleAxisOrder(player.scores);
  const points = axisScores
    .map((score, index) => {
      const point = radarPoint(index, axisScores.length, (score.value / 100) * RADAR_RADIUS);
      return `${point.x},${point.y}`;
    })
    .join(' ');
  const ariaLabel = axisScores
    .map((score) => `${text.styles[score.id]} ${score.value}`)
    .join(' / ');

  return (
    <div className="border-hairline border-divider bg-sunken p-xs" aria-label={ariaLabel}>
      <svg viewBox="0 0 120 120" role="img" className="aspect-square w-full">
        {RADAR_RINGS.map((ring) => (
          <polygon
            key={ring}
            points={radarPoints(axisScores.length, RADAR_RADIUS * ring)}
            fill="none"
            stroke={theme.border}
            strokeWidth="0.8"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {axisScores.map((score, index) => {
          const axis = radarPoint(index, axisScores.length, RADAR_RADIUS);
          const label = radarPoint(index, axisScores.length, RADAR_LABEL_RADIUS);
          const anchor = radarLabelAnchor(label.x);
          return (
            <g key={score.id}>
              <line
                x1={RADAR_CENTER}
                y1={RADAR_CENTER}
                x2={axis.x}
                y2={axis.y}
                stroke={theme.border}
                strokeWidth="0.8"
                vectorEffect="non-scaling-stroke"
              />
              <text
                x={label.x}
                y={label.y}
                textAnchor={anchor}
                dominantBaseline="central"
                fill={theme.textSecondary}
                fontSize="5.4"
                fontWeight="650"
              >
                <tspan>{score.rank}</tspan>
                <tspan dx="1.5">{text.styles[score.id]}</tspan>
              </text>
            </g>
          );
        })}
        <polygon
          points={points}
          fill={withAlpha(accent, 0.24)}
          stroke={accent}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        {axisScores.map((score, index) => {
          const point = radarPoint(index, axisScores.length, (score.value / 100) * RADAR_RADIUS);
          return <circle key={score.id} cx={point.x} cy={point.y} r="1.8" fill={accent} />;
        })}
      </svg>
    </div>
  );
}

const PLAYER_METRIC_UNITS: Record<PlayerMetricId, string> = {
  playtime: '',
  distance: ' km',
  deaths: ' 回',
  mobKills: ' 体',
  blocksMined: ' 個',
  advancements: ' 件',
};

function formatMetricValue(metric: PlayerStatusMetric, basis: RateBasis): string {
  switch (metric.id) {
    case 'playtime':
      return formatHours(metric.value);
    case 'distance':
      return `${formatCompact(metric.value)}${unitFor(PLAYER_METRIC_UNITS.distance, basis)}`;
    case 'blocksMined':
      return `${formatCompact(metric.value)}${unitFor(PLAYER_METRIC_UNITS.blocksMined, basis)}`;
    default:
      return `${basis === 'total' ? formatInt(metric.value) : formatDecimal(metric.value)}${unitFor(
        PLAYER_METRIC_UNITS[metric.id],
        basis,
      )}`;
  }
}

function PlayerStatTile({
  label,
  metric,
  accent,
  total,
  theme,
  basis,
}: {
  label: string;
  metric: PlayerStatusMetric;
  accent: string;
  total: number;
  theme: VizTheme;
  basis: RateBasis;
}) {
  const level = playerDataHighlightLevel({ rank: metric.rank, averageRatio: metric.averageRatio });
  const colors = playerDataHighlightColors(theme, level, accent);
  return (
    <div
      className="grid min-w-0 gap-xxs border-hairline p-xs"
      style={{ borderColor: colors.border, backgroundColor: colors.fill }}
    >
      <div className="flex min-w-0 items-start justify-between gap-xs">
        <p className="truncate text-xs font-bold leading-tight text-muted">{label}</p>
        <p className="shrink-0 font-mono text-xs font-bold leading-tight" style={{ color: colors.text }}>
          #{metric.rank}/{total}
        </p>
      </div>
      <p className="truncate font-mono text-md font-bold leading-tight text-heading">
        {formatMetricValue(metric, metric.id === 'playtime' ? 'total' : basis)}
      </p>
      <div className="h-[calc(var(--sr-border-thick)*2)] bg-surface" aria-hidden>
        <div className="h-full" style={{ width: `${metric.percentOfMax}%`, backgroundColor: colors.bar }} />
      </div>
      <p className="truncate text-xs leading-tight text-muted">AVG x{formatDecimal(metric.averageRatio)}</p>
    </div>
  );
}

function PlayerStatusCard({
  player,
  text,
  accent,
  theme,
  totalPlayers,
  basis,
  profileHref,
}: {
  player: PlayerStatus;
  text: PlayerStatusText;
  accent: string;
  theme: VizTheme;
  totalPlayers: number;
  basis: RateBasis;
  profileHref?: (name: string) => string;
}) {
  const href = profileHref?.(player.name);
  return (
    <article className="grid gap-lg border-thick border-divider bg-surface p-lg lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.25fr)]">
      <div className="grid min-w-0 gap-md">
        <div className="flex min-w-0 items-start gap-md">
          <PlayerIconPlaceholder name={player.name} accent={accent} alt={text.skinAlt(player.name)} size="large" />
          <div className="min-w-0">
            <h3 className="truncate text-2xl font-bold leading-tight text-heading">
              {href ? <a href={href} className="hover:underline">{player.name}</a> : player.name}
            </h3>
            <p className="font-mono text-md font-bold text-muted">{text.achievementTitles[player.title]}</p>
            <p className="mt-xxs text-sm text-muted">{text.level(player.level)}</p>
          </div>
        </div>

        <div className="border-hairline border-divider bg-sunken p-md">
          <p className="text-xs font-bold text-muted">{text.primary}</p>
          <p className="font-mono text-lg font-bold leading-tight text-heading">{text.styles[player.primary]}</p>
          <p className="mt-xs text-sm leading-base text-muted">{text.descriptions[player.description]}</p>
        </div>

        <div className="grid grid-cols-[repeat(auto-fit,minmax(112px,1fr))] gap-xs">
          {player.metrics.map((metric) => (
            <PlayerStatTile
              key={metric.id}
              label={text.metrics[metric.id]}
              metric={metric}
              accent={accent}
              total={totalPlayers}
              theme={theme}
              basis={basis}
            />
          ))}
        </div>
      </div>

      <div className="grid min-w-0 gap-md sm:grid-cols-[minmax(160px,0.72fr)_minmax(0,1fr)]">
        <PlaystyleRadar player={player} text={text} accent={accent} theme={theme} />
        <div className="grid content-center gap-xs border-hairline border-divider bg-sunken p-xs">
          <div className="mb-xxs grid gap-xxs border-b-hairline border-divider pb-xs">
            <p className="text-xs font-bold text-muted">{text.rarest}</p>
            <p className="font-mono text-md font-bold leading-tight text-heading">
              {text.styles[player.rarest]} #{player.rarestRank}
            </p>
          </div>
            {player.scores.map((score) => (
              <div key={score.id} className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-sm text-sm">
                <span className="truncate font-bold text-muted">{text.styles[score.id]}</span>
                <span className="font-mono font-bold text-heading">{score.value}</span>
                <span className="col-span-2 h-[calc(var(--sr-border-thick)*2)] bg-surface">
                  <span
                    className="block h-full"
                    style={{
                      width: `${score.value}%`,
                      backgroundColor: score.rank === 1 ? accent : withAlpha(accent, 0.52),
                    }}
                  />
                </span>
              </div>
            ))}
        </div>
      </div>
    </article>
  );
}

/** プレイヤーごとの遊び方をステータスカードとして比較する。 */
export function PlayerStatusGallery({
  players,
  text,
  theme,
  basis,
  onBasisChange,
  selectedName,
  onSelectedNameChange,
  profileHref,
}: PlayerStatusGalleryProps) {
  const [internalSelectedName, setInternalSelectedName] = useState(players[0]?.name ?? '');
  const activeName = selectedName ?? internalSelectedName;
  const selectPlayer = onSelectedNameChange ?? setInternalSelectedName;
  const selectedPlayer = players.find((player) => player.name === activeName) ?? players[0];
  const selectedIndex = Math.max(
    0,
    players.findIndex((player) => player.name === selectedPlayer?.name),
  );
  const selectedAccent = theme.categorical[selectedIndex % theme.categorical.length] ?? theme.accent;

  if (!selectedPlayer) return null;

  return (
    <section className={SECTION}>
      <SectionHeader
        title={text.title}
        note={text.note}
        actions={<Picker label={text.basis} value={basis} options={BASIS_OPTIONS} onChange={onBasisChange} />}
      />
      <PlayerStatusCard
        player={selectedPlayer}
        text={text}
        accent={selectedAccent}
        theme={theme}
        totalPlayers={players.length}
        basis={basis}
        profileHref={profileHref}
      />

      <div className="mt-lg">
        <p className="mb-sm text-sm font-bold text-muted">{text.selectPlayer}</p>
        <div className="flex gap-sm overflow-x-auto pb-sm" role="listbox" aria-label={text.selectPlayer}>
          {players.map((player, playerIndex) => {
            const accent = theme.categorical[playerIndex % theme.categorical.length] ?? theme.accent;
            const selected = player.name === selectedPlayer.name;
            return (
              <button
                key={player.name}
                type="button"
                className={`shrink-0 border-thick bg-surface p-xs ${
                  selected ? 'border-focus' : 'border-divider hover:bg-hover'
                }`}
                onClick={() => selectPlayer(player.name)}
                aria-label={text.selectPlayerAlt(player.name)}
                aria-selected={selected}
                role="option"
              >
                <PlayerIconPlaceholder name={player.name} accent={accent} alt={text.skinAlt(player.name)} />
                <span className="mt-xxs block max-w-[var(--sr-space-section)] truncate text-xs text-muted">
                  {player.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

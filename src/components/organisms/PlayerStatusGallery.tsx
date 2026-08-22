import { useState } from 'react';
import type { PlayerStatus, PlaystyleId } from '../../lib/statsExperience';
import { withAlpha, type VizTheme } from '../../theme/palette';
import { SECTION } from '../classes';
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
  styles: Record<PlaystyleId, string>;
  descriptions: Record<PlaystyleId, string>;
  achievementTitles: Record<PlaystyleId | 'diamond' | 'fallen', string>;
}

export interface PlayerStatusGalleryProps {
  players: PlayerStatus[];
  text: PlayerStatusText;
  theme: VizTheme;
}

const RADAR_CENTER = 50;
const RADAR_RADIUS = 34;
const RADAR_LABEL_RADIUS = 43;
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
  const points = player.scores
    .map((score, index) => {
      const point = radarPoint(index, player.scores.length, (score.value / 100) * RADAR_RADIUS);
      return `${point.x},${point.y}`;
    })
    .join(' ');
  const ariaLabel = player.scores
    .map((score) => `${text.styles[score.id]} ${score.value}`)
    .join(' / ');

  return (
    <div className="border-hairline border-divider bg-sunken p-xs" aria-label={ariaLabel}>
      <svg viewBox="0 0 100 100" role="img" className="aspect-square w-full">
        {RADAR_RINGS.map((ring) => (
          <polygon
            key={ring}
            points={radarPoints(player.scores.length, RADAR_RADIUS * ring)}
            fill="none"
            stroke={theme.border}
            strokeWidth="0.8"
            vectorEffect="non-scaling-stroke"
          />
        ))}
        {player.scores.map((score, index) => {
          const axis = radarPoint(index, player.scores.length, RADAR_RADIUS);
          const label = radarPoint(index, player.scores.length, RADAR_LABEL_RADIUS);
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
                textAnchor="middle"
                dominantBaseline="central"
                fill={theme.textSecondary}
                fontSize="6"
                fontWeight="650"
              >
                {index + 1}
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
        {player.scores.map((score, index) => {
          const point = radarPoint(index, player.scores.length, (score.value / 100) * RADAR_RADIUS);
          return <circle key={score.id} cx={point.x} cy={point.y} r="1.8" fill={accent} />;
        })}
      </svg>
    </div>
  );
}

function PlayerStatusCard({
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
  return (
    <article className="grid gap-xl border-thick border-divider bg-surface p-lg md:grid-cols-[auto_minmax(0,1fr)]">
      <div className="flex items-start gap-lg md:flex-col">
        <PlayerIconPlaceholder name={player.name} accent={accent} alt={text.skinAlt(player.name)} size="large" />
        <div className="min-w-0">
          <h3 className="truncate text-xl font-bold leading-tight text-heading">{player.name}</h3>
          <p className="text-md text-muted">{text.level(player.level)}</p>
        </div>
      </div>

      <div className="min-w-0">
        <div className="mb-lg border-hairline border-divider bg-sunken p-md">
          <p className="text-xs font-bold text-muted">{text.primary}</p>
          <p className="font-mono text-lg font-bold leading-tight text-heading">{text.styles[player.primary]}</p>
          <p className="mt-xs text-sm leading-base text-muted">{text.descriptions[player.description]}</p>
        </div>

        <div className="mb-lg grid gap-sm sm:grid-cols-[minmax(0,0.7fr)_minmax(0,1fr)]">
          <PlaystyleRadar player={player} text={text} accent={accent} theme={theme} />
          <div className="grid content-center gap-xs border-hairline border-divider bg-sunken p-xs">
            {player.scores.map((score, index) => (
              <div key={score.id} className="flex min-w-0 items-center justify-between gap-md text-sm">
                <span className="truncate font-bold text-muted">
                  {index + 1}. {text.styles[score.id]}
                </span>
                <span className="font-mono font-bold text-heading">{score.value}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-xs border-t-hairline border-divider pt-md">
          <p className="text-xs font-bold text-muted">{text.rarest}</p>
          <p className="font-mono text-md font-bold text-heading">
            {text.styles[player.rarest]} #{player.rarestRank}
          </p>
          <p className="text-sm text-muted">{text.achievementTitles[player.title]}</p>
        </div>
      </div>
    </article>
  );
}

/** プレイヤーごとの遊び方をステータスカードとして比較する。 */
export function PlayerStatusGallery({ players, text, theme }: PlayerStatusGalleryProps) {
  const [selectedName, setSelectedName] = useState(players[0]?.name ?? '');
  const selectedPlayer = players.find((player) => player.name === selectedName) ?? players[0];
  const selectedIndex = Math.max(
    0,
    players.findIndex((player) => player.name === selectedPlayer?.name),
  );
  const selectedAccent = theme.categorical[selectedIndex % theme.categorical.length] ?? theme.accent;

  if (!selectedPlayer) return null;

  return (
    <section className={SECTION}>
      <SectionHeader title={text.title} note={text.note} />
      <PlayerStatusCard player={selectedPlayer} text={text} accent={selectedAccent} theme={theme} />

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
              onClick={() => setSelectedName(player.name)}
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

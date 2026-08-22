import { useState } from 'react';
import type { PlayerStatus, PlaystyleId } from '../../lib/statsExperience';
import type { VizTheme } from '../../theme/palette';
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

        <div className="mb-lg flex flex-col gap-sm">
          {player.scores.map((score, scoreIndex) => {
            const color = theme.categorical[scoreIndex % theme.categorical.length] ?? theme.accent;
            return (
              <div key={score.id} className="min-w-0">
                <div className="mb-xxs flex items-center justify-between gap-md text-sm">
                  <span className="font-bold text-muted">{text.styles[score.id]}</span>
                  <span className="font-mono text-heading">{score.value}</span>
                </div>
                <div className="h-[var(--sr-space-xs)] border-hairline border-divider bg-sunken">
                  <div className="h-full" style={{ width: `${score.value}%`, backgroundColor: color }} />
                </div>
              </div>
            );
          })}
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

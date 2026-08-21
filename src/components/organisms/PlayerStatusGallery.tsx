import type { PlayerStatus, PlaystyleId } from '../../lib/statsExperience';
import { withAlpha, type VizTheme } from '../../theme/palette';
import { SECTION } from '../classes';
import { SectionHeader } from '../molecules/SectionHeader';

export interface PlayerStatusText {
  title: string;
  note: string;
  primary: string;
  rarest: string;
  level: (level: number) => string;
  styles: Record<PlaystyleId, string>;
  descriptions: Record<PlaystyleId, string>;
  achievementTitles: Record<PlaystyleId | 'diamond' | 'fallen', string>;
}

export interface PlayerStatusGalleryProps {
  players: PlayerStatus[];
  text: PlayerStatusText;
  theme: VizTheme;
}

/** プレイヤーごとの遊び方をステータスカードとして比較する。 */
export function PlayerStatusGallery({ players, text, theme }: PlayerStatusGalleryProps) {
  return (
    <section className={SECTION}>
      <SectionHeader title={text.title} note={text.note} />
      <div className="flex gap-lg overflow-x-auto pb-sm">
        {players.map((player, playerIndex) => {
          const accent = theme.categorical[playerIndex % theme.categorical.length] ?? theme.accent;
          return (
            <article
              key={player.name}
              className="w-[min(78vw,320px)] shrink-0 border-thick border-divider bg-surface p-lg"
            >
              <div className="mb-lg flex items-start justify-between gap-md">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-bold leading-tight text-heading">{player.name}</h3>
                  <p className="text-sm text-muted">{text.level(player.level)}</p>
                </div>
                <div
                  className="grid size-[var(--sr-space-section)] place-items-center border-thick font-bold text-heading"
                  style={{ borderColor: accent, backgroundColor: withAlpha(accent, 0.16) }}
                  aria-hidden
                >
                  {player.name.slice(0, 2).toUpperCase()}
                </div>
              </div>

              <div className="mb-lg border-hairline border-divider bg-sunken p-md">
                <p className="text-xs font-bold text-muted">{text.primary}</p>
                <p className="font-mono text-lg font-bold leading-tight text-heading">
                  {text.styles[player.primary]}
                </p>
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
                        <div
                          className="h-full"
                          style={{ width: `${score.value}%`, backgroundColor: color }}
                        />
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
            </article>
          );
        })}
      </div>
    </section>
  );
}

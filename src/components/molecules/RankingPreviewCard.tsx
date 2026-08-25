import { playerPath } from '../../data/playerProfiles';
import { formatInt } from '../../lib/format';
import { PlayerIconPlaceholder } from './PlayerIconPlaceholder';

export interface RankingPreviewCardProps {
  title: string;
  value: number;
  accent: string;
  subtitle?: string;
  unit?: string;
  rank?: number | null;
  playerName?: string;
  href?: string;
}

/** ランキングの横に添える小さな紹介カード。 */
export function RankingPreviewCard({
  title,
  value,
  accent,
  subtitle,
  unit = '',
  rank,
  playerName,
  href,
}: RankingPreviewCardProps) {
  const body = (
    <>
      <div className="flex min-w-0 items-center gap-sm">
        {playerName && <PlayerIconPlaceholder name={playerName} accent={accent} alt={`${playerName} のアイコン`} />}
        <span className="min-w-0">
          <span
            className="block truncate text-sm font-bold text-heading"
            style={{ borderLeft: `var(--sr-border-thick) solid ${accent}`, paddingLeft: 'var(--sr-space-xs)' }}
          >
            {title}
          </span>
          {subtitle && <span className="block truncate text-xs text-muted">{subtitle}</span>}
        </span>
        {rank && <span className="ml-auto shrink-0 font-mono text-xs text-muted">#{rank}</span>}
      </div>
      <p className="font-mono text-md font-bold text-heading">
        {formatInt(value)}
        {unit && <span className="ml-xxs text-xs text-muted">{unit}</span>}
      </p>
    </>
  );

  return (
    <a
      href={href ?? (playerName ? playerPath(playerName) : '#/minecraft')}
      className="grid min-w-0 gap-xs border-hairline border-divider bg-surface p-sm hover:bg-hover"
    >
      {body}
    </a>
  );
}

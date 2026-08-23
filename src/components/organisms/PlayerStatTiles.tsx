import type { NamedPlayer } from '../../data/schema';
import { formatCompact, formatDecimal, formatHours, formatInt } from '../../lib/format';
import type { VizTheme } from '../../theme/palette';
import { SECTION } from '../classes';

export type PlayerMainStatKey = 'playtime' | 'distance' | 'blocks_mined' | 'mobKills' | 'deaths' | 'items_crafted';

const PLAYER_MAIN_STATS: Array<{ key: PlayerMainStatKey; label: string }> = [
  { key: 'playtime', label: 'プレイ時間' },
  { key: 'distance', label: '移動距離' },
  { key: 'blocks_mined', label: '採掘' },
  { key: 'mobKills', label: 'Mob討伐' },
  { key: 'deaths', label: '死亡' },
  { key: 'items_crafted', label: 'クラフト' },
];

function statValue(player: NamedPlayer, key: PlayerMainStatKey): string {
  switch (key) {
    case 'playtime':
      return formatHours(player.playtime.hours);
    case 'distance':
      return `${formatDecimal(player.movement.total_km)} km`;
    case 'mobKills':
      return `${formatInt(player.combat.mob_kills)} 体`;
    case 'deaths':
      return `${formatInt(player.deaths.total)} 回`;
    case 'blocks_mined':
      return formatCompact(player.production.blocks_mined);
    case 'items_crafted':
      return formatCompact(player.production.items_crafted);
  }
}

export interface PlayerStatTilesProps {
  player: NamedPlayer;
  theme: VizTheme;
  generatedOn: string;
}

/** プレイヤーの代表的な統計値を横並びにするKPI群。 */
export function PlayerStatTiles({ player, theme, generatedOn }: PlayerStatTilesProps) {
  return (
    <section className={`${SECTION} grid grid-cols-[repeat(auto-fit,minmax(132px,1fr))] gap-xs`}>
      {PLAYER_MAIN_STATS.map((stat, index) => {
        const color = theme.categorical[index % theme.categorical.length] ?? theme.accent;
        return (
          <div key={stat.key} className="min-w-0 border-hairline border-divider bg-surface p-sm">
            <p className="truncate text-xs font-bold text-muted" style={{ borderLeft: `var(--sr-border-thick) solid ${color}`, paddingLeft: 'var(--sr-space-xs)' }}>
              {stat.label}
            </p>
            <p className="mt-xs truncate font-mono text-lg font-bold leading-tight text-heading">{statValue(player, stat.key)}</p>
            <p className="mt-xxs font-mono text-xs text-muted">更新 {generatedOn}</p>
          </div>
        );
      })}
    </section>
  );
}

import type { InventoryRecord } from '../../lib/statsExperience';
import { readableTextOn, withAlpha, type VizTheme } from '../../theme/palette';
import { SECTION } from '../classes';

export interface MinecraftHeroText {
  server: string;
  title: string;
  season: string;
  inventory: string;
}

export interface MinecraftHeroProps {
  text: MinecraftHeroText;
  records: InventoryRecord[];
  theme: VizTheme;
}

/** サーバー名と主要記録を Minecraft のインベントリ風に見せる導入部。 */
export function MinecraftHero({ text, records, theme }: MinecraftHeroProps) {
  return (
    <section
      className={`${SECTION} border-thick border-divider bg-sunken p-xl`}
      style={{
        backgroundImage: `linear-gradient(90deg, ${withAlpha(theme.borderStrong, 0.24)} 1px, transparent 1px), linear-gradient(${withAlpha(theme.borderStrong, 0.24)} 1px, transparent 1px)`,
        backgroundSize: 'var(--sr-space-xl) var(--sr-space-xl)',
      }}
    >
      <div className="grid gap-xl lg:grid-cols-[minmax(0,1fr)_minmax(320px,0.8fr)]">
        <div className="flex min-w-0 flex-col justify-between gap-xl">
          <div>
            <p className="mb-xs text-md font-bold text-muted">{text.server}</p>
            <h2 className="text-display font-bold leading-tight tracking-tight text-heading sm:text-xl">
              {text.title}
            </h2>
            <p className="mt-sm text-lg font-medium text-muted">{text.season}</p>
          </div>
          <div className="h-[var(--sr-space-md)] border-thick border-control-line bg-selected-subtle">
            <div className="h-full w-3/4 bg-selected" />
          </div>
        </div>

        <div className="min-w-0">
          <p className="mb-md text-sm font-bold text-muted">{text.inventory}</p>
          <div className="grid grid-cols-2 gap-md sm:grid-cols-4 lg:grid-cols-2">
            {records.map((record) => {
              const color = theme.categorical[record.colorIndex % theme.categorical.length] ?? theme.accent;
              return (
                <div
                  key={record.key}
                  className="border-thick border-divider bg-surface p-sm"
                >
                  <div
                    className="mb-sm grid aspect-square place-items-center border-thick border-divider font-bold"
                    style={{
                      backgroundColor: withAlpha(color, 0.22),
                      color: readableTextOn(theme.surface, theme),
                    }}
                    aria-hidden
                  >
                    <span
                      className="grid h-2/3 w-2/3 place-items-center border-thick font-bold leading-tight"
                      style={{ borderColor: color, color }}
                    >
                      {record.icon}
                    </span>
                  </div>
                  <p className="text-xs font-bold text-muted">{record.label}</p>
                  <p className="font-mono text-lg font-bold leading-tight text-heading">{record.value}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}

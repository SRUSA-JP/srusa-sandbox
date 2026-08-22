import type { Discovery, DiscoveryKind } from '../../lib/statsExperience';
import { slotSurface } from '../../lib/minecraftTextures';
import { readableTextOn, type VizTheme } from '../../theme/palette';
import { SectionHeader } from '../molecules/SectionHeader';

export interface DiscoveryBoardText {
  title: string;
  note: string;
  anomaly: string;
  kinds: Record<DiscoveryKind, string>;
}

export interface DiscoveryBoardProps {
  discoveries: Discovery[];
  text: DiscoveryBoardText;
  theme: VizTheme;
}

/** 自動抽出した面白い記録を、実績スロットのように並べる。 */
export function DiscoveryBoard({ discoveries, text, theme }: DiscoveryBoardProps) {
  return (
    <section className="mb-xxl">
      <SectionHeader title={text.title} note={text.note} />
      <div className="border-thick border-divider bg-sunken p-xs" style={slotSurface(theme)}>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(112px,1fr))] gap-xxs">
          {discoveries.map((discovery) => {
            const color = theme.categorical[discovery.colorIndex % theme.categorical.length] ?? theme.accent;
            const ink = readableTextOn(color, theme);
            return (
              <article
                key={discovery.key}
                className="grid aspect-square min-w-0 grid-rows-[minmax(0,1fr)_auto] border-thick border-divider bg-surface p-xxs"
                style={slotSurface(theme)}
                aria-label={`${discovery.kind === 'outlier' ? text.anomaly : text.kinds[discovery.kind]}: ${
                  discovery.player
                } ${discovery.value} ${discovery.metric}`}
              >
                <div className="grid min-h-0 place-items-center">
                  <div
                    className="grid size-[calc(var(--sr-space-xxl)*1.35)] place-items-center border-thick text-md font-bold"
                    style={{ ...slotSurface(theme, color), borderColor: color, color: ink }}
                    aria-hidden
                  >
                    {discovery.icon}
                  </div>
                </div>

                <div className="min-w-0 border-t-hairline border-divider pt-xxs">
                  <p className="truncate font-mono text-md font-bold leading-tight text-heading">
                    {discovery.value}
                  </p>
                  <p className="truncate text-xs font-bold leading-tight text-muted">{discovery.player}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

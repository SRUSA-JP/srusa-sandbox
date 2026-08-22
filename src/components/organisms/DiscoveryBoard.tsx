import type { Discovery, DiscoveryKind } from '../../lib/statsExperience';
import { readableTextOn, withAlpha, type VizTheme } from '../../theme/palette';
import { SECTION } from '../classes';
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
    <section className={SECTION}>
      <SectionHeader title={text.title} note={text.note} />
      <div className="grid gap-md grid-cols-[repeat(auto-fit,minmax(160px,1fr))]">
        {discoveries.map((discovery) => {
          const color = theme.categorical[discovery.colorIndex % theme.categorical.length] ?? theme.accent;
          const ink = readableTextOn(color, theme);
          return (
            <article
              key={discovery.key}
              className="flex aspect-square min-w-0 flex-col justify-between border-thick border-divider bg-surface p-md"
            >
              <div className="flex items-start justify-between gap-sm">
                <p
                  className="min-w-0 border-hairline px-xs py-xxs text-xs font-bold leading-tight"
                  style={{ borderColor: color, backgroundColor: withAlpha(color, 0.14), color }}
                >
                  {discovery.kind === 'outlier' ? text.anomaly : text.kinds[discovery.kind]}
                </p>
                <div
                  className="grid size-[var(--sr-space-xxl)] shrink-0 place-items-center border-thick text-sm font-bold"
                  style={{ backgroundColor: color, borderColor: color, color: ink }}
                  aria-hidden
                >
                  {discovery.icon}
                </div>
              </div>
              <div className="min-w-0">
                <h3 className="truncate text-lg font-bold leading-tight text-heading">{discovery.player}</h3>
                <p className="truncate font-mono text-lg font-bold leading-tight text-heading">
                  {discovery.value}
                </p>
                <p className="text-sm text-muted">{discovery.metric}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

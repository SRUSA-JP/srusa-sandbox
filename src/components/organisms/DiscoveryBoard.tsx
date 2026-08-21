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
      <div className="grid gap-lg md:grid-cols-2 xl:grid-cols-3">
        {discoveries.map((discovery) => {
          const color = theme.categorical[discovery.colorIndex % theme.categorical.length] ?? theme.accent;
          const ink = readableTextOn(color, theme);
          return (
            <article
              key={discovery.key}
              className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-md border-thick border-divider bg-surface p-lg"
            >
              <div
                className="grid size-[var(--sr-space-section)] place-items-center border-thick font-bold"
                style={{ backgroundColor: color, borderColor: color, color: ink }}
                aria-hidden
              >
                {discovery.icon}
              </div>
              <div className="min-w-0">
                <p
                  className="mb-xxs inline-flex border-hairline px-xs py-xxs text-xs font-bold"
                  style={{ borderColor: color, backgroundColor: withAlpha(color, 0.14), color }}
                >
                  {discovery.kind === 'outlier' ? text.anomaly : text.kinds[discovery.kind]}
                </p>
                <h3 className="truncate text-lg font-bold leading-tight text-heading">{discovery.player}</h3>
                <p className="font-mono text-display font-bold leading-tight text-heading">{discovery.value}</p>
                <p className="text-sm text-muted">{discovery.metric}</p>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

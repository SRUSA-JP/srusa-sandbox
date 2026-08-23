import { useState } from 'react';
import type { Discovery, DiscoveryKind } from '../../lib/statsExperience';
import type { VizTheme } from '../../theme/palette';
import { Picker } from '../atoms';
import { SectionHeader } from '../molecules/SectionHeader';

export interface DiscoveryBoardText {
  title: string;
  note: string;
  display: string;
  anomaly: string;
  kinds: Record<DiscoveryKind, string>;
}

export interface DiscoveryBoardProps {
  discoveries: Discovery[];
  text: DiscoveryBoardText;
  theme: VizTheme;
}

type DiscoveryDisplayMode = 'featured' | 'ranked' | 'compact';

const DISPLAY_OPTIONS: Array<{ value: DiscoveryDisplayMode; label: string }> = [
  { value: 'featured', label: '注目' },
  { value: 'ranked', label: 'ランキング' },
  { value: 'compact', label: 'コンパクト' },
];

function discoveryTitle(discovery: Discovery, text: DiscoveryBoardText): string {
  return discovery.kind === 'outlier' ? text.anomaly : text.kinds[discovery.kind];
}

/** 自動抽出した面白い記録を、読み取りやすい注目リストとして並べる。 */
export function DiscoveryBoard({ discoveries, text, theme }: DiscoveryBoardProps) {
  const [mode, setMode] = useState<DiscoveryDisplayMode>('featured');
  const featured = discoveries[0];

  return (
    <section className="mb-xxl">
      <SectionHeader
        title={text.title}
        note={text.note}
        actions={<Picker label={text.display} value={mode} options={DISPLAY_OPTIONS} onChange={setMode} />}
      />

      {mode === 'featured' && featured && (
        <div className="grid gap-md border-thick border-divider bg-surface p-md lg:grid-cols-[minmax(0,0.42fr)_minmax(0,1fr)]">
          <article className="min-w-0 border-hairline border-focus bg-sunken p-md">
            <p className="text-xs font-bold text-muted">{discoveryTitle(featured, text)}</p>
            <p className="truncate font-mono text-2xl font-bold leading-tight text-heading">{featured.value}</p>
            <p className="mt-xs truncate text-sm font-bold text-muted">{featured.player}</p>
            <p className="mt-xxs truncate text-xs text-muted">{featured.metric}</p>
          </article>

          <div className="grid content-start gap-xs">
            {discoveries.slice(1).map((discovery) => {
              const color = theme.categorical[discovery.colorIndex % theme.categorical.length] ?? theme.accent;
              return (
                <article
                  key={discovery.key}
                  className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-md border-hairline border-divider bg-surface p-sm"
                  aria-label={`${discoveryTitle(discovery, text)}: ${discovery.player} ${discovery.value} ${discovery.metric}`}
                >
                  <div className="min-w-0" style={{ borderLeft: `var(--sr-border-thick) solid ${color}`, paddingLeft: 'var(--sr-space-sm)' }}>
                    <p className="truncate text-xs font-bold text-muted">{discoveryTitle(discovery, text)}</p>
                    <p className="truncate text-sm font-bold text-heading">{discovery.player}</p>
                  </div>
                  <div className="min-w-0 text-right">
                    <p className="font-mono text-md font-bold text-heading">{discovery.value}</p>
                    <p className="truncate text-xs text-muted">{discovery.metric}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}

      {mode === 'ranked' && (
        <div className="grid gap-xs border-thick border-divider bg-surface p-md">
          {discoveries.map((discovery) => {
            const color = theme.categorical[discovery.colorIndex % theme.categorical.length] ?? theme.accent;
            return (
              <article
                key={discovery.key}
                className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-md border-b-hairline border-divider py-sm"
                aria-label={`${discoveryTitle(discovery, text)}: ${discovery.player} ${discovery.value} ${discovery.metric}`}
              >
                <p className="font-mono text-sm font-bold text-muted">{discovery.icon}</p>
                <div className="min-w-0" style={{ borderLeft: `var(--sr-border-thick) solid ${color}`, paddingLeft: 'var(--sr-space-sm)' }}>
                  <p className="truncate text-sm font-bold text-heading">{discoveryTitle(discovery, text)}</p>
                  <p className="truncate text-xs text-muted">{discovery.player}</p>
                </div>
                <div className="min-w-0 text-right">
                  <p className="font-mono text-md font-bold text-heading">{discovery.value}</p>
                  <p className="truncate text-xs text-muted">{discovery.metric}</p>
                </div>
              </article>
            );
          })}
        </div>
      )}

      {mode === 'compact' && (
        <div className="grid gap-xxs sm:grid-cols-2">
          {discoveries.map((discovery) => {
            const color = theme.categorical[discovery.colorIndex % theme.categorical.length] ?? theme.accent;
            return (
              <article
                key={discovery.key}
                className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] gap-md border-b-hairline border-divider py-xs"
              >
                <p className="truncate text-sm font-bold text-muted" style={{ borderLeft: `var(--sr-border-thick) solid ${color}`, paddingLeft: 'var(--sr-space-xs)' }}>
                  {discovery.player}
                </p>
                <p className="font-mono text-sm font-bold text-heading">{discovery.value}</p>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}

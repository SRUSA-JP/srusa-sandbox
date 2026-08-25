import { useState } from 'react';
import { MINECRAFT_HERO_DEFAULT_DISPLAY_MODE } from '../../config/dataRegistry';
import type { InventoryRecord } from '../../lib/statsExperience';
import type { VizTheme } from '../../theme/palette';
import { Picker } from '../atoms';

export interface MinecraftHeroText {
  server: string;
  title: string;
  season: string;
  inventory: string;
  display: string;
}

export interface MinecraftHeroProps {
  text: MinecraftHeroText;
  records: InventoryRecord[];
  theme: VizTheme;
}

type StatsDisplayMode = 'overview' | 'ranked' | 'compact';

const DISPLAY_OPTIONS: Array<{ value: StatsDisplayMode; label: string }> = [
  { value: 'overview', label: '概要' },
  { value: 'ranked', label: 'ランキング' },
  { value: 'compact', label: 'コンパクト' },
];

function numericValue(record: InventoryRecord): number {
  const text = record.value.replace(/,/g, '');
  const unit = text.endsWith('万') ? 10000 : 1;
  const value = Number.parseFloat(text);
  return Number.isFinite(value) ? value * unit : 0;
}

/** サーバー名と主要記録を、読み取りやすいサマリーとして見せる導入部。 */
export function MinecraftHero({
  text,
  records,
  theme,
}: MinecraftHeroProps) {
  const [selectedKey, setSelectedKey] = useState(records[0]?.key ?? '');
  const [mode, setMode] = useState<StatsDisplayMode>(MINECRAFT_HERO_DEFAULT_DISPLAY_MODE);
  const selectedRecord = records.find((record) => record.key === selectedKey) ?? records[0];
  const maxValue = Math.max(...records.map(numericValue), 1);

  return (
    <section className="mb-xxl">
      <header className="mb-md flex flex-wrap items-end justify-between gap-md">
        <div className="min-w-0">
          <h2 className="text-lg font-bold leading-tight text-heading">
            {text.server} {text.title}
          </h2>
          <p className="mt-xxs font-mono text-xs font-bold text-muted">{text.season}</p>
        </div>
        <Picker label={text.display} value={mode} options={DISPLAY_OPTIONS} onChange={setMode} />
      </header>

      <div className="grid gap-md border-thick border-divider bg-surface p-md">
        {selectedRecord && mode === 'overview' && (
          <div className="grid gap-md lg:grid-cols-[minmax(220px,0.34fr)_minmax(0,1fr)]">
            <button
              type="button"
              className="grid min-w-0 content-center gap-xxs border-thick border-focus bg-sunken p-sm text-left"
              onClick={() => setSelectedKey(selectedRecord.key)}
            >
              <div className="flex min-w-0 items-baseline justify-between gap-md">
                <p className="truncate text-xs font-bold text-muted">{selectedRecord.label}</p>
                <p className="font-mono text-xs font-bold text-muted">{selectedRecord.icon}</p>
              </div>
              <p className="truncate font-mono text-display font-bold leading-tight text-heading">
                {selectedRecord.value}
              </p>
            </button>

            <div className="grid gap-xs sm:grid-cols-2">
              {records.map((record) => {
                const color = theme.categorical[record.colorIndex % theme.categorical.length] ?? theme.accent;
                const selected = record.key === selectedRecord.key;
                const value = numericValue(record);
                return (
                  <button
                    key={record.key}
                    type="button"
                    className={`grid min-w-0 gap-xxs border-hairline bg-surface p-xs text-left ${
                      selected ? 'border-focus' : 'border-divider hover:bg-hover'
                    }`}
                    onClick={() => setSelectedKey(record.key)}
                  >
                    <div className="flex min-w-0 items-baseline justify-between gap-md">
                      <span className="truncate text-sm font-bold text-muted">{record.label}</span>
                      <span className="font-mono text-md font-bold text-heading">{record.value}</span>
                    </div>
                    <span className="h-[calc(var(--sr-border-thick)*2)] bg-sunken" aria-hidden>
                      <span
                        className="block h-full"
                        style={{ width: `${(value / maxValue) * 100}%`, backgroundColor: color }}
                      />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {mode === 'ranked' && (
          <div className="grid gap-xxs" aria-label={text.inventory}>
            {[...records]
              .sort((a, b) => numericValue(b) - numericValue(a))
              .map((record, index) => {
                const color = theme.categorical[record.colorIndex % theme.categorical.length] ?? theme.accent;
                const value = numericValue(record);
                return (
                  <button
                    key={record.key}
                    type="button"
                    className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-md border-b-hairline border-divider py-xs text-left hover:bg-hover"
                    onClick={() => setSelectedKey(record.key)}
                  >
                    <span className="font-mono text-sm font-bold text-muted">#{index + 1}</span>
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-bold text-heading">{record.label}</span>
                      <span className="mt-xxs block h-[calc(var(--sr-border-thick)*2)] bg-sunken" aria-hidden>
                        <span
                          className="block h-full"
                          style={{ width: `${(value / maxValue) * 100}%`, backgroundColor: color }}
                        />
                      </span>
                    </span>
                    <span className="font-mono text-md font-bold text-heading">{record.value}</span>
                  </button>
                );
              })}
          </div>
        )}

        {mode === 'compact' && (
          <div className="grid gap-xxs sm:grid-cols-2 lg:grid-cols-3" aria-label={text.inventory}>
            {records.map((record) => {
              const color = theme.categorical[record.colorIndex % theme.categorical.length] ?? theme.accent;
              return (
                <button
                  key={record.key}
                  type="button"
                  className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-md border-b-hairline border-divider py-xs text-left hover:bg-hover"
                  onClick={() => setSelectedKey(record.key)}
                >
                  <span
                    className="truncate text-sm font-bold text-muted"
                    style={{ borderLeft: `var(--sr-border-thick) solid ${color}`, paddingLeft: 'var(--sr-space-xs)' }}
                  >
                    {record.label}
                  </span>
                  <span className="font-mono text-sm font-bold text-heading">{record.value}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}

import { useState } from 'react';
import type { InventoryRecord } from '../../lib/statsExperience';
import { slotSurface, stoneTexture } from '../../lib/minecraftTextures';
import { readableTextOn, withAlpha, type VizTheme } from '../../theme/palette';

export interface MinecraftHeroText {
  server: string;
  title: string;
  season: string;
  inventory: string;
  hud: {
    activity: string;
    players: string;
    level: (level: number) => string;
  };
  hotbar: {
    label: string;
    slots: readonly { key: string; label: string; icon: string }[];
  };
}

export interface MinecraftHeroProps {
  text: MinecraftHeroText;
  records: InventoryRecord[];
  theme: VizTheme;
  activePlayers: number;
  totalPlayers: number;
  seasonLevel: number;
}

function filledSlots(value: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(1, Math.min(10, Math.round((value / max) * 10)));
}

function HudPips({
  label,
  filled,
  color,
  theme,
}: {
  label: string;
  filled: number;
  color: string;
  theme: VizTheme;
}) {
  return (
    <div className="min-w-0">
      <p className="mb-xs text-xs font-bold text-muted">{label}</p>
      <div className="grid grid-cols-10 gap-xxs" aria-hidden>
        {Array.from({ length: 10 }, (_, index) => (
          <span
            key={`${label}-${index}`}
            className="aspect-square border-hairline border-divider"
            style={{
              backgroundColor: index < filled ? color : theme.surfaceSunken,
              boxShadow:
                index < filled
                  ? `inset var(--sr-border-hairline) var(--sr-border-hairline) ${withLight(theme)}, inset calc(var(--sr-border-hairline) * -1) calc(var(--sr-border-hairline) * -1) ${withDark(theme)}`
                  : undefined,
            }}
          />
        ))}
      </div>
    </div>
  );
}

function withLight(theme: VizTheme): string {
  return withAlpha(theme.surfaceRaised, theme.mode === 'dark' ? 0.22 : 0.72);
}

function withDark(theme: VizTheme): string {
  return withAlpha(theme.surfaceSunken, theme.mode === 'dark' ? 0.42 : 0.24);
}

function inventoryGridSlots(records: InventoryRecord[]): Array<InventoryRecord | null> {
  const rows = Math.max(3, Math.ceil(records.length / 3));
  return [...records, ...Array<null>(rows * 3 - records.length).fill(null)];
}

/** サーバー名と主要記録を Minecraft のインベントリ風に見せる導入部。 */
export function MinecraftHero({
  text,
  records,
  theme,
  activePlayers,
  totalPlayers,
  seasonLevel,
}: MinecraftHeroProps) {
  const activeSlots = filledSlots(activePlayers, totalPlayers);
  const [activeHotbarKey, setActiveHotbarKey] = useState(text.hotbar.slots[0]?.key ?? '');
  const activeHotbar = text.hotbar.slots.find((slot) => slot.key === activeHotbarKey) ?? text.hotbar.slots[0];
  const inventorySlots = inventoryGridSlots(records);

  return (
    <section className="mb-xxl border-thick border-divider bg-sunken p-sm sm:p-md" style={stoneTexture(theme)}>
      <div className="border-thick border-divider bg-surface p-md sm:p-lg" style={slotSurface(theme)}>
        <div className="grid gap-md">
          <div className="flex flex-wrap items-center justify-between gap-sm border-b-thick border-divider pb-xs">
            <div className="min-w-0">
              <p className="text-xs font-bold text-muted">{text.server}</p>
              <h2 className="text-xl font-bold leading-tight tracking-tight text-heading">
                {text.title}
              </h2>
            </div>
            <p
              className="border-thick border-divider px-sm py-xs font-mono text-md font-bold text-heading"
              style={slotSurface(theme)}
            >
              {text.season}
            </p>
          </div>

          <div className="grid gap-sm lg:grid-cols-[minmax(210px,0.42fr)_minmax(0,1fr)]">
            <aside
              className="grid min-w-0 content-between gap-xs border-thick border-divider bg-sunken p-xs"
              style={stoneTexture(theme)}
            >
              <div className="grid gap-xs">
                <HudPips
                  label={text.hud.activity}
                  filled={Math.min(10, records.length + 4)}
                  color={theme.danger}
                  theme={theme}
                />
                <HudPips
                  label={text.hud.players}
                  filled={activeSlots}
                  color={theme.accent}
                  theme={theme}
                />
              </div>
              <div className="grid gap-xs">
                <div className="h-[var(--sr-space-md)] border-thick border-control-line bg-sunken">
                  <div
                    className="h-full bg-selected"
                    style={{ width: `${Math.min(100, seasonLevel * 4)}%` }}
                  />
                </div>
                <div className="flex items-center justify-center">
                  <span className="font-mono text-lg font-bold text-heading">{text.hud.level(seasonLevel)}</span>
                </div>
              </div>
            </aside>

            <div className="min-w-0 border-thick border-divider bg-sunken p-xs" style={stoneTexture(theme)}>
              <p className="mb-xs text-xs font-bold text-muted">{text.inventory}</p>
              <div className="grid grid-cols-3 gap-xxs sm:grid-cols-6 lg:grid-cols-3">
                {inventorySlots.map((record, index) => {
                  if (!record) {
                    return (
                      <div
                        key={`empty-${index}`}
                        className="aspect-square border-thick border-divider"
                        style={slotSurface(theme)}
                        aria-hidden
                      />
                    );
                  }
                  const color = theme.categorical[record.colorIndex % theme.categorical.length] ?? theme.accent;
                  return (
                    <div
                      key={record.key}
                      className={`grid aspect-square min-w-0 grid-rows-[minmax(0,1fr)_auto_auto] border-thick bg-surface p-xxs ${
                        record.key === activeHotbar?.key ? 'border-focus' : 'border-divider'
                      }`}
                      style={slotSurface(theme)}
                    >
                      <div
                        className="grid min-h-0 place-items-center border-thick border-divider font-bold"
                        style={{
                          ...slotSurface(theme, color),
                          color: readableTextOn(theme.surface, theme),
                        }}
                        aria-hidden
                      >
                        <span
                          className="grid h-2/3 w-2/3 place-items-center border-thick text-sm font-bold leading-tight"
                          style={{ borderColor: color, color }}
                        >
                          {record.icon}
                        </span>
                      </div>
                      <p className="mt-xxs truncate font-mono text-md font-bold leading-tight text-heading">
                        {record.value}
                      </p>
                      <p className="truncate text-xs font-bold leading-tight text-muted">{record.label}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <div aria-label={text.hotbar.label}>
            <div className="grid grid-cols-[repeat(9,minmax(var(--sr-space-xxl),1fr))] gap-xxs overflow-x-auto border-thick border-divider bg-sunken p-xxs">
              {text.hotbar.slots.map((slot, index) => {
                const color = theme.categorical[index % theme.categorical.length] ?? theme.accent;
                const selected = slot.key === activeHotbar?.key;
                return (
                  <button
                    key={slot.key}
                    type="button"
                    className={`min-w-[var(--sr-space-xxl)] border-thick p-xs text-center ${
                      selected ? 'border-focus' : 'border-divider hover:bg-hover'
                    }`}
                    onClick={() => setActiveHotbarKey(slot.key)}
                    style={slotSurface(theme, color)}
                    aria-pressed={selected}
                    aria-label={slot.label}
                  >
                    <div
                      className="mx-auto grid aspect-square w-full place-items-center border-hairline text-sm font-bold"
                      style={{ borderColor: color, color }}
                      aria-hidden
                    >
                      {slot.icon}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

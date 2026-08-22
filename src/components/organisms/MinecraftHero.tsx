import { useState } from 'react';
import type { InventoryRecord } from '../../lib/statsExperience';
import { slotSurface, stoneTexture } from '../../lib/minecraftTextures';
import { readableTextOn, type VizTheme } from '../../theme/palette';

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

function inventoryGridSlots(records: InventoryRecord[]): Array<InventoryRecord | null> {
  const rows = Math.max(3, Math.ceil(records.length / 3));
  return [...records, ...Array<null>(rows * 3 - records.length).fill(null)];
}

/** サーバー名と主要記録を Minecraft のインベントリ風に見せる導入部。 */
export function MinecraftHero({
  text,
  records,
  theme,
}: MinecraftHeroProps) {
  const [selectedKey, setSelectedKey] = useState(records[0]?.key ?? '');
  const selectedRecord = records.find((record) => record.key === selectedKey) ?? records[0];
  const inventorySlots = inventoryGridSlots(records);

  return (
    <section className="mb-xxl border-thick border-divider bg-sunken p-xs" style={stoneTexture(theme)}>
      <div className="grid gap-sm">
        <div className="flex flex-wrap items-center justify-between gap-sm px-xs">
          <div className="min-w-0">
            <p className="text-xs font-bold text-muted">{text.server}</p>
            <h2 className="text-xl font-bold leading-tight text-heading">{text.title}</h2>
          </div>
          <p className="font-mono text-sm font-bold text-muted">{text.season}</p>
        </div>

        <div className="grid grid-cols-3 gap-xxs sm:grid-cols-6 lg:grid-cols-9" aria-label={text.inventory}>
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
              <button
                key={record.key}
                type="button"
                className={`grid aspect-square min-w-0 grid-rows-[minmax(0,1fr)_auto] border-thick bg-surface p-xxs text-left ${
                  record.key === selectedRecord?.key ? 'border-focus' : 'border-divider hover:bg-hover'
                }`}
                onClick={() => setSelectedKey(record.key)}
                style={slotSurface(theme)}
                aria-pressed={record.key === selectedRecord?.key}
                aria-label={`${record.label} ${record.value}`}
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
                <div className="min-w-0">
                  <p className="truncate font-mono text-md font-bold leading-tight text-heading">{record.value}</p>
                  <p className="truncate text-xs font-bold leading-tight text-muted">{record.label}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
}

import { useState } from 'react';
import { FEATURED_ITEM_RANKING_DEFAULT_ID, FEATURED_ITEM_SUMMARY_LIMIT } from '../../config/dataRegistry';
import { Picker } from '../atoms';
import { RankingPreviewCard } from '../molecules';
import { SECTION } from '../classes';
import {
  FEATURED_USED_ITEMS,
  featuredUsedItemsGeneratedOn,
  featuredUsedItemsSnapshotDate,
  usedItemPlayerRank,
  usedItemPlayerValue,
  type FeaturedUsedItem,
} from '../../data/playerItemUsage';
import type { NamedPlayer } from '../../data/schema';
import { formatInt } from '../../lib/format';
import type { VizTheme } from '../../theme/palette';

export interface PlayerFeaturedUsePanelProps {
  player: NamedPlayer;
  theme: VizTheme;
  accentOffset?: number;
}

/** プレイヤー個別ページの、切替式アイテム使用ランキング。 */
export function PlayerFeaturedUsePanel({ player, theme, accentOffset = 6 }: PlayerFeaturedUsePanelProps) {
  const generatedOn = featuredUsedItemsGeneratedOn();
  const snapshotDate = featuredUsedItemsSnapshotDate();
  const [selectedId, setSelectedId] = useState<FeaturedUsedItem['id']>(FEATURED_ITEM_RANKING_DEFAULT_ID);
  const selected = FEATURED_USED_ITEMS.find((option) => option.id === selectedId) ?? FEATURED_USED_ITEMS[0];
  const selectedRank = usedItemPlayerRank(player.name, selected.id);
  const selectedValue = usedItemPlayerValue(player.name, selected.id);
  const accent = theme.categorical[accentOffset % theme.categorical.length] ?? theme.accent;
  const summaries = FEATURED_USED_ITEMS.filter((item) => item.id !== selected.id)
    .map((item) => ({
      item,
      value: usedItemPlayerValue(player.name, item.id),
      rank: usedItemPlayerRank(player.name, item.id),
    }))
    .filter((entry) => entry.value > 0)
    .slice(0, FEATURED_ITEM_SUMMARY_LIMIT);

  return (
    <section className={`${SECTION} grid gap-xs lg:grid-cols-[minmax(0,1fr)_minmax(220px,0.38fr)]`}>
      <div className="min-w-0 border-thick border-divider bg-surface p-md">
        <div className="flex min-w-0 items-baseline justify-between gap-md">
          <p
            className="truncate text-sm font-bold text-muted"
            style={{ borderLeft: `var(--sr-border-thick) solid ${accent}`, paddingLeft: 'var(--sr-space-xs)' }}
          >
            {selected.label}
          </p>
          <p className="shrink-0 font-mono text-xs font-bold text-muted">{selectedRank ? `#${selectedRank}` : '未使用'}</p>
        </div>
        <div className="mt-xs">
          <Picker
            label="ランキング"
            value={selected.id}
            options={FEATURED_USED_ITEMS.map((option) => ({ value: option.id, label: option.label }))}
            onChange={setSelectedId}
          />
        </div>
        <p className="mt-xs font-mono text-xl font-bold text-heading">{formatInt(selectedValue)} 回</p>
        <p className="mt-xxs text-xs leading-tight text-muted">{selected.note}</p>
        <p className="mt-xxs font-mono text-xs text-muted">更新 {generatedOn} / 集計 {snapshotDate}</p>
      </div>

      {summaries.length > 0 && (
        <aside className="hidden min-w-0 content-start gap-xs lg:grid">
          {summaries.map((entry, index) => (
            <RankingPreviewCard
              key={entry.item.id}
              title={entry.item.label}
              value={entry.value}
              unit="回"
              rank={entry.rank}
              accent={theme.categorical[(index + accentOffset + 1) % theme.categorical.length] ?? theme.accent}
              href="#/minecraft"
            />
          ))}
        </aside>
      )}
    </section>
  );
}

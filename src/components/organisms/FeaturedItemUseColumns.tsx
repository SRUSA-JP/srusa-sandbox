import { useState } from 'react';
import {
  FEATURED_ITEM_RANKING_DEFAULT_ID,
  FEATURED_ITEM_RANKING_LIMIT,
  FEATURED_ITEM_RECENT_LIMIT,
  FEATURED_ITEM_LEADER_LIMIT,
  FEATURED_ITEM_SUMMARY_LIMIT,
} from '../../config/dataRegistry';
import {
  FEATURED_USED_ITEMS,
  featuredUsedItemsGeneratedOn,
  featuredUsedItemsSnapshotDate,
  latestUsedItemDelta,
  usedItemRanking,
  usedItemTotal,
  type FeaturedUsedItem,
} from '../../data/playerItemUsage';
import { playerPath } from '../../data/playerProfiles';
import { formatInt } from '../../lib/format';
import type { VizTheme } from '../../theme/palette';
import { Picker } from '../atoms';
import { PlayerIconPlaceholder, RankingPreviewCard } from '../molecules';

export interface FeaturedItemUseColumnsProps {
  theme: VizTheme;
}

function periodLabel(from: string, to: string): string {
  return `${from.slice(5, 10)} -> ${to.slice(5, 10)}`;
}

function ItemUseCard({
  item,
  theme,
  index,
  onItemChange,
}: {
  item: FeaturedUsedItem;
  theme: VizTheme;
  index: number;
  onItemChange: (id: FeaturedUsedItem['id']) => void;
}) {
  const accent = theme.categorical[index % theme.categorical.length] ?? theme.accent;
  const ranking = usedItemRanking(item.id, FEATURED_ITEM_RANKING_LIMIT);
  const total = usedItemTotal(item.id);
  const recent = latestUsedItemDelta(item.id);
  const generatedOn = featuredUsedItemsGeneratedOn();
  const snapshotDate = featuredUsedItemsSnapshotDate();

  return (
    <article className="grid min-w-0 gap-sm border-thick border-divider bg-surface p-md">
      <header className="min-w-0">
        <div className="flex min-w-0 items-baseline justify-between gap-md">
          <h3 className="truncate text-md font-bold text-heading">{item.label}ランキング</h3>
          <p className="shrink-0 font-mono text-sm font-bold text-muted">{formatInt(total)} 回</p>
        </div>
        <div className="mt-xs">
          <Picker
            label="ランキング"
            value={item.id}
            options={FEATURED_USED_ITEMS.map((option) => ({ value: option.id, label: option.label }))}
            onChange={onItemChange}
          />
        </div>
        <p className="mt-xxs text-xs leading-tight text-muted">{item.note}</p>
        <p className="mt-xxs font-mono text-xs text-muted">更新 {generatedOn} / 集計 {snapshotDate}</p>
      </header>

      <div className="grid gap-xs">
        {ranking.map((entry, rank) => (
          <a
            key={entry.key}
            href={playerPath(entry.label)}
            className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-sm border-hairline border-divider bg-sunken p-xs hover:bg-hover"
          >
            <PlayerIconPlaceholder name={entry.label} accent={accent} alt={`${entry.label} のアイコン`} />
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold text-heading">{entry.label}</span>
              <span className="block font-mono text-xs text-muted">#{rank + 1}</span>
            </span>
            <span className="font-mono text-md font-bold text-heading">{formatInt(entry.value)}</span>
          </a>
        ))}
      </div>

      {recent && recent.entries.length > 0 && (
        <p className="border-t-hairline border-divider pt-xs text-xs text-muted">
          直近 {periodLabel(recent.from, recent.to)}: {recent.entries.slice(0, FEATURED_ITEM_RECENT_LIMIT).map((entry) => `${entry.label} +${formatInt(entry.value)}`).join(' / ')}
        </p>
      )}
    </article>
  );
}

function ItemUseSummary({ item, theme, index }: { item: FeaturedUsedItem; theme: VizTheme; index: number }) {
  const accent = theme.categorical[(index + 1) % theme.categorical.length] ?? theme.accent;
  const leader = usedItemRanking(item.id, FEATURED_ITEM_LEADER_LIMIT)[0];
  return (
    <RankingPreviewCard
      title={item.label}
      value={leader?.value ?? 0}
      unit="回"
      accent={accent}
      subtitle={leader ? `${leader.label} が首位` : 'データなし'}
      playerName={leader?.label}
      href={leader ? playerPath(leader.label) : '#/minecraft'}
    />
  );
}

/** 概要の上部に置く、ちょっとした話題になるアイテム使用ランキング。 */
export function FeaturedItemUseColumns({ theme }: FeaturedItemUseColumnsProps) {
  const [selectedId, setSelectedId] = useState<FeaturedUsedItem['id']>(FEATURED_ITEM_RANKING_DEFAULT_ID);
  const selected = FEATURED_USED_ITEMS.find((option) => option.id === selectedId) ?? FEATURED_USED_ITEMS[0];
  const summaries = FEATURED_USED_ITEMS.filter((item) => item.id !== selected.id).slice(0, FEATURED_ITEM_SUMMARY_LIMIT);

  return (
    <section className="mb-section grid gap-md lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.42fr)]">
      <ItemUseCard item={selected} theme={theme} index={0} onItemChange={setSelectedId} />
      <aside className="hidden min-w-0 content-start gap-sm lg:grid">
        {summaries.map((item, index) => (
          <ItemUseSummary key={item.id} item={item} theme={theme} index={index} />
        ))}
      </aside>
    </section>
  );
}

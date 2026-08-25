import { currentFeaturedUsedItemsJson } from './current';
import type { Entry } from '../lib/selectors';

export type FeaturedUsedItemId = keyof typeof currentFeaturedUsedItemsJson.snapshot.items & string;

export interface FeaturedUsedItem {
  id: FeaturedUsedItemId;
  label: string;
  note: string;
}

interface FeaturedUsedItemRecord extends FeaturedUsedItem {
  total: number;
  ranking: Array<{ player: string; value: number }>;
}

interface FeaturedUsedItemsDocument {
  generated_on: string;
  source: string;
  snapshot: {
    date: string;
    items: Record<FeaturedUsedItemId, FeaturedUsedItemRecord>;
  };
  daily_deltas: Array<{
    from: string;
    to: string;
    items: Record<FeaturedUsedItemId, Array<{ player: string; value: number }>>;
  }>;
}

const doc = currentFeaturedUsedItemsJson as FeaturedUsedItemsDocument;

export const FEATURED_USED_ITEMS: FeaturedUsedItem[] = Object.values(doc.snapshot.items).map((item) => ({
  id: item.id,
  label: item.label,
  note: item.note,
}));

export function featuredUsedItemsGeneratedOn(): string {
  return doc.generated_on;
}

export function featuredUsedItemsSnapshotDate(): string {
  return doc.snapshot.date;
}

function toEntry(entry: { player: string; value: number }): Entry {
  return { key: entry.player, label: entry.player, value: entry.value };
}

export function usedItemRanking(itemId: FeaturedUsedItemId, limit = 5): Entry[] {
  return doc.snapshot.items[itemId].ranking.slice(0, limit).map(toEntry);
}

export function usedItemTotal(itemId: FeaturedUsedItemId): number {
  return doc.snapshot.items[itemId].total;
}

export function usedItemPlayerValue(playerName: string, itemId: FeaturedUsedItemId): number {
  return doc.snapshot.items[itemId].ranking.find((entry) => entry.player === playerName)?.value ?? 0;
}

export function usedItemPlayerRank(playerName: string, itemId: FeaturedUsedItemId): number | null {
  const index = doc.snapshot.items[itemId].ranking.findIndex((entry) => entry.player === playerName);
  return index === -1 ? null : index + 1;
}

export function latestUsedItemDelta(itemId: FeaturedUsedItemId): { from: string; to: string; entries: Entry[] } | null {
  const latest = [...doc.daily_deltas].reverse().find((delta) => delta.items[itemId].length > 0);
  return latest ? { from: latest.from, to: latest.to, entries: latest.items[itemId].map(toEntry) } : null;
}

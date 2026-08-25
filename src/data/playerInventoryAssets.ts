import { currentPlayerInventoryAssetsJson } from './current';
import { economyItemCategory } from '../config/economy';
import { stripNamespace } from '../lib/format';
import type { EconomyItemAmount, PlayerEconomyRow } from '../lib/selectors';

interface InventoryAssetItem {
  count: number;
  value: number;
}

interface InventoryAssetValue {
  value: number;
  /** item ID → 換算前の数と換算後の資産量。分類別の内訳に使う。 */
  items?: Record<string, InventoryAssetItem>;
}

interface InventoryAssetPlayer {
  total: number;
  assets: {
    diamond?: InventoryAssetValue;
    emerald?: InventoryAssetValue;
  };
}

interface PlayerInventoryAssetsDocument {
  generated_on: string;
  source: { note: string };
  players: Record<string, InventoryAssetPlayer>;
}

const doc = currentPlayerInventoryAssetsJson as PlayerInventoryAssetsDocument;

/** 資産 1 種類の item 内訳。分類は config/economy.ts の定義から引く。 */
function itemAmounts(asset: InventoryAssetValue | undefined): EconomyItemAmount[] {
  return Object.entries(asset?.items ?? {})
    .map(([id, item]) => {
      const itemId = stripNamespace(id);
      return {
        id: itemId,
        category: economyItemCategory(itemId),
        count: item.count,
        value: item.value,
      };
    })
    .filter((item) => item.value > 0);
}

export function playerInventoryAssetsGeneratedOn(): string {
  return doc.generated_on;
}

export function playerInventoryAssetsNote(): string {
  return doc.source.note;
}

export function playerInventoryAssetRows(players?: string[]): PlayerEconomyRow[] {
  const playerSet = players && players.length > 0 ? new Set(players) : null;
  return Object.entries(doc.players)
    .filter(([name]) => !playerSet || playerSet.has(name))
    .map(([name, player]) => {
      const diamond = player.assets.diamond?.value ?? 0;
      const emerald = player.assets.emerald?.value ?? 0;
      return {
        name,
        diamond,
        emerald,
        total: diamond + emerald,
        items: {
          diamond: itemAmounts(player.assets.diamond),
          emerald: itemAmounts(player.assets.emerald),
        },
      };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'ja'));
}

import { currentPlayerInventoryAssetsJson } from './current';
import type { PlayerEconomyRow } from '../lib/selectors';

interface InventoryAssetValue {
  value: number;
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
      };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, 'ja'));
}

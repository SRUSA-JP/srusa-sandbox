/**
 * SRUSA 内の簡易経済指標。
 *
 * 換算係数や対象アイテムは data/economy-assets.json に集約する。
 * スクリプトとフロントエンドが同じ定義を読むので、装備換算のズレを作らない。
 */
import type { ItemMetric } from '../data/schema';
import economyAssetsConfig from '../../data/economy-assets.json';

export type EconomyStatsSourceMetric = Extract<ItemMetric, 'picked_up' | 'mined'>;
export type EconomySourceMetric = 'inventory' | EconomyStatsSourceMetric;

export interface EconomyAssetEntry {
  id: string;
  multiplier: number;
  label?: string;
  /** 内訳の分類（装備・ツール・原石など）。itemCategories の id。 */
  category: EconomyItemCategoryId;
}

export type EconomyItemCategoryId = 'raw' | 'block' | 'ore' | 'armor' | 'tool';

/** 内訳の分類。並び順がそのまま積み上げの順になる。 */
export interface EconomyItemCategory {
  id: EconomyItemCategoryId;
  label: string;
}

export interface EconomyAsset {
  id: 'diamond' | 'emerald';
  label: string;
  shortLabel: string;
  unit: string;
  /** stats の累計指標でこの資産として数える item/block ID。namespace の有無は集計側で吸収する。 */
  statsEntries: EconomyAssetEntry[];
  /** 現在在庫でこの資産として換算する item/tool/armor ID。 */
  inventoryEntries: EconomyAssetEntry[];
}

interface EconomyAssetsConfig {
  indexName: string;
  indexBase: number;
  defaultSource: EconomySourceMetric;
  itemCategories: EconomyItemCategory[];
  sourceOptions: Array<{ value: EconomySourceMetric; label: string; note: string }>;
  assets: EconomyAsset[];
}

const config = economyAssetsConfig as EconomyAssetsConfig;

export const ECONOMY_INDEX_NAME = config.indexName;

export const ECONOMY_INDEX_BASE = config.indexBase;

export const ECONOMY_DEFAULT_SOURCE = config.defaultSource;

export const ECONOMY_SOURCE_OPTIONS = config.sourceOptions;

export const ECONOMY_ASSETS = config.assets;

export const ECONOMY_ITEM_CATEGORIES = config.itemCategories;

/** item ID → 内訳の分類。名前空間の有無は呼び出し側で落としてから渡す。 */
const CATEGORY_BY_ITEM_ID = new Map<string, EconomyItemCategoryId>(
  ECONOMY_ASSETS.flatMap((asset) =>
    [...asset.statsEntries, ...asset.inventoryEntries].map(
      (entry) => [entry.id, entry.category] as const,
    ),
  ),
);

/**
 * その item がどの分類に入るか。
 * 未登録の item は素材（原石）として数え、内訳から取りこぼさないようにする。
 */
export function economyItemCategory(itemId: string): EconomyItemCategoryId {
  return CATEGORY_BY_ITEM_ID.get(itemId) ?? 'raw';
}

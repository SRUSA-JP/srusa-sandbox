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
  sourceOptions: Array<{ value: EconomySourceMetric; label: string; note: string }>;
  assets: EconomyAsset[];
}

const config = economyAssetsConfig as EconomyAssetsConfig;

export const ECONOMY_INDEX_NAME = config.indexName;

export const ECONOMY_INDEX_BASE = config.indexBase;

export const ECONOMY_DEFAULT_SOURCE = config.defaultSource;

export const ECONOMY_SOURCE_OPTIONS = config.sourceOptions;

export const ECONOMY_ASSETS = config.assets;

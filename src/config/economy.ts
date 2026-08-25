/**
 * Minecraft 統計から作る SRUSA 内の簡易経済指標。
 *
 * stats は「いま残っている在庫」を持たないので、ここでは拾得数を資産量の近似として扱う。
 * 換算係数や対象アイテムを変えると、総資産・レート・指数が同じ定義で更新される。
 */
import type { ItemMetric } from '../data/schema';

export type EconomySourceMetric = Extract<ItemMetric, 'picked_up' | 'mined'>;

export interface EconomyAsset {
  id: 'diamond' | 'emerald';
  label: string;
  shortLabel: string;
  unit: string;
  /** この資産として数える item/block ID。namespace の有無は集計側で吸収する。 */
  entries: Array<{ id: string; multiplier: number }>;
}

export const ECONOMY_INDEX_NAME = 'SRUSA鉱物指数';

export const ECONOMY_INDEX_BASE = 100;

export const ECONOMY_DEFAULT_SOURCE: EconomySourceMetric = 'picked_up';

export const ECONOMY_SOURCE_OPTIONS: Array<{ value: EconomySourceMetric; label: string; note: string }> = [
  {
    value: 'picked_up',
    label: '拾得ベース',
    note: '拾ったアイテム数から見る流通量寄りの指標です。チェスト内の実在庫ではありません。',
  },
  {
    value: 'mined',
    label: '採掘ベース',
    note: '鉱石ブロックの採掘数から見る産出量寄りの指標です。村人取引などで得たエメラルドは入りにくくなります。',
  },
];

export const ECONOMY_ASSETS: EconomyAsset[] = [
  {
    id: 'diamond',
    label: 'ダイヤ',
    shortLabel: 'DI',
    unit: 'DI',
    entries: [
      { id: 'diamond', multiplier: 1 },
      { id: 'diamond_block', multiplier: 9 },
      { id: 'diamond_ore', multiplier: 1 },
      { id: 'deepslate_diamond_ore', multiplier: 1 },
    ],
  },
  {
    id: 'emerald',
    label: 'エメラルド',
    shortLabel: 'EM',
    unit: 'EM',
    entries: [
      { id: 'emerald', multiplier: 1 },
      { id: 'emerald_block', multiplier: 9 },
      { id: 'emerald_ore', multiplier: 1 },
      { id: 'deepslate_emerald_ore', multiplier: 1 },
    ],
  },
];

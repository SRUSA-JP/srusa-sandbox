/**
 * Type definitions for `data/minecraft-stats-YYYYMMDD.json`.
 *
 * These types are the contract between the exporter (SSM 経由で集計した JSON) and
 * any consumer. They are intentionally dependency-free so that they can be
 * imported from a plain `.ts`/`.tsx` file, a Node script, or a Lambda.
 */

/** 集計対象・生成元のメタ情報。 */
export interface StatsSource {
  path: string;
  instance_id: string;
  account: string;
  region: string;
  retrieved_via: string;
  minecraft_version: string;
  loader: string;
  difficulty: string;
}

/** 数値の単位についての注記（ドキュメント目的のフリーテキスト）。 */
export interface StatsUnits {
  playtime: string;
  damage: string;
  distance: string;
}

/** サーバー全体の合計値。`players` の総和と一致する。 */
export interface StatsTotals {
  playtime_hours: number;
  deaths: number;
  distance_km: number;
  mob_kills: number;
  player_kills: number;
  damage_dealt_hp: number;
  damage_taken_hp: number;
  blocks_mined: number;
  items_crafted: number;
  jumps: number;
  advancements: number;
  recipes_unlocked: number;
}

/** キー = ID（mob 名 / アイテム名 / 移動手段）、値 = 回数。 */
export type CountMap = Record<string, number>;

export interface PlayerPlaytime {
  ticks: number;
  hours: number;
  sneak_hours: number;
  since_last_death_hours: number;
  since_last_rest_hours: number;
  sessions_left: number;
}

export interface PlayerDeaths {
  total: number;
  per_hour: number;
  /** `minecraft:killed_by` 由来。環境ダメージ等は含まれない。 */
  by_mob: CountMap;
  /** 落下・溶岩など mob 以外の死因の合計（total - sum(by_mob)）。 */
  other_causes: number;
}

export interface PlayerMovement {
  total_km: number;
  by_method_km: CountMap;
  by_method_cm: CountMap;
  jumps: number;
}

export interface PlayerCombat {
  mob_kills: number;
  mob_kills_per_hour: number;
  player_kills: number;
  damage_dealt_hp: number;
  damage_taken_hp: number;
  damage_absorbed_hp: number;
  damage_dealt_absorbed_hp: number;
  damage_dealt_resisted_hp: number;
  /**
   * `minecraft:killed` 由来。間接キル（落下・溶岩に落として倒した等）は
   * カウントされないため、合計は `mob_kills` より小さくなることがある。
   */
  kills_by_mob: CountMap;
}

export interface PlayerProduction {
  blocks_mined: number;
  items_crafted: number;
  items_used: number;
  items_picked_up: number;
  items_dropped: number;
  tools_broken: number;
  mined: CountMap;
  crafted: CountMap;
  used: CountMap;
  picked_up: CountMap;
  dropped: CountMap;
  broken: CountMap;
}

export interface PlayerTwilightForest {
  trophy_pedestals_activated: number;
  keeping_charms_activated: number;
  life_charms_activated: number;
  e115_slices_eaten: number;
}

export interface PlayerAdvancements {
  count: number;
  recipes_unlocked: number;
  list: string[];
}

export interface PlayerStats {
  uuid: string;
  playtime: PlayerPlaytime;
  deaths: PlayerDeaths;
  movement: PlayerMovement;
  combat: PlayerCombat;
  production: PlayerProduction;
  /** `chests_opened` などの行動系カウンタ。 */
  activity: CountMap;
  twilight_forest: PlayerTwilightForest;
  advancements: PlayerAdvancements;
  /** `minecraft:custom` の生データ（接頭辞なし）。 */
  raw_custom: CountMap;
}

/** JSON ファイル 1 つ分。 */
export interface StatsDocument {
  generated_on: string;
  source: StatsSource;
  units: StatsUnits;
  player_count: number;
  totals: StatsTotals;
  /** キーはプレイヤー名。 */
  players: Record<string, PlayerStats>;
}

/** `players` を配列で扱いたいとき用の 1 行。 */
export interface NamedPlayer extends PlayerStats {
  name: string;
}

/** production / combat 内の CountMap を選ぶためのキー。 */
export type ItemMetric = 'mined' | 'crafted' | 'used' | 'picked_up' | 'dropped' | 'broken';

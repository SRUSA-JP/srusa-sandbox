/**
 * データの ID に対応する日本語名。
 *
 * Minecraft の統計キー（`minecraft:walk` など）をそのまま画面に出さないための辞書。
 * ここに無い ID は lib/format.ts の `prettifyId` が英語表記に整えて表示する。
 * 表示名を直したいときはこのファイルだけを編集する。
 */

/** 移動手段の日本語ラベル。 */
export const MOVEMENT_LABELS: Record<string, string> = {
  walk: '徒歩',
  sprint: 'ダッシュ',
  crouch: 'しゃがみ',
  swim: '水泳',
  walk_under_water: '水中歩行',
  walk_on_water: '水上歩行',
  fall: '落下',
  climb: '登り',
  fly: '飛行',
  boat: 'ボート',
  horse: '馬',
  minecart: 'トロッコ',
  pig: '豚',
  strider: 'ストライダー',
  aviate: 'エリトラ',
};

/** 行動系カウンタの日本語ラベル。 */
export const ACTIVITY_LABELS: Record<string, string> = {
  chests_opened: 'チェストを開けた',
  enderchests_opened: 'エンダーチェストを開けた',
  barrels_opened: '樽を開けた',
  trapped_chests_triggered: 'トラップチェスト',
  crafting_table_uses: '作業台の使用',
  furnace_uses: 'かまどの使用',
  blast_furnace_uses: '溶鉱炉の使用',
  smithing_table_uses: '鍛冶台の使用',
  stonecutter_uses: '石切台の使用',
  anvil_uses: '金床の使用',
  brewing_stand_uses: '醸造台の使用',
  items_enchanted: 'エンチャント回数',
  villager_trades: '村人との取引',
  villagers_talked_to: '村人に話しかけた',
  animals_bred: '動物の繁殖',
  fish_caught: '釣った魚',
  slept_in_bed: 'ベッドで寝た',
};

/** Twilight Forest 固有カウンタのラベル。 */
export const TWILIGHT_LABELS: Record<string, string> = {
  trophy_pedestals_activated: 'トロフィー台座の起動',
  keeping_charms_activated: '保護のお守り発動',
  life_charms_activated: '生命のお守り発動',
  e115_slices_eaten: '実験 115 を食べた',
};

/* ------------------------------------------------------------------ *
 * 集計で作る項目
 *
 * 元データには無いが、まとめ・合算のために作る行や系列。
 * キーと表示名を対で持ち、集計（lib/selectors.ts）と画面の両方から参照する。
 * ------------------------------------------------------------------ */

/** 上位に入らなかった分をまとめる項目。 */
export const OTHER_ENTRY = { key: '__other__', label: 'その他' } as const;

/** mob 以外の死因をまとめる項目。 */
export const ENVIRONMENT_ENTRY = { key: '__environment__', label: '環境ダメージほか' } as const;

/** 与ダメージ / 被ダメージの系列名。 */
export const DAMAGE_LABELS = { dealt: '与ダメージ', taken: '被ダメージ' } as const;

/** 対象者をひとまとめにした系列。 */
export const TOTAL_SERIES = { key: 'total', label: '対象者の合計' } as const;

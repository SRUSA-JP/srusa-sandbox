import { allPlayerRecords, playerIconPath, playerSkinPath } from '../data/playerDb';

/** プレイヤーアイコンのプレースホルダーに使う色。 */
export const PLAYER_ICON_COLORS = {
  skin: ['#f2c7a5', '#d9a26f', '#8f5f43', '#c98f5b', '#6f4630'],
  hair: ['#2a1a13', '#5b3a29', '#302018', '#d8b15f', '#79341f', '#181818'],
  eyes: ['#1b1b1b', '#263d67', '#24523a', '#4c2d1c'],
  detail: ['#e7d7a6', '#f2f2ef', '#a5d8ff', '#f0cf4f', '#cf4f4f'],
} as const;

/**
 * プレイヤーごとの手動差し替え画像。
 *
 * 画像を `public/players/名前.png` などに置き、ここへ追加すると
 * data/player-skins/manifest.json 由来のアイコンより優先して表示される。
 * 例: `{ Alice: 'players/alice-face.png' }`
 */
export const PLAYER_ICON_OVERRIDES: Record<string, string> = {};

/** スキン本体画像も個別に差し替えたい場合の手動上書き。 */
export const PLAYER_SKIN_OVERRIDES: Record<string, string> = {};

const dbIconImages: Record<string, string> = Object.fromEntries(
  allPlayerRecords()
    .map((player) => [player.username, playerIconPath(player.username)] as const)
    .filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
);

const dbSkinImages: Record<string, string> = Object.fromEntries(
  allPlayerRecords()
    .map((player) => [player.username, playerSkinPath(player.username)] as const)
    .filter((entry): entry is readonly [string, string] => Boolean(entry[1])),
);

/**
 * 実際に画面が参照する画像。
 *
 * 優先順位は「手動上書き → manifest → 名前から生成する仮アイコン」。
 * スキンを再取得して manifest が更新されても、手動上書きはここに残せる。
 */
export const PLAYER_ICON_IMAGES: Record<string, string> = {
  ...dbIconImages,
  ...PLAYER_ICON_OVERRIDES,
};

export const PLAYER_SKIN_IMAGES: Record<string, string> = {
  ...dbSkinImages,
  ...PLAYER_SKIN_OVERRIDES,
};

export function playerIconImage(name: string): string | undefined {
  return PLAYER_ICON_OVERRIDES[name] ?? PLAYER_ICON_IMAGES[name] ?? playerIconPath(name);
}

/**
 * 相関図の人物に対応する Minecraft のアイコン。
 *
 * 相関図は人物 ID で人を指し、スキンは player-db の名前で持っているので、
 * player-db の relationship_id を頼りに繋ぐ。サーバーに入っていない人には
 * スキンが無いので undefined を返し、呼び出し側が代替の人型を出す。
 */
export function playerIconForRelationshipPerson(
  personId: string,
  fallbackName: string,
): string | undefined {
  const record = allPlayerRecords().find((entry) => entry.sources.relationship_id === personId);
  return playerIconImage(record?.username ?? fallbackName);
}

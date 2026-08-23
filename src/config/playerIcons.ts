import playerSkinManifest from '../../data/player-skins/manifest.json';

interface PlayerSkinManifestEntry {
  name: string;
  face_icon_path: string;
  skin_path: string;
}

interface PlayerSkinManifest {
  players: PlayerSkinManifestEntry[];
}

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

const manifest = playerSkinManifest as PlayerSkinManifest;

const manifestIconImages: Record<string, string> = Object.fromEntries(
  manifest.players.map((player) => [player.name, `player-skins/${player.face_icon_path}`]),
);

const manifestSkinImages: Record<string, string> = Object.fromEntries(
  manifest.players.map((player) => [player.name, `player-skins/${player.skin_path}`]),
);

/**
 * 実際に画面が参照する画像。
 *
 * 優先順位は「手動上書き → manifest → 名前から生成する仮アイコン」。
 * スキンを再取得して manifest が更新されても、手動上書きはここに残せる。
 */
export const PLAYER_ICON_IMAGES: Record<string, string> = {
  ...manifestIconImages,
  ...PLAYER_ICON_OVERRIDES,
};

export const PLAYER_SKIN_IMAGES: Record<string, string> = {
  ...manifestSkinImages,
  ...PLAYER_SKIN_OVERRIDES,
};

export function playerIconImage(name: string): string | undefined {
  return PLAYER_ICON_IMAGES[name] ?? PLAYER_ICON_IMAGES[name.toLowerCase()];
}

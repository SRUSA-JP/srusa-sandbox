/**
 * ホーム画面に追加したときの見え方（PWA のマニフェスト）。
 *
 * 名前・説明・配色を index.html や manifest ファイルへ書き写すと、
 * 画面の中の表記とずれていく。ここが唯一の定義で、実際のファイルは
 * vite.config.ts のプラグインがビルド時に組み立てる。
 */
import { LIGHT_THEME } from '../theme/palette';
import { APP_TEXT } from './messages';

/** 出力するマニフェストのファイル名。 */
export const MANIFEST_FILE = 'manifest.webmanifest';

/**
 * アイコンの元絵（リポジトリの根からの相対パス）。
 *
 * ここを差し替えて `npm run build:icons` を実行すると、
 * 下の APP_ICONS の寸法ぶんが作り直される。
 *
 * public/ には置かない。public/ の中身はそのまま配られるので、
 * 元絵（1MB 近い）まで利用者に落ちてしまう。
 */
export const APP_ICON_SOURCE = 'assets/app-icon.png';

export const APP_ICON_TYPE = 'image/png';

/**
 * 実際に配るアイコン。
 *
 * 用途ごとに要る寸法が違う。1 枚を使い回すと、タブでは大きすぎて潰れ、
 * ホーム画面では小さすぎてぼやける。
 *
 * - 32:  タブ（favicon）
 * - 180: iOS のホーム画面（apple-touch-icon の決まりの寸法）
 * - 192: Android のホーム画面
 * - 512: 起動画面とストアの表示
 */
export const APP_ICONS = [
  { path: 'icons/srusa-32.png', size: 32, usage: 'favicon' },
  { path: 'icons/srusa-180.png', size: 180, usage: 'apple' },
  { path: 'icons/srusa-192.png', size: 192, usage: 'manifest' },
  { path: 'icons/srusa-512.png', size: 512, usage: 'manifest' },
] as const;

/** その用途に使うアイコン。 */
export function appIcon(usage: (typeof APP_ICONS)[number]['usage']) {
  const found = APP_ICONS.find((icon) => icon.usage === usage);
  if (!found) throw new Error(`アイコンの用途が見つかりません: ${usage}`);
  return found;
}

/**
 * ブラウザの枠（アドレスバーなど）の色。
 *
 * 初回描画のための控えなので、明るい配色の地の色を使う。
 * 表示中の実際の色は theme/cssVariables.ts が配色とスキンに追随させて書き換える。
 */
export const INITIAL_THEME_COLOR = LIGHT_THEME.background;

/** マニフェストの中身。 */
export function webManifest(): string {
  return JSON.stringify(
    {
      name: APP_TEXT.siteName,
      short_name: APP_TEXT.shortName,
      description: APP_TEXT.siteDescription,
      lang: 'ja',
      /* 相対パスにして、どのディレクトリに置いても動くようにする */
      start_url: './',
      scope: './',
      display: 'standalone',
      background_color: LIGHT_THEME.background,
      theme_color: INITIAL_THEME_COLOR,
      icons: APP_ICONS.filter((icon) => icon.usage === 'manifest').map((icon) => ({
        src: `./${icon.path}`,
        sizes: `${icon.size}x${icon.size}`,
        type: APP_ICON_TYPE,
        purpose: 'any',
      })),
    },
    null,
    2,
  );
}

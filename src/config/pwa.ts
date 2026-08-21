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

/** アイコンの置き場所（public/ からの相対パス）。 */
export const APP_ICON = {
  path: 'icons/srusa.png',
  type: 'image/png',
  /** 実ファイルの一辺（px）。差し替えたらここも合わせる。 */
  size: 200,
} as const;

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
      icons: [
        {
          src: `./${APP_ICON.path}`,
          sizes: `${APP_ICON.size}x${APP_ICON.size}`,
          type: APP_ICON.type,
          purpose: 'any',
        },
      ],
    },
    null,
    2,
  );
}

import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { APP_TEXT } from './src/config/messages';
import {
  APP_ICON_TYPE,
  appIcon,
  INITIAL_THEME_COLOR,
  MANIFEST_FILE,
  webManifest,
} from './src/config/pwa';

/**
 * ページの見出しまわり（タイトル・説明・アイコン・マニフェスト）を組み立てる。
 *
 * index.html に名前や色を書き写すと、画面の中の表記とずれていく。
 * 実際の値は src/config/pwa.ts と src/config/messages.ts だけが持ち、
 * ここはそれを HTML と manifest ファイルへ流し込むだけ。
 */
function siteMetadata(): Plugin {
  const manifestUrl = `/${MANIFEST_FILE}`;

  return {
    name: 'srusa-site-metadata',

    /* 開発サーバーでも同じマニフェストを返す（本番だけ壊れている、を防ぐ） */
    configureServer(server) {
      server.middlewares.use((request, response, next) => {
        if (request.url?.split('?')[0] !== manifestUrl) return next();
        response.setHeader('Content-Type', 'application/manifest+json');
        response.end(webManifest());
      });
    },

    generateBundle() {
      this.emitFile({ type: 'asset', fileName: MANIFEST_FILE, source: webManifest() });
    },

    transformIndexHtml() {
      return [
        { tag: 'title', children: APP_TEXT.siteName, injectTo: 'head' as const },
        {
          tag: 'meta',
          attrs: { name: 'description', content: APP_TEXT.siteDescription },
          injectTo: 'head' as const,
        },
        /* 表示中の実際の色は theme/cssVariables.ts が配色に追随させて書き換える */
        {
          tag: 'meta',
          attrs: { name: 'theme-color', content: INITIAL_THEME_COLOR },
          injectTo: 'head' as const,
        },
        {
          tag: 'meta',
          attrs: { name: 'mobile-web-app-capable', content: 'yes' },
          injectTo: 'head' as const,
        },
        {
          tag: 'meta',
          attrs: { name: 'apple-mobile-web-app-capable', content: 'yes' },
          injectTo: 'head' as const,
        },
        {
          tag: 'meta',
          attrs: { name: 'apple-mobile-web-app-title', content: APP_TEXT.shortName },
          injectTo: 'head' as const,
        },
        {
          tag: 'meta',
          attrs: { name: 'apple-mobile-web-app-status-bar-style', content: 'default' },
          injectTo: 'head' as const,
        },
        {
          tag: 'link',
          attrs: {
            rel: 'icon',
            type: APP_ICON_TYPE,
            sizes: `${appIcon('favicon').size}x${appIcon('favicon').size}`,
            href: `./${appIcon('favicon').path}`,
          },
          injectTo: 'head' as const,
        },
        {
          tag: 'link',
          attrs: {
            rel: 'apple-touch-icon',
            sizes: `${appIcon('apple').size}x${appIcon('apple').size}`,
            href: `./${appIcon('apple').path}`,
          },
          injectTo: 'head' as const,
        },
        {
          tag: 'link',
          attrs: { rel: 'manifest', href: `./${MANIFEST_FILE}` },
          injectTo: 'head' as const,
        },
      ];
    },
  };
}

export default defineConfig({
  /* GitHub Pages などのサブディレクトリ配信でもそのまま動くよう相対パスで出力する */
  base: './',
  plugins: [react(), tailwindcss(), siteMetadata()],
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 1200,
  },
});

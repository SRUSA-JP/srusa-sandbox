/**
 * 公開している各 UI が初期レンダリングで壊れていないかを確認する。
 *
 * ブラウザ操作までは見ない軽量なスモークテスト。
 * ルート追加、データ import、相関図/地図の初期計算、ページ単位の JSX 破損を
 * `npm run build` の前段で検知するために使う。
 *
 * 描き上がった SVG の中の文字が枠からはみ出していないかも、ここで一緒に見る
 * （切り取られた文字は console.error を出さないので、レンダリングが通るだけでは気づけない）。
 * 図の寸法そのものの検査は scripts/check-layout.ts。
 */
import { renderToString } from 'react-dom/server';
import type { ReactElement } from 'react';
import { ClipsPage, EventRankingsPage, MapPage, PlayerPage, StatsPage, WorldMapPage, ZukanPage } from '../src/pages';
import { ROUTES, routeFromHash, skinForRoute, type Route, type RouteId } from '../src/routes';
import { setActiveSkin } from '../src/config/skins';
import { buildTheme } from '../src/theme/useThemeMode';
import { svgTextOverflow } from './svg-text-fit';

type PageRenderer = (props: { route: Route }) => ReactElement;

const PAGES: Record<RouteId, PageRenderer> = {
  stats: ({ route }) => <StatsPage theme={themeFor(route)} />,
  'world-map': ({ route }) => <WorldMapPage theme={themeFor(route)} />,
  relationships: ({ route }) => <MapPage theme={themeFor(route)} />,
  zukan: ({ route }) => <ZukanPage theme={themeFor(route)} />,
  events: ({ route }) => <EventRankingsPage theme={themeFor(route)} />,
  clips: () => <ClipsPage />,
  player: ({ route }) => <PlayerPage theme={themeFor(route)} route={route} />,
};

const ROUTES_TO_CHECK = [
  ...ROUTES,
  routeFromHash('#/players/nodoamenn'),
  routeFromHash('#/players/unknown-player'),
];

function themeFor(route: Route) {
  const skin = skinForRoute(route);
  setActiveSkin(skin);
  return buildTheme('light', skin);
}

function withConsoleTrap<T>(label: string, fn: () => T): T {
  const errors: string[] = [];
  const originalError = console.error;
  console.error = (...args: unknown[]) => {
    errors.push(args.map(String).join(' '));
  };
  try {
    const result = fn();
    if (errors.length > 0) {
      throw new Error(`${label} が console.error を出しました:\n${errors.join('\n')}`);
    }
    return result;
  } finally {
    console.error = originalError;
  }
}

let failed = false;

for (const route of ROUTES_TO_CHECK) {
  const label = `${route.label} ${route.path}`;
  try {
    const html = withConsoleTrap(label, () => renderToString(PAGES[route.id]({ route })));
    if (html.length < 100) throw new Error(`レンダリング結果が短すぎます (${html.length} chars)`);

    const overflow = svgTextOverflow(html);
    if (overflow.length > 0) {
      throw new Error(
        `図の文字が枠からはみ出しています:\n${overflow
          .map((finding) => `  「${finding.text}」（${finding.frame}）${finding.detail}`)
          .join('\n')}`,
      );
    }

    console.log(`OK  ${label} (${html.length} chars)`);
  } catch (error) {
    failed = true;
    console.error(`NG  ${label}`);
    console.error(error instanceof Error ? error.message : String(error));
  }
}

if (failed) process.exitCode = 1;
else console.log('UI 初期レンダリングはすべて通りました');

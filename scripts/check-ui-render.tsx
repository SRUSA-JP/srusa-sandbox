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
import { AppShell, ServiceCostPanel } from '../src/components';
import { APP_TEXT } from '../src/config/messages';
import {
  ClipsPage,
  BoardScorePage,
  EventRankingsPage,
  GamePlaceholderPage,
  HomePage,
  MapPage,
  PlayerPage,
  StatsPage,
  CalendarPage,
  HistoryPage,
  WorldMapPage,
  ZukanPage,
} from '../src/pages';
import { ROUTES, routeFromHash, skinForRoute, type Route, type RouteId } from '../src/routes';
import { setActiveSkin } from '../src/config/skins';
import { buildTheme } from '../src/theme/useThemeMode';
import { svgTextOverflow } from './svg-text-fit';
import type { PlayerRow } from '../src/lib/selectors';

type PageRenderer = (props: { route: Route }) => ReactElement;

const PAGES: Record<RouteId, PageRenderer> = {
  home: () => <HomePage />,
  stats: ({ route }) => <StatsPage theme={themeFor(route)} />,
  'world-map': ({ route }) => <WorldMapPage theme={themeFor(route)} />,
  relationships: ({ route }) => <MapPage theme={themeFor(route)} />,
  zukan: ({ route }) => <ZukanPage theme={themeFor(route)} />,
  calendar: ({ route }) => <CalendarPage theme={themeFor(route)} />,
  'board-score': ({ route }) => <BoardScorePage theme={themeFor(route)} />,
  valorant: ({ route }) => <GamePlaceholderPage route={route} />,
  lol: ({ route }) => <GamePlaceholderPage route={route} />,
  apex: ({ route }) => <GamePlaceholderPage route={route} />,
  history: ({ route }) => <HistoryPage theme={themeFor(route)} />,
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

function expectIncludes(label: string, html: string, text: string) {
  if (!html.includes(text)) throw new Error(`${label} に ${text} が見つかりません`);
}

function expectExcludes(label: string, html: string, text: string) {
  if (html.includes(text)) throw new Error(`${label} に不要な ${text} が含まれています`);
}

function htmlFrom(html: string, marker: string): string {
  const start = html.indexOf(marker);
  if (start < 0) throw new Error(`${marker} が見つかりません`);
  const end = html.indexOf('</nav>', start);
  return end < 0 ? html.slice(start) : html.slice(start, end);
}

const RELATIONSHIP_HTML_MAX_CHARS = 320_000;
let failed = false;

for (const route of ROUTES_TO_CHECK) {
  const label = `${route.label} ${route.path}`;
  try {
    const html = withConsoleTrap(label, () => renderToString(PAGES[route.id]({ route })));
    if (html.length < 100) throw new Error(`レンダリング結果が短すぎます (${html.length} chars)`);
    if (route.id === 'relationships') {
      expectIncludes(label, html, '関係樹');
      expectIncludes(label, html, 'nodoame');
      expectIncludes(label, html, '<details');
      if (html.length > RELATIONSHIP_HTML_MAX_CHARS) {
        throw new Error(`相関図 HTML が大きすぎます (${html.length} chars)`);
      }
    }
    if (route.id === 'history') expectExcludes(label, html, 'いま分かっていること');
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

const SERVICE_COST_ROWS: PlayerRow[] = [
  {
    name: 'nodoamenn',
    uuid: 'sample-nodoamenn',
    playtime_hours: 12.5,
    deaths: 0,
    deaths_per_hour: 0,
    distance_km: 0,
    jumps: 0,
    mob_kills: 0,
    mob_kills_per_hour: 0,
    player_kills: 0,
    damage_dealt_hp: 0,
    damage_taken_hp: 0,
    blocks_mined: 0,
    items_crafted: 0,
    items_used: 0,
    items_picked_up: 0,
    items_dropped: 0,
    tools_broken: 0,
    advancements: 0,
    recipes_unlocked: 0,
    chests_opened: 0,
    villager_trades: 0,
  },
  {
    name: 'Octbee',
    uuid: 'sample-octbee',
    playtime_hours: 3.25,
    deaths: 0,
    deaths_per_hour: 0,
    distance_km: 0,
    jumps: 0,
    mob_kills: 0,
    mob_kills_per_hour: 0,
    player_kills: 0,
    damage_dealt_hp: 0,
    damage_taken_hp: 0,
    blocks_mined: 0,
    items_crafted: 0,
    items_used: 0,
    items_picked_up: 0,
    items_dropped: 0,
    tools_broken: 0,
    advancements: 0,
    recipes_unlocked: 0,
    chests_opened: 0,
    villager_trades: 0,
  },
];

try {
  const route = routeFromHash('#/minecraft');
  const html = withConsoleTrap('ServiceCost playtime', () =>
    renderToString(
      <ServiceCostPanel
        rows={SERVICE_COST_ROWS}
        options={{ totalCost: 3000, basePercent: 20, slope: 1, roundingUnit: 1, customCosts: {} }}
        onOptionsChange={() => undefined}
        theme={themeFor(route)}
      />,
    ),
  );
  expectIncludes('ServiceCost playtime', html, 'プレイヤー別プレイ時間');
  expectIncludes('ServiceCost playtime', html, 'nodoamenn のプレイ時間');
  expectIncludes('ServiceCost playtime', html, '12時間30分');
  console.log(`OK  ServiceCost playtime (${html.length} chars)`);
} catch (error) {
  failed = true;
  console.error('NG  ServiceCost playtime');
  console.error(error instanceof Error ? error.message : String(error));
}

try {
  const route = routeFromHash('#/minecraft/world-map');
  const worldMapPageHtml = withConsoleTrap('WorldMap 3D smoke', () => renderToString(<WorldMapPage theme={themeFor(route)} />));
  expectIncludes('WorldMap 3D smoke', worldMapPageHtml, 'スポーン周辺 3D');
  expectIncludes('WorldMap 3D smoke', worldMapPageHtml, '生成物を確認しています');
  console.log(`OK  WorldMap 3D smoke (${worldMapPageHtml.length} chars)`);
} catch (error) {
  failed = true;
  console.error('NG  WorldMap 3D smoke');
  console.error(error instanceof Error ? error.message : String(error));
}

try {
  const route = routeFromHash('#/board-games/score');
  const html = withConsoleTrap('BoardScore active members', () =>
    renderToString(<BoardScorePage theme={themeFor(route)} />),
  );
  expectIncludes('BoardScore active members', html, 'アクティブ');
  expectIncludes('BoardScore active members', html, 'role="img"');
  expectIncludes('BoardScore active members', html, 'nodoamenn');
  expectIncludes('BoardScore active members', html, 'ボードゲーム得点記録表');
  expectIncludes('BoardScore active members', html, 'scope="col"');
  expectIncludes('BoardScore active members', html, 'scope="row"');
  expectIncludes('BoardScore active members', html, '未入力');
  expectIncludes('BoardScore active members', html, '合計');
  console.log(`OK  BoardScore active members (${html.length} chars)`);
} catch (error) {
  failed = true;
  console.error('NG  BoardScore active members');
  console.error(error instanceof Error ? error.message : String(error));
}

try {
  const route = routeFromHash('#/minecraft/world-map');
  const html = withConsoleTrap('AppShell mobile nav', () =>
    renderToString(
      <AppShell route={route} onNavigate={() => undefined} mode="light" onToggleTheme={() => undefined}>
        <main>content</main>
      </AppShell>,
    ),
  );
  const navHtml = htmlFrom(html, `aria-label="${APP_TEXT.mobileNavLabel}"`);
  expectIncludes('AppShell mobile nav', navHtml, 'sr-only">ゲーム</span>');
  expectIncludes('AppShell mobile nav', navHtml, 'aria-current="page"');
  expectIncludes('AppShell mobile nav', navHtml, 'bg-tab-marker');
  expectIncludes('AppShell mobile nav', navHtml, '<svg');
  expectExcludes('AppShell mobile nav', navHtml, 'grid-cols-5 grid-rows-5');
  expectExcludes('AppShell mobile nav', navHtml, 'bg-selected');
  expectExcludes('AppShell mobile nav', navHtml, APP_TEXT.gameContentNavLabel);
  expectIncludes('AppShell mobile context nav', html, `aria-label="${APP_TEXT.gameContentNavLabel}"`);
  console.log(`OK  AppShell mobile nav (${html.length} chars)`);
} catch (error) {
  failed = true;
  console.error('NG  AppShell mobile nav');
  console.error(error instanceof Error ? error.message : String(error));
}

try {
  const route = routeFromHash('#/zukan');
  const html = withConsoleTrap('AppShell people context nav', () =>
    renderToString(
      <AppShell route={route} onNavigate={() => undefined} mode="light" onToggleTheme={() => undefined}>
        <main>content</main>
      </AppShell>,
    ),
  );
  expectIncludes('AppShell people context nav', html, 'メンバー');
  expectIncludes('AppShell people context nav', html, '相関図');
  expectIncludes('AppShell people context nav', html, `aria-label="${APP_TEXT.gameNavLabel}"`);
  console.log(`OK  AppShell people context nav (${html.length} chars)`);
} catch (error) {
  failed = true;
  console.error('NG  AppShell people context nav');
  console.error(error instanceof Error ? error.message : String(error));
}

if (failed) process.exitCode = 1;
else console.log('UI 初期レンダリングはすべて通りました');

import type { ReactElement } from 'react';
import { AppShell } from './components';
import { useHashRoute } from './hooks/useHashRoute';
import { EventRankingsPage, MapPage, PlayerPage, StatsPage, WorldMapPage, ZukanPage } from './pages';
import { skinForRoute, type Route, type RouteId } from './routes';
import { setActiveSkin } from './config/skins';
import { useAppTheme } from './theme/useThemeMode';
import type { VizTheme } from './theme/palette';

/** 画面 ID → 中身。並び順と URL は routes.ts が持つ。 */
const PAGES: Record<RouteId, (props: { theme: VizTheme; route: Route }) => ReactElement> = {
  stats: StatsPage,
  'world-map': WorldMapPage,
  relationships: MapPage,
  zukan: ZukanPage,
  events: EventRankingsPage,
  player: PlayerPage,
};

/**
 * アプリの入口。
 *
 * 画面の切り替え（routes.ts）と、その画面の見た目（config/skins.ts）と
 * 配色（theme/）を結びつけるだけで、画面の中身には関わらない。
 */
export function App() {
  const { route, navigate } = useHashRoute();
  const skin = skinForRoute(route);

  /*
   * スキンは CSS を経由しない値（グラフの角丸・文字の大きさ）にも効くので、
   * 中身が描かれる前に切り替えておく。
   */
  setActiveSkin(skin);

  const { theme, mode, toggle } = useAppTheme(skin);
  const Page = PAGES[route.id];

  return (
    <AppShell route={route} onNavigate={navigate} mode={mode} onToggleTheme={toggle}>
      <Page theme={theme} route={route} />
    </AppShell>
  );
}

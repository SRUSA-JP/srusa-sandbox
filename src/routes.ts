/**
 * 画面の一覧と URL。
 *
 * タブに何を並べるか、どの画面をどの見た目（スキン）で出すかは、
 * このファイルだけが決める。画面の中身は pages/ にあり、
 * どの ID にどの画面を割り当てるかは App.tsx が持つ。
 */
import { MINECRAFT_SKIN, skinFor, type Skin } from './config/skins';

export type RouteId =
  | 'stats'
  | 'world-map'
  | 'relationships'
  | 'zukan'
  | 'calendar'
  | 'history'
  | 'events'
  | 'clips'
  | 'player';

export interface Route {
  id: RouteId;
  /** URL のハッシュ。ブックマークと再読み込みができるようにする。 */
  path: string;
  /** タブに出す名前。 */
  label: string;
  /** この画面で使う見た目のプリセット（config/skins.ts）。 */
  skinId: string;
  /** 動的ページだけが持つ URL パラメータ。 */
  params?: Record<string, string>;
  /**
   * タブに出さない画面が、どのタブの下にいるか。
   *
   * プレイヤー紹介は URL を直に開けるがタブには並べない。それでも
   * 「いま図鑑の中にいる」と分かるように、選択中のタブだけを借りる。
   */
  tabId?: RouteId;
}

/**
 * 図鑑の URL。
 *
 * 相関図など他の画面からも直に貼るので、文字列を書き写さずここを参照する。
 */
export const ZUKAN_PATH = '#/zukan';

export const ROUTES: Route[] = [
  { id: 'stats', path: '#/minecraft', label: 'Minecraft 統計', skinId: MINECRAFT_SKIN.id },
  {
    id: 'world-map',
    path: '#/minecraft/world-map',
    label: 'ワールドマップ',
    skinId: MINECRAFT_SKIN.id,
  },
  /* 活動カレンダーはサーバーのログから作るので、Minecraft のまとまりに置く */
  {
    id: 'calendar',
    path: '#/minecraft/calendar',
    label: '活動カレンダー',
    skinId: MINECRAFT_SKIN.id,
  },
  /* 相関図も Minecraft のページと同じドット絵風にする（サイト全体の雰囲気を揃えるため） */
  { id: 'relationships', path: '#/relationships', label: '相関図', skinId: MINECRAFT_SKIN.id },
  { id: 'zukan', path: ZUKAN_PATH, label: 'SRUSA 図鑑', skinId: MINECRAFT_SKIN.id },
  { id: 'history', path: '#/history', label: '年表', skinId: MINECRAFT_SKIN.id },
  { id: 'events', path: '#/events', label: 'イベント', skinId: MINECRAFT_SKIN.id },
  { id: 'clips', path: '#/gallery', label: 'ギャラリー', skinId: MINECRAFT_SKIN.id },
];

/** ハッシュが無い・知らないときに出す画面。 */
export const DEFAULT_ROUTE = ROUTES[0];

/** URL のハッシュから画面を決める唯一の入口。 */
export function routeFromHash(hash: string): Route {
  const normalized = hash.replace(/\/$/, '');
  if (normalized === '#/clips') {
    return ROUTES.find((route) => route.id === 'clips') ?? DEFAULT_ROUTE;
  }
  const known = ROUTES.find((route) => route.path === normalized);
  if (known) return known;
  const player = normalized.match(/^#\/players\/(.+)$/);
  if (player) {
    return {
      id: 'player',
      path: normalized,
      label: 'プレイヤー紹介',
      skinId: MINECRAFT_SKIN.id,
      params: { player: player[1] },
      tabId: 'zukan',
    };
  }
  return DEFAULT_ROUTE;
}

/** その画面で使うスキン。 */
export function skinForRoute(route: Route): Skin {
  return skinFor(route.skinId);
}

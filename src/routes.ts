/**
 * 画面の一覧と URL。
 *
 * タブに何を並べるか、どの画面をどの見た目（スキン）で出すかは、
 * このファイルだけが決める。画面の中身は pages/ にあり、
 * どの ID にどの画面を割り当てるかは App.tsx が持つ。
 */
import { MINECRAFT_SKIN, skinFor, type Skin } from './config/skins';

export type RouteId = 'stats' | 'world-map' | 'relationships';

export interface Route {
  id: RouteId;
  /** URL のハッシュ。ブックマークと再読み込みができるようにする。 */
  path: string;
  /** タブに出す名前。 */
  label: string;
  /** この画面で使う見た目のプリセット（config/skins.ts）。 */
  skinId: string;
}

export const ROUTES: Route[] = [
  { id: 'stats', path: '#/minecraft', label: 'Minecraft 統計', skinId: MINECRAFT_SKIN.id },
  {
    id: 'world-map',
    path: '#/minecraft/world-map',
    label: 'ワールドマップ',
    skinId: MINECRAFT_SKIN.id,
  },
  /* 相関図も Minecraft のページと同じドット絵風にする（サイト全体の雰囲気を揃えるため） */
  { id: 'relationships', path: '#/relationships', label: '相関図', skinId: MINECRAFT_SKIN.id },
];

/** ハッシュが無い・知らないときに出す画面。 */
export const DEFAULT_ROUTE = ROUTES[0];

/** URL のハッシュから画面を決める唯一の入口。 */
export function routeFromHash(hash: string): Route {
  const normalized = hash.replace(/\/$/, '');
  return ROUTES.find((route) => route.path === normalized) ?? DEFAULT_ROUTE;
}

/** その画面で使うスキン。 */
export function skinForRoute(route: Route): Skin {
  return skinFor(route.skinId);
}

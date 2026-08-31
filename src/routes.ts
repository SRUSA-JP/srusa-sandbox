/**
 * 画面の一覧と URL。
 *
 * タブに何を並べるか、どの画面をどの見た目（スキン）で出すかは、
 * このファイルだけが決める。画面の中身は pages/ にあり、
 * どの ID にどの画面を割り当てるかは App.tsx が持つ。
 */
import { MINECRAFT_SKIN, skinFor, type Skin } from './config/skins';

export type RouteId =
  | 'home'
  | 'stats'
  | 'world-map'
  | 'relationships'
  | 'zukan'
  | 'calendar'
  | 'valorant'
  | 'lol'
  | 'apex'
  | 'history'
  | 'events'
  | 'clips'
  | 'player';

/**
 * まとまり（上のタブ）の一覧。
 *
 * Minecraft・VALORANT・LOL・APEX は「遊んでいるゲーム」という同じ話題なので、
 * 上のタブでは「ゲーム」1 つにまとめ、どのゲームかは下の段で切り替える。
 * 上のタブが何枚もあると、どれが同じ話題なのか分からなくなるため。
 */
export const SECTIONS = [
  { id: 'home', label: 'ホーム' },
  { id: 'games', label: 'ゲーム' },
  { id: 'relationships', label: '相関図' },
  { id: 'members', label: 'メンバー' },
  { id: 'history', label: '年表' },
  { id: 'events', label: 'イベント' },
  { id: 'clips', label: 'ギャラリー' },
] as const;

export type SectionId = (typeof SECTIONS)[number]['id'];

export interface Route {
  id: RouteId;
  /** どのまとまりに属するか。上のタブはこれで選ばれる。 */
  section: SectionId;
  /** URL のハッシュ。ブックマークと再読み込みができるようにする。 */
  path: string;
  /** タブに出す名前。 */
  label: string;
  /** この画面で使う見た目のプリセット（config/skins.ts）。 */
  skinId: string;
  /** ゲーム配下の画面だけが持つ、親ゲームの ID。 */
  gameId?: string;
  /** ゲーム配下の画面だけが持つ、親ゲームの表示名。 */
  gameLabel?: string;
  /** 動的ページだけが持つ URL パラメータ。 */
  params?: Record<string, string>;
  /**
   * 下の段で、複数の画面を持つゲームだとまとめて見せるための名前。
   *
   * Minecraft は統計・ワールドマップ・活動カレンダーの 3 画面を持つが、
   * VALORANT・LOL・APEX はそれぞれ 1 画面だけなので、並べただけでは
   * どれが同じゲームの画面か分からない。この名前がある画面どうしを
   * 1 つの囲いにまとめ、無い画面は今までどおり単独のタブにする。
   */
  group?: string;
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
  {
    id: 'home',
    section: 'home',
    path: '#/',
    label: 'ホーム',
    skinId: MINECRAFT_SKIN.id,
  },
  /* ゲーム。遊んでいるゲームをここにまとめ、下の段で切り替える */
  {
    id: 'stats',
    section: 'games',
    group: 'Minecraft',
    gameId: 'minecraft',
    gameLabel: 'Minecraft',
    path: '#/minecraft',
    label: '統計',
    skinId: MINECRAFT_SKIN.id,
  },
  {
    id: 'world-map',
    section: 'games',
    group: 'Minecraft',
    gameId: 'minecraft',
    gameLabel: 'Minecraft',
    path: '#/minecraft/world-map',
    label: 'ワールドマップ',
    skinId: MINECRAFT_SKIN.id,
  },
  {
    id: 'calendar',
    section: 'games',
    group: 'Minecraft',
    gameId: 'minecraft',
    gameLabel: 'Minecraft',
    path: '#/minecraft/calendar',
    label: '活動カレンダー',
    skinId: MINECRAFT_SKIN.id,
  },
  /*
   * ここから先はまだ中身が無いプレースホルダー。Minecraft 以外にも遊んでいる
   * ゲームがあるので、タブの場所だけ先に用意しておく。
   */
  {
    id: 'valorant',
    section: 'games',
    gameId: 'valorant',
    gameLabel: 'VALORANT',
    path: '#/valorant',
    label: '概要',
    skinId: MINECRAFT_SKIN.id,
  },
  {
    id: 'lol',
    section: 'games',
    gameId: 'lol',
    gameLabel: 'LOL',
    path: '#/lol',
    label: '概要',
    skinId: MINECRAFT_SKIN.id,
  },
  {
    id: 'apex',
    section: 'games',
    gameId: 'apex',
    gameLabel: 'APEX',
    path: '#/apex',
    label: '概要',
    skinId: MINECRAFT_SKIN.id,
  },
  /* 相関図も Minecraft のページと同じドット絵風にする（サイト全体の雰囲気を揃えるため） */
  {
    id: 'relationships',
    section: 'relationships',
    path: '#/relationships',
    label: '相関図',
    skinId: MINECRAFT_SKIN.id,
  },
  { id: 'zukan', section: 'members', path: ZUKAN_PATH, label: 'メンバー', skinId: MINECRAFT_SKIN.id },
  { id: 'history', section: 'history', path: '#/history', label: '年表', skinId: MINECRAFT_SKIN.id },
  { id: 'events', section: 'events', path: '#/events', label: 'イベント', skinId: MINECRAFT_SKIN.id },
  { id: 'clips', section: 'clips', path: '#/gallery', label: 'ギャラリー', skinId: MINECRAFT_SKIN.id },
];

/** そのまとまりに入っている画面。下の段に並べる。 */
export function routesInSection(section: SectionId): Route[] {
  return ROUTES.filter((route) => route.section === section);
}

/** ハッシュが無い・知らないときに出す画面。 */
export const DEFAULT_ROUTE = ROUTES[0];

/** URL のハッシュから画面を決める唯一の入口。 */
export function routeFromHash(hash: string): Route {
  const normalized = hash.replace(/\/$/, '');
  if (normalized === '' || normalized === '#' || normalized === '#/home') {
    return DEFAULT_ROUTE;
  }
  if (normalized === '#/clips') {
    return ROUTES.find((route) => route.id === 'clips') ?? DEFAULT_ROUTE;
  }
  const known = ROUTES.find((route) => route.path === normalized);
  if (known) return known;
  const player = normalized.match(/^#\/players\/(.+)$/);
  if (player) {
    return {
      id: 'player',
      section: 'members',
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

import type { ReactNode } from 'react';
import { APP_TEXT } from '../../config/messages';
import { SECTIONS, routesInSection, type Route, type SectionId } from '../../routes';
import type { ThemeMode } from '../../theme/palette';
import { Icon, IconButton, type IconName } from '../atoms';

export interface AppShellProps {
  /** 表示中の画面。 */
  route: Route;
  onNavigate: (route: Route) => void;
  /** いま表示している配色。ボタンの絵と説明がこれで決まる。 */
  mode: ThemeMode;
  onToggleTheme: () => void;
  children: ReactNode;
}

/** 上の段のタブ 1 枚。選択中は下線と面で示す（色だけに頼らない）。 */
const TAB = 'shrink-0 cursor-pointer whitespace-nowrap rounded-md border-b-thick px-md py-xs text-sm transition-colors';

/**
 * 下の段のタブ 1 枚。
 *
 * 上の段より小さく、下線ではなく面で選択中を示す。同じ形にすると
 * どちらが上位のまとまりなのか分からなくなる。
 */
const SUB_TAB = 'shrink-0 cursor-pointer whitespace-nowrap rounded-md px-md py-xs text-sm transition-colors';

type MobileNavItem = {
  label: string;
  icon: IconName;
  targetSection: SectionId;
  activeSections: readonly SectionId[];
};

const MOBILE_NAV_ITEMS: MobileNavItem[] = [
  { label: 'ホーム', icon: 'home', targetSection: 'home', activeSections: ['home'] },
  { label: 'ゲーム', icon: 'game', targetSection: 'games', activeSections: ['games'] },
  { label: '人', icon: 'people', targetSection: 'members', activeSections: ['members', 'relationships'] },
  { label: '記録', icon: 'record', targetSection: 'history', activeSections: ['history', 'events'] },
  { label: 'ギャラリー', icon: 'gallery', targetSection: 'clips', activeSections: ['clips'] },
];

function gameClusters(siblings: Route[]): Array<{ id: string; label: string; entries: Route[] }> {
  const clusters: Array<{ id: string; label: string; entries: Route[] }> = [];
  for (const entry of siblings) {
    const id = entry.gameId ?? entry.id;
    const label = entry.gameLabel ?? entry.group ?? entry.label;
    const last = clusters[clusters.length - 1];
    if (last?.id === id) {
      last.entries.push(entry);
    } else {
      clusters.push({ id, label, entries: [entry] });
    }
  }
  return clusters;
}

/** 下の段のタブ 1 枚分のボタン。 */
function subTabButton(entry: Route, route: Route, onNavigate: (route: Route) => void) {
  /* タブに並ばない画面（プレイヤー紹介）は、親のタブを選択中に見せる */
  const active = entry.id === (route.tabId ?? route.id);
  return (
    <button
      key={entry.id}
      type="button"
      aria-current={active ? 'page' : undefined}
      className={
        active
          ? `${SUB_TAB} bg-selected font-medium text-selected-ink`
          : `${SUB_TAB} text-tab hover:bg-hover hover:text-tab-active`
      }
      onClick={() => onNavigate(entry)}
    >
      {entry.label}
    </button>
  );
}

function mobileNavButton(item: MobileNavItem, route: Route, onNavigate: (route: Route) => void) {
  const active = item.activeSections.includes(route.section);
  const target = routesInSection(item.targetSection)[0];
  if (!target) return null;
  return (
    <button
      key={item.label}
      type="button"
      aria-current={active ? 'page' : undefined}
      className={
        active
          ? 'grid min-h-[var(--sr-layout-mobile-nav-height)] min-w-0 place-items-center gap-xxs rounded-md bg-selected px-xs py-xs text-selected-ink'
          : 'grid min-h-[var(--sr-layout-mobile-nav-height)] min-w-0 place-items-center gap-xxs rounded-md px-xs py-xs text-tab hover:bg-hover hover:text-tab-active'
      }
      onClick={() => onNavigate(target)}
    >
      <Icon name={item.icon} />
      <span className="max-w-full truncate text-xs font-medium leading-tight">{item.label}</span>
    </button>
  );
}

/**
 * サイト全体の枠。
 *
 * どのページでも変わらないもの（サイト名・タブ・配色の切り替え・本文の幅）
 * だけを持ち、ページの中身には関わらない。
 */
export function AppShell({ route, onNavigate, mode, onToggleTheme, children }: AppShellProps) {
  const dark = mode === 'dark';
  const logoSrc = `${import.meta.env.BASE_URL}icons/srusa-32.png`;
  const siblings = routesInSection(route.section);
  const games = route.section === 'games' ? gameClusters(siblings) : [];
  const activeGameId = route.gameId ?? route.id;
  const activeGame = games.find((game) => game.id === activeGameId);
  return (
    <div className="mx-auto max-w-[var(--sr-layout-max-width)] px-lg pb-[var(--sr-layout-mobile-nav-page-padding)] sm:px-xxl sm:pb-page md:px-xxxl">
      <header className="sticky top-0 z-40 -mx-lg border-b-hairline border-divider bg-page px-lg py-xs sm:-mx-xxl sm:px-xxl md:-mx-xxxl md:px-xxxl">
        <div className="mx-auto flex max-w-[var(--sr-layout-max-width)] items-center gap-md overflow-x-auto">
          <a href="#/" className="flex shrink-0 items-center gap-sm hover:bg-hover" aria-label={APP_TEXT.homeLink}>
            <img
              src={logoSrc}
              alt={APP_TEXT.logoAlt}
              className="h-[var(--sr-layout-logo-size)] w-[var(--sr-layout-logo-size)] shrink-0 rounded-sm border-hairline border-divider bg-sunken"
            />
            <span className="text-lg font-medium tracking-tight text-heading">{APP_TEXT.siteName}</span>
          </a>

          {/* 上の段: まとまり。押すとそのまとまりの最初の画面へ行く */}
          <nav className="hidden shrink-0 items-center gap-xs sm:flex" aria-label={APP_TEXT.navLabel}>
            {SECTIONS.map((section) => {
              const active = section.id === route.section;
              const first = routesInSection(section.id)[0];
              if (!first) return null;
              return (
                <button
                  key={section.id}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  className={
                    active
                      ? `${TAB} border-tab-marker bg-tab-active-bg font-medium text-tab-active`
                      : `${TAB} border-transparent text-tab hover:bg-hover hover:text-tab-active`
                  }
                  onClick={() => onNavigate(first)}
                >
                  {section.label}
                </button>
              );
            })}
          </nav>

          {/* 絵は「押すと何になるか」を出す。説明も同じ言い方で揃える */}
          <div className="ml-auto shrink-0">
            <IconButton
              icon={dark ? 'light' : 'dark'}
              label={dark ? APP_TEXT.theme.toLight : APP_TEXT.theme.toDark}
              onClick={onToggleTheme}
            />
          </div>
        </div>
      </header>

      {games.length > 1 && (
        <nav className="mt-md flex items-center gap-xs overflow-x-auto" aria-label={APP_TEXT.gameNavLabel}>
          {games.map((game) => {
            const active = game.id === activeGameId;
            return (
              <button
                key={game.id}
                type="button"
                aria-current={active ? 'page' : undefined}
                className={
                  active
                    ? `${SUB_TAB} bg-selected font-medium text-selected-ink`
                    : `${SUB_TAB} text-tab hover:bg-hover hover:text-tab-active`
                }
                onClick={() => onNavigate(game.entries[0])}
              >
                {game.label}
              </button>
            );
          })}
        </nav>
      )}

      {/* 下の段: そのまとまりの中の画面。1 つしか無いまとまりでは出さない */}
      {route.section !== 'games' && siblings.length > 1 && (
        <nav className="mt-md flex items-center gap-md overflow-x-auto" aria-label={APP_TEXT.sectionNavLabel}>
          {siblings.map((entry) => subTabButton(entry, route, onNavigate))}
        </nav>
      )}

      {activeGame && activeGame.entries.length > 1 && (
        <nav className="mt-sm flex items-center gap-xs overflow-x-auto" aria-label={APP_TEXT.gameContentNavLabel}>
          {activeGame.entries.map((entry) => subTabButton(entry, route, onNavigate))}
        </nav>
      )}

      <div className="mb-xxl" />

      {children}

      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t-hairline border-divider bg-page px-xs pb-mobile-nav-safe pt-xs sm:hidden"
        aria-label={APP_TEXT.mobileNavLabel}
      >
        <div className="mx-auto grid max-w-[var(--sr-layout-max-width)] grid-cols-5 gap-xxs">
          {MOBILE_NAV_ITEMS.map((item) => mobileNavButton(item, route, onNavigate))}
        </div>
      </nav>
    </div>
  );
}

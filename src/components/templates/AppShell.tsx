import type { ReactNode } from 'react';
import { APP_TEXT } from '../../config/messages';
import { SECTIONS, routesInSection, type Route } from '../../routes';
import type { ThemeMode } from '../../theme/palette';
import { IconButton } from '../atoms';

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
const TAB = 'cursor-pointer rounded-t-md border-b-thick px-lg py-md text-md transition-colors';

/**
 * 下の段のタブ 1 枚。
 *
 * 上の段より小さく、下線ではなく面で選択中を示す。同じ形にすると
 * どちらが上位のまとまりなのか分からなくなる。
 */
const SUB_TAB = 'cursor-pointer rounded-md px-md py-xs text-sm transition-colors';

/**
 * 下の段を、複数の画面を持つゲーム（route.group）ごとにまとめる。
 *
 * 同じ group が並んでいる区間を 1 つの囲いにし、group の無い画面は
 * 今までどおり単独のタブにする。route.ts で group を持つ画面は
 * 連続して並べてあるので、ここでは並び順をそのまま見るだけでよい。
 */
function groupedSiblings(siblings: Route[]): Array<{ group?: string; entries: Route[] }> {
  const clusters: Array<{ group?: string; entries: Route[] }> = [];
  for (const entry of siblings) {
    const last = clusters[clusters.length - 1];
    if (entry.group && last?.group === entry.group) {
      last.entries.push(entry);
    } else {
      clusters.push({ group: entry.group, entries: [entry] });
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

/**
 * サイト全体の枠。
 *
 * どのページでも変わらないもの（サイト名・タブ・配色の切り替え・本文の幅）
 * だけを持ち、ページの中身には関わらない。
 */
export function AppShell({ route, onNavigate, mode, onToggleTheme, children }: AppShellProps) {
  const dark = mode === 'dark';
  const siblings = routesInSection(route.section);
  return (
    <div className="mx-auto max-w-[var(--sr-layout-max-width)] px-lg pt-lg pb-page sm:px-xxl sm:pt-xxl md:px-xxxl">
      <header className="flex flex-wrap items-start justify-between gap-lg">
        <div className="min-w-0">
          <span className="text-lg font-medium tracking-tight text-heading">{APP_TEXT.siteName}</span>
          <p className="mt-xxs text-sm text-muted">{APP_TEXT.siteNote}</p>
        </div>
        {/* 絵は「押すと何になるか」を出す。説明も同じ言い方で揃える */}
        <IconButton
          icon={dark ? 'light' : 'dark'}
          label={dark ? APP_TEXT.theme.toLight : APP_TEXT.theme.toDark}
          onClick={onToggleTheme}
        />
      </header>

      {/* 上の段: まとまり。押すとそのまとまりの最初の画面へ行く */}
      <nav
        className="mt-lg flex flex-wrap gap-xs border-b-hairline border-divider sm:mt-xl"
        aria-label={APP_TEXT.navLabel}
      >
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

      {/* 下の段: そのまとまりの中の画面。1 つしか無いまとまりでは出さない */}
      {siblings.length > 1 && (
        <nav className="mt-md flex flex-wrap items-center gap-md" aria-label={APP_TEXT.sectionNavLabel}>
          {groupedSiblings(siblings).map((cluster) =>
            cluster.group ? (
              <div
                key={`group-${cluster.group}`}
                className="flex flex-wrap items-center gap-xs rounded-md border-hairline border-divider px-xs py-xxs"
              >
                <span className="px-xs text-xs font-medium text-subtle">{cluster.group}</span>
                {cluster.entries.map((entry) => subTabButton(entry, route, onNavigate))}
              </div>
            ) : (
              <div key={cluster.entries[0].id} className="flex flex-wrap gap-xs">
                {cluster.entries.map((entry) => subTabButton(entry, route, onNavigate))}
              </div>
            ),
          )}
        </nav>
      )}

      <div className="mb-xxl sm:mb-section" />

      {children}
    </div>
  );
}

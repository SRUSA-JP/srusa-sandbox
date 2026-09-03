import { useState } from 'react';
import { APP_TEXT } from '../../config/messages';
import {
  NAV_GROUPS,
  navGroupForRoute,
  routesInNavGroup,
  type NavGroupId,
  type Route,
} from '../../routes';
import type { IconName } from '../atoms';
import { MobileNavButton, NavigationButton } from '../molecules';

type RouteCluster = {
  id: string;
  label: string;
  entries: Route[];
};

const NAV_GROUP_ICONS: Record<NavGroupId, IconName> = {
  home: 'home',
  games: 'game',
  people: 'people',
  records: 'record',
  gallery: 'gallery',
};

function routeClusters(entries: Route[]): RouteCluster[] {
  const clusters: RouteCluster[] = [];
  for (const entry of entries) {
    const id = entry.gameId ?? entry.id;
    const label = entry.gameLabel ?? entry.group ?? entry.label;
    const last = clusters[clusters.length - 1];
    if (last?.id === id) last.entries.push(entry);
    else clusters.push({ id, label, entries: [entry] });
  }
  return clusters;
}

function routeIsActive(entry: Route, route: Route): boolean {
  return entry.id === (route.tabId ?? route.id);
}

function navGroupLabel(route: Route): string {
  return NAV_GROUPS.find((group) => group.id === navGroupForRoute(route))?.label ?? route.label;
}

function contextSummary(route: Route): string {
  return [navGroupLabel(route), route.gameLabel, route.label].filter(Boolean).join(' / ');
}

function activeRouteClusters(route: Route): RouteCluster[] {
  return routeClusters(routesInNavGroup(navGroupForRoute(route)));
}

export interface PrimaryNavigationProps {
  route: Route;
  onNavigate: (route: Route) => void;
}

/** PC ヘッダーの親ジャンル切替。 */
export function PrimaryNavigation({ route, onNavigate }: PrimaryNavigationProps) {
  const activeGroup = navGroupForRoute(route);
  return (
    <nav className="hidden shrink-0 items-center gap-xs sm:flex" aria-label={APP_TEXT.navLabel}>
      {NAV_GROUPS.map((group) => {
        const first = routesInNavGroup(group.id)[0];
        if (!first) return null;
        return (
          <NavigationButton
            key={group.id}
            label={group.label}
            active={group.id === activeGroup}
            variant="primary"
            onClick={() => onNavigate(first)}
          />
        );
      })}
    </nav>
  );
}

export interface ContextNavigationProps {
  route: Route;
  onNavigate: (route: Route) => void;
}

/** 親ジャンルの中身を切り替えるナビ。ゲームでは「ゲーム名 → コンテンツ」の順に出す。 */
export function ContextNavigation({ route, onNavigate }: ContextNavigationProps) {
  const [collapsed, setCollapsed] = useState(false);
  const clusters = activeRouteClusters(route);
  const activeClusterId = route.gameId ?? route.tabId ?? route.id;
  const activeCluster = clusters.find((cluster) => cluster.id === activeClusterId);
  const hasClusterChoices = clusters.length > 1;
  const hasEntryChoices = activeCluster && activeCluster.entries.length > 1;

  if (!hasClusterChoices && !hasEntryChoices) return null;

  return (
    <div className="mt-xs grid gap-xs">
      <div className="mx-auto grid max-w-[var(--sr-layout-max-width)] gap-xs">
        <div className="flex min-w-0 items-center gap-xs">
          <p className="min-w-0 flex-1 truncate text-xs text-muted">{contextSummary(route)}</p>
          <button
            type="button"
            className="shrink-0 rounded-md border-hairline border-control-line bg-control px-sm py-xxs text-xs leading-tight text-control-ink transition-colors hover:border-control-line-hover hover:bg-control-hover"
            aria-expanded={!collapsed}
            onClick={() => setCollapsed((current) => !current)}
          >
            {collapsed ? APP_TEXT.contextNav.show : APP_TEXT.contextNav.hide}
          </button>
        </div>

        {!collapsed && hasClusterChoices && (
          <nav className="flex items-center gap-xs overflow-x-auto" aria-label={APP_TEXT.gameNavLabel}>
            {clusters.map((cluster) => (
              <NavigationButton
                key={cluster.id}
                label={cluster.label}
                active={cluster.id === activeClusterId}
                onClick={() => onNavigate(cluster.entries[0])}
              />
            ))}
          </nav>
        )}

        {!collapsed && hasEntryChoices && (
          <nav className="flex items-center gap-xs overflow-x-auto" aria-label={APP_TEXT.gameContentNavLabel}>
            {activeCluster.entries.map((entry) => (
              <NavigationButton
                key={entry.id}
                label={entry.label}
                active={routeIsActive(entry, route)}
                onClick={() => onNavigate(entry)}
              />
            ))}
          </nav>
        )}
      </div>
    </div>
  );
}

export interface MobileFooterNavigationProps {
  route: Route;
  onNavigate: (route: Route) => void;
}

/** スマートフォン下部の親ジャンル切替。 */
export function MobileFooterNavigation({ route, onNavigate }: MobileFooterNavigationProps) {
  const activeGroup = navGroupForRoute(route);
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-50 border-t-hairline border-divider bg-page px-xs pb-mobile-nav-safe sm:hidden"
      aria-label={APP_TEXT.mobileNavLabel}
    >
      <div className="mx-auto grid max-w-[var(--sr-layout-max-width)] grid-cols-5 gap-xxs">
        {NAV_GROUPS.map((group) => {
          const first = routesInNavGroup(group.id)[0];
          if (!first) return null;
          return (
            <MobileNavButton
              key={group.id}
              label={group.label}
              icon={NAV_GROUP_ICONS[group.id]}
              active={group.id === activeGroup}
              onClick={() => onNavigate(first)}
            />
          );
        })}
      </div>
    </nav>
  );
}

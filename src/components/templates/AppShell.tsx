import type { ReactNode } from 'react';
import { APP_TEXT } from '../../config/messages';
import type { Route } from '../../routes';
import type { ThemeMode } from '../../theme/palette';
import { IconButton } from '../atoms';
import { ContextNavigation, MobileFooterNavigation, PrimaryNavigation } from '../organisms';

export interface AppShellProps {
  /** 表示中の画面。 */
  route: Route;
  onNavigate: (route: Route) => void;
  /** いま表示している配色。ボタンの絵と説明がこれで決まる。 */
  mode: ThemeMode;
  onToggleTheme: () => void;
  children: ReactNode;
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
  return (
    <div className="mx-auto max-w-[var(--sr-layout-max-width)] px-lg pb-[var(--sr-layout-mobile-nav-page-padding)] sm:px-xxl sm:pb-page md:px-xxxl">
      <header className="sticky top-0 z-50 -mx-lg border-b-hairline border-divider bg-page px-lg py-xs sm:-mx-xxl sm:px-xxl md:-mx-xxxl md:px-xxxl">
        <div className="mx-auto flex max-w-[var(--sr-layout-max-width)] items-center gap-md overflow-x-auto">
          <a href="#/" className="flex shrink-0 items-center gap-sm hover:bg-hover" aria-label={APP_TEXT.homeLink}>
            <img
              src={logoSrc}
              alt={APP_TEXT.logoAlt}
              className="h-[var(--sr-layout-logo-size)] w-[var(--sr-layout-logo-size)] shrink-0 rounded-sm border-hairline border-divider bg-sunken"
            />
            <span className="text-lg font-medium tracking-tight text-heading">{APP_TEXT.siteName}</span>
          </a>

          <PrimaryNavigation route={route} onNavigate={onNavigate} />

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

      <ContextNavigation route={route} onNavigate={onNavigate} />
      <ContextNavigation route={route} onNavigate={onNavigate} mobile />

      <div className="mb-xxl" />

      {children}

      <MobileFooterNavigation route={route} onNavigate={onNavigate} />
    </div>
  );
}

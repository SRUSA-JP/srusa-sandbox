import type { ReactNode } from 'react';
import { APP_TEXT } from '../../config/messages';
import { ROUTES, type Route } from '../../routes';
import type { ThemePreference } from '../../theme/useThemeMode';
import { Picker } from '../atoms';

export interface AppShellProps {
  /** 表示中の画面。 */
  route: Route;
  onNavigate: (route: Route) => void;
  preference: ThemePreference;
  onPreferenceChange: (preference: ThemePreference) => void;
  children: ReactNode;
}

/** 配色の選択肢。文言は config/messages.ts が持つ。 */
const THEME_OPTIONS: Array<{ value: ThemePreference; label: string }> = [
  { value: 'system', label: APP_TEXT.theme.system },
  { value: 'light', label: APP_TEXT.theme.light },
  { value: 'dark', label: APP_TEXT.theme.dark },
];

const TAB = 'cursor-pointer border-b-thick px-lg py-md';

/**
 * サイト全体の枠。
 *
 * どのページでも変わらないもの（サイト名・タブ・配色の切り替え・本文の幅）
 * だけを持ち、ページの中身には関わらない。
 */
export function AppShell({ route, onNavigate, preference, onPreferenceChange, children }: AppShellProps) {
  return (
    <div className="mx-auto max-w-[var(--sr-layout-max-width)] px-xxl pt-xxxl pb-page">
      <header className="mb-xl flex flex-wrap items-start justify-between gap-lg bg-header text-header-ink">
        <div>
          <span className="text-lg font-medium text-heading">{APP_TEXT.siteName}</span>
          <p className="mt-xxs text-sm text-muted">{APP_TEXT.siteNote}</p>
        </div>
        <Picker
          showLabel
          label={APP_TEXT.theme.label}
          value={preference}
          options={THEME_OPTIONS}
          onChange={onPreferenceChange}
        />
      </header>

      <nav
        className="mt-xl mb-xxl flex flex-wrap gap-xs border-b-hairline border-divider"
        aria-label={APP_TEXT.navLabel}
      >
        {ROUTES.map((entry) => {
          const active = entry.id === route.id;
          return (
            <button
              key={entry.id}
              type="button"
              aria-current={active ? 'page' : undefined}
              className={
                active
                  ? `${TAB} border-b-selected font-medium text-ink`
                  : `${TAB} border-b-transparent text-muted`
              }
              onClick={() => onNavigate(entry)}
            >
              {entry.label}
            </button>
          );
        })}
      </nav>

      {children}
    </div>
  );
}

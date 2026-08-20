import type { ReactNode } from 'react';
import { APP_TEXT } from '../../config/messages';
import { ROUTES, type Route } from '../../routes';
import type { ThemePreference } from '../../theme/useThemeMode';
import { Segmented, type SegmentedOption } from '../atoms';

export interface AppShellProps {
  /** 表示中の画面。 */
  route: Route;
  onNavigate: (route: Route) => void;
  preference: ThemePreference;
  onPreferenceChange: (preference: ThemePreference) => void;
  children: ReactNode;
}

/** 配色の選択肢。文言は config/messages.ts が持つ。 */
const THEME_OPTIONS: Array<SegmentedOption<ThemePreference>> = [
  { value: 'system', label: APP_TEXT.theme.system, icon: 'device' },
  { value: 'light', label: APP_TEXT.theme.light, icon: 'light' },
  { value: 'dark', label: APP_TEXT.theme.dark, icon: 'dark' },
];

/** タブ 1 枚。選択中は下線と面で示す（色だけに頼らない）。 */
const TAB = 'cursor-pointer rounded-t-md border-b-thick px-lg py-md text-md transition-colors';

/**
 * サイト全体の枠。
 *
 * どのページでも変わらないもの（サイト名・タブ・配色の切り替え・本文の幅）
 * だけを持ち、ページの中身には関わらない。
 */
export function AppShell({ route, onNavigate, preference, onPreferenceChange, children }: AppShellProps) {
  return (
    <div className="mx-auto max-w-[var(--sr-layout-max-width)] px-lg pt-lg pb-page sm:px-xxl sm:pt-xxl md:px-xxxl">
      <header className="flex flex-wrap items-start justify-between gap-lg">
        <div className="min-w-0">
          <span className="text-lg font-medium tracking-tight text-heading">{APP_TEXT.siteName}</span>
          <p className="mt-xxs text-sm text-muted">{APP_TEXT.siteNote}</p>
        </div>
        {/* 狭い画面では絵だけにする。文字は読み上げのために残す */}
        <Segmented
          options={THEME_OPTIONS}
          value={preference}
          onChange={onPreferenceChange}
          ariaLabel={APP_TEXT.theme.label}
          hideLabelsWhenNarrow
        />
      </header>

      <nav
        className="mt-lg mb-xxl flex flex-wrap gap-xs border-b-hairline border-divider sm:mt-xl sm:mb-section"
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
                  ? `${TAB} border-tab-marker bg-tab-active-bg font-medium text-tab-active`
                  : `${TAB} border-transparent text-tab hover:bg-hover hover:text-tab-active`
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

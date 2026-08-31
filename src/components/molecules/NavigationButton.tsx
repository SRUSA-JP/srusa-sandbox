import { LAYOUT } from '../../theme/tokens';
import { Icon, PixelNavIcon, type IconName } from '../atoms';

const PRIMARY_TAB = 'shrink-0 cursor-pointer whitespace-nowrap rounded-md border-b-thick px-md py-xs text-sm transition-colors';
const SUB_TAB = 'shrink-0 cursor-pointer whitespace-nowrap rounded-md px-md py-xs text-sm transition-colors';

export interface NavigationButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  variant?: 'primary' | 'sub';
}

/** ヘッダーや文脈切替で使うテキストタブ。 */
export function NavigationButton({ label, active, onClick, variant = 'sub' }: NavigationButtonProps) {
  const base = variant === 'primary' ? PRIMARY_TAB : SUB_TAB;
  return (
    <button
      type="button"
      aria-current={active ? 'page' : undefined}
      className={
        active
          ? `${base} ${variant === 'primary' ? 'border-tab-marker bg-tab-active-bg text-tab-active' : 'bg-selected text-selected-ink'} font-medium`
          : `${base} ${variant === 'primary' ? 'border-transparent' : ''} text-tab hover:bg-hover hover:text-tab-active`
      }
      onClick={onClick}
    >
      {label}
    </button>
  );
}

export interface MobileNavButtonProps {
  label: string;
  icon: IconName;
  active: boolean;
  onClick: () => void;
}

/** スマートフォン下部ナビのアイコンボタン。 */
export function MobileNavButton({ label, icon, active, onClick }: MobileNavButtonProps) {
  const buttonClass = active
    ? 'flex min-h-[var(--sr-layout-mobile-nav-height)] min-w-0 flex-col items-center justify-start px-xs py-xxs text-tab-active'
    : 'flex min-h-[var(--sr-layout-mobile-nav-height)] min-w-0 flex-col items-center justify-start px-xs py-xxs text-tab hover:text-tab-active';
  return (
    <button type="button" aria-current={active ? 'page' : undefined} className={buttonClass} onClick={onClick}>
      <span
        aria-hidden
        className={`h-[var(--sr-border-thick)] w-[var(--sr-space-xl)] ${active ? 'bg-tab-marker' : 'bg-transparent'}`}
      />
      <span className="hidden flex-1 place-items-center sm:grid">
        <Icon name={icon} size={LAYOUT.mobileNavIconSize} />
      </span>
      <span className="grid flex-1 place-items-center sm:hidden">
        <PixelNavIcon name={icon} />
      </span>
      <span className="sr-only">{label}</span>
    </button>
  );
}

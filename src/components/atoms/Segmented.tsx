import { Icon, type IconName } from './Icon';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  /** 文字の左に添える絵。 */
  icon?: IconName;
}

export interface SegmentedProps<T extends string> {
  options: Array<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
  /**
   * 狭い画面で文字を隠し、絵だけにする。
   * 文字は読み上げのために DOM へ残すので、意味は失われない。
   */
  hideLabelsWhenNarrow?: boolean;
}

const SEGMENT =
  'inline-flex cursor-pointer items-center gap-xs px-lg py-sm text-md transition-colors';

/**
 * 選択肢が少ないときの単一選択。
 *
 * 選択肢を隠さず全部見せられるので、3 つ程度まではプルダウンより速い。
 * 押した区画だけを塗り、残りは面を持たせない。
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
  hideLabelsWhenNarrow = false,
}: SegmentedProps<T>) {
  const labelClass = hideLabelsWhenNarrow ? 'sr-only sm:not-sr-only' : undefined;
  return (
    <div
      className="inline-flex overflow-hidden rounded-md border-hairline border-control-line bg-control"
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={active}
            className={
              active
                ? `${SEGMENT} bg-selected text-selected-ink`
                : `${SEGMENT} text-muted hover:bg-control-hover hover:text-ink`
            }
            onClick={() => onChange(option.value)}
          >
            {option.icon && <Icon name={option.icon} />}
            <span className={labelClass}>{option.label}</span>
          </button>
        );
      })}
    </div>
  );
}

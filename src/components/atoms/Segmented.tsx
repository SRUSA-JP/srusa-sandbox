export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedProps<T extends string> {
  options: Array<SegmentedOption<T>>;
  value: T;
  onChange: (value: T) => void;
  ariaLabel?: string;
}

/** 選択肢が少ないときの単一選択。押した区画だけを塗る。 */
export function Segmented<T extends string>({ options, value, onChange, ariaLabel }: SegmentedProps<T>) {
  return (
    <div
      className="inline-flex overflow-hidden rounded-md border-hairline border-control-line"
      role="tablist"
      aria-label={ariaLabel}
    >
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          role="tab"
          aria-selected={option.value === value}
          className={
            option.value === value
              ? 'cursor-pointer bg-selected px-lg py-xs text-selected-ink'
              : 'cursor-pointer px-lg py-xs text-muted'
          }
          onClick={() => onChange(option.value)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

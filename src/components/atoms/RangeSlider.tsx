export interface RangeSliderProps {
  /** つまみの位置（0 から max まで）。 */
  value: number;
  max: number;
  onChange: (value: number) => void;
  /** 読み上げ用の説明。何を動かすつまみかが分かる形にする。 */
  ariaLabel: string;
  /** いま指している位置の読み上げ（日付など）。 */
  ariaValueText?: string;
}

/**
 * 横に動かすつまみ。
 *
 * 見た目は `src/styles/index.css` の `input[type='range']` に寄せてあり、
 * ここでは値の受け渡しだけを持つ。
 */
export function RangeSlider({ value, max, onChange, ariaLabel, ariaValueText }: RangeSliderProps) {
  return (
    <input
      type="range"
      className="w-full"
      min={0}
      max={max}
      step={1}
      value={value}
      aria-label={ariaLabel}
      aria-valuetext={ariaValueText}
      onChange={(event) => onChange(Number(event.target.value))}
    />
  );
}

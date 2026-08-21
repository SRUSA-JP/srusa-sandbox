import { FIELD, FIELD_INPUT } from '../classes';

export interface NumberFieldProps {
  /** 入力欄の前に出す短い名前（下限・上限など）。 */
  label: string;
  /** 読み上げ用の説明。何の値かが分かる形にする。 */
  ariaLabel: string;
  value: number;
  onChange: (value: number) => void;
}

/** 数値の入力欄。刻みを決めず、小数もそのまま受ける。 */
export function NumberField({ label, ariaLabel, value, onChange }: NumberFieldProps) {
  return (
    <label className={FIELD}>
      {label}
      <input
        type="number"
        step="any"
        className={FIELD_INPUT}
        value={value}
        aria-label={ariaLabel}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  );
}

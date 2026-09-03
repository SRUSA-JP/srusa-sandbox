import { useState } from 'react';
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
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);

  return (
    <label className={FIELD}>
      {label}
      <input
        type="number"
        step="any"
        className={FIELD_INPUT}
        value={focused ? draft : String(value)}
        aria-label={ariaLabel}
        onFocus={() => {
          setFocused(true);
          setDraft(String(value));
        }}
        onBlur={() => {
          setFocused(false);
          setDraft(String(value));
        }}
        onChange={(event) => {
          const next = event.target.value;
          setDraft(next);
          if (next === '') return;
          const parsed = Number(next);
          if (Number.isFinite(parsed)) onChange(parsed);
        }}
      />
    </label>
  );
}

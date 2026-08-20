import { CONTROL, CONTROL_HOVER, FIELD } from '../classes';

export interface PickerOption<T extends string> {
  value: T;
  label: string;
}

export interface PickerProps<T extends string> {
  /** 選択肢の意味（読み上げと、表示するときの見出し）。 */
  label: string;
  value: T;
  options: Array<PickerOption<T>>;
  onChange: (value: T) => void;
  /** 見出しを画面にも出すか。既定は読み上げのみ。 */
  showLabel?: boolean;
}

/** グラフ・図の上に置く単一選択のプルダウン。統計ビューアと相関図で共用する。 */
export function Picker<T extends string>({
  label,
  value,
  options,
  onChange,
  showLabel = false,
}: PickerProps<T>) {
  const select = (
    <select
      className={`${CONTROL} ${CONTROL_HOVER}`}
      value={value}
      aria-label={label}
      onChange={(event) => onChange(event.target.value as T)}
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  return showLabel ? (
    <label className={FIELD}>
      {label}
      {select}
    </label>
  ) : (
    select
  );
}

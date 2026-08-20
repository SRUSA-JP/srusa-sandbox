import { CONTROL, CONTROL_DISABLED, CONTROL_HOVER } from '../classes';

export interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}

/** 画面のボタン。見た目は 1 種類だけに絞る（枠線と文字だけの控えめな形）。 */
export function Button({ label, onClick, disabled = false }: ButtonProps) {
  return (
    <button
      type="button"
      className={`${CONTROL} ${CONTROL_HOVER} ${CONTROL_DISABLED}`}
      onClick={onClick}
      disabled={disabled}
    >
      {label}
    </button>
  );
}

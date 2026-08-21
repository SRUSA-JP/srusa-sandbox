import { CONTROL, CONTROL_DISABLED, CONTROL_HOVER, CONTROL_ROW } from '../classes';
import { Icon, type IconName } from './Icon';

export interface ButtonProps {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  /** 文字の左に添える絵。意味は文字が持つので、無くても使える。 */
  icon?: IconName;
}

/**
 * 画面のボタン。
 *
 * 見た目は 1 種類だけに絞る（枠線と文字だけの控えめな形）。目立たせたい
 * ボタンを増やすと、どれも目立たなくなるため。
 */
export function Button({ label, onClick, disabled = false, icon }: ButtonProps) {
  return (
    <button
      type="button"
      className={`${CONTROL} ${CONTROL_ROW} ${CONTROL_HOVER} ${CONTROL_DISABLED}`}
      onClick={onClick}
      disabled={disabled}
    >
      {icon && <Icon name={icon} />}
      {label}
    </button>
  );
}

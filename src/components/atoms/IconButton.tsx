import { CONTROL, CONTROL_HOVER } from '../classes';
import { Icon, type IconName } from './Icon';

export interface IconButtonProps {
  icon: IconName;
  /**
   * 押すと何が起きるかの説明。読み上げと、指したときの吹き出しに使う。
   * 文字を出さないボタンなので、これが唯一の説明になる。必ず動作で書く。
   */
  label: string;
  onClick: () => void;
}

/**
 * 絵だけのボタン。
 *
 * 文字を置く場所が無く、かつ絵だけで意味が伝わる操作にだけ使う
 * （配色の切り替えなど）。迷ったら文字のある Button を使うこと。
 * 上下左右の余白は Button と揃えてあるので、並べても高さがずれない。
 */
export function IconButton({ icon, label, onClick }: IconButtonProps) {
  return (
    <button
      type="button"
      className={`${CONTROL} ${CONTROL_HOVER} inline-flex items-center justify-center px-sm`}
      aria-label={label}
      title={label}
      onClick={onClick}
    >
      <Icon name={icon} />
    </button>
  );
}

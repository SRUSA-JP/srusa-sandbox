import { TAG } from '../classes';

export interface TagButtonProps {
  label: string;
  /** 地の色。 */
  background: string;
  /** 地の上で読める文字色。 */
  color: string;
  onClick: () => void;
}

/**
 * 色つきの押せるタグ 1 個。
 *
 * 地の色で種類を示す（ゲーム／登場人物／シーンなど、呼び出し側が決める）。
 * 押すと何かに絞り込む用途を想定するが、意味は呼び出し側の `onClick` が持つ。
 */
export function TagButton({ label, background, color, onClick }: TagButtonProps) {
  return (
    <button
      type="button"
      className={`${TAG} cursor-pointer border-transparent transition-opacity hover:opacity-80`}
      style={{ backgroundColor: background, color }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

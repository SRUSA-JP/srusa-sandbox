import { TAG } from '../classes';

export interface TagButtonProps {
  label: string;
  /** 枠線と文字の色。地は TAG の既定（bg-sunken）のまま変えない。 */
  color: string;
  onClick: () => void;
}

/**
 * 色つきの押せるタグ 1 個。
 *
 * 枠線と文字の色で種類を示す（ゲーム／登場人物／シーンなど、呼び出し側が決める）。
 * 押すと何かに絞り込む用途を想定するが、意味は呼び出し側の `onClick` が持つ。
 */
export function TagButton({ label, color, onClick }: TagButtonProps) {
  return (
    <button
      type="button"
      className={`${TAG} cursor-pointer transition-colors hover:bg-hover`}
      style={{ borderColor: color, color }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

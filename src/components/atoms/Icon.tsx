import { ICON } from '../../theme/tokens';
import { ICON_PATHS, type IconName } from './iconPaths';

export type { IconName } from './iconPaths';

export interface IconProps {
  name: IconName;
  /** 一辺の長さ（px）。既定は本文と並べる大きさ。 */
  size?: number;
}

/**
 * 文字の横に添える小さな絵。
 *
 * 色は `currentColor` なので、置いた場所の文字色にそのまま従う。
 * 意味は必ず隣の文字が持たせる（アイコンだけのボタンは作らない）ので、
 * 読み上げからは外す。
 */
export function Icon({ name, size = ICON.size }: IconProps) {
  return (
    <svg
      aria-hidden
      focusable="false"
      width={size}
      height={size}
      viewBox={`0 0 ${ICON.gridSize} ${ICON.gridSize}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={ICON.strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className="shrink-0"
    >
      {ICON_PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

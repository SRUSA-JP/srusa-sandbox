import { PLAYER_ICON_GRID } from '../../lib/playerIcon';

export interface PixelAvatarProps {
  /** 並べる色。lib/playerIcon.ts が名前から作る。 */
  pixels: string[];
  /** 一辺の長さ。中心が原点になるように描く。 */
  size: number;
}

/**
 * 升目を並べた顔（SVG）。
 *
 * 図鑑は同じ色の並びを HTML の升目で出している。相関図は SVG なので
 * 升目を四角で描くが、色を作るのは同じ lib/playerIcon.ts。
 * こうすると、同じ人はどちらの画面でも必ず同じ顔になる。
 */
export function PixelAvatar({ pixels, size }: PixelAvatarProps) {
  const cell = size / PLAYER_ICON_GRID;
  const origin = -size / 2;

  return (
    <g aria-hidden>
      {pixels.map((color, index) => (
        <rect
          key={index}
          x={origin + (index % PLAYER_ICON_GRID) * cell}
          y={origin + Math.floor(index / PLAYER_ICON_GRID) * cell}
          /* 隣の升目との間に隙間が出ないよう、わずかに重ねる */
          width={cell + 0.5}
          height={cell + 0.5}
          fill={color}
        />
      ))}
    </g>
  );
}

import { ICON } from '../../theme/tokens';

/**
 * 使えるアイコンの名前。
 *
 * 増やすときは下の PATHS に 1 行足す。外部のアイコンライブラリは入れない
 * （線の太さと大きさをトークンで揃えたいのと、依存を増やさないため）。
 */
export type IconName =
  | 'download'
  | 'upload'
  | 'table'
  | 'chart'
  | 'reset'
  | 'zoom-in'
  | 'zoom-out'
  | 'fit'
  | 'move'
  | 'previous'
  | 'next'
  | 'light'
  | 'dark';

/**
 * アイコンの図形。
 *
 * すべて 24 × 24 の座標系に、太さ 2 の線だけで描く（塗りは使わない）。
 * 同じ骨格で描くことで、並べたときに太さと重さが揃って見える。
 */
const PATHS: Record<IconName, string[]> = {
  /** 書き出す。 */
  download: ['M12 3.5v11', 'M7.5 10 12 14.5 16.5 10', 'M4.5 19.5h15'],
  /** 読み込む。 */
  upload: ['M12 14.5v-11', 'M7.5 8 12 3.5 16.5 8', 'M4.5 19.5h15'],
  /** 表に切り替える。 */
  table: ['M4 5.5h16v13H4z', 'M4 10.5h16', 'M10 10.5v8'],
  /** グラフに切り替える。 */
  chart: ['M4.5 19.5h15', 'M8 19.5v-6', 'M12 19.5v-11', 'M16 19.5v-4'],
  /** 元に戻す（絞り込みの解除）。 */
  reset: ['M4.5 12a7.5 7.5 0 1 0 2.4-5.5', 'M4 4.5V9h4.5'],
  /** 拡大する。 */
  'zoom-in': ['M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z', 'M15.5 15.5 20 20', 'M7.5 10.5h6', 'M10.5 7.5v6'],
  /** 縮小する。 */
  'zoom-out': ['M10.5 4a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13z', 'M15.5 15.5 20 20', 'M7.5 10.5h6'],
  /** 全体が入る大きさに戻す。 */
  fit: ['M4 9V4h5', 'M20 9V4h-5', 'M4 15v5h5', 'M20 15v5h-5'],
  /** 1 つ前へ。 */
  previous: ['M14.5 5.5 8 12l6.5 6.5'],
  /** 1 つ後へ。 */
  next: ['M9.5 5.5 16 12l-6.5 6.5'],
  /** 掴んで動かせる。 */
  move: ['M12 4v16', 'M4 12h16', 'M9 7l3-3 3 3', 'M9 17l3 3 3-3', 'M7 9l-3 3 3 3', 'M17 9l3 3-3 3'],
  /** 明るい配色。 */
  light: [
    'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7z',
    'M12 2.5v2',
    'M12 19.5v2',
    'M2.5 12h2',
    'M19.5 12h2',
    'M5.3 5.3l1.4 1.4',
    'M17.3 17.3l1.4 1.4',
    'M18.7 5.3l-1.4 1.4',
    'M6.7 17.3l-1.4 1.4',
  ],
  /** 暗い配色。 */
  dark: ['M20 14.3A8.5 8.5 0 0 1 9.7 4 8.5 8.5 0 1 0 20 14.3z'],
};

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
      {PATHS[name].map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  );
}

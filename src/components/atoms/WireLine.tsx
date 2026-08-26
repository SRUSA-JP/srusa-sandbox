import type { ReactNode } from 'react';
import type { EdgeStyle } from '../../map/display';
import { manhattanPath } from '../../map/geometry';
import type { Point } from '../../map/geometry';

export interface WireLineProps {
  from: Point;
  to: Point;
  /** 折り返す位置をずらす量。近くを走る線が 1 本に見えないようにする。 */
  channelOffset: number;
  /** 色・太さ・粉の間隔。決めるのは map/display.ts。 */
  style: EdgeStyle;
  /** 読み上げと、指したときに出す説明。 */
  children?: ReactNode;
}

/**
 * 2 点を繋ぐ 1 本の配線。
 *
 * 縦横だけで繋ぎ、芯の下に一回り太い被覆を敷く。基盤の配線もレッドストーンも
 * 細い芯のまわりに層があり、こうすると線が交差しても筋を追える。
 *
 * 何を表す線か（関係なのか所属なのか）は知らない。色も太さも受け取るだけなので、
 * 見せ方を増やしても、この部品は変えなくてよい。
 */
export function WireLine({ from, to, channelOffset, style, children }: WireLineProps) {
  const path = manhattanPath(from, to, style.elbow, channelOffset);

  return (
    <g>
      {style.casing && (
        <path
          d={path}
          fill="none"
          stroke={style.casing.stroke}
          strokeWidth={style.casing.strokeWidth}
          strokeLinecap="butt"
          strokeLinejoin="miter"
          opacity={style.casing.opacity}
          vectorEffect="non-scaling-stroke"
        />
      )}
      <path
        d={path}
        fill="none"
        stroke={style.stroke}
        strokeWidth={style.strokeWidth}
        strokeDasharray={style.strokeDasharray}
        strokeLinecap="butt"
        strokeLinejoin="miter"
        opacity={style.opacity}
        vectorEffect="non-scaling-stroke"
      >
        {children}
      </path>
    </g>
  );
}

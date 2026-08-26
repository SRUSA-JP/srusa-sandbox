import { edgeStyle, relationLabel } from '../../map/display';
import { manhattanPath } from '../../map/geometry';
import type { EdgeStyleId } from '../../map/config';
import type { EdgePlacement } from '../../map/layout';
import type { VizTheme } from '../../theme/palette';

export interface RelationEdgeProps {
  edge: EdgePlacement;
  theme: VizTheme;
  highlighted: boolean;
  nameOf: (personId: string) => string;
  showTooltip?: boolean;
  /** 線の見せ方（config.ts の EDGE_STYLES）。 */
  style?: EdgeStyleId;
}

/**
 * 人物同士の関係線。
 *
 * 基盤の配線のように、縦横だけで繋ぐ。斜めに引くと線が四方八方を向いて
 * どれがどこへ繋がっているのか追いにくいので、向きを揃える。
 *
 * 芯の下に一回り太い被覆を敷く。基盤の配線もレッドストーンも細い芯の
 * まわりに層があり、こうすると線が交差しても筋を追える。
 * 色・太さ・粉の間隔は display.ts（設定は config.ts）が決める。
 */
export function RelationEdge({
  edge,
  theme,
  highlighted,
  nameOf,
  showTooltip = true,
  style: styleId,
}: RelationEdgeProps) {
  const style = edgeStyle(edge.relation, theme, highlighted, styleId);
  const path = manhattanPath(edge.from, edge.to, style.elbow);

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
        {showTooltip && <title>{relationLabel(edge.relation, nameOf)}</title>}
      </path>
    </g>
  );
}

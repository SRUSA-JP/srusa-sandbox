import { edgeStyle, relationLabel } from '../../map/display';
import { arcPath } from '../../map/geometry';
import type { EdgePlacement } from '../../map/layout';
import type { VizTheme } from '../../theme/palette';

export interface RelationEdgeProps {
  edge: EdgePlacement;
  theme: VizTheme;
  highlighted: boolean;
  nameOf: (personId: string) => string;
}

/**
 * 人物同士の関係線。
 *
 * 直線だと同じ相手へ集まる線が重なるので、長さに応じた弧を描く。
 * 曲がり具合は display.ts（設定は config.ts）が決める。
 */
export function RelationEdge({ edge, theme, highlighted, nameOf }: RelationEdgeProps) {
  const length = Math.hypot(edge.to.x - edge.from.x, edge.to.y - edge.from.y);
  const style = edgeStyle(edge.relation, theme, highlighted, length);

  return (
    <path
      d={arcPath(edge.from, edge.to, style.bow)}
      fill="none"
      stroke={style.stroke}
      strokeWidth={style.strokeWidth}
      strokeDasharray={style.strokeDasharray}
      strokeLinecap="round"
      opacity={style.opacity}
      vectorEffect="non-scaling-stroke"
    >
      <title>{relationLabel(edge.relation, nameOf)}</title>
    </path>
  );
}

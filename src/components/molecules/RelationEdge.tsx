import { edgeStyle, relationLabel } from '../../map/display';
import { orthogonalPath } from '../../map/geometry';
import type { EdgePlacement } from '../../map/layout';
import type { VizTheme } from '../../theme/palette';

export interface RelationEdgeProps {
  edge: EdgePlacement;
  theme: VizTheme;
  highlighted: boolean;
  nameOf: (personId: string) => string;
  showTooltip?: boolean;
}

/**
 * 人物同士の関係線。
 *
 * 路線図のように、直角と 45 度だけで繋ぐ。斜めに引くと線が四方八方を向いて
 * どれがどこへ繋がっているのか追いにくいので、向きを揃える。
 * 角の丸めは display.ts（設定は config.ts）が決める。
 */
export function RelationEdge({ edge, theme, highlighted, nameOf, showTooltip = true }: RelationEdgeProps) {
  const style = edgeStyle(edge.relation, theme, highlighted);

  return (
    <path
      d={orthogonalPath(edge.from, edge.to, style.elbow)}
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
  );
}

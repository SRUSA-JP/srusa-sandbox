import { edgeStyle, relationLabel } from '../../map/display';
import type { EdgeStyleId } from '../../map/config';
import type { EdgePlacement } from '../../map/layout';
import type { VizTheme } from '../../theme/palette';
import { WireLine } from '../atoms/WireLine';

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
 * データにはっきり書かれている関係（一緒に何かをした、など）だけを引く。
 * 所属から導いた線は AffiliationEdge が別に引く。
 *
 * 引き方そのものは WireLine が持つ。ここが決めるのは
 * 「関係の色と太さ」と「指したときに出す説明」だけ。
 */
export function RelationEdge({
  edge,
  theme,
  highlighted,
  nameOf,
  showTooltip = true,
  style: styleId,
}: RelationEdgeProps) {
  return (
    <WireLine
      from={edge.from}
      to={edge.to}
      channelOffset={edge.channelOffset}
      style={edgeStyle(edge.relation, theme, highlighted, styleId)}
    >
      {showTooltip && <title>{relationLabel(edge.relation, nameOf)}</title>}
    </WireLine>
  );
}

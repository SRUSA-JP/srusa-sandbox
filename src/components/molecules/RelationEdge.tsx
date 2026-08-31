import { affiliationEdgeStyle, edgeStyle, groupLabel, relationLabel } from '../../map/display';
import { MAP_TEXT } from '../../config/messages';
import { EDGE, type EdgeStyleId } from '../../map/config';
import type { EdgePlacement } from '../../map/layout';
import type { Group } from '../../map/schema';
import { WireLine } from '../atoms/WireLine';
import type { VizTheme } from '../../theme/palette';

export interface RelationEdgeProps {
  edge: EdgePlacement;
  theme: VizTheme;
  highlighted: boolean;
  nameOf: (personId: string) => string;
  showTooltip?: boolean;
  /** 線の見せ方（config.ts の EDGE_STYLES）。 */
  style?: EdgeStyleId;
  /** この関係線を色分けする共有グループ。 */
  groups?: Group[];
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
  groups = [],
}: RelationEdgeProps) {
  if (groups.length > 0) {
    const groupNames = groups.map(groupLabel);
    return (
      <g>
        {groups.map((group, index) => {
          const offset = edge.channelOffset + (index - (groups.length - 1) / 2) * EDGE.channelGap;
          return (
            <WireLine
              key={group.id}
              from={edge.from}
              to={edge.to}
              channelOffset={offset}
              style={affiliationEdgeStyle(group, theme, false)}
            >
              {showTooltip && (
                <title>
                  {[relationLabel(edge.relation, nameOf), MAP_TEXT.tooltip.relationGroups(groupNames)].join(' / ')}
                </title>
              )}
            </WireLine>
          );
        })}
      </g>
    );
  }

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

import { affiliationEdgeStyle, groupLabel } from '../../map/display';
import { MAP_TEXT } from '../../config/messages';
import type { AffiliationEdgePlacement } from '../../map/layout';
import type { VizTheme } from '../../theme/palette';
import { WireLine } from '../atoms/WireLine';

export interface AffiliationEdgeProps {
  edge: AffiliationEdgePlacement;
  theme: VizTheme;
  /** 他のグループが強調されていて、この線は主役ではない。 */
  dimmed: boolean;
  nameOf: (personId: string) => string;
  showTooltip?: boolean;
}

/**
 * 所属から導いた線。
 *
 * グループごとの「親」から所属者へ 1 本ずつ引く。線の色はそのグループの
 * 囲いと同じなので、囲いを消していても「どの所属で繋がっているか」が色で読める。
 *
 * 引き方は WireLine が持つ。ここが決めるのは「グループの色」と説明だけ。
 */
export function AffiliationEdge({ edge, theme, dimmed, nameOf, showTooltip = true }: AffiliationEdgeProps) {
  return (
    <WireLine
      from={edge.from}
      to={edge.to}
      channelOffset={edge.channelOffset}
      style={affiliationEdgeStyle(edge.group, theme, dimmed)}
    >
      {showTooltip && (
        <title>
          {MAP_TEXT.tooltip.affiliation(nameOf(edge.hubId), nameOf(edge.memberId), groupLabel(edge.group))}
        </title>
      )}
    </WireLine>
  );
}

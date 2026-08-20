import { MAP_TEXT } from '../../config/messages';
import { regionPaintOrder } from '../../map/display';
import type { MapLayout } from '../../map/layout';
import type { VizTheme } from '../../theme/palette';
import { GroupRegion } from '../molecules/GroupRegion';
import { PersonNode } from '../molecules/PersonNode';
import { RelationEdge } from '../molecules/RelationEdge';

export interface RelationshipMapProps {
  layout: MapLayout;
  theme: VizTheme;
  /** 中心人物の ID。 */
  centerId: string;
  /** 強調するグループの ID（空文字なら強調なし）。 */
  highlightedGroupId: string;
  /** 描画する関係線。呼び出し側が絞り込んだものを渡す。 */
  edges: MapLayout['edges'];
  nameMode: string;
  onSelectPerson?: (personId: string) => void;
}

/**
 * 相関図の描画。
 *
 * 座標は layout.ts が、色と寸法は display.ts が決める。
 * このコンポーネントは「どの順で重ねるか」と「どの状態か」だけを扱う。
 */
export function RelationshipMap({
  layout,
  theme,
  centerId,
  highlightedGroupId,
  edges,
  nameMode,
  onSelectPerson,
}: RelationshipMapProps) {
  const relatedIds = new Set<string>();
  for (const edge of layout.edges) {
    if (edge.relation.source === centerId) relatedIds.add(edge.relation.target);
    if (edge.relation.target === centerId) relatedIds.add(edge.relation.source);
  }

  const highlightedMembers = new Set(
    layout.regions.find((region) => region.group.id === highlightedGroupId)?.memberIds ?? [],
  );

  const nameOf = (personId: string) => layout.byId.get(personId)?.person.onlineName ?? personId;
  const regions = [...layout.regions].sort(regionPaintOrder);

  return (
    <svg
      viewBox={`0 0 ${Math.round(layout.width)} ${Math.round(layout.height)}`}
      width="100%"
      className="block h-auto min-w-[var(--sr-layout-map-min-width)]"
      role="img"
      aria-label={MAP_TEXT.card.map.ariaLabel}
    >
      <g>
        {regions.map((region) => (
          <GroupRegion
            key={region.group.id}
            region={region}
            theme={theme}
            highlighted={region.group.id === highlightedGroupId}
          />
        ))}
      </g>
      <g>
        {edges.map((edge) => (
          <RelationEdge
            key={`${edge.relation.source}-${edge.relation.target}`}
            edge={edge}
            theme={theme}
            highlighted={edge.relation.source === centerId || edge.relation.target === centerId}
            nameOf={nameOf}
          />
        ))}
      </g>
      <g>
        {layout.people.map((placement) => (
          <PersonNode
            key={placement.person.id}
            placement={placement}
            theme={theme}
            nameMode={nameMode}
            state={{
              isCenter: placement.person.id === centerId,
              isRelated: relatedIds.has(placement.person.id),
              isDimmed: highlightedGroupId !== '' && !highlightedMembers.has(placement.person.id),
            }}
            onSelect={onSelectPerson}
          />
        ))}
      </g>
    </svg>
  );
}

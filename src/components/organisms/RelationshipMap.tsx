import { useRef, useState, type ReactNode } from 'react';
import { MAP_TEXT, VIEWPORT_TEXT } from '../../config/messages';
import { RELATIONSHIP_ZOOM, VIEWPORT } from '../../config/viewport';
import { usePanZoom } from '../../hooks/usePanZoom';
import { toScreen, transformStyle } from '../../lib/viewport';
import { clampToCanvas, personLabel, regionPaintOrder } from '../../map/display';
import type { MapLayout, PersonPlacement } from '../../map/layout';
import type { VizTheme } from '../../theme/palette';
import { GroupRegion } from '../molecules/GroupRegion';
import { PersonNode } from '../molecules/PersonNode';
import { PersonProfileTooltip } from '../molecules/PersonProfileTooltip';
import { RelationEdge } from '../molecules/RelationEdge';
import { ViewportFrame } from './ViewportFrame';

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
  profileHref: (placement: PersonPlacement) => string;
  /** 人を掴んで動かせるようにする。動かした先の座標を受け取る。 */
  onMovePerson?: (personId: string, x: number, y: number) => void;
  /** 図の右上に足す操作（配置を戻す、など）。 */
  actions?: ReactNode;
  /** 人・領域・関係線の SVG 標準ツールチップを出すか。 */
  showTooltips?: boolean;
  /** 所属を囲う曲線を出すか。消すと人と関係線だけになる。 */
  showRegions?: boolean;
}

/** 掴んでいる最中の人物。動いたかどうかで「押した」と「動かした」を分ける。 */
interface DragState {
  personId: string;
  /** 掴んだ点とノード中心のずれ。これを保つと、掴んだ場所がずれない。 */
  offsetX: number;
  offsetY: number;
  /** 掴み始めたブラウザ上の位置。ここからの距離で「動かした」を判定する。 */
  startX: number;
  startY: number;
  moved: boolean;
}

/**
 * 相関図の描画。
 *
 * 座標は map/layout.ts が、色と寸法は map/display.ts が決める。
 * このコンポーネントは「どの順で重ねるか」「いまどこを掴んでいるか」だけを扱う。
 *
 * 図全体は ViewportFrame の中に置き、掴んで動かす・拡大縮小できるようにする。
 * 人を掴んだときは表示枠側の移動を止めて、その人だけが動くようにする。
 */
export function RelationshipMap({
  layout,
  theme,
  centerId,
  highlightedGroupId,
  edges,
  nameMode,
  profileHref,
  onMovePerson,
  actions,
  showTooltips = true,
  showRegions = true,
}: RelationshipMapProps) {
  const panZoom = usePanZoom(layout.width, layout.height, RELATIONSHIP_ZOOM);
  const drag = useRef<DragState | null>(null);
  const [grabbedId, setGrabbedId] = useState<string | null>(null);
  const [activePersonId, setActivePersonId] = useState<string | null>(null);

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
  const activePlacement = activePersonId ? layout.byId.get(activePersonId) : undefined;
  const activePoint = activePlacement
    ? toScreen(panZoom.view, { x: activePlacement.x, y: activePlacement.y })
    : null;

  /* ---------------------------------------------------------------- *
   * 人を掴んで動かす
   * ---------------------------------------------------------------- */

  const pointerFor = (placement: PersonPlacement) => {
    if (!onMovePerson) return undefined;
    const personId = placement.person.id;

    return {
      onPointerDown: (event: React.PointerEvent<SVGGElement>) => {
        /* 表示枠側の「掴んで動かす」を起こさない。起こすと図ごと動いてしまう */
        event.stopPropagation();
        event.currentTarget.setPointerCapture(event.pointerId);
        const point = panZoom.toContentPoint(event.clientX, event.clientY);
        drag.current = {
          personId,
          offsetX: placement.x - point.x,
          offsetY: placement.y - point.y,
          startX: event.clientX,
          startY: event.clientY,
          moved: false,
        };
        setGrabbedId(personId);
        setActivePersonId(null);
      },

      onPointerMove: (event: React.PointerEvent<SVGGElement>) => {
        const state = drag.current;
        if (!state || state.personId !== personId) return;
        event.stopPropagation();

        /* 指で触れると数 px は動くので、しきい値を越えるまでは掴んだだけとみなす */
        if (!state.moved) {
          const distance = Math.hypot(event.clientX - state.startX, event.clientY - state.startY);
          if (distance < VIEWPORT.dragThreshold) return;
          state.moved = true;
        }

        const point = panZoom.toContentPoint(event.clientX, event.clientY);
        const next = clampToCanvas(layout, {
          x: point.x + state.offsetX,
          y: point.y + state.offsetY,
        });
        onMovePerson(personId, next.x, next.y);
      },

      onPointerUp: (event: React.PointerEvent<SVGGElement>) => {
        const state = drag.current;
        event.stopPropagation();
        /* 動かしていなければ「押した」とみなして人物の吹き出しを出す */
        if (state && !state.moved) setActivePersonId(personId);
        drag.current = null;
        setGrabbedId(null);
      },
    };
  };

  return (
    <ViewportFrame
      panZoom={panZoom}
      label={MAP_TEXT.card.map.ariaLabel}
      status={VIEWPORT_TEXT.zoom(Math.round(panZoom.view.scale * 100))}
      actions={actions}
      overlay={
        activePlacement && activePoint ? (
          <div
            className="absolute z-10 -translate-x-1/2 -translate-y-full"
            style={{ left: activePoint.x, top: activePoint.y }}
          >
            <PersonProfileTooltip
              person={activePlacement.person}
              label={personLabel(activePlacement.person, nameMode)}
              href={profileHref(activePlacement)}
              onClose={() => setActivePersonId(null)}
            />
          </div>
        ) : undefined
      }
    >
      <div
        className="origin-top-left"
        style={{
          width: layout.width,
          height: layout.height,
          transform: transformStyle(panZoom.view),
        }}
      >
        <svg
          viewBox={`0 0 ${Math.round(layout.width)} ${Math.round(layout.height)}`}
          width={layout.width}
          height={layout.height}
          className="block"
          role="img"
          aria-label={MAP_TEXT.card.map.ariaLabel}
        >
          {showRegions && (
            <g>
              {regions.map((region) => (
                <GroupRegion
                  key={region.group.id}
                  region={region}
                  theme={theme}
                  highlighted={region.group.id === highlightedGroupId}
                  showTooltip={showTooltips}
                />
              ))}
            </g>
          )}
          <g>
            {edges.map((edge) => (
              <RelationEdge
                key={`${edge.relation.source}-${edge.relation.target}`}
                edge={edge}
                theme={theme}
                highlighted={edge.relation.source === centerId || edge.relation.target === centerId}
                nameOf={nameOf}
                showTooltip={showTooltips}
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
                onSelect={setActivePersonId}
                pointer={pointerFor(placement)}
                grabbed={grabbedId === placement.person.id}
                showTooltip={showTooltips}
              />
            ))}
          </g>
        </svg>
      </div>
    </ViewportFrame>
  );
}

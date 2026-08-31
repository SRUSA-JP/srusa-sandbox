import { useMemo, useRef, useState, type ReactNode } from 'react';
import { MAP_TEXT, VIEWPORT_TEXT } from '../../config/messages';
import { RELATIONSHIP_ZOOM, VIEWPORT } from '../../config/viewport';
import { usePanZoom } from '../../hooks/usePanZoom';
import { toScreen, transformStyle } from '../../lib/viewport';
import {
  clampToCanvas,
  groupLabel,
  nodeRingColors,
  personLabel,
  regionPaintOrder,
  regionStyle,
  type NodeState,
} from '../../map/display';
import { groupConnects, LEGEND, type EdgeStyleId } from '../../map/config';
import type { MapLayout, PersonPlacement } from '../../map/layout';
import type { Group } from '../../map/schema';
import type { VizTheme } from '../../theme/palette';
import { Swatch } from '../atoms';
import { AffiliationEdge } from '../molecules/AffiliationEdge';
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
  /** グループ凡例から強調対象を切り替える。 */
  onHighlightGroup?: (groupId: string) => void;
  /** 描画する関係線。呼び出し側が絞り込んだものを渡す。 */
  edges: MapLayout['edges'];
  /** 所属から導いた線を出すか。消すとはっきり書かれた関係だけになる。 */
  showAffiliationEdges?: boolean;
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
  /** 関係線の見せ方（map/config.ts の EDGE_STYLES）。 */
  edgeStyleId?: EdgeStyleId;
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

const RELATED_TOOLTIP_COUNT = 6;

function relationEdgeKey(edge: MapLayout['edges'][number]): string {
  return `${edge.relation.source}\u0000${edge.relation.target}`;
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
  onHighlightGroup,
  edges,
  showAffiliationEdges = true,
  nameMode,
  profileHref,
  onMovePerson,
  actions,
  showTooltips = true,
  showRegions = true,
  edgeStyleId,
}: RelationshipMapProps) {
  const panZoom = usePanZoom(layout.width, layout.height, RELATIONSHIP_ZOOM);
  const drag = useRef<DragState | null>(null);
  const [grabbedId, setGrabbedId] = useState<string | null>(null);
  const [activePersonId, setActivePersonId] = useState<string | null>(null);

  const relatedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const edge of layout.edges) {
      if (edge.relation.source === centerId) ids.add(edge.relation.target);
      if (edge.relation.target === centerId) ids.add(edge.relation.source);
    }
    return ids;
  }, [centerId, layout.edges]);

  const highlightedMembers = useMemo(
    () => new Set(layout.regions.find((region) => region.group.id === highlightedGroupId)?.memberIds ?? []),
    [highlightedGroupId, layout.regions],
  );

  const nameOf = (personId: string) => layout.byId.get(personId)?.person.onlineName ?? personId;
  const regions = [...layout.regions].sort(regionPaintOrder);
  const visibleRegions = showRegions
    ? regions
    : regions.filter((region) => highlightedGroupId !== '' && region.group.id === highlightedGroupId);
  const activePlacement = activePersonId ? layout.byId.get(activePersonId) : undefined;
  const activePoint = activePlacement
    ? toScreen(panZoom.view, { x: activePlacement.x, y: activePlacement.y })
    : null;

  /*
   * 枠線の色。所属の線と同じ色にして、アイコンを見ただけで所属が分かるようにする。
   * どのグループがどの色かは display.ts が決め、ここは人と所属を結びつけるだけ。
   */
  const groupById = useMemo(() => new Map(layout.regions.map((region) => [region.group.id, region.group])), [layout.regions]);
  const connectingGroupIds = useMemo(
    () => new Set(layout.regions.filter((region) => groupConnects(region.group)).map((region) => region.group.id)),
    [layout.regions],
  );
  const relatedNameMap = useMemo(() => {
    const idsByPerson = new Map(layout.people.map((placement) => [placement.person.id, new Set<string>()]));
    for (const edge of layout.edges) {
      idsByPerson.get(edge.relation.source)?.add(edge.relation.target);
      idsByPerson.get(edge.relation.target)?.add(edge.relation.source);
    }
    for (const edge of layout.affiliationEdges) {
      idsByPerson.get(edge.hubId)?.add(edge.memberId);
      idsByPerson.get(edge.memberId)?.add(edge.hubId);
    }
    return new Map(
      [...idsByPerson.entries()].map(([personId, ids]) => {
        const names = [...ids]
          .map((id) => layout.byId.get(id)?.person)
          .filter((person): person is PersonPlacement['person'] => Boolean(person))
          .sort((a, b) => personLabel(a, nameMode).localeCompare(personLabel(b, nameMode), 'ja'))
          .map((person) => personLabel(person, nameMode));
        return [
          personId,
          {
            names: names.slice(0, RELATED_TOOLTIP_COUNT),
            rest: Math.max(0, names.length - RELATED_TOOLTIP_COUNT),
          },
        ];
      }),
    );
  }, [layout.affiliationEdges, layout.byId, layout.edges, layout.people, nameMode]);
  const sharedGroupsByEdge = useMemo(
    () =>
      new Map(
        layout.edges.map((edge) => {
          const source = layout.byId.get(edge.relation.source);
          const target = layout.byId.get(edge.relation.target);
          if (!source || !target) return [relationEdgeKey(edge), [] as Group[]] as const;
          const targetGroups = new Set(target.groupIds);
          const groups = source.groupIds
            .filter((id) => targetGroups.has(id) && connectingGroupIds.has(id))
            .map((id) => groupById.get(id))
            .filter((group): group is Group => group !== undefined)
            .sort((a, b) => groupLabel(a).localeCompare(groupLabel(b), 'ja'));
          return [relationEdgeKey(edge), groups] as const;
        }),
      ),
    [connectingGroupIds, groupById, layout.byId, layout.edges],
  );
  const connectedNamesFor = (personId: string) =>
    relatedNameMap.get(personId) ?? { names: [], rest: 0 };
  const sharedGroupsFor = (edge: MapLayout['edges'][number]): Group[] => sharedGroupsByEdge.get(relationEdgeKey(edge)) ?? [];
  const nodeStateFor = (placement: PersonPlacement): NodeState => ({
    isCenter: placement.person.id === centerId,
    isRelated: relatedIds.has(placement.person.id),
    isDimmed: highlightedGroupId !== '' && !highlightedMembers.has(placement.person.id),
  });
  const ringColorsFor = (placement: PersonPlacement) =>
    nodeRingColors(
      placement.groupIds
        .map((id) => groupById.get(id))
        .filter((group): group is Group => group !== undefined),
      theme,
      nodeStateFor(placement),
    );
  const attributeBadgesFor = (placement: PersonPlacement) =>
    placement.groupIds
      .map((id) => groupById.get(id))
      .filter((group): group is Group => group !== undefined)
      .sort((a, b) => groupLabel(a).localeCompare(groupLabel(b), 'ja'))
      .map((group) => {
        const style = regionStyle(group, theme, group.id === highlightedGroupId);
        return { label: groupLabel(group), color: style.labelColor };
      });

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
        /*
         * 指を捕まえるとこの指の出来事は表示枠に届かなくなる。表示枠は指の
         * 本数でつまむ操作を見分けているので、本数だけは知らせておく。
         * 知らせないと、1 本目が人物の上にあるときにつまんで拡大できない。
         */
        panZoom.externalPointer.down(event);
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
        panZoom.externalPointer.move(event);

        /* 2 本目の指が来たら、人を動かすのをやめてつまむ操作に譲る */
        if (panZoom.pointerCount() >= 2) {
          drag.current = null;
          setGrabbedId(null);
          return;
        }

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
        panZoom.externalPointer.up(event);
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
        <>
          <details className="pointer-events-auto absolute top-md left-md z-10 max-h-[var(--sr-layout-viewport-legend-max-height)] max-w-[var(--sr-layout-person-tooltip-max-width)] overflow-y-auto rounded-md border-hairline border-divider bg-overlay px-md py-sm text-xs text-muted">
            <summary className="cursor-pointer text-sm font-bold text-heading">{MAP_TEXT.card.legend.title}</summary>
            <div className="mt-xs grid gap-xxs">
              {regions.map((region) => {
                const style = regionStyle(region.group, theme, region.group.id === highlightedGroupId);
                return (
                  <button
                    key={region.group.id}
                    type="button"
                    className="flex min-w-0 items-center gap-xs text-left hover:bg-hover"
                    aria-pressed={region.group.id === highlightedGroupId}
                    onClick={() => onHighlightGroup?.(region.group.id === highlightedGroupId ? '' : region.group.id)}
                  >
                    <Swatch
                      className="shrink-0 rounded-sm border-hairline"
                      size={LEGEND.swatchSize}
                      background={style.fill}
                      borderColor={style.stroke}
                    />
                    <span className="truncate">{groupLabel(region.group)}</span>
                  </button>
                );
              })}
            </div>
          </details>
          {activePlacement && activePoint ? (
            <div
              className="absolute z-10 -translate-x-1/2 -translate-y-full"
              style={{ left: activePoint.x, top: activePoint.y }}
            >
              <PersonProfileTooltip
                person={activePlacement.person}
                label={personLabel(activePlacement.person, nameMode)}
                href={profileHref(activePlacement)}
                onClose={() => setActivePersonId(null)}
                attributeBadges={attributeBadgesFor(activePlacement)}
                relatedNames={connectedNamesFor(activePlacement.person.id).names}
                relatedRest={connectedNamesFor(activePlacement.person.id).rest}
              />
            </div>
          ) : undefined}
        </>
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
          {visibleRegions.length > 0 && (
            <g>
              {visibleRegions.map((region) => (
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
          {showAffiliationEdges && (
            <g>
              {layout.affiliationEdges.map((edge) => (
                <AffiliationEdge
                  key={`${edge.group.id}-${edge.hubId}-${edge.memberId}`}
                  edge={edge}
                  theme={theme}
                  dimmed={highlightedGroupId !== '' && edge.group.id !== highlightedGroupId}
                  nameOf={nameOf}
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
                style={edgeStyleId}
                showTooltip={showTooltips}
                groups={sharedGroupsFor(edge)}
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
                state={nodeStateFor(placement)}
                onSelect={setActivePersonId}
                ringColors={ringColorsFor(placement)}
                pointer={pointerFor(placement)}
                grabbed={grabbedId === placement.person.id}
                showTooltip={showTooltips}
                relatedNames={connectedNamesFor(placement.person.id).names}
                relatedRest={connectedNamesFor(placement.person.id).rest}
              />
            ))}
          </g>
        </svg>
      </div>
    </ViewportFrame>
  );
}

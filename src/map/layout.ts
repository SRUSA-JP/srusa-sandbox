/**
 * データ → 座標の変換。純関数だけで構成する（React にも SVG にも依存しない）。
 *
 * 方針:
 * 1. 所属の組み合わせが同じ人を「クラスタ」としてまとめる（1人1ノードを守るため）
 * 2. 所属の重なりが大きいクラスタ同士を隣に置く（領域が伸びて交差しないように）
 * 3. 各グループの領域は、その所属者のノードを囲う多角形として求める
 *
 * これにより「複数の所属は領域の重なりで表す」「研究室は大学の内側に入る」が
 * レイアウトの副作用として自然に成立する。
 */
import { CANVAS, CLUSTER, groupTypeSetting, NODE, REGION, SATELLITE, UNASSIGNED } from './config';
import { enclosingPolygon, pointInPolygon, polygonArea, type Point } from './geometry';
import type { Group, Person, Relation, RelationshipData } from './schema';

export interface PersonPlacement {
  person: Person;
  x: number;
  y: number;
  /** 所属グループの ID（描画時の強調判定に使う）。 */
  groupIds: string[];
}

export interface RegionPlacement {
  group: Group;
  polygon: Point[];
  /** 面積。大きいものから描いて、内側のグループを上に重ねる。 */
  area: number;
  memberIds: string[];
}

export interface EdgePlacement {
  relation: Relation;
  from: Point;
  to: Point;
}

export interface MapLayout {
  width: number;
  height: number;
  people: PersonPlacement[];
  regions: RegionPlacement[];
  edges: EdgePlacement[];
  byId: Map<string, PersonPlacement>;
}

/** 所属が無い人をまとめるための仮グループ。 */
function unassignedGroup(): Group {
  return { id: UNASSIGNED.groupId, name: UNASSIGNED.label, type: UNASSIGNED.type };
}

interface Cluster {
  key: string;
  groupNames: string[];
  members: Person[];
  width: number;
  height: number;
  columns: number;
}

function buildClusters(people: Person[]): Cluster[] {
  const byKey = new Map<string, Person[]>();
  for (const person of people) {
    const key = [...person.attributes].sort().join('|');
    const list = byKey.get(key) ?? [];
    list.push(person);
    byKey.set(key, list);
  }

  return [...byKey.entries()]
    .map(([key, members]) => {
      const columns = Math.min(CLUSTER.maxColumns, Math.max(1, Math.ceil(Math.sqrt(members.length))));
      const rows = Math.ceil(members.length / columns);
      return {
        key,
        groupNames: key === '' ? [] : key.split('|'),
        members,
        columns,
        width: columns * NODE.gapX,
        height: rows * NODE.gapY,
      };
    })
    .sort((a, b) => b.members.length - a.members.length || a.key.localeCompare(b.key));
}

/** 所属集合の重なり具合（Jaccard 係数）。 */
function attributeSimilarity(a: string[], b: string[]): number {
  if (a.length === 0 || b.length === 0) return 0;
  const setB = new Set(b);
  const shared = a.filter((name) => setB.has(name)).length;
  return shared / (a.length + b.length - shared);
}

/** 2 つのクラスタをまたぐ関係の本数。 */
function relationsBetween(a: Cluster, b: Cluster, relations: Relation[]): number {
  const idsA = new Set(a.members.map((person) => person.id));
  const idsB = new Set(b.members.map((person) => person.id));
  return relations.filter(
    (relation) =>
      (idsA.has(relation.source) && idsB.has(relation.target)) ||
      (idsB.has(relation.source) && idsA.has(relation.target)),
  ).length;
}

/**
 * 隣に置きたい度合い。
 *
 * 所属の重なりに加えて、関係線でつながっているかも見る。
 * 関係のあるクラスタを近くに置くと、図を横切る長い線が減る。
 */
function affinity(a: Cluster, b: Cluster, relations: Relation[]): number {
  const shared = relationsBetween(a, b, relations);
  const relationScore = Math.min(1, shared / CLUSTER.relationSaturation) * CLUSTER.relationAffinity;
  return attributeSimilarity(a.groupNames, b.groupNames) + relationScore;
}

/**
 * 近いクラスタが隣り合う並びを作る（貪欲な最近傍連鎖）。
 * 同点は「人数が多い順 → キー順」で決めるので、結果は毎回同じになる。
 */
function orderClusters(clusters: Cluster[], relations: Relation[]): Cluster[] {
  if (clusters.length <= 1) return clusters;
  const remaining = [...clusters];
  const ordered: Cluster[] = [remaining.shift()!];

  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1];
    let bestIndex = 0;
    let bestScore = -1;
    remaining.forEach((cluster, index) => {
      const score = affinity(last, cluster, relations);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    ordered.push(remaining.splice(bestIndex, 1)[0]);
  }
  return ordered;
}

/** クラスタを行に詰める。行ごとに向きを変えて、並び順の近さを縦にも保つ。 */
function packRows(clusters: Cluster[]): Cluster[][] {
  const rows: Cluster[][] = [];
  let current: Cluster[] = [];
  let width = 0;

  for (const cluster of clusters) {
    const next = width === 0 ? cluster.width : width + CLUSTER.gap + cluster.width;
    if (current.length > 0 && next > CANVAS.targetWidth) {
      rows.push(current);
      current = [cluster];
      width = cluster.width;
    } else {
      current.push(cluster);
      width = next;
    }
  }
  if (current.length > 0) rows.push(current);

  return rows.map((row, index) => (index % 2 === 1 ? [...row].reverse() : row));
}

function placePeople(rows: Cluster[][]): PersonPlacement[] {
  const placements: PersonPlacement[] = [];
  let originY = 0;

  for (const row of rows) {
    let originX = 0;
    const rowHeight = Math.max(...row.map((cluster) => cluster.height));

    for (const cluster of row) {
      cluster.members.forEach((person, index) => {
        const column = index % cluster.columns;
        const line = Math.floor(index / cluster.columns);
        placements.push({
          person,
          x: originX + column * NODE.gapX + NODE.gapX / 2,
          y: originY + line * NODE.gapY + NODE.gapY / 2,
          groupIds: [],
        });
      });
      originX += cluster.width + CLUSTER.gap;
    }
    originY += rowHeight + CLUSTER.gap;
  }
  return placements;
}

/**
 * グループの領域がノードの外側に取る余白。
 *
 * 入れ子の内側ほど詰めることで、大学の中に研究室が入っているように見せる。
 * 位置を差し替えて描き直すとき（withPositions）にも同じ値が要るので関数にする。
 */
function regionPadding(type: string): number {
  const depth = groupTypeSetting(type).depth;
  return Math.max(REGION.padding - depth * REGION.nestedPaddingStep, REGION.nestedPaddingStep);
}

function buildRegions(groups: Group[], placements: PersonPlacement[]): RegionPlacement[] {
  const regions = groups.map((group) => {
    const members = placements.filter((placement) => placement.person.attributes.includes(group.name));
    const padding = regionPadding(group.type);
    const polygon = enclosingPolygon(
      members.map((member) => ({ x: member.x, y: member.y })),
      padding,
    );
    return {
      group,
      polygon,
      area: polygonArea(polygon),
      memberIds: members.map((member) => member.person.id),
    };
  });

  if (UNASSIGNED.showRegion) {
    const members = placements.filter((placement) => placement.person.attributes.length === 0);
    if (members.length > 0) {
      const polygon = enclosingPolygon(
        members.map((member) => ({ x: member.x, y: member.y })),
        REGION.padding,
      );
      regions.push({
        group: unassignedGroup(),
        polygon,
        area: polygonArea(polygon),
        memberIds: members.map((member) => member.person.id),
      });
    }
  }

  /* 所属者が 0 人のグループは描かない（参照切れは parse.ts が報告済み） */
  return regions.filter((region) => region.memberIds.length > 0).sort((a, b) => b.area - a.area);
}

/** 図全体が正の座標に収まるよう平行移動し、余白込みの寸法を決める。 */
function normalize(people: PersonPlacement[], regions: RegionPlacement[]) {
  const xs = [
    ...people.map((p) => p.x),
    ...regions.flatMap((region) => region.polygon.map((point) => point.x)),
  ];
  const ys = [
    ...people.map((p) => p.y),
    ...regions.flatMap((region) => region.polygon.map((point) => point.y)),
  ];
  const minX = Math.min(...xs);
  const minY = Math.min(...ys);
  const offsetX = CANVAS.padding - minX;
  const offsetY = CANVAS.padding - minY;

  for (const placement of people) {
    placement.x += offsetX;
    placement.y += offsetY;
  }
  for (const region of regions) {
    region.polygon = region.polygon.map((point) => ({ x: point.x + offsetX, y: point.y + offsetY }));
  }

  return {
    width: Math.max(...xs) - minX + CANVAS.padding * 2,
    height: Math.max(...ys) - minY + CANVAS.padding * 2,
  };
}

/* ------------------------------------------------------------------ *
 * 所属の無い人の配置
 *
 * 所属が無い人をまとめて置くと、関係線が図を横切って読めなくなる。
 * 関係のある相手のそばの空き場所へ 1 人ずつ置いて、線を短く保つ。
 * ------------------------------------------------------------------ */

function isFarEnough(candidate: Point, placements: PersonPlacement[]): boolean {
  return placements.every(
    (placement) => Math.hypot(placement.x - candidate.x, placement.y - candidate.y) >= SATELLITE.minDistance,
  );
}

function isOutsideRegions(candidate: Point, regions: RegionPlacement[]): boolean {
  return regions.every((region) => !pointInPolygon(candidate, region.polygon));
}

/** 相手の周囲を外側へ螺旋状に探して、最初に見つかった空き場所を返す。 */
function findFreeSpot(anchor: Point, placements: PersonPlacement[], regions: RegionPlacement[]): Point {
  for (let radius = SATELLITE.radiusStep; radius <= SATELLITE.maxRadius; radius += SATELLITE.radiusStep) {
    for (let step = 0; step < SATELLITE.directions; step += 1) {
      const angle = (2 * Math.PI * step) / SATELLITE.directions;
      const candidate = { x: anchor.x + Math.cos(angle) * radius, y: anchor.y + Math.sin(angle) * radius };
      if (isFarEnough(candidate, placements) && isOutsideRegions(candidate, regions)) return candidate;
    }
  }
  return { x: anchor.x + SATELLITE.maxRadius, y: anchor.y };
}

/** その人物と関係のある相手のうち、すでに配置済みで最も関係数が多い人。 */
function anchorOf(
  person: Person,
  relations: Relation[],
  placed: Map<string, PersonPlacement>,
  degree: Map<string, number>,
): PersonPlacement | undefined {
  const partners = relations
    .filter((relation) => relation.source === person.id || relation.target === person.id)
    .map((relation) => (relation.source === person.id ? relation.target : relation.source))
    .filter((id) => placed.has(id))
    .sort((a, b) => (degree.get(b) ?? 0) - (degree.get(a) ?? 0) || a.localeCompare(b));
  return partners.length > 0 ? placed.get(partners[0]) : undefined;
}

function placeSatellites(
  people: Person[],
  relations: Relation[],
  placements: PersonPlacement[],
  regions: RegionPlacement[],
): Person[] {
  const degree = new Map<string, number>();
  for (const relation of relations) {
    degree.set(relation.source, (degree.get(relation.source) ?? 0) + 1);
    degree.set(relation.target, (degree.get(relation.target) ?? 0) + 1);
  }

  const placed = new Map(placements.map((placement) => [placement.person.id, placement]));
  /* 関係の多い人から置く。同数は ID 順にして結果を毎回同じにする */
  const queue = [...people].sort(
    (a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0) || a.id.localeCompare(b.id),
  );

  const remaining: Person[] = [];
  for (const person of queue) {
    const anchor = anchorOf(person, relations, placed, degree);
    if (!anchor) {
      remaining.push(person);
      continue;
    }
    const spot = findFreeSpot({ x: anchor.x, y: anchor.y }, placements, regions);
    const placement: PersonPlacement = { person, x: spot.x, y: spot.y, groupIds: [] };
    placements.push(placement);
    placed.set(person.id, placement);
  }
  return remaining;
}

/** 関係も所属も無い人を、図の下に 1 行で並べる。 */
function placeLeftovers(people: Person[], placements: PersonPlacement[]): void {
  if (people.length === 0) return;
  const minX = Math.min(...placements.map((placement) => placement.x));
  const maxY = Math.max(...placements.map((placement) => placement.y));
  const y = maxY + CLUSTER.gap;
  people.forEach((person, index) => {
    placements.push({ person, x: minX + index * NODE.gapX, y, groupIds: [] });
  });
}

function buildEdges(relations: Relation[], byId: Map<string, PersonPlacement>): EdgePlacement[] {
  return relations
    .map((relation) => {
      const from = byId.get(relation.source);
      const to = byId.get(relation.target);
      if (!from || !to) return null;
      return { relation, from: { x: from.x, y: from.y }, to: { x: to.x, y: to.y } };
    })
    .filter((edge): edge is EdgePlacement => edge !== null);
}

export function buildLayout(data: RelationshipData): MapLayout {
  const groupByName = new Map(data.groups.map((group) => [group.name, group]));

  /* 所属のある人はクラスタとして配置し、所属の無い人は後から相手のそばへ置く */
  const affiliated = data.people.filter((person) => person.attributes.length > 0);
  const unaffiliated = data.people.filter((person) => person.attributes.length === 0);

  const rows = packRows(orderClusters(buildClusters(affiliated), data.relations));
  const people = placePeople(rows);

  for (const placement of people) {
    placement.groupIds = placement.person.attributes
      .map((name) => groupByName.get(name)?.id)
      .filter((id): id is string => id !== undefined);
  }

  /* 領域は所属者だけで決まるので、衛星を置く前に確定できる */
  const regions = buildRegions(data.groups, people);
  const leftovers = placeSatellites(unaffiliated, data.relations, people, regions);
  placeLeftovers(leftovers, people);

  const { width, height } = normalize(people, regions);
  const byId = new Map(people.map((placement) => [placement.person.id, placement]));

  return { width, height, people, regions, edges: buildEdges(data.relations, byId), byId };
}

/**
 * 人物の位置を差し替えた図を作り直す。
 *
 * 画面上で人を掴んで動かしたときに使う。動かした人だけ座標を差し替え、
 * グループの領域と関係線はその結果から求め直す。こうしないと、人だけが
 * 動いて領域が置き去りになり、所属の関係が読めなくなる。
 *
 * 元の layout は変更しない（純関数）。差し替えが無ければそのまま返す。
 */
export function withPositions(layout: MapLayout, positions: Record<string, Point>): MapLayout {
  if (Object.keys(positions).length === 0) return layout;

  const people = layout.people.map((placement) => {
    const moved = positions[placement.person.id];
    return moved ? { ...placement, x: moved.x, y: moved.y } : placement;
  });
  const byId = new Map(people.map((placement) => [placement.person.id, placement]));

  const regions = layout.regions
    .map((region) => {
      const points = region.memberIds
        .map((id) => byId.get(id))
        .filter((placement): placement is PersonPlacement => placement !== undefined)
        .map((placement) => ({ x: placement.x, y: placement.y }));
      const polygon = enclosingPolygon(points, regionPadding(region.group.type));
      return { ...region, polygon, area: polygonArea(polygon) };
    })
    .sort((a, b) => b.area - a.area);

  const edges = layout.edges.map((edge) => {
    const from = byId.get(edge.relation.source);
    const to = byId.get(edge.relation.target);
    if (!from || !to) return edge;
    return { relation: edge.relation, from: { x: from.x, y: from.y }, to: { x: to.x, y: to.y } };
  });

  return { ...layout, people, byId, regions, edges };
}

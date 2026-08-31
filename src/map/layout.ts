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
import {
  CANVAS,
  CLUSTER,
  EDGE,
  FALLBACK_GROUP_TYPE,
  FLOORPLAN,
  GRID,
  GROUP_RELAX,
  groupConnects,
  groupTypeSetting,
  NODE,
  REGION,
  RELATION_TREE,
  SATELLITE,
  SEPARATION,
  UNASSIGNED,
  type LayoutMode,
} from './config';
import { centroid, enclosingPolygon, inflatedBox, pointInPolygon, polygonArea, type Point } from './geometry';
import type { Group, Person, Relation, RelationshipData } from './schema';

export interface PersonPlacement {
  person: Person;
  x: number;
  y: number;
  /** 所属グループの ID（描画時の強調判定に使う）。 */
  groupIds: string[];
  /**
   * この人を置いた区画のグループ ID。
   *
   * 複数の所属を持つ人は 1 か所にしか置けないので、囲いをどこまで広げるかは
   * 「持ち場」で決める。持ち場でない所属との繋がりは、所属の線が引き受ける。
   * 区画（floorplan）以外の並べ方では持たない。
   */
  homeGroupId?: string;
}

export interface RegionPlacement {
  group: Group;
  polygon: Point[];
  /** 面積。大きいものから描いて、内側のグループを上に重ねる。 */
  area: number;
  memberIds: string[];
}

/** 2 点を繋ぐ 1 本の配線。関係線も所属の線も、配線としては同じもの。 */
export interface WirePlacement {
  from: Point;
  to: Point;
  /**
   * 折り返す位置をずらす量（座標単位）。
   *
   * 同じ場所で折り返す線どうしが 1 本に見えないよう、隣り合わせて走らせる。
   */
  channelOffset: number;
}

export interface EdgePlacement extends WirePlacement {
  relation: Relation;
}

/**
 * 所属から引く線。
 *
 * 同じ所属の人を総当たりで繋ぐと読めない量になるので（この規模で 570 本）、
 * グループごとに「親」を 1 人決めて、そこから他の所属者へ引く。
 * 親は所属の数がいちばん多い人。多くのグループに顔を出す人が
 * 自然に何本もの線の集まる場所になる。
 */
export interface AffiliationEdgePlacement extends WirePlacement {
  group: Group;
  /** 親（そのグループで所属数がいちばん多い人）。 */
  hubId: string;
  /** 親から線を引かれる側。 */
  memberId: string;
}

export interface MapLayout {
  width: number;
  height: number;
  people: PersonPlacement[];
  regions: RegionPlacement[];
  edges: EdgePlacement[];
  /** 所属から導いた線。関係線とは別に持ち、画面側で出し分ける。 */
  affiliationEdges: AffiliationEdgePlacement[];
  byId: Map<string, PersonPlacement>;
}

/**
 * 囲いの形。四角にするか、点を包む多角形にするか。
 *
 * 四角にすると、区画（floorplan）の並びと縁が揃って基盤の区画割りのように読める。
 * 形の選択は REGION.shape が持ち、ここ以外では決めない。
 */
function regionPolygon(points: Point[], padding: number): Point[] {
  if (points.length === 0) return [];
  return REGION.shape === 'rect' ? inflatedBox(points, padding) : enclosingPolygon(points, padding);
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

/**
 * 所属を外側の所属にたたむ。
 *
 * 研究室は大学の中、部活は高校の中にあるので、親（parentGroupId）をたどって
 * いちばん外側の所属の名前を返す。こうすると「M大学の人」と「Y研究室の人」が
 * 同じ塊に入り、領域が入れ子に描かれる。
 */
function outermostGroupName(name: string, groups: Group[]): string {
  const byName = new Map(groups.map((group) => [group.name, group]));
  const byId = new Map(groups.map((group) => [group.id, group]));
  let current = byName.get(name);
  const seen = new Set<string>();

  while (current?.parentGroupId && !seen.has(current.id)) {
    seen.add(current.id);
    const parent = byId.get(current.parentGroupId);
    if (!parent) break;
    current = parent;
  }
  return current?.name ?? name;
}

/**
 * そのクラスタをどの塊に入れるか。
 *
 * 所属を外側にたたんだうえで、いちばん「外枠」らしいものを選ぶ。
 * 外枠らしさは分類の描画順（groupTypeSetting の order）で決める。大学・高校が先で、
 * 部活や「アクティブメンバー」のような後付けの札は後ろになる。
 * 同じ順位なら人数の多い方を採る。
 */
function clusterAnchor(cluster: Cluster, groups: Group[]): string {
  if (cluster.groupNames.length === 0) return '';
  const byName = new Map(groups.map((group) => [group.name, group]));
  /* 場所を表す所属だけを塊の代表にする。札しか持たない人はひとまとまりにする */
  const places = cluster.groupNames.filter((name) => {
    const group = byName.get(name);
    return group ? groupTypeSetting(group.type).binds : false;
  });
  const roots = [...new Set((places.length > 0 ? places : cluster.groupNames).map((name) => outermostGroupName(name, groups)))];

  return roots.reduce((best, name) => {
    const order = (target: string) => {
      const group = byName.get(target);
      return group ? groupTypeSetting(group.type).order : FALLBACK_GROUP_TYPE.order;
    };
    if (order(name) !== order(best)) return order(name) < order(best) ? name : best;
    return name.localeCompare(best, 'ja') < 0 ? name : best;
  });
}

/** 塊（同じ外枠にまとまるクラスタの並び）。 */
type Block = Cluster[];

/** 塊が持つ所属の全部。塊どうしの近さを測るのに使う。 */
function blockGroupNames(block: Block): string[] {
  return [...new Set(block.flatMap((cluster) => cluster.groupNames))];
}

/** 塊どうしの隣に置きたい度合い。中身のクラスタをまとめて 1 つとみなす。 */
function blockAffinity(a: Block, b: Block, relations: Relation[]): number {
  const merged = (block: Block): Cluster => ({
    key: '',
    groupNames: blockGroupNames(block),
    members: block.flatMap((cluster) => cluster.members),
    columns: 1,
    width: 0,
    height: 0,
  });
  return affinity(merged(a), merged(b), relations);
}

/**
 * クラスタを外枠ごとの塊にまとめ、塊の中と外をそれぞれ並べる。
 *
 * 塊の中は「所属の少ない順」にする。M大学だけの人が先、研究室まで持つ人が後になり、
 * 外側の領域が内側の領域を包むように広がる。
 */
function buildBlocks(clusters: Cluster[], groups: Group[], relations: Relation[]): Block[] {
  const byAnchor = new Map<string, Block>();
  for (const cluster of clusters) {
    const anchor = clusterAnchor(cluster, groups);
    const block = byAnchor.get(anchor) ?? [];
    block.push(cluster);
    byAnchor.set(anchor, block);
  }

  const blocks = [...byAnchor.values()].map((block) =>
    [...block].sort(
      (a, b) =>
        a.groupNames.length - b.groupNames.length ||
        b.members.length - a.members.length ||
        a.key.localeCompare(b.key),
    ),
  );
  blocks.sort((a, b) => b.flatMap((c) => c.members).length - a.flatMap((c) => c.members).length);

  /* 塊の並びも、近いものが隣り合うように貪欲につなぐ（クラスタの並べ方と同じ考え方） */
  if (blocks.length <= 1) return blocks;
  const remaining = blocks.slice(1);
  const ordered: Block[] = [blocks[0]];
  while (remaining.length > 0) {
    const last = ordered[ordered.length - 1];
    let bestIndex = 0;
    let bestScore = -1;
    remaining.forEach((block, index) => {
      const score = blockAffinity(last, block, relations);
      if (score > bestScore) {
        bestScore = score;
        bestIndex = index;
      }
    });
    ordered.push(remaining.splice(bestIndex, 1)[0]);
  }
  return ordered;
}

/**
 * 塊を行に詰める。塊は途中で折り返さない。
 *
 * 折り返してしまうと、同じ大学の人が上下の行に分かれて領域が図を縦断し、
 * 関係の無い人まで囲ってしまう。
 */
function packBlocks(blocks: Block[]): Cluster[][] {
  const blockWidth = (block: Block) =>
    block.reduce((sum, cluster, index) => sum + cluster.width + (index > 0 ? CLUSTER.gap : 0), 0);

  const rows: Cluster[][] = [];
  let current: Cluster[] = [];
  let width = 0;

  for (const block of blocks) {
    const own = blockWidth(block);
    const next = width === 0 ? own : width + CLUSTER.gap + own;
    if (current.length > 0 && next > CANVAS.targetWidth) {
      rows.push(current);
      current = [...block];
      width = own;
    } else {
      current.push(...block);
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

function relationDegree(relations: Relation[]): Map<string, number> {
  const degree = new Map<string, number>();
  for (const relation of relations) {
    degree.set(relation.source, (degree.get(relation.source) ?? 0) + 1);
    degree.set(relation.target, (degree.get(relation.target) ?? 0) + 1);
  }
  return degree;
}

function relationNeighbors(relations: Relation[]): Map<string, string[]> {
  const neighbors = new Map<string, Set<string>>();
  for (const relation of relations) {
    const source = neighbors.get(relation.source) ?? new Set<string>();
    const target = neighbors.get(relation.target) ?? new Set<string>();
    source.add(relation.target);
    target.add(relation.source);
    neighbors.set(relation.source, source);
    neighbors.set(relation.target, target);
  }
  return new Map([...neighbors.entries()].map(([id, values]) => [id, [...values].sort()]));
}

function relationKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function primaryAttribute(person: Person): string {
  return person.attributes[0] ?? '';
}

function sortedPeople(data: RelationshipData): Person[] {
  const degree = relationDegree(data.relations);
  return [...data.people].sort(
    (a, b) =>
      primaryAttribute(a).localeCompare(primaryAttribute(b), 'ja') ||
      (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0) ||
      a.id.localeCompare(b.id),
  );
}

function placeCircular(data: RelationshipData): PersonPlacement[] {
  const people = sortedPeople(data);
  const radius = Math.max(260, (people.length * NODE.gapX) / (Math.PI * 2));
  return people.map((person, index) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(people.length, 1);
    return {
      person,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      groupIds: [],
    };
  });
}

function placeRadial(data: RelationshipData, centerId: string): PersonPlacement[] {
  const neighbors = relationNeighbors(data.relations);
  const distance = new Map<string, number>([[centerId, 0]]);
  const queue = [centerId];
  for (let index = 0; index < queue.length; index += 1) {
    const id = queue[index];
    for (const next of neighbors.get(id) ?? []) {
      if (distance.has(next)) continue;
      distance.set(next, (distance.get(id) ?? 0) + 1);
      queue.push(next);
    }
  }

  const people = [...data.people].sort((a, b) => {
    const layerA = distance.get(a.id) ?? Number.MAX_SAFE_INTEGER;
    const layerB = distance.get(b.id) ?? Number.MAX_SAFE_INTEGER;
    return layerA - layerB || primaryAttribute(a).localeCompare(primaryAttribute(b), 'ja') || a.id.localeCompare(b.id);
  });
  const byLayer = new Map<number, Person[]>();
  for (const person of people) {
    const layer = Math.min(distance.get(person.id) ?? 4, 4);
    const list = byLayer.get(layer) ?? [];
    list.push(person);
    byLayer.set(layer, list);
  }

  const placements: PersonPlacement[] = [];
  for (const [layer, members] of [...byLayer.entries()].sort((a, b) => a[0] - b[0])) {
    if (layer === 0) {
      members.forEach((person, index) => placements.push({ person, x: index * NODE.gapX, y: 0, groupIds: [] }));
      continue;
    }
    const radius = layer * 190;
    members.forEach((person, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(members.length, 1);
      placements.push({ person, x: Math.cos(angle) * radius, y: Math.sin(angle) * radius, groupIds: [] });
    });
  }
  return placements;
}

function placeLayered(data: RelationshipData): PersonPlacement[] {
  const groupsByName = new Map(data.groups.map((group) => [group.name, group]));
  const degree = relationDegree(data.relations);
  const layers = new Map<string, Person[]>();
  for (const person of data.people) {
    const group = groupsByName.get(primaryAttribute(person));
    const key = group ? `${groupTypeSetting(group.type).order}-${group.type}` : '999-unassigned';
    const list = layers.get(key) ?? [];
    list.push(person);
    layers.set(key, list);
  }

  const placements: PersonPlacement[] = [];
  let y = 0;
  for (const [, members] of [...layers.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const sorted = [...members].sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0) || a.id.localeCompare(b.id));
    const rowWidth = (sorted.length - 1) * NODE.gapX;
    sorted.forEach((person, index) => placements.push({ person, x: index * NODE.gapX - rowWidth / 2, y, groupIds: [] }));
    y += NODE.gapY * 1.35;
  }
  return placements;
}

function groupPeopleByPrimaryAttribute(data: RelationshipData): Array<{ key: string; people: Person[] }> {
  const byAttribute = new Map<string, Person[]>();
  for (const person of data.people) {
    const key = primaryAttribute(person) || UNASSIGNED.label;
    const list = byAttribute.get(key) ?? [];
    list.push(person);
    byAttribute.set(key, list);
  }

  const degree = relationDegree(data.relations);
  return [...byAttribute.entries()]
    .map(([key, people]) => ({
      key,
      people: [...people].sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0) || a.id.localeCompare(b.id)),
    }))
    .sort((a, b) => b.people.length - a.people.length || a.key.localeCompare(b.key, 'ja'));
}

/**
 * 所属を主語にして読む配置。
 *
 * Graphviz の osage / patchwork 的に「クラスタを先に置く」発想を、SVG 領域が
 * 読みやすいよう円周上の小さなまとまりとして表す。
 */
function placeAttributeRadial(data: RelationshipData): PersonPlacement[] {
  const groups = groupPeopleByPrimaryAttribute(data);
  const outerRadius = Math.max(360, (groups.length * NODE.gapX) / (Math.PI * 1.6));
  const placements: PersonPlacement[] = [];

  groups.forEach((group, groupIndex) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * groupIndex) / Math.max(groups.length, 1);
    const center = {
      x: Math.cos(angle) * outerRadius,
      y: Math.sin(angle) * outerRadius,
    };
    const columns = Math.min(CLUSTER.maxColumns, Math.max(1, Math.ceil(Math.sqrt(group.people.length))));
    const rows = Math.ceil(group.people.length / columns);
    const width = (columns - 1) * NODE.gapX;
    const height = (rows - 1) * NODE.gapY;

    group.people.forEach((person, index) => {
      const column = index % columns;
      const row = Math.floor(index / columns);
      placements.push({
        person,
        x: center.x + column * NODE.gapX - width / 2,
        y: center.y + row * NODE.gapY - height / 2,
        groupIds: [],
      });
    });
  });

  return placements;
}

/**
 * つながりの多い人を中心に、周辺の人を外側へ出す配置。
 *
 * 関係数が少ない相関図では、純粋な力学配置より「誰がハブか」が読みやすい。
 */
function placeCorePeriphery(data: RelationshipData): PersonPlacement[] {
  const degree = relationDegree(data.relations);
  const people = [...data.people].sort(
    (a, b) =>
      (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0) ||
      primaryAttribute(a).localeCompare(primaryAttribute(b), 'ja') ||
      a.id.localeCompare(b.id),
  );
  const ringSizes = [8, 18, 28];
  const rings: Person[][] = [];
  let cursor = 0;

  for (const size of ringSizes) {
    rings.push(people.slice(cursor, cursor + size));
    cursor += size;
  }
  if (cursor < people.length) rings.push(people.slice(cursor));

  const placements: PersonPlacement[] = [];
  rings.forEach((members, ringIndex) => {
    if (members.length === 0) return;
    const radius = ringIndex === 0 ? 130 : 130 + ringIndex * 270;
    const sorted = [...members].sort(
      (a, b) =>
        primaryAttribute(a).localeCompare(primaryAttribute(b), 'ja') ||
        (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0) ||
        a.id.localeCompare(b.id),
    );

    sorted.forEach((person, index) => {
      const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(sorted.length, 1);
      placements.push({
        person,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
        groupIds: [],
      });
    });
  });

  return placements;
}

interface TreeLink {
  a: string;
  b: string;
  weight: number;
}

function addTreeLink(links: Map<string, TreeLink>, a: string, b: string, weight: number): void {
  if (a === b) return;
  const key = relationKey(a, b);
  const current = links.get(key);
  links.set(key, { a, b, weight: Math.max(current?.weight ?? 0, weight) });
}

function relationTreeLinks(data: RelationshipData, rootId = ''): TreeLink[] {
  const links = new Map<string, TreeLink>();
  for (const relation of data.relations) addTreeLink(links, relation.source, relation.target, 4);
  for (const hub of affiliationHubs(data)) {
    for (const memberId of hub.memberIds) addTreeLink(links, hub.hubId, memberId, 1);
  }
  const root = data.people.find((person) => person.id === rootId);
  if (root) {
    const connectingGroups = new Set(
      data.groups.filter((group) => groupConnects(group)).map((group) => group.name),
    );
    const rootGroups = new Set(root.attributes.filter((name) => connectingGroups.has(name)));
    for (const person of data.people) {
      if (person.id === root.id) continue;
      const shared = person.attributes.filter((name) => rootGroups.has(name));
      if (shared.length > 0) addTreeLink(links, root.id, person.id, 2 + shared.length);
    }
  }
  return [...links.values()];
}

function treeNeighbors(links: TreeLink[]): Map<string, string[]> {
  const neighbors = new Map<string, Set<string>>();
  for (const link of links) {
    const a = neighbors.get(link.a) ?? new Set<string>();
    const b = neighbors.get(link.b) ?? new Set<string>();
    a.add(link.b);
    b.add(link.a);
    neighbors.set(link.a, a);
    neighbors.set(link.b, b);
  }
  return new Map([...neighbors.entries()].map(([id, ids]) => [id, [...ids]]));
}

function treeDegree(links: TreeLink[]): Map<string, number> {
  const degree = new Map<string, number>();
  for (const link of links) {
    degree.set(link.a, (degree.get(link.a) ?? 0) + link.weight);
    degree.set(link.b, (degree.get(link.b) ?? 0) + link.weight);
  }
  return degree;
}

function preferredRoot(data: RelationshipData, centerId: string): string {
  const candidates = ['nodoame', data.view?.centerPersonId, data.project.defaultCenterPersonId, centerId];
  return candidates.find((id) => id && data.people.some((person) => person.id === id)) ?? data.people[0]?.id ?? '';
}

function relationTreeOrder(data: RelationshipData, rootId: string): Person[] {
  const links = relationTreeLinks(data, rootId);
  const degree = treeDegree(links);
  const neighbors = treeNeighbors(links);
  const byId = new Map(data.people.map((person) => [person.id, person]));
  const seen = new Set<string>();
  const ordered: Person[] = [];

  const queueFrom = (startId: string) => {
    const queue = [startId];
    seen.add(startId);
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const id = queue[cursor];
      const person = byId.get(id);
      if (person) ordered.push(person);

      const next = (neighbors.get(id) ?? [])
        .filter((candidate) => !seen.has(candidate))
        .sort(
          (a, b) =>
            (degree.get(b) ?? 0) - (degree.get(a) ?? 0) ||
            primaryAttribute(byId.get(a) ?? person ?? data.people[0]).localeCompare(
              primaryAttribute(byId.get(b) ?? person ?? data.people[0]),
              'ja',
            ) ||
            a.localeCompare(b),
        );
      for (const candidate of next) {
        seen.add(candidate);
        queue.push(candidate);
      }
    }
  };

  if (rootId) queueFrom(rootId);
  const remaining = [...data.people]
    .filter((person) => !seen.has(person.id))
    .sort(
      (a, b) =>
        (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0) ||
        primaryAttribute(a).localeCompare(primaryAttribute(b), 'ja') ||
        a.id.localeCompare(b.id),
    );
  for (const person of remaining) queueFrom(person.id);
  return ordered;
}

function placeRelationshipTree(data: RelationshipData, centerId: string): PersonPlacement[] {
  const rootId = preferredRoot(data, centerId);
  const links = relationTreeLinks(data, rootId);
  const degree = treeDegree(links);
  const neighbors = treeNeighbors(links);
  const byId = new Map(data.people.map((person) => [person.id, person]));
  const depth = new Map<string, number>();
  const seen = new Set<string>();
  const components: Person[][] = [];

  for (const root of relationTreeOrder(data, rootId)) {
    if (seen.has(root.id)) continue;
    const queue = [root.id];
    const component: Person[] = [];
    depth.set(root.id, 0);
    seen.add(root.id);

    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const id = queue[cursor];
      const person = byId.get(id);
      if (person) component.push(person);
      const next = (neighbors.get(id) ?? [])
        .filter((candidate) => !seen.has(candidate))
        .sort((a, b) => (degree.get(b) ?? 0) - (degree.get(a) ?? 0) || a.localeCompare(b));
      for (const candidate of next) {
        seen.add(candidate);
        depth.set(candidate, (depth.get(id) ?? 0) + 1);
        queue.push(candidate);
      }
    }
    components.push(component);
  }

  const placements: PersonPlacement[] = [];
  let componentOffsetY = 0;
  components.forEach((component, componentIndex) => {
    const byDepth = new Map<number, Person[]>();
    for (const person of component) {
      const list = byDepth.get(depth.get(person.id) ?? 0) ?? [];
      list.push(person);
      byDepth.set(depth.get(person.id) ?? 0, list);
    }

    if (componentIndex === 0) {
      for (const [level, members] of [...byDepth.entries()].sort((a, b) => a[0] - b[0])) {
        if (level === 0) {
          members.forEach((person) => placements.push({ person, x: 0, y: 0, groupIds: [] }));
          continue;
        }
        const sorted = [...members].sort(
          (a, b) =>
            (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0) ||
            primaryAttribute(a).localeCompare(primaryAttribute(b), 'ja') ||
            a.id.localeCompare(b.id),
        );
        const buckets = new Map<string, Person[]>();
        for (const person of sorted) {
          const key = primaryAttribute(person) || UNASSIGNED.label;
          buckets.set(key, [...(buckets.get(key) ?? []), person]);
        }
        const categoryGroups = [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ja'));
        const slotCount =
          sorted.length + Math.max(0, categoryGroups.length - 1) * RELATION_TREE.categoryGapSlots;
        let slot = 0;
        categoryGroups.forEach(([, groupMembers], groupIndex) => {
          const radius = level * RELATION_TREE.levelGapY + groupIndex * RELATION_TREE.categoryRadiusStep;
          groupMembers.forEach((person) => {
            const angle = -Math.PI / 2 + (Math.PI * 2 * (slot + 0.5)) / Math.max(slotCount, 1);
            placements.push({
              person,
              x: Math.cos(angle) * radius,
              y: Math.sin(angle) * radius,
              groupIds: [],
            });
            slot += 1;
          });
          slot += RELATION_TREE.categoryGapSlots;
        });
      }
      componentOffsetY = Math.max(...placements.map((placement) => placement.y)) + RELATION_TREE.componentGapY;
      return;
    }

    let componentHeight = 0;
    for (const [level, members] of [...byDepth.entries()].sort((a, b) => a[0] - b[0])) {
      const sorted = [...members].sort(
        (a, b) =>
          (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0) ||
          primaryAttribute(a).localeCompare(primaryAttribute(b), 'ja') ||
          a.id.localeCompare(b.id),
      );
      const columns = Math.min(RELATION_TREE.maxColumns, Math.max(1, sorted.length));
      const rows = Math.ceil(sorted.length / columns);
      const width = (columns - 1) * RELATION_TREE.branchGapX;
      sorted.forEach((person, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        placements.push({
          person,
          x: column * RELATION_TREE.branchGapX - width / 2,
          y: componentOffsetY + level * RELATION_TREE.levelGapY + row * RELATION_TREE.branchGapY,
          groupIds: [],
        });
      });
      componentHeight = Math.max(
        componentHeight,
        level * RELATION_TREE.levelGapY + Math.max(0, rows - 1) * RELATION_TREE.branchGapY,
      );
    }

    componentOffsetY += componentHeight + RELATION_TREE.componentGapY;
  });

  return placements;
}

function placeForce(data: RelationshipData): PersonPlacement[] {
  const people = sortedPeople(data);
  const positions = new Map(placeCircular(data).map((placement) => [placement.person.id, { x: placement.x, y: placement.y }]));
  const area = Math.max(people.length, 1) * NODE.gapX * NODE.gapY * 2.4;
  const k = Math.sqrt(area / Math.max(people.length, 1));
  let temperature = Math.max(160, Math.sqrt(area) / 8);

  for (let iteration = 0; iteration < 180; iteration += 1) {
    const delta = new Map(people.map((person) => [person.id, { x: 0, y: 0 }]));

    for (let i = 0; i < people.length; i += 1) {
      for (let j = i + 1; j < people.length; j += 1) {
        const a = positions.get(people[i].id)!;
        const b = positions.get(people[j].id)!;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const force = (k * k) / distance;
        const x = (dx / distance) * force;
        const y = (dy / distance) * force;
        delta.get(people[i].id)!.x += x;
        delta.get(people[i].id)!.y += y;
        delta.get(people[j].id)!.x -= x;
        delta.get(people[j].id)!.y -= y;
      }
    }

    for (const relation of data.relations) {
      const a = positions.get(relation.source);
      const b = positions.get(relation.target);
      if (!a || !b) continue;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const force = (distance * distance) / k;
      const x = (dx / distance) * force;
      const y = (dy / distance) * force;
      delta.get(relation.source)!.x -= x;
      delta.get(relation.source)!.y -= y;
      delta.get(relation.target)!.x += x;
      delta.get(relation.target)!.y += y;
    }

    for (const person of people) {
      const point = positions.get(person.id)!;
      const move = delta.get(person.id)!;
      const distance = Math.max(1, Math.hypot(move.x, move.y));
      point.x += (move.x / distance) * Math.min(distance, temperature);
      point.y += (move.y / distance) * Math.min(distance, temperature);
    }
    temperature *= 0.96;
  }

  return people.map((person) => {
    const point = positions.get(person.id)!;
    return { person, x: point.x, y: point.y, groupIds: [] };
  });
}

function clusterFromMembers(key: string, members: Person[]): Cluster {
  const columns = Math.min(CLUSTER.maxColumns, Math.max(1, Math.ceil(Math.sqrt(members.length))));
  const rows = Math.ceil(members.length / columns);
  return {
    key,
    groupNames: [],
    members,
    columns,
    width: columns * NODE.gapX,
    height: rows * NODE.gapY,
  };
}

function placeClusterBlocks(clusters: Cluster[], relations: Relation[]): PersonPlacement[] {
  return placePeople(packRows(orderClusters(clusters, relations)));
}

/**
 * 関係線だけからコミュニティを作る。
 *
 * ラベル伝播に近い決定的なヒューリスティックで、つながりの多いラベルへ寄せる。
 * 毎回同じ結果になるよう、処理順と同点の決め方は ID / ラベル順で固定する。
 */
function relationCommunities(data: RelationshipData): Cluster[] {
  const people = sortedPeople(data);
  const neighbors = relationNeighbors(data.relations);
  const degree = relationDegree(data.relations);
  const labels = new Map(people.map((person) => [person.id, person.id]));

  for (let iteration = 0; iteration < 14; iteration += 1) {
    let changed = false;
    const queue = [...people].sort(
      (a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0) || a.id.localeCompare(b.id),
    );

    for (const person of queue) {
      const counts = new Map<string, number>();
      for (const neighbor of neighbors.get(person.id) ?? []) {
        const label = labels.get(neighbor) ?? neighbor;
        counts.set(label, (counts.get(label) ?? 0) + 1);
      }
      if (counts.size === 0) continue;

      const current = labels.get(person.id) ?? person.id;
      counts.set(current, (counts.get(current) ?? 0) + 0.35);
      const next = [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? current;
      if (next !== current) {
        labels.set(person.id, next);
        changed = true;
      }
    }
    if (!changed) break;
  }

  const byLabel = new Map<string, Person[]>();
  for (const person of people) {
    const label = labels.get(person.id) ?? person.id;
    const list = byLabel.get(label) ?? [];
    list.push(person);
    byLabel.set(label, list);
  }

  return [...byLabel.entries()]
    .map(([label, members]) => clusterFromMembers(label, members))
    .sort((a, b) => b.members.length - a.members.length || a.key.localeCompare(b.key));
}

function placeCommunity(data: RelationshipData): PersonPlacement[] {
  return placeClusterBlocks(relationCommunities(data), data.relations);
}

function shortestPathDistances(people: Person[], relations: Relation[]): Map<string, Map<string, number>> {
  const neighbors = relationNeighbors(relations);
  const all = new Map<string, Map<string, number>>();

  for (const source of people) {
    const distance = new Map<string, number>([[source.id, 0]]);
    const queue = [source.id];
    for (let index = 0; index < queue.length; index += 1) {
      const id = queue[index];
      for (const next of neighbors.get(id) ?? []) {
        if (distance.has(next)) continue;
        distance.set(next, (distance.get(id) ?? 0) + 1);
        queue.push(next);
      }
    }
    all.set(source.id, distance);
  }

  return all;
}

function placementMap(placements: PersonPlacement[]): Map<string, Point> {
  return new Map(placements.map((placement) => [placement.person.id, { x: placement.x, y: placement.y }]));
}

function placementsFromPositionMap(people: Person[], positions: Map<string, Point>): PersonPlacement[] {
  return people.map((person) => {
    const point = positions.get(person.id) ?? { x: 0, y: 0 };
    return { person, x: point.x, y: point.y, groupIds: [] };
  });
}

/**
 * グラフ距離を平面距離に近づけるストレス系の配置。
 *
 * MDS / stress majorization の考え方に寄せ、近い関係は近く、遠い関係は遠く置く。
 * 厳密な固有値分解は入れず、ブラウザで軽く動く反復法にしている。
 */
function placeStress(data: RelationshipData): PersonPlacement[] {
  const people = sortedPeople(data);
  const positions = placementMap(placeCircular(data));
  const distances = shortestPathDistances(people, data.relations);
  const relationPairs = new Set(data.relations.map((relation) => relationKey(relation.source, relation.target)));
  const disconnectedDistance = Math.min(5, Math.max(3, Math.ceil(Math.sqrt(people.length))));

  for (let iteration = 0; iteration < 150; iteration += 1) {
    const cooling = 1 - iteration / 150;
    const delta = new Map(people.map((person) => [person.id, { x: 0, y: 0 }]));

    for (let i = 0; i < people.length; i += 1) {
      for (let j = i + 1; j < people.length; j += 1) {
        const a = people[i];
        const b = people[j];
        const pointA = positions.get(a.id)!;
        const pointB = positions.get(b.id)!;
        const dx = pointA.x - pointB.x;
        const dy = pointA.y - pointB.y;
        const current = Math.max(1, Math.hypot(dx, dy));
        const graphDistance = distances.get(a.id)?.get(b.id) ?? disconnectedDistance;
        const desired = graphDistance * NODE.gapX * 0.95;
        const weight = relationPairs.has(relationKey(a.id, b.id)) ? 0.022 : 0.006 / Math.max(graphDistance, 1);
        const force = (current - desired) * weight * cooling;
        const x = (dx / current) * force;
        const y = (dy / current) * force;
        delta.get(a.id)!.x -= x;
        delta.get(a.id)!.y -= y;
        delta.get(b.id)!.x += x;
        delta.get(b.id)!.y += y;
      }
    }

    for (const person of people) {
      const point = positions.get(person.id)!;
      const move = delta.get(person.id)!;
      point.x += Math.max(-26, Math.min(26, move.x));
      point.y += Math.max(-26, Math.min(26, move.y));
    }
  }

  return placementsFromPositionMap(people, positions);
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

/**
 * その区画に置かれた人（自分の区画と、その中の区画にいる人）。
 *
 * 囲いの形はこの人たちだけで決める。持ち場が別のところにある所属者まで
 * 囲おうとすると、四角が図を横切るほど広がって、どこが何のまとまりか読めなくなる。
 * 囲いに入らない所属は、その所属の色の線が繋いで見せる。
 */
function homeMembers(group: Group, groups: Group[], placements: PersonPlacement[]): PersonPlacement[] {
  const ids = new Set([group.id]);
  for (let added = true; added; ) {
    added = false;
    for (const candidate of groups) {
      if (candidate.parentGroupId && ids.has(candidate.parentGroupId) && !ids.has(candidate.id)) {
        ids.add(candidate.id);
        added = true;
      }
    }
  }
  return placements.filter((placement) => placement.homeGroupId && ids.has(placement.homeGroupId));
}

function buildRegions(groups: Group[], placements: PersonPlacement[]): RegionPlacement[] {
  /* 区画で並べたときだけ持ち場が入る。他の並べ方では今まで通り所属者全員で囲う */
  const hasHomes = placements.some((placement) => placement.homeGroupId);

  const regions = groups.map((group) => {
    const members = placements.filter((placement) => placement.person.attributes.includes(group.name));
    const shaping = hasHomes ? homeMembers(group, groups, placements) : members;
    /*
     * 持ち場がこのグループにある人が 1 人もいないときは、囲いを描かない。
     *
     * 全員が他のグループの区画に住んでいるということなので（S塾 は全員が
     * K高校 か M大学 に住んでいる）、散らばった人を四角で囲うと図を横切る
     * 大きさになり、どこが何のまとまりか読めなくなる。
     * そういうグループの繋がりは、そのグループの色の線が引き受ける。
     */
    const padding = regionPadding(group.type);
    const polygon = regionPolygon(
      shaping.map((member) => ({ x: member.x, y: member.y })),
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
      const polygon = regionPolygon(
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

  /*
   * 所属者が 0 人のグループは描かない（参照切れは parse.ts が報告済み）。
   * 囲いを描かないグループも一覧には残す。凡例と強調の対象からは外さない。
   */
  return regions.filter((region) => region.memberIds.length > 0).sort((a, b) => b.area - a.area);
}

function isRegionIntruder(placement: PersonPlacement, region: RegionPlacement): boolean {
  return !region.memberIds.includes(placement.person.id) && pointInPolygon(placement, region.polygon);
}

function intrudingRegions(placement: PersonPlacement, regions: RegionPlacement[]): RegionPlacement[] {
  return regions.filter((region) => isRegionIntruder(placement, region));
}

/**
 * 領域を厳格に保つ。
 *
 * 凸包で作った領域は読みやすい一方、近くに置かれた非所属者を包み込むことがある。
 * 非所属者が領域内に入ったら外側へ押し出し、所属している領域だけに残るよう再計算する。
 */
/**
 * 人のノードが重ならないように離す。
 *
 * 置き方はいくつもあり（所属のまとまり・衛星・はみ出しの押し出し）、どれか 1 つを
 * 直しても別の経路で重なりが残る。最後にここを通して、重なっている組を必ず離す。
 * 中心人物はアイコンが大きいので、その分も見込む。
 */
function separateNodes(placements: PersonPlacement[], centerId: string): void {
  const radiusOf = (placement: PersonPlacement) =>
    (placement.person.id === centerId ? NODE.size * NODE.centerScale : NODE.size) / 2;

  for (let pass = 0; pass < SEPARATION.passes; pass += 1) {
    let moved = false;

    for (let i = 0; i < placements.length; i += 1) {
      for (let j = i + 1; j < placements.length; j += 1) {
        const a = placements[i];
        const b = placements[j];
        const need = radiusOf(a) + radiusOf(b) + SEPARATION.padding;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        /*
         * アイコンは四角なので、縦か横のどちらかが離れていれば重ならない。
         * 円のつもりで中心の距離だけを見ると、角どうしが重なったまま通ってしまう。
         */
        const overlapX = need - Math.abs(dx);
        const overlapY = need - Math.abs(dy);
        if (overlapX <= 0 || overlapY <= 0) continue;

        /* 動かす量が少なくて済む向きへ逃がす。重なったままなら決まった向きへ */
        if (overlapX <= overlapY) {
          const sign = dx !== 0 ? Math.sign(dx) : a.person.id < b.person.id ? -1 : 1;
          a.x += (sign * overlapX) / 2;
          b.x -= (sign * overlapX) / 2;
        } else {
          const sign = dy !== 0 ? Math.sign(dy) : a.person.id < b.person.id ? -1 : 1;
          a.y += (sign * overlapY) / 2;
          b.y -= (sign * overlapY) / 2;
        }
        moved = true;
      }
    }

    if (!moved) break;
  }
}

function enforceStrictRegions(groups: Group[], placements: PersonPlacement[]): RegionPlacement[] {
  let regions = buildRegions(groups, placements);

  for (let pass = 0; pass < REGION.strictPasses; pass += 1) {
    let moved = false;

    for (const placement of placements) {
      const blockers = intrudingRegions(placement, regions);
      if (blockers.length === 0) continue;

      const center = centroid(blockers.flatMap((region) => region.polygon));
      let dx = placement.x - center.x;
      let dy = placement.y - center.y;
      if (dx === 0 && dy === 0) {
        const angle = (placement.person.id.charCodeAt(0) % REGION.strictDirections) * ((Math.PI * 2) / REGION.strictDirections);
        dx = Math.cos(angle);
        dy = Math.sin(angle);
      }
      const length = Math.hypot(dx, dy) || 1;

      for (let step = 0; step < REGION.strictMaxSteps; step += 1) {
        const next = {
          x: placement.x + (dx / length) * REGION.strictPushStep,
          y: placement.y + (dy / length) * REGION.strictPushStep,
        };
        placement.x = next.x;
        placement.y = next.y;
        moved = true;
        if (intrudingRegions(placement, regions).length === 0) break;
      }
    }

    regions = buildRegions(groups, placements);
    if (!moved) return regions;
  }

  return regions;
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

/**
 * 座標を格子の交点に載せて、人を縦横に整列させる。
 *
 * 緩和計算のあとの座標は端数だらけなので、縦横に引いた配線がどれも
 * 少しずつ違う行・列を走る。基盤や路線図のように見えるのは線の向きが
 * 揃っているからで、そのためには線の端（＝人）が揃っている必要がある。
 *
 * 同じ交点に 2 人乗ると重なるので、近い交点から順に空きを探す。
 * 探す順は上から下・左から右で固定し、何度作り直しても同じ結果にする。
 */
function alignToGrid(placements: PersonPlacement[]): void {
  const taken = new Set<string>();
  /* 並び順を固定する。座標が同じときは ID で決めて、計算のたびに入れ替わらないようにする */
  const order = [...placements].sort(
    (a, b) => a.y - b.y || a.x - b.x || a.person.id.localeCompare(b.person.id),
  );

  for (const placement of order) {
    const column = Math.round(placement.x / GRID.cell);
    const row = Math.round(placement.y / GRID.cell);

    /* 本来の位置から近い交点から順に、空いているところを探す */
    let best: { column: number; row: number } | null = null;
    for (let ring = 0; ring <= GRID.search && !best; ring += 1) {
      for (let dy = -ring; dy <= ring && !best; dy += 1) {
        for (let dx = -ring; dx <= ring && !best; dx += 1) {
          /* いま見ている輪の縁だけを調べる（内側は前の輪で調べ済み） */
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== ring) continue;
          const key = `${column + dx}:${row + dy}`;
          if (taken.has(key)) continue;
          taken.add(key);
          best = { column: column + dx, row: row + dy };
        }
      }
    }

    if (!best) continue;
    placement.x = best.column * GRID.cell;
    placement.y = best.row * GRID.cell;
  }
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

/**
 * 所属から線を導く。
 *
 * グループごとに「親」を 1 人決めて、そこから他の所属者へ線を引く。
 * 親は所属の数がいちばん多い人（同数なら ID 順）。多くのグループに顔を出す人が、
 * 自然に何本もの線が集まる場所になる。
 *
 * 総当たりで繋がないのは、読める量に収めるため。同じ所属の人を全部繋ぐと
 * この規模で 570 本になり、線が面になって何も読み取れなくなる。
 */
/** グループ名 → そのグループの親と所属者。線を引くのも引き寄せるのも、この結果を使う。 */
export interface AffiliationHub {
  group: Group;
  hubId: string;
  memberIds: string[];
}

/**
 * グループごとの親と所属者を求める。
 *
 * 親は所属の数がいちばん多い人（同数なら ID 順）。並び順を決めておくことで、
 * 何度計算しても同じ人が親になり、図が作り直しのたびに変わらない。
 * 所属者が 1 人だけのグループは、繋ぐ相手がいないので含めない。
 */
export function affiliationHubs(data: RelationshipData): AffiliationHub[] {
  const groupNames = new Set(data.groups.map((group) => group.name));
  /** その人が持つ所属の数。親を選ぶ基準にする。 */
  const affiliationCount = new Map(
    data.people.map((person) => [
      person.id,
      person.attributes.filter((name) => groupNames.has(name)).length,
    ]),
  );

  const hubs: AffiliationHub[] = [];
  for (const group of data.groups) {
    /*
     * 「知り合い」を意味しない所属からは線を引かない。
     *
     * 名前の無い段階（小学校・高校）や状態の札（アクティブメンバー）は、
     * 同じ札が付いていても顔を合わせているとは限らない。そこから線を引くと、
     * 実際には無い繋がりが図に出てしまう。
     */
    if (!groupConnects(group)) continue;

    const members = data.people.filter((person) => person.attributes.includes(group.name));
    if (members.length < 2) continue;

    const hub = members.reduce((best, person) => {
      const a = affiliationCount.get(person.id) ?? 0;
      const b = affiliationCount.get(best.id) ?? 0;
      if (a !== b) return a > b ? person : best;
      return person.id < best.id ? person : best;
    });

    hubs.push({
      group,
      hubId: hub.id,
      memberIds: members.filter((person) => person.id !== hub.id).map((person) => person.id),
    });
  }
  return hubs;
}

function buildAffiliationEdges(
  data: RelationshipData,
  byId: Map<string, PersonPlacement>,
): AffiliationEdgePlacement[] {
  const edges: AffiliationEdgePlacement[] = [];

  for (const { group, hubId, memberIds } of affiliationHubs(data)) {
    const hubPlace = byId.get(hubId);
    if (!hubPlace) continue;

    for (const memberId of memberIds) {
      const place = byId.get(memberId);
      if (!place) continue;
      edges.push({
        group,
        hubId,
        memberId,
        from: { x: hubPlace.x, y: hubPlace.y },
        to: { x: place.x, y: place.y },
        channelOffset: 0,
      });
    }
  }

  return edges;
}

/**
 * 配線が重ならないように、折り返す位置をずらす。
 *
 * 縦横だけで繋ぐと、どの線も中点で折り返すので、近くを走る線どうしが
 * 同じ列（または行）に乗って 1 本に見えてしまう。基盤の配線が隣り合って
 * 走るように、同じ折り返し位置になる線を見つけて少しずつ横へずらす。
 *
 * ずらす順は 0 → +1 → -1 → +2 … と中心から交互に広げる。
 * 並び順は関係の並びで決まるので、何度作り直しても同じ配線になる。
 */
function assignEdgeChannels(edges: WirePlacement[]): void {
  /* すでに使った折り返し位置。基盤の配線のように一定の間隔に載せる */
  const taken = new Set<string>();

  for (const edge of edges) {
    const horizontal = Math.abs(edge.to.x - edge.from.x) >= Math.abs(edge.to.y - edge.from.y);
    /* 折り返す線の位置。ここが同じ線どうしが重なる */
    const middle = horizontal ? (edge.from.x + edge.to.x) / 2 : (edge.from.y + edge.to.y) / 2;
    const axis = horizontal ? 'x' : 'y';
    const base = Math.round(middle / EDGE.channelGap);

    /* 本来の位置から近い順に、空いているところを探す */
    for (let step = 0; step <= EDGE.channelSearch; step += 1) {
      const candidates = step === 0 ? [base] : [base + step, base - step];
      const free = candidates.find((lane) => !taken.has(`${axis}:${lane}`));
      if (free === undefined) continue;
      taken.add(`${axis}:${free}`);
      edge.channelOffset = free * EDGE.channelGap - middle;
      break;
    }
  }
}

function buildEdges(relations: Relation[], byId: Map<string, PersonPlacement>): EdgePlacement[] {
  const edges = relations
    .map((relation) => {
      const from = byId.get(relation.source);
      const to = byId.get(relation.target);
      if (!from || !to) return null;
      return {
        relation,
        from: { x: from.x, y: from.y },
        to: { x: to.x, y: to.y },
        channelOffset: 0,
      };
    })
    .filter((edge): edge is EdgePlacement => edge !== null);

  /* ずらしの割り当ては呼び出し側が、所属の線とまとめて行う */
  return edges;
}

function assignGroupIds(people: PersonPlacement[], groups: Group[]): void {
  const groupByName = new Map(groups.map((group) => [group.name, group]));
  for (const placement of people) {
    placement.groupIds = placement.person.attributes
      .map((name) => groupByName.get(name)?.id)
      .filter((id): id is string => id !== undefined);
  }
}

/**
 * 所属ごとの塊を締める。
 *
 * 並べ替えだけでは、複数の所属を持つ人をどれか 1 か所にしか置けないので、
 * その人の別の所属の領域が図を横切って伸びる。ここでは所属の重心へ少しずつ
 * 引き寄せ、同時に近づきすぎた人どうしを離す。
 *
 * 引く力は「その人が持つ所属の数」で割る。こうすると 1 つしか所属が無い人は
 * その塊の中心へ入り、複数持つ人はそれぞれの塊の間に落ち着く（＝領域が重なる）。
 * 研究室のように所属者が大学の一部であるときは、内側の小さな塊が
 * 外側の塊の中に自然に収まる。
 *
 * あわせて、関係線でつながっている人どうしも引き寄せる。所属より関係線を
 * 優先したいので、こちらを強く効かせる。図を横切る長い関係線が減り、
 * 「誰と誰が繋がっているか」を追いやすくなる。
 */
function relaxGroupClusters(
  placements: PersonPlacement[],
  groups: Group[],
  relations: Relation[],
  hubs: AffiliationHub[],
): void {
  /* 場所を表す所属だけがまとまりを作る（アクティブメンバーのような札は効かせない） */
  const groupNames = new Set(
    groups.filter((group) => groupTypeSetting(group.type).binds).map((group) => group.name),
  );
  const belongs = new Map(
    placements.map((placement) => [
      placement.person.id,
      placement.person.attributes.filter((name) => groupNames.has(name)),
    ]),
  );

  for (let iteration = 0; iteration < GROUP_RELAX.iterations; iteration += 1) {
    const cooling = 1 - iteration / GROUP_RELAX.iterations;

    /* いまの所属ごとの重心 */
    const sums = new Map<string, { x: number; y: number; count: number }>();
    for (const placement of placements) {
      for (const name of belongs.get(placement.person.id) ?? []) {
        const sum = sums.get(name) ?? { x: 0, y: 0, count: 0 };
        sum.x += placement.x;
        sum.y += placement.y;
        sum.count += 1;
        sums.set(name, sum);
      }
    }

    const delta = new Map(placements.map((placement) => [placement.person.id, { x: 0, y: 0 }]));

    /* 所属の重心へ引き寄せる */
    for (const placement of placements) {
      const names = belongs.get(placement.person.id) ?? [];
      if (names.length === 0) continue;
      const move = delta.get(placement.person.id)!;
      for (const name of names) {
        const sum = sums.get(name);
        if (!sum || sum.count === 0) continue;
        const centerX = sum.x / sum.count;
        const centerY = sum.y / sum.count;
        move.x += ((centerX - placement.x) * GROUP_RELAX.attraction * cooling) / names.length;
        move.y += ((centerY - placement.y) * GROUP_RELAX.attraction * cooling) / names.length;
      }
    }

    /*
     * 関係線でつながっている人どうしを、ちょうどよい距離へ寄せる。
     * 所属より優先したいので、所属の引きより強く効かせる。
     */
    const byId = new Map(placements.map((placement) => [placement.person.id, placement]));
    for (const relation of relations) {
      const a = byId.get(relation.source);
      const b = byId.get(relation.target);
      if (!a || !b) continue;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const force = ((distance - GROUP_RELAX.edgeDistance) * GROUP_RELAX.edgeAttraction * cooling) / 2;
      const moveX = (dx / distance) * force;
      const moveY = (dy / distance) * force;
      const moveA = delta.get(a.person.id)!;
      const moveB = delta.get(b.person.id)!;
      moveA.x -= moveX;
      moveA.y -= moveY;
      moveB.x += moveX;
      moveB.y += moveY;
    }

    /*
     * 所属の親のそばへ集める。
     *
     * 所属の線は親から放射状に出るので、親の近くに集まっていれば線が短く済み、
     * 「この人を中心にこのグループが繋がっている」形がそのまま図に出る。
     */
    for (const { hubId, memberIds } of hubs) {
      const hub = byId.get(hubId);
      if (!hub) continue;
      for (const memberId of memberIds) {
        const member = byId.get(memberId);
        if (!member) continue;
        const dx = member.x - hub.x;
        const dy = member.y - hub.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        const force = ((distance - GROUP_RELAX.hubDistance) * GROUP_RELAX.hubAttraction * cooling) / 2;
        const moveX = (dx / distance) * force;
        const moveY = (dy / distance) * force;
        const moveHub = delta.get(hubId)!;
        const moveMember = delta.get(memberId)!;
        moveMember.x -= moveX;
        moveMember.y -= moveY;
        moveHub.x += moveX;
        moveHub.y += moveY;
      }
    }

    /* 近づきすぎた人どうしを離す（ノードが重なると誰が誰だか読めなくなる） */
    for (let i = 0; i < placements.length; i += 1) {
      for (let j = i + 1; j < placements.length; j += 1) {
        const a = placements[i];
        const b = placements[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.hypot(dx, dy);
        if (distance >= GROUP_RELAX.minDistance) continue;
        /* 真上に重なったときは決まった向きへ逃がす（毎回同じ結果にするため） */
        const nx = distance > 0 ? dx / distance : 1;
        const ny = distance > 0 ? dy / distance : 0;
        const push = (GROUP_RELAX.minDistance - distance) * GROUP_RELAX.repulsion;
        const moveA = delta.get(a.person.id)!;
        const moveB = delta.get(b.person.id)!;
        moveA.x += nx * push;
        moveA.y += ny * push;
        moveB.x -= nx * push;
        moveB.y -= ny * push;
      }
    }

    for (const placement of placements) {
      const move = delta.get(placement.person.id)!;
      placement.x += move.x;
      placement.y += move.y;
    }
  }
}

/* ------------------------------------------------------------------ *
 * 区画（floorplan）
 * ------------------------------------------------------------------ */

/**
 * 区画の箱。グループ 1 つぶん。
 *
 * 中に子グループの箱（研究室 ⊂ 大学）と、そのグループ「そのもの」に
 * 属する人の升目を持つ。大きさは升目の数で数え、実際の座標は最後にまとめて出す。
 */
interface FloorBox {
  group: Group | null;
  /** この箱に直接置く人（子グループに属さない人）。 */
  members: Person[];
  children: FloorBox[];
  /** 親の中での左上（升目）。 */
  column: number;
  row: number;
  columns: number;
  rows: number;
  /** 中に置く人の、箱の中での位置（升目）。 */
  slots: Array<{ person: Person; column: number; row: number }>;
}

/**
 * n 人をできるだけ整った長方形に並べるときの列数。
 *
 * 余りが出ない形を優先し、同じなら正方形に近いほうを選ぶ。
 * 8 人なら 4×2、3 人なら 3×1 のように、段の欠けない形になる。
 */
function gridColumns(count: number): number {
  if (count <= 1) return 1;
  const limit = Math.min(count, FLOORPLAN.maxColumns);
  let best = 1;
  let bestScore = Number.POSITIVE_INFINITY;
  for (let columns = 1; columns <= limit; columns += 1) {
    const rows = Math.ceil(count / columns);
    /*
     * 欠けた升目を嫌いつつ、正方形に近い形を選ぶ。
     *
     * 欠けを重く見すぎると、1 列（必ず欠けが 0）がいつでも勝ってしまい、
     * 11 人が 1×11 の細長い帯になる。欠け 1 つと縦横の差 3 が釣り合うくらいにする。
     * 同じ点数なら横に広いほうを採り、3 人なら縦 1 列ではなく横 1 行にする。
     */
    const score = (rows * columns - count) * 3 + Math.abs(columns - rows);
    if (score <= bestScore) {
      bestScore = score;
      best = columns;
    }
  }
  return best;
}

/**
 * 箱を横に並べ、幅を超えたら次の段へ折り返す（棚積み）。
 *
 * 箱の `column` / `row` を埋めて、並べ終わった全体の大きさを返す。
 */
function shelfPack(
  boxes: FloorBox[],
  targetColumns: number,
): { columns: number; rows: number } {
  let column = 0;
  let row = 0;
  let shelfRows = 0;
  let widest = 0;

  for (const box of boxes) {
    if (column > 0 && column + box.columns > targetColumns) {
      row += shelfRows + FLOORPLAN.channel;
      column = 0;
      shelfRows = 0;
    }
    box.column = column;
    box.row = row;
    column += box.columns + FLOORPLAN.channel;
    shelfRows = Math.max(shelfRows, box.rows);
    widest = Math.max(widest, column - FLOORPLAN.channel);
  }

  return { columns: widest, rows: row + shelfRows };
}

/** 箱の中身（子の箱 → 自分の人）を並べ、箱の大きさを決める。 */
function layoutBox(box: FloorBox): void {
  for (const child of box.children) layoutBox(child);

  const inner = FLOORPLAN.padding;
  /*
   * 中の区画は、全体と同じ幅で折り返すと親が横に間延びする
   * （M大学 の中に研究室 3 つを並べると、右半分が空いた横長の四角になる）。
   * 中身の広さから、ほぼ正方形になる幅を出してそこで折り返す。
   */
  const childArea =
    box.children.length > 0
      ? shelfPack(
          box.children,
          Math.max(
            ...box.children.map((child) => child.columns),
            Math.ceil(Math.sqrt(box.children.reduce((sum, child) => sum + child.columns * child.rows, 0))),
          ),
        )
      : { columns: 0, rows: 0 };

  /* 子の箱は縁の余白のぶんだけ内側へ寄せる */
  for (const child of box.children) {
    child.column += inner;
    child.row += inner;
  }

  /* 自分の人は、子の箱の下に長方形で並べる */
  const columns = gridColumns(box.members.length);
  const memberRows = Math.ceil(box.members.length / columns);
  const memberTop = childArea.rows > 0 ? inner + childArea.rows + FLOORPLAN.channel : inner;

  box.slots = box.members.map((person, index) => ({
    person,
    column: inner + (index % columns),
    row: memberTop + Math.floor(index / columns),
  }));

  const usedColumns = Math.max(childArea.columns, box.members.length > 0 ? columns : 0);
  const usedRows = (box.members.length > 0 ? memberTop + memberRows : inner + childArea.rows) - inner;

  box.columns = usedColumns + inner * 2;
  box.rows = Math.max(usedRows, 1) + inner * 2;
}

/** 箱を実際の座標へ展開する。 */
function emitBox(box: FloorBox, originColumn: number, originRow: number, into: PersonPlacement[]): void {
  const column = originColumn + box.column;
  const row = originRow + box.row;

  for (const slot of box.slots) {
    into.push({
      person: slot.person,
      x: (column + slot.column) * NODE.gapX,
      y: (row + slot.row) * NODE.gapY,
      groupIds: [],
      homeGroupId: box.group?.id,
    });
  }
  for (const child of box.children) emitBox(child, column, row, into);
}

/**
 * 人の「持ち場」になるグループを決める。
 *
 * 複数の所属を持つ人は 1 か所にしか置けない。いちばん内側（研究室 > 大学）の
 * 所属を持ち場にして、そこの区画に入れる。他の所属との繋がりは、
 * 所属の線（グループの色）が引き受けるので、区画が離れていても読める。
 */
function homeGroupOf(person: Person, groups: Group[], memberCount: Map<string, number>): Group | null {
  const byName = new Map(groups.map((group) => [group.name, group]));
  const byId = new Map(groups.map((group) => [group.id, group]));

  const depthOf = (group: Group): number => {
    let depth = 0;
    let current: Group | undefined = group;
    const seen = new Set<string>();
    while (current?.parentGroupId && !seen.has(current.id)) {
      seen.add(current.id);
      current = byId.get(current.parentGroupId);
      depth += 1;
    }
    return depth;
  };

  /* 場所を表す所属だけを持ち場にする（アクティブメンバーのような札は持ち場にしない） */
  const candidates = person.attributes
    .map((name) => byName.get(name))
    .filter((group): group is Group => Boolean(group) && groupTypeSetting(group!.type).binds);
  if (candidates.length === 0) return null;

  return candidates.reduce((best, group) => {
    /* 内側の所属を優先する（研究室 ⊃ 大学 なら研究室に住む） */
    const a = depthOf(group);
    const b = depthOf(best);
    if (a !== b) return a > b ? group : best;

    /*
     * 同じ深さなら、所属者の少ないほうに住む。
     *
     * 分類の順で決めると、大きい所属がいつも勝って小さい所属が空になる。
     * 実際 S塾 の 10 人は全員 K高校 か M大学 に住み、S塾 には誰も残らず、
     * 囲いも描かれないまま 10 人が図の 6 割に散らばっていた。
     * 少ないほうに住まわせると、どの所属にも人が残ってまとまりができる。
     */
    const sizeA = memberCount.get(group.name) ?? 0;
    const sizeB = memberCount.get(best.name) ?? 0;
    if (sizeA !== sizeB) return sizeA > sizeB ? group : best;

    const orderA = groupTypeSetting(group.type).order;
    const orderB = groupTypeSetting(best.type).order;
    if (orderA !== orderB) return orderA < orderB ? group : best;
    return group.name.localeCompare(best.name, 'ja') < 0 ? group : best;
  });
}

/**
 * 区画として並べる。
 *
 * 基盤の設計と同じ順で組む。部品（グループ）を四角い区画にまとめ、
 * 入れ子の所属は区画の入れ子にし、区画のあいだに配線の通る道を空ける。
 * 緩和計算と違って結果が座標の端数に散らないので、人が縦横に揃う。
 */
function floorplanPlacements(data: RelationshipData): PersonPlacement[] {
  const hubs = affiliationHubs(data);
  /* 所属者の数。持ち場を決めるときに「少ないほう」を選ぶのに使う */
  const memberCount = new Map(
    data.groups.map((group) => [
      group.name,
      data.people.filter((person) => person.attributes.includes(group.name)).length,
    ]),
  );
  const home = new Map(
    data.people.map((person) => [person.id, homeGroupOf(person, data.groups, memberCount)]),
  );

  const boxes = new Map<string, FloorBox>();
  for (const group of data.groups) {
    boxes.set(group.id, {
      group,
      members: data.people.filter((person) => home.get(person.id)?.id === group.id),
      children: [],
      column: 0,
      row: 0,
      columns: 0,
      rows: 0,
      slots: [],
    });
  }

  /* 親子を繋ぐ。親が見つからない子は根として扱う */
  const roots: FloorBox[] = [];
  for (const group of data.groups) {
    const box = boxes.get(group.id)!;
    const parent = group.parentGroupId ? boxes.get(group.parentGroupId) : undefined;
    if (parent && parent !== box) parent.children.push(box);
    else roots.push(box);
  }

  /* 持ち場の無い人（札しか持たない人・所属の無い人）はまとめて 1 つの区画にする */
  const homeless = data.people.filter((person) => !home.get(person.id));
  if (homeless.length > 0) {
    roots.push({
      group: null,
      members: homeless,
      children: [],
      column: 0,
      row: 0,
      columns: 0,
      rows: 0,
      slots: [],
    });
  }

  /* 中身の無い区画は置かない（線も囲いも出ないので、空きになるだけ） */
  const used = roots.filter((box) => countMembers(box) > 0);
  for (const box of used) layoutBox(box);
  const placed = orderBoxes(used, data, hubs);
  shelfPack(placed.order, placed.targetColumns);

  const placements: PersonPlacement[] = [];
  for (const box of used) emitBox(box, 0, 0, placements);
  refineSlots(used, placements, data, hubs);
  return placements;
}

/**
 * 区画を置く順を決める。
 *
 * 基盤の設計でいう「フロアプラン」。部品をどこに置くかで配線の総距離が決まるので、
 * 人を動かすのではなく区画の並びを直して線を短くする。
 *
 * まず、区画と区画のあいだに何本の線が渡るか（つながりの重さ）を数える。
 * つぎに、2 つの区画の場所を入れ替えてみて総距離が縮むなら採る、を繰り返す。
 * 縮まなくなったら終わり。試す順は決まっているので、結果は毎回同じになる。
 */
function orderBoxes(
  boxes: FloorBox[],
  data: RelationshipData,
  hubs: AffiliationHub[],
): { order: FloorBox[]; targetColumns: number } {
  if (boxes.length < 2) return { order: boxes, targetColumns: FLOORPLAN.minColumns };

  /* 誰がどの区画にいるか */
  const boxOf = new Map<string, FloorBox>();
  const walk = (box: FloorBox, root: FloorBox) => {
    for (const person of box.members) boxOf.set(person.id, root);
    for (const child of box.children) walk(child, root);
  };
  for (const box of boxes) walk(box, box);

  /* 区画と区画のあいだに渡る線の本数。関係線も所属の線も 1 本は 1 本として数える */
  const weights = new Map<string, number>();
  const indexOf = new Map(boxes.map((box, index) => [box, index] as const));
  const connect = (a: string, b: string, weight: number) => {
    const left = boxOf.get(a);
    const right = boxOf.get(b);
    if (!left || !right || left === right) return;
    const i = indexOf.get(left)!;
    const j = indexOf.get(right)!;
    const key = i < j ? `${i}:${j}` : `${j}:${i}`;
    weights.set(key, (weights.get(key) ?? 0) + weight);
  };
  /*
   * はっきり書かれた関係を、所属から導いた線より重く見る。
   * 所属の線は 92 本、関係線は 26 本しかないので、同じ重さで数えると
   * 関係線の都合が所属の線に押し切られて、実際の関係が図を横切ってしまう。
   */
  for (const relation of data.relations) {
    connect(relation.source, relation.target, FLOORPLAN.relationWeight);
  }
  for (const hub of hubs) {
    for (const memberId of hub.memberIds) connect(hub.hubId, memberId, 1);
  }

  const links = [...weights.entries()].map(([key, weight]) => {
    const [i, j] = key.split(':').map(Number);
    return { i, j, weight };
  });

  /*
   * はっきり書かれた関係が渡る区画の組。総距離とは別に、この中の
   * いちばん長いものも短くする。総距離だけを縮めると、多くの線を少し
   * 縮める代わりに 1 本が図を突っ切る形が選ばれてしまう。
   */
  const relationLinks = new Set<string>();
  for (const relation of data.relations) {
    const left = boxOf.get(relation.source);
    const right = boxOf.get(relation.target);
    if (!left || !right || left === right) continue;
    const i = indexOf.get(left)!;
    const j = indexOf.get(right)!;
    relationLinks.add(i < j ? `${i}:${j}` : `${j}:${i}`);
  }

  /**
   * その並びの良さ。小さいほど良い。
   *
   * 配線の総距離を図の大きさ（縦 + 横）で割り、縦横の偏りで重みを付ける。
   *
   * 距離だけを見ると、図を細長く広げて距離を稼いだ並びと詰まった並びの
   * 区別が付かないので、図の大きさで割る。ただし割るだけだと、今度は
   * 縦一列に積んで「大きさ」を稼ぐほうが得になってしまう（実際に
   * 584×5108 の帯になった）。画面に収まるのは正方形に近い形なので、
   * 縦横が偏るほど点数を悪くする。
   */
  const cost = (order: FloorBox[], targetColumns: number): number => {
    shelfPack(order, targetColumns);
    const center = new Map(
      order.map((box) => [
        indexOf.get(box)!,
        { x: box.column + box.columns / 2, y: box.row + box.rows / 2 },
      ]),
    );

    let width = 0;
    let height = 0;
    for (const box of order) {
      width = Math.max(width, box.column + box.columns);
      height = Math.max(height, box.row + box.rows);
    }

    let total = 0;
    let longest = 0;
    for (const link of links) {
      const a = center.get(link.i)!;
      const b = center.get(link.j)!;
      const distance = Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
      total += link.weight * distance;
      if (relationLinks.has(link.i < link.j ? `${link.i}:${link.j}` : `${link.j}:${link.i}`)) {
        longest = Math.max(longest, distance);
      }
    }
    /* 本数を掛けて、総距離と釣り合う大きさにしてから足す */
    total += FLOORPLAN.longestWeight * links.length * longest;

    /* 正方形なら 1、細長いほど大きくなる */
    const aspect = Math.max(width, height) / Math.max(1, Math.min(width, height));
    const penalty = 1 + FLOORPLAN.aspectWeight * (aspect - 1);
    return (total / Math.max(1, width + height)) * penalty;
  };

  /* 出発点は、人数の多い区画から。同数なら名前順にして毎回同じ並びから始める */
  const start = [...boxes].sort(
    (a, b) => countMembers(b) - countMembers(a) || (a.group?.name ?? '').localeCompare(b.group?.name ?? '', 'ja'),
  );

  /** ある折り返し幅で、並びをできるだけ良くする。 */
  const improve = (targetColumns: number): { order: FloorBox[]; score: number } => {
    let order = [...start];
    let best = cost(order, targetColumns);

    for (let pass = 0; pass < FLOORPLAN.swapPasses; pass += 1) {
      let improved = false;
      for (let i = 0; i < order.length; i += 1) {
        for (let j = 0; j < order.length; j += 1) {
          if (i === j) continue;

          /* 入れ替えと、抜いて差し込み直しの両方を試す。
             棚積みでは差し込みのほうが後ろの区画をまとめてずらせるので、
             入れ替えだけでは届かない並びに届く */
          const swapped = [...order];
          [swapped[i], swapped[j]] = [swapped[j], swapped[i]];

          const moved = [...order];
          moved.splice(j, 0, moved.splice(i, 1)[0]);

          for (const candidate of [swapped, moved]) {
            const score = cost(candidate, targetColumns);
            if (score < best) {
              best = score;
              order = candidate;
              improved = true;
            }
          }
        }
      }
      if (!improved) break;
    }
    return { order, score: best };
  };

  /*
   * 折り返す幅も探す。
   *
   * 幅を決め打ちにすると、人が 1 人増えただけで並びが別の形に落ち着き、
   * 線の長さが大きく振れる（実際、uobaa の所属を直しただけで
   * 関係線の長い線が 0 → 6 本になった）。幅を手で決め直すのは続かないので、
   * いくつかの幅で並べてみて、いちばん良かったものを採る。
   *
   * 幅の範囲は中身の広さから出す。中身がほぼ正方形に収まる幅を真ん中にして、
   * 細長いほうと平たいほうへ広げる。
   */
  const area = boxes.reduce((sum, box) => sum + box.columns * box.rows, 0);
  const square = Math.max(FLOORPLAN.minColumns, Math.ceil(Math.sqrt(area)));
  const widest = Math.max(...boxes.map((box) => box.columns));

  let bestOrder = start;
  let bestScore = Number.POSITIVE_INFINITY;
  let bestColumns = square;

  for (let step = -FLOORPLAN.widthSteps; step <= FLOORPLAN.widthSteps; step += 1) {
    const targetColumns = Math.max(widest, square + step * FLOORPLAN.widthStep);
    const result = improve(targetColumns);
    if (result.score < bestScore) {
      bestScore = result.score;
      bestOrder = result.order;
      bestColumns = targetColumns;
    }
  }

  /* 試した並びで column / row が書き換わっているので、採用した並びと幅で置き直す */
  cost(bestOrder, bestColumns);
  return { order: bestOrder, targetColumns: bestColumns };
}

/**
 * 区画の中で人を入れ替えて、線をさらに短くする。
 *
 * 区画の並べ替えは区画の中心どうしの距離しか見ていないので、
 * 同じ区画の中で「相手が遠いほうにいる人」が反対の隅に座ることがある。
 * その 1 本が図を突っ切って見える。
 *
 * 升目そのものは動かさず、誰がどの升目に座るかだけを入れ替える。
 * 区画の形も並びも変わらないまま、線だけが短くなる。
 */
function refineSlots(
  boxes: FloorBox[],
  placements: PersonPlacement[],
  data: RelationshipData,
  hubs: AffiliationHub[],
): void {
  const byId = new Map(placements.map((placement) => [placement.person.id, placement]));

  /**
   * 誰と誰を近くに置きたいか。
   *
   * 線で繋がっている相手（関係線・所属の線）に加えて、同じ所属の人どうしも
   * 引き寄せる。所属の線は親から放射状に出るだけなので、線だけを見ていると
   * 「同じ所属だが親ではない人」どうしが離れたままになる
   * （S塾 の 10 人が図の 63% に散らばっていた）。
   */
  const neighbours = new Map<string, Array<{ id: string; weight: number }>>();
  const link = (a: string, b: string, weight: number) => {
    if (!byId.has(a) || !byId.has(b)) return;
    neighbours.set(a, [...(neighbours.get(a) ?? []), { id: b, weight }]);
    neighbours.set(b, [...(neighbours.get(b) ?? []), { id: a, weight }]);
  };
  for (const relation of data.relations) {
    link(relation.source, relation.target, FLOORPLAN.relationWeight);
  }
  for (const hub of hubs) {
    for (const memberId of hub.memberIds) link(hub.hubId, memberId, 1);
  }

  /* 同じ所属どうしを引き寄せる。人数の多い所属ほど 1 組あたりは軽くして、
     大きな所属が全部を引きずらないようにする */
  for (const { memberIds, hubId } of hubs) {
    const members = [hubId, ...memberIds];
    const weight = FLOORPLAN.groupCohesion / Math.max(1, members.length - 1);
    for (let i = 0; i < members.length; i += 1) {
      for (let j = i + 1; j < members.length; j += 1) link(members[i], members[j], weight);
    }
  }

  /** その人から出ている線の長さの合計。 */
  const wireLength = (id: string): number => {
    const place = byId.get(id);
    if (!place) return 0;
    let total = 0;
    for (const other of neighbours.get(id) ?? []) {
      const target = byId.get(other.id);
      if (!target) continue;
      total += other.weight * (Math.abs(place.x - target.x) + Math.abs(place.y - target.y));
    }
    return total;
  };

  /* 同じ区画にいる人だけを入れ替える。区画をまたぐと囲いが崩れる */
  const groups: PersonPlacement[][] = [];
  const collect = (box: FloorBox) => {
    const members = box.slots
      .map((slot) => byId.get(slot.person.id))
      .filter((place): place is PersonPlacement => Boolean(place));
    if (members.length > 1) groups.push(members);
    for (const child of box.children) collect(child);
  };
  for (const box of boxes) collect(box);

  for (const members of groups) {
    for (let pass = 0; pass < FLOORPLAN.slotPasses; pass += 1) {
      let improved = false;
      for (let i = 0; i < members.length; i += 1) {
        for (let j = i + 1; j < members.length; j += 1) {
          const a = members[i];
          const b = members[j];
          const before = wireLength(a.person.id) + wireLength(b.person.id);

          [a.x, b.x] = [b.x, a.x];
          [a.y, b.y] = [b.y, a.y];
          const after = wireLength(a.person.id) + wireLength(b.person.id);

          if (after < before) {
            improved = true;
            continue;
          }
          /* 縮まなかったので戻す */
          [a.x, b.x] = [b.x, a.x];
          [a.y, b.y] = [b.y, a.y];
        }
      }
      if (!improved) break;
    }
  }
}

function countMembers(box: FloorBox): number {
  return box.members.length + box.children.reduce((sum, child) => sum + countMembers(child), 0);
}

function clusteredPlacements(data: RelationshipData): PersonPlacement[] {
  /* 所属のある人はクラスタとして配置し、所属の無い人は後から相手のそばへ置く */
  const affiliated = data.people.filter((person) => person.attributes.length > 0);
  const clusters = orderClusters(buildClusters(affiliated), data.relations);
  const placements = placePeople(packBlocks(buildBlocks(clusters, data.groups, data.relations)));
  relaxGroupClusters(placements, data.groups, data.relations, affiliationHubs(data));
  return placements;
}

function relaxClusterHybrid(placements: PersonPlacement[], relations: Relation[]): void {
  const anchors = placementMap(placements);
  const linked = new Set(relations.map((relation) => relationKey(relation.source, relation.target)));

  for (let iteration = 0; iteration < 72; iteration += 1) {
    const cooling = 1 - iteration / 72;
    const delta = new Map(placements.map((placement) => [placement.person.id, { x: 0, y: 0 }]));
    const byId = new Map(placements.map((placement) => [placement.person.id, placement]));

    for (const relation of relations) {
      const a = byId.get(relation.source);
      const b = byId.get(relation.target);
      if (!a || !b) continue;
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      const distance = Math.max(1, Math.hypot(dx, dy));
      const desired = NODE.gapX * 1.15;
      const force = (distance - desired) * 0.026 * cooling;
      const x = (dx / distance) * force;
      const y = (dy / distance) * force;
      delta.get(a.person.id)!.x -= x;
      delta.get(a.person.id)!.y -= y;
      delta.get(b.person.id)!.x += x;
      delta.get(b.person.id)!.y += y;
    }

    for (let i = 0; i < placements.length; i += 1) {
      for (let j = i + 1; j < placements.length; j += 1) {
        const a = placements[i];
        const b = placements[j];
        if (linked.has(relationKey(a.person.id, b.person.id))) continue;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distance = Math.max(1, Math.hypot(dx, dy));
        if (distance >= SATELLITE.minDistance) continue;
        const force = (SATELLITE.minDistance - distance) * 0.04 * cooling;
        const x = (dx / distance) * force;
        const y = (dy / distance) * force;
        delta.get(a.person.id)!.x += x;
        delta.get(a.person.id)!.y += y;
        delta.get(b.person.id)!.x -= x;
        delta.get(b.person.id)!.y -= y;
      }
    }

    for (const placement of placements) {
      const anchor = anchors.get(placement.person.id);
      const move = delta.get(placement.person.id)!;
      if (anchor && placement.person.attributes.length > 0) {
        move.x += (anchor.x - placement.x) * 0.018;
        move.y += (anchor.y - placement.y) * 0.018;
      }
      placement.x += Math.max(-18, Math.min(18, move.x));
      placement.y += Math.max(-18, Math.min(18, move.y));
    }
  }
}

function placeClusterHybrid(data: RelationshipData): PersonPlacement[] {
  const placements = clusteredPlacements(data);
  const affiliatedIds = new Set(placements.map((placement) => placement.person.id));
  const initialRegions = enforceStrictRegions(data.groups, placements);
  const leftovers = placeSatellites(
    data.people.filter((person) => person.attributes.length === 0 && !affiliatedIds.has(person.id)),
    data.relations,
    placements,
    initialRegions,
  );
  placeLeftovers(leftovers, placements);
  relaxClusterHybrid(placements, data.relations);
  return placements;
}

function placementsFor(data: RelationshipData, mode: LayoutMode, centerId: string): PersonPlacement[] {
  if (mode === 'relationshipTree') return placeRelationshipTree(data, centerId);
  if (mode === 'floorplan') return floorplanPlacements(data);
  if (mode === 'clusterHybrid') return placeClusterHybrid(data);
  if (mode === 'community') return placeCommunity(data);
  if (mode === 'stress') return placeStress(data);
  if (mode === 'attributeRadial') return placeAttributeRadial(data);
  if (mode === 'corePeriphery') return placeCorePeriphery(data);
  if (mode === 'force') return placeForce(data);
  if (mode === 'radial') return placeRadial(data, centerId);
  if (mode === 'layered') return placeLayered(data);
  if (mode === 'circular') return placeCircular(data);
  return clusteredPlacements(data);
}

export function buildLayout(data: RelationshipData, mode: LayoutMode = 'floorplan', centerId = ''): MapLayout {
  const effectiveCenterId = centerId || data.view?.centerPersonId || data.project.defaultCenterPersonId || data.people[0]?.id || '';
  const people = placementsFor(data, mode, effectiveCenterId);
  assignGroupIds(people, data.groups);

  if (mode === 'cluster') {
    const unaffiliated = data.people.filter((person) => person.attributes.length === 0);
    const affiliatedIds = new Set(people.map((placement) => placement.person.id));

    /* 領域は所属者だけで決まるので、衛星を置く前に確定できる */
    const initialRegions = enforceStrictRegions(data.groups, people);
    const leftovers = placeSatellites(
      unaffiliated.filter((person) => !affiliatedIds.has(person.id)),
      data.relations,
      people,
      initialRegions,
    );
    placeLeftovers(leftovers, people);
  }

  /*
   * 重なりの解消は最後にまとめて行う。囲いのはみ出しを直すと人が動くので、
   * その後にもう一度離してから、動いた位置で囲いを引き直す。
   */
  /*
   * 区画で並べたときは、もう升目の上に整列していて入れ子も区画の入れ子で
   * 表せている。押し離しも整列もかけると、せっかく揃った並びが崩れる。
   */
  if (mode !== 'floorplan') {
    separateNodes(people, effectiveCenterId);
    if (mode !== 'relationshipTree') enforceStrictRegions(data.groups, people);
    separateNodes(people, effectiveCenterId);
    /* 整列は最後。ここで動かす量は交点 1 つぶん以内なので、囲いの入れ子は崩れない */
    alignToGrid(people);
  }
  const regions = buildRegions(data.groups, people);
  const { width, height } = normalize(people, regions);
  const byId = new Map(people.map((placement) => [placement.person.id, placement]));

  /* 配線のずらしは関係線と所属の線をまとめて決める。別々に決めると互いに重なる */
  const edges = buildEdges(data.relations, byId);
  const affiliationEdges = buildAffiliationEdges(data, byId);
  assignEdgeChannels([...edges, ...affiliationEdges]);

  return { width, height, people, regions, edges, affiliationEdges, byId };
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

  const regions = enforceStrictRegions(
    layout.regions.map((region) => region.group),
    people,
  )
    .map((region) => {
      const points = region.memberIds
        .map((id) => byId.get(id))
        .filter((placement): placement is PersonPlacement => placement !== undefined)
        .map((placement) => ({ x: placement.x, y: placement.y }));
      const polygon = regionPolygon(points, regionPadding(region.group.type));
      return { ...region, polygon, area: polygonArea(polygon) };
    })
    .sort((a, b) => b.area - a.area);

  const edges = layout.edges.map((edge) => {
    const from = byId.get(edge.relation.source);
    const to = byId.get(edge.relation.target);
    if (!from || !to) return edge;
    return {
      relation: edge.relation,
      from: { x: from.x, y: from.y },
      to: { x: to.x, y: to.y },
      channelOffset: 0,
    };
  });

  const affiliationEdges = layout.affiliationEdges.map((edge) => {
    const from = byId.get(edge.hubId);
    const to = byId.get(edge.memberId);
    if (!from || !to) return edge;
    return {
      ...edge,
      from: { x: from.x, y: from.y },
      to: { x: to.x, y: to.y },
      channelOffset: 0,
    };
  });

  /* 人を動かすと折り返す位置も変わるので、配線のずらし方を決め直す */
  assignEdgeChannels([...edges, ...affiliationEdges]);

  return { ...layout, people, byId, regions, edges, affiliationEdges };
}

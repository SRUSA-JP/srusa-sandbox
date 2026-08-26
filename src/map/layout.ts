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
  GROUP_RELAX,
  groupTypeSetting,
  NODE,
  REGION,
  SATELLITE,
  SEPARATION,
  UNASSIGNED,
  type LayoutMode,
} from './config';
import { centroid, enclosingPolygon, pointInPolygon, polygonArea, type Point } from './geometry';
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
  /**
   * 折り返す位置をずらす量（座標単位）。
   *
   * 同じ場所で折り返す線どうしが 1 本に見えないよう、隣り合わせて走らせる。
   */
  channelOffset: number;
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
 * 配線が重ならないように、折り返す位置をずらす。
 *
 * 縦横だけで繋ぐと、どの線も中点で折り返すので、近くを走る線どうしが
 * 同じ列（または行）に乗って 1 本に見えてしまう。基盤の配線が隣り合って
 * 走るように、同じ折り返し位置になる線を見つけて少しずつ横へずらす。
 *
 * ずらす順は 0 → +1 → -1 → +2 … と中心から交互に広げる。
 * 並び順は関係の並びで決まるので、何度作り直しても同じ配線になる。
 */
function assignEdgeChannels(edges: EdgePlacement[]): void {
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

  assignEdgeChannels(edges);
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

function clusteredPlacements(data: RelationshipData): PersonPlacement[] {
  /* 所属のある人はクラスタとして配置し、所属の無い人は後から相手のそばへ置く */
  const affiliated = data.people.filter((person) => person.attributes.length > 0);
  const clusters = orderClusters(buildClusters(affiliated), data.relations);
  const placements = placePeople(packBlocks(buildBlocks(clusters, data.groups, data.relations)));
  relaxGroupClusters(placements, data.groups, data.relations);
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

export function buildLayout(data: RelationshipData, mode: LayoutMode = 'cluster', centerId = ''): MapLayout {
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
  separateNodes(people, effectiveCenterId);
  enforceStrictRegions(data.groups, people);
  separateNodes(people, effectiveCenterId);
  const regions = buildRegions(data.groups, people);
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

  const regions = enforceStrictRegions(
    layout.regions.map((region) => region.group),
    people,
  )
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
    return {
      relation: edge.relation,
      from: { x: from.x, y: from.y },
      to: { x: to.x, y: to.y },
      channelOffset: 0,
    };
  });
  /* 人を動かすと折り返す位置も変わるので、配線のずらし方を決め直す */
  assignEdgeChannels(edges);

  return { ...layout, people, byId, regions, edges };
}

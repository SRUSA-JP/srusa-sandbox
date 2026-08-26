/**
 * 相関図が「読める形」になっているかを検査する。
 *
 * 配置は緩和計算で決まるので、設定を少し変えただけで静かに崩れる。
 * 画面を見れば分かる崩れ方だが、気づかないまま入ってしまうのがこの 4 つ。
 *
 * - 重なり: 人のアイコン同士が重なっていないか
 * - 入れ子: 親を持つ所属（研究室 ⊂ 大学、部活 ⊂ 高校）が親の中に入っているか
 * - 関係線: 図を横切る長い線が増えていないか
 * - 所属の線: 所属を持つ人が全員どこかに繋がっているか
 * - 整列:   人が格子に載っていて、配線の向きが揃っているか
 * - 囲い:   領域が広がりすぎて、どの所属がどこか読めなくなっていないか
 *
 * しきい値は「いま通っている値」より少しゆるめに置く。ここを緩めないと
 * 直せない変更をするときは、しきい値ではなく配置のほうを見直すこと。
 */
import { readFileSync } from 'node:fs';
import { EDGE, GRID, NODE, SEPARATION } from '../src/map/config';
import { manhattanPath, pointInPolygon } from '../src/map/geometry';
import { buildLayout } from '../src/map/layout';
import { parseRelationshipData } from '../src/map/parse';
import type { Group } from '../src/map/schema';

type Finding = { target: string; rule: string; detail: string };

const findings: Finding[] = [];

function fail(target: string, rule: string, detail: string) {
  findings.push({ target, rule, detail });
}

/** 関係線の長さの上限（図の対角線に対する割合）。これを超えると図を横切って見える。 */
const MAX_EDGE_RATIO = 0.4;

/**
 * 図を横切る長さの線を、何本まで許すか。
 *
 * いまは 1 本。関係線の引き寄せを切ると 3 本まで増えるので、
 * その手前で止まるように 2 本にしている。
 */
const MAX_LONG_EDGES = 2;

/**
 * 整列できている人の割合の下限。
 *
 * 同じ列（または行）に他の人がいる人の割合。基盤や路線図のように見えるのは
 * 線の端が揃っているからで、揃っていないと縦横に引いても向きがばらける。
 * 格子に載っていれば座標がぴったり一致するので、整列を外すと一気に落ちる。
 */
const MIN_ALIGNED_RATIO = 0.8;

/**
 * 所属の線の長さの平均の上限（対角線に対する割合）。
 *
 * 本数ではなく平均で測る。長い線の本数は、配置が崩れて図が広がると
 * かえって減ることがあり（対角線も伸びるため）、崩れの目印にならない。
 * いまは 16%。親への引き寄せを外すと 21% まで伸びるので、その手前に置く。
 */
const MAX_AFFILIATION_MEAN = 0.19;

/** 領域が図に占める割合の合計（重なりを含む）。大きいほど囲いが広がっている。 */
const MAX_REGION_COVERAGE = 1.6;

const raw = JSON.parse(readFileSync('data/srusa-relationship-v0.2.json', 'utf8'));
const parsed = parseRelationshipData(raw);
const data = parsed.data;
const layout = buildLayout(data, 'cluster', '');
const diagonal = Math.hypot(layout.width, layout.height);
const canvas = layout.width * layout.height;
/* 関係線と所属の線は同じ折り返しの列を取り合うので、配線の検査はまとめて行う */
const wires = [...layout.edges, ...layout.affiliationEdges];

/* ------------------------------------------------------------------ *
 * 重なり
 * ------------------------------------------------------------------ */

function radiusOf(personId: string): number {
  const isCenter = personId === data.project.defaultCenterPersonId;
  return (isCenter ? NODE.size * NODE.centerScale : NODE.size) / 2;
}

function checkOverlap() {
  const people = layout.people;
  let worst = { pair: '', gap: Infinity };
  let overlaps = 0;

  /*
   * アイコンは四角なので、中心の距離ではなく縦横のすきまで見る。
   * 円のつもりで測ると、角どうしが重なっているのを見落とす。
   */
  for (let i = 0; i < people.length; i += 1) {
    for (let j = i + 1; j < people.length; j += 1) {
      const a = people[i];
      const b = people[j];
      const need = radiusOf(a.person.id) + radiusOf(b.person.id);
      const gapX = Math.abs(a.x - b.x) - need;
      const gapY = Math.abs(a.y - b.y) - need;
      /* 四角どうしは、縦か横のどちらかが離れていれば重ならない */
      const gap = Math.max(gapX, gapY);
      if (gap < 0) overlaps += 1;
      if (gap < worst.gap) worst = { pair: `${a.person.onlineName} / ${b.person.onlineName}`, gap };
    }
  }

  if (overlaps > 0) {
    fail('人のノード', '重なり', `${overlaps} 組が重なっています（最悪 ${worst.pair} で ${worst.gap.toFixed(1)}px）`);
    return;
  }
  console.log(`OK  重なり 0 組（いちばん近い ${worst.pair} で ${worst.gap.toFixed(1)}px 空き / 下限 ${SEPARATION.padding}px）`);
}

/* ------------------------------------------------------------------ *
 * 入れ子（parentGroupId が指す親の中に入っているか）
 * ------------------------------------------------------------------ */

function checkNesting() {
  const byId = new Map(data.groups.map((group) => [group.id, group]));
  const regionOf = (group: Group) => layout.regions.find((region) => region.group.id === group.id);

  for (const child of data.groups) {
    if (!child.parentGroupId) continue;
    const parent = byId.get(child.parentGroupId);
    if (!parent) continue;

    const childRegion = regionOf(child);
    const parentRegion = regionOf(parent);
    if (!childRegion || !parentRegion) continue;

    const outside = childRegion.memberIds.filter((id) => {
      const place = layout.byId.get(id);
      return place && !pointInPolygon({ x: place.x, y: place.y }, parentRegion.polygon);
    });

    if (outside.length > 0) {
      const names = outside.map((id) => layout.byId.get(id)?.person.onlineName ?? id);
      fail(
        `${child.name} ⊂ ${parent.name}`,
        '入れ子',
        `${outside.length} 人が ${parent.name} の外にいます（${names.join(', ')}）`,
      );
      continue;
    }
    console.log(`OK  ${child.name} の ${childRegion.memberIds.length} 人が ${parent.name} の中`);
  }
}

/* ------------------------------------------------------------------ *
 * 関係線の長さ
 * ------------------------------------------------------------------ */

function checkEdges() {
  const lengths = layout.edges.map((edge) => Math.hypot(edge.to.x - edge.from.x, edge.to.y - edge.from.y));
  if (lengths.length === 0) return;

  const long = lengths.filter((value) => value / diagonal > MAX_EDGE_RATIO);
  const longest = Math.max(...lengths) / diagonal;
  const mean = lengths.reduce((sum, value) => sum + value, 0) / lengths.length / diagonal;

  if (long.length > MAX_LONG_EDGES) {
    fail(
      '関係線',
      '長すぎ',
      `対角線の ${(MAX_EDGE_RATIO * 100).toFixed(0)}% を超える線が ${long.length} 本（上限 ${MAX_LONG_EDGES} 本）`,
    );
    return;
  }
  console.log(
    `OK  関係線 ${lengths.length} 本 平均 ${(mean * 100).toFixed(1)}% / 最長 ${(longest * 100).toFixed(1)}%（長い線 ${long.length} 本）`,
  );
}

/* ------------------------------------------------------------------ *
 * 配線が縦横だけになっているか
 * ------------------------------------------------------------------ */

/** 直線の縦横判定に使う許容誤差（座標を丸めるので、ぴったり 0 にはならない）。 */
const AXIS_TOLERANCE = 0.51;

function checkWiring() {
  /* 角を丸めていると曲線が混ざるので、そのときは判定しない */
  if (EDGE.elbow > 0) {
    console.log(`SKIP 配線の向き（角を丸めているため / EDGE.elbow = ${EDGE.elbow}）`);
    return;
  }

  let diagonal = 0;
  let segments = 0;

  for (const edge of wires) {
    const path = manhattanPath(edge.from, edge.to, EDGE.elbow, edge.channelOffset);
    const points = path
      .replace(/^M /, '')
      .split(' L ')
      .map((pair) => pair.trim().split(/\s+/).map(Number));

    for (let i = 1; i < points.length; i += 1) {
      const [x1, y1] = points[i - 1];
      const [x2, y2] = points[i];
      const dx = Math.abs(x2 - x1);
      const dy = Math.abs(y2 - y1);
      if (dx < AXIS_TOLERANCE || dy < AXIS_TOLERANCE) {
        segments += 1;
        continue;
      }
      diagonal += 1;
      segments += 1;
    }
  }

  if (diagonal > 0) {
    fail('関係線', '斜め', `縦にも横にも沿っていない線分が ${diagonal} 本あります（全 ${segments} 本）`);
    return;
  }
  console.log(`OK  配線は縦横だけ（${wires.length} 本 / 線分 ${segments} 本）`);
}

/**
 * 折り返す位置が重なっていないか。
 *
 * 同じ列（行）で折り返す線どうしは 1 本に見えてしまう。
 * 隣り合わせてずらせているかを確かめる。
 */
function checkChannels() {
  const lanes = new Map<string, number>();
  let shared = 0;

  for (const edge of wires) {
    const horizontal = Math.abs(edge.to.x - edge.from.x) >= Math.abs(edge.to.y - edge.from.y);
    const middle = horizontal ? (edge.from.x + edge.to.x) / 2 : (edge.from.y + edge.to.y) / 2;
    /* 実際に描かれる折り返し位置（ずらしたあと） */
    const lane = `${horizontal ? 'x' : 'y'}:${Math.round((middle + edge.channelOffset) / EDGE.channelGap)}`;
    const count = (lanes.get(lane) ?? 0) + 1;
    lanes.set(lane, count);
    if (count > 1) shared += 1;
  }

  if (shared > 0) {
    fail('配線', '配線の重なり', `${shared} 本が他の線と同じ位置で折り返しています`);
    return;
  }
  console.log(`OK  配線の折り返しは全て別の位置（${lanes.size} 通り / 間隔 ${EDGE.channelGap}）`);
}

/* ------------------------------------------------------------------ *
 * 所属から引いた線
 * ------------------------------------------------------------------ */

/**
 * 所属を持つ人が、全員どこかに繋がっているか。
 *
 * 相関図の目的は「誰と誰が繋がっているか」を見せることなので、
 * 所属があるのに線が 1 本も出ていない人がいると、その人だけ図から浮く。
 * 明示的な関係が書かれていない人（nodoame など）を拾うのがこの検査の役目。
 */
function checkAffiliationEdges() {
  /* 所属者が 1 人だけのグループは、どう繋いでも相手がいない。繋げる対象から外す */
  const memberCount = new Map(
    data.groups.map((group) => [
      group.name,
      data.people.filter((person) => person.attributes.includes(group.name)).length,
    ]),
  );
  const groupNames = new Set(
    data.groups.map((group) => group.name).filter((name) => (memberCount.get(name) ?? 0) >= 2),
  );
  const connected = new Set<string>();
  for (const edge of layout.affiliationEdges) {
    connected.add(edge.hubId);
    connected.add(edge.memberId);
  }
  for (const edge of layout.edges) {
    connected.add(edge.relation.source);
    connected.add(edge.relation.target);
  }

  const isolated = data.people.filter(
    (person) =>
      person.attributes.some((name) => groupNames.has(name)) && !connected.has(person.id),
  );

  if (isolated.length > 0) {
    fail(
      '所属の線',
      '繋がらない人',
      `所属があるのに線が 1 本も出ていない人が ${isolated.length} 人（${isolated.slice(0, 3).map((person) => person.onlineName).join(', ')}）`,
    );
    return;
  }

  /* 線がいちばん集まる人（親）を出しておく。図の読み方が変わったときに気づける */
  const degree = new Map<string, number>();
  for (const edge of layout.affiliationEdges) {
    degree.set(edge.hubId, (degree.get(edge.hubId) ?? 0) + 1);
    degree.set(edge.memberId, (degree.get(edge.memberId) ?? 0) + 1);
  }
  const top = [...degree.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id, count]) => `${layout.byId.get(id)?.person.onlineName ?? id} ${count}本`);

  /*
   * 誰とも所属を共有していない人。データ側の穴なので、ここでは落とさずに数だけ出す。
   * 所属を足せば自動で線が繋がるので、増えていないかを見るための目印。
   */
  const alone = data.people.filter(
    (person) =>
      !connected.has(person.id) &&
      person.attributes.some((name) => memberCount.has(name)),
  );

  console.log(
    `OK  所属の線 ${layout.affiliationEdges.length} 本 / 繋がらない人 0 人（集まる順: ${top.join(', ')}）`,
  );
  if (alone.length > 0) {
    console.log(
      `    参考: 所属を共有する相手がいない人 ${alone.length} 人（${alone.map((person) => person.onlineName).join(', ')}）`,
    );
  }
}

/* ------------------------------------------------------------------ *
 * 整列
 * ------------------------------------------------------------------ */

/**
 * 人が格子の交点に載って、縦横に整列しているか。
 *
 * 配線を縦横だけに限っても、線の端（＝人）の座標がばらばらだと
 * どの線も違う行・列を走り、基盤や路線図の「揃った」見え方にならない。
 * 同じ列か行に他の人がいる割合で、整列できているかを測る。
 */
function checkAlignment() {
  /*
   * 座標そのものが一致するかで測る。近い値を同じ列として丸めてしまうと、
   * 整列していない座標でも同じ枠に入って「揃っている」ことになり、検査にならない。
   */
  const columns = new Map<number, number>();
  const rows = new Map<number, number>();
  for (const placement of layout.people) {
    columns.set(placement.x, (columns.get(placement.x) ?? 0) + 1);
    rows.set(placement.y, (rows.get(placement.y) ?? 0) + 1);
  }

  const aligned = layout.people.filter(
    (placement) => (columns.get(placement.x) ?? 0) > 1 || (rows.get(placement.y) ?? 0) > 1,
  ).length;
  const ratio = aligned / layout.people.length;

  if (ratio < MIN_ALIGNED_RATIO) {
    fail(
      '配置',
      '整列していない',
      `他の人と列も行も揃っていない人が ${layout.people.length - aligned} 人（揃い ${(ratio * 100).toFixed(0)}% / 下限 ${(MIN_ALIGNED_RATIO * 100).toFixed(0)}%）`,
    );
    return;
  }
  console.log(
    `OK  整列 ${(ratio * 100).toFixed(0)}%（${columns.size} 列 / ${rows.size} 行 に ${layout.people.length} 人 / 間隔 ${GRID.cell}）`,
  );
}

/** 所属の線が図を横切りすぎていないか。親の周りに集まっていれば短く収まる。 */
function checkAffiliationLength() {
  const lengths = layout.affiliationEdges.map((edge) =>
    Math.hypot(edge.to.x - edge.from.x, edge.to.y - edge.from.y),
  );
  if (lengths.length === 0) return;

  const mean = lengths.reduce((sum, value) => sum + value, 0) / lengths.length / diagonal;

  if (mean > MAX_AFFILIATION_MEAN) {
    fail(
      '所属の線',
      '長すぎ',
      `長さの平均が対角線の ${(mean * 100).toFixed(1)}%（上限 ${(MAX_AFFILIATION_MEAN * 100).toFixed(0)}%）。親の周りに集まっていません`,
    );
    return;
  }
  console.log(
    `OK  所属の線の長さ 平均 ${(mean * 100).toFixed(1)}%（上限 ${(MAX_AFFILIATION_MEAN * 100).toFixed(0)}%）`,
  );
}

/* ------------------------------------------------------------------ *
 * 囲いの広がり
 * ------------------------------------------------------------------ */

function checkRegions() {
  const coverage = layout.regions.reduce((sum, region) => sum + region.area / canvas, 0);
  if (coverage > MAX_REGION_COVERAGE) {
    const worst = [...layout.regions]
      .sort((a, b) => b.area - a.area)
      .slice(0, 3)
      .map((region) => `${region.group.name} ${((region.area / canvas) * 100).toFixed(0)}%`);
    fail(
      '所属の囲い',
      '広がりすぎ',
      `占有率の合計 ${(coverage * 100).toFixed(0)}%（上限 ${(MAX_REGION_COVERAGE * 100).toFixed(0)}%）。広い順: ${worst.join(', ')}`,
    );
    return;
  }
  console.log(`OK  囲いの占有率の合計 ${(coverage * 100).toFixed(0)}%（上限 ${(MAX_REGION_COVERAGE * 100).toFixed(0)}%）`);
}

/* ------------------------------------------------------------------ *
 * データそのものの不整合
 * ------------------------------------------------------------------ */

function checkData() {
  if (parsed.issues.length > 0) {
    fail('相関図のデータ', '不整合', parsed.issues.slice(0, 3).join(' / '));
    return;
  }
  console.log(`OK  データの不整合 0 件（${data.people.length} 人 / ${data.groups.length} グループ / ${data.relations.length} 関係）`);
}

checkData();
checkOverlap();
checkNesting();
checkEdges();
checkAffiliationEdges();
checkAffiliationLength();
checkAlignment();
checkWiring();
checkChannels();
checkRegions();

if (findings.length === 0) {
  console.log('相関図の検査はすべて通りました');
  process.exit(0);
}

for (const finding of findings) {
  console.log(`NG  ${finding.target} [${finding.rule}] ${finding.detail}`);
}
console.log(`\n未達: ${findings.length} 件`);
process.exit(1);

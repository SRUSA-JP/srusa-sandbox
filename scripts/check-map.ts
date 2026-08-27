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
import { skinnedFontSize } from '../src/config/skins';
import { groupTypeSetting } from '../src/map/config';
import { manhattanPath } from '../src/map/geometry';
import { affiliationEdgeStyle, nodeRingColors } from '../src/map/display';
import { activeSkin } from '../src/config/skins';
import { buildTheme } from '../src/theme/useThemeMode';
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

/** 子の囲いが親からはみ出してよい量（座標を丸めるぶん）。 */
const NESTING_TOLERANCE = 1;

/**
 * 同じ所属の人が、図のどこまで散らばってよいか（対角線に対する割合）。
 *
 * いまは S塾 の 45% がいちばん広い。所属が重なっている人はどちらか 1 か所に
 * しか置けないので 0 にはできない。持ち場の決め方を「所属者の多いほう」から
 * 「少ないほう」に変えると 78% まで広がるので、その手前に置く。
 */
const MAX_GROUP_SPREAD = 0.55;

/** 区画の縦横の比の上限。これを超えると帯に見える。 */
const MAX_BLOCK_RATIO = 4;

/** 区画の形を見る、いちばん少ない人数。2〜3 人はどう並べても細長い。 */
const MIN_BLOCK_MEMBERS = 4;

/**
 * 所属の線の長さの平均の上限（対角線に対する割合）。
 *
 * 本数ではなく平均で測る。長い線の本数は、配置が崩れて図が広がると
 * かえって減ることがあり（対角線も伸びるため）、崩れの目印にならない。
 *
 * いまは 15%。区画の並べ替えをやめると 29% を超えるので、その手前に置く。
 */
const MAX_AFFILIATION_MEAN = 0.19;

/** 領域が図に占める割合の合計（重なりを含む）。大きいほど囲いが広がっている。 */
const MAX_REGION_COVERAGE = 1.6;

const raw = JSON.parse(readFileSync('data/srusa-relationship-v0.2.json', 'utf8'));
const parsed = parseRelationshipData(raw);
const data = parsed.data;
const layout = buildLayout(data, 'floorplan', '');
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

/**
 * 入れ子の所属（研究室 ⊂ 大学、部活 ⊂ 高校）が、囲いごと親の中に入っているか。
 *
 * 見ている人が読み取るのは描かれた四角なので、点の位置ではなく囲いそのものが
 * 親の囲いに収まっているかを確かめる。区画で並べれば構造として入れ子になるが、
 * 余白や並べ方を変えたときに、子の囲いが親からはみ出すことがある。
 */
function checkNesting() {
  const byId = new Map(data.groups.map((group) => [group.id, group]));
  const regionOf = (group: Group) => layout.regions.find((region) => region.group.id === group.id);

  const boundsOf = (polygon: Array<{ x: number; y: number }>) => ({
    minX: Math.min(...polygon.map((point) => point.x)),
    maxX: Math.max(...polygon.map((point) => point.x)),
    minY: Math.min(...polygon.map((point) => point.y)),
    maxY: Math.max(...polygon.map((point) => point.y)),
  });

  for (const child of data.groups) {
    if (!child.parentGroupId) continue;
    const parent = byId.get(child.parentGroupId);
    if (!parent) continue;

    const childRegion = regionOf(child);
    const parentRegion = regionOf(parent);
    if (!childRegion || !parentRegion) continue;
    if (childRegion.polygon.length === 0 || parentRegion.polygon.length === 0) continue;

    const inner = boundsOf(childRegion.polygon);
    const outer = boundsOf(parentRegion.polygon);
    const overhang = Math.max(
      outer.minX - inner.minX,
      inner.maxX - outer.maxX,
      outer.minY - inner.minY,
      inner.maxY - outer.maxY,
    );

    if (overhang > NESTING_TOLERANCE) {
      fail(
        `${child.name} ⊂ ${parent.name}`,
        '入れ子',
        `囲いが ${parent.name} から ${overhang.toFixed(0)}px はみ出しています`,
      );
      continue;
    }
    console.log(`OK  ${child.name} の囲いが ${parent.name} の中（${childRegion.memberIds.length} 人）`);
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
 * 繋がれるはずなのに線が 1 本も出ていない人がいると、その人だけ図から浮く。
 *
 * 「繋がれるはず」は、名前のある場所（M大学・K高校・S塾・K社）に
 * 所属している人のこと。名前の無い段階（小学校・高校）や状態の札
 * （アクティブメンバー）しか持たない人は、そもそも線を引く根拠が無いので
 * 対象にしない。無い繋がりを描くよりは、線が無いままのほうがよい。
 */
function checkAffiliationEdges() {
  /* 所属者が 1 人だけのグループは、どう繋いでも相手がいない。繋げる対象から外す */
  const memberCount = new Map(
    data.groups.map((group) => [
      group.name,
      data.people.filter((person) => person.attributes.includes(group.name)).length,
    ]),
  );
  /* 線を引く根拠になるのは、所属者が 2 人以上いて、かつ「知り合い」を意味する所属だけ */
  const connecting = new Set(
    data.groups
      .filter((group) => groupTypeSetting(group.type).connects)
      .map((group) => group.name),
  );
  const groupNames = new Set(
    data.groups
      .map((group) => group.name)
      .filter((name) => (memberCount.get(name) ?? 0) >= 2 && connecting.has(name)),
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
  /* 札しか持っていない人。データの穴ではないので落とさず、数だけ出す */
  const alone = data.people.filter(
    (person) => !connected.has(person.id) && person.attributes.some((name) => memberCount.has(name)),
  );

  console.log(
    `OK  所属の線 ${layout.affiliationEdges.length} 本 / 繋がらない人 0 人（集まる順: ${top.join(', ')}）`,
  );
  if (alone.length > 0) {
    console.log(
      `    参考: 線を引く根拠のある所属を持たない人 ${alone.length} 人（${alone.map((person) => person.onlineName).join(', ')}）`,
    );
  }
}

/* ------------------------------------------------------------------ *
 * 所属のまとまり
 * ------------------------------------------------------------------ */

/**
 * 同じ所属の人が、図の上でも近くに集まっているか。
 *
 * 見る人は「同じ所属＝近く」で読むので、離れていると所属が読み取れない。
 *
 * 見るのは「知り合い」を意味する所属だけ（名前のある場所）。
 * 「アクティブメンバー」「小学校」のような札は、別々の場所にいる人へ
 * 横断的に付くものなので、図の上で近くに集まるほうがおかしい。
 *
 * 1 人はどこか 1 か所にしか置けないので、所属が重なっている人がいると
 * どちらかの所属は必ず広がる。完全には潰せないので上限で押さえる。
 */
function checkGroupCohesion() {
  const rows: Array<{ name: string; members: number; spread: number }> = [];

  for (const group of data.groups) {
    if (!groupTypeSetting(group.type).connects) continue;
    const members = data.people
      .filter((person) => person.attributes.includes(group.name))
      .map((person) => layout.byId.get(person.id))
      .filter((place): place is NonNullable<typeof place> => Boolean(place));
    if (members.length < 2) continue;

    /* いちばん遠い 2 人の距離。1 人でも離れていると所属が読めなくなる */
    let farthest = 0;
    for (let i = 0; i < members.length; i += 1) {
      for (let j = i + 1; j < members.length; j += 1) {
        farthest = Math.max(
          farthest,
          Math.hypot(members[i].x - members[j].x, members[i].y - members[j].y),
        );
      }
    }
    rows.push({ name: group.name, members: members.length, spread: farthest / diagonal });
  }

  if (rows.length === 0) return;
  rows.sort((a, b) => b.spread - a.spread);
  const worst = rows[0];

  if (worst.spread > MAX_GROUP_SPREAD) {
    fail(
      '所属のまとまり',
      '散らばり',
      `${worst.name} の ${worst.members} 人が図の ${(worst.spread * 100).toFixed(0)}% に散らばっています（上限 ${(MAX_GROUP_SPREAD * 100).toFixed(0)}%）`,
    );
    return;
  }
  console.log(
    `OK  所属のまとまり（いちばん散らばっているのは ${worst.name} の ${(worst.spread * 100).toFixed(0)}% / 上限 ${(MAX_GROUP_SPREAD * 100).toFixed(0)}%）`,
  );
}

/* ------------------------------------------------------------------ *
 * 名前の重なり
 * ------------------------------------------------------------------ */

/**
 * アイコンの下に出す名前が、隣の人の名前と重なっていないか。
 *
 * 重なりの検査はアイコン（34px の四角）しか見ていない。名前はそれより
 * ずっと横に長いので、間隔を詰めるとアイコンは離れたまま名前だけが重なる。
 * 「panndasanngou」のような長い名前で先に起きる。
 *
 * 実際に描かせて測るのがいちばん確かだが、ここは配置の検査なので
 * 文字の幅を見積もって当たりを取る（全角は 1、半角は約 0.55 文字ぶん）。
 */
function checkLabelOverlap() {
  const fontSize = skinnedFontSize(NODE.labelFontSize);
  const widthOf = (text: string) => {
    let units = 0;
    for (const char of text) units += /[\x20-\x7e]/.test(char) ? 0.55 : 1;
    return units * fontSize;
  };

  const boxes = layout.people.map((placement) => {
    const width = widthOf(placement.person.onlineName);
    const isCenter = placement.person.id === data.project.defaultCenterPersonId;
    const size = isCenter ? NODE.size * NODE.centerScale : NODE.size;
    /* 名前はアイコンの下、中央そろえ */
    const top = placement.y + size / 2 + NODE.labelOffsetY - fontSize;
    return {
      name: placement.person.onlineName,
      left: placement.x - width / 2,
      right: placement.x + width / 2,
      top,
      bottom: top + fontSize,
    };
  });

  let worst: { a: string; b: string; overlap: number } | null = null;
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
      const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
      if (overlapX <= 0 || overlapY <= 0) continue;
      if (!worst || overlapX > worst.overlap) worst = { a: a.name, b: b.name, overlap: overlapX };
    }
  }

  if (worst) {
    fail(
      '名前',
      '重なり',
      `${worst.a} と ${worst.b} の名前が ${worst.overlap.toFixed(0)}px 重なっています`,
    );
    return;
  }

  /* いちばん近い組の空きも出しておく。どれだけ詰められるかの目安になる */
  let closest = Number.POSITIVE_INFINITY;
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      if (Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top) <= 0) continue;
      closest = Math.min(closest, Math.max(a.left, b.left) - Math.min(a.right, b.right));
    }
  }
  const gap = Number.isFinite(closest) ? `${closest.toFixed(0)}px` : '同じ行に並ぶ名前なし';
  console.log(`OK  名前の重なり 0 組（同じ行でいちばん近い名前どうしの空き ${gap}）`);
}

/* ------------------------------------------------------------------ *
 * 枠線の色
 * ------------------------------------------------------------------ */

/**
 * 人物アイコンの枠線が、その所属の線と同じ色になっているか。
 *
 * 枠線を所属の線と同じ色にしてあるからこそ、線をたどらなくても
 * アイコンだけで所属が読める。片方の色の決め方だけ変えると、
 * 見た目は成立したまま意味だけが崩れる（気づきにくい）ので測る。
 */
function checkRingColors() {
  const theme = buildTheme('light', activeSkin());
  const state = { isCenter: false, isRelated: false, isDimmed: false };
  const groupById = new Map(data.groups.map((group) => [group.id, group]));

  let checked = 0;
  for (const placement of layout.people) {
    const groups = placement.groupIds
      .map((id) => groupById.get(id))
      .filter((group): group is Group => group !== undefined);
    if (groups.length === 0) continue;

    const rings = nodeRingColors(groups, theme, state);
    for (const color of rings) {
      /* その色を持つ所属が、その人の所属の中にあるか */
      const match = groups.some(
        (group) => affiliationEdgeStyle(group, theme, false).stroke === color,
      );
      if (!match) {
        fail(
          '枠線の色',
          '所属の線と違う',
          `${placement.person.onlineName} の枠線 ${color} に合う所属の線がありません`,
        );
        return;
      }
    }
    checked += 1;
  }

  console.log(`OK  枠線の色は所属の線と同じ（${checked} 人ぶんを確認）`);
}

/* ------------------------------------------------------------------ *
 * 区画の形
 * ------------------------------------------------------------------ */

/**
 * グループの区画が、細長い帯になっていないか。
 *
 * 同じグループの人は 1 列や 2×4 のような整った長方形に並べたい。
 * 並べ方の点数の付け方をひとつ間違えると（欠けた升目を重く見すぎるなど）、
 * 11 人が 1×11 の帯になって図が縦に伸びる。見た目には気づきにくいので測る。
 *
 * 見るのは、そのグループを持ち場にしている人（＝実際に区画を作っている人）だけ。
 * 持ち場が他所にある所属者まで含めると、散らばった位置の外接矩形を
 * 「区画の形」として測ってしまい、区画ではないものを細長いと言ってしまう。
 */
function checkBlockShape() {
  const worst: Array<{ name: string; ratio: number; columns: number; rows: number }> = [];

  for (const region of layout.regions) {
    /* 子の区画を持つグループは、子の形に引っぱられるので対象外 */
    if (data.groups.some((group) => group.parentGroupId === region.group.id)) continue;
    /* その区画に住んでいる人だけを見る */
    const points = region.memberIds
      .map((id) => layout.byId.get(id))
      .filter((place): place is NonNullable<typeof place> => Boolean(place))
      .filter((place) => place.homeGroupId === region.group.id);
    if (points.length < MIN_BLOCK_MEMBERS) continue;
    const columns = new Set(points.map((place) => place.x)).size;
    const rows = new Set(points.map((place) => place.y)).size;
    if (columns === 0 || rows === 0) continue;

    worst.push({
      name: region.group.name,
      ratio: Math.max(columns, rows) / Math.min(columns, rows),
      columns,
      rows,
    });
  }

  if (worst.length === 0) return;
  worst.sort((a, b) => b.ratio - a.ratio);
  const bad = worst.filter((entry) => entry.ratio > MAX_BLOCK_RATIO);

  if (bad.length > 0) {
    const detail = bad
      .slice(0, 3)
      .map((entry) => `${entry.name} ${entry.columns}×${entry.rows}`)
      .join(', ');
    fail(
      '区画の形',
      '細長い',
      `縦横の比が ${MAX_BLOCK_RATIO} を超える区画が ${bad.length} 個（${detail}）`,
    );
    return;
  }
  console.log(
    `OK  区画の形（いちばん細長いのは ${worst[0].name} の ${worst[0].columns}×${worst[0].rows} / 上限 ${MAX_BLOCK_RATIO} 倍）`,
  );
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
checkGroupCohesion();
checkLabelOverlap();
checkRingColors();
checkBlockShape();
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

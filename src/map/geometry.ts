/**
 * 図形の計算。React にもデータ形式にも依存しない純関数だけを置く。
 *
 * 「点の集まりを囲う角丸の多角形」を作るのが役割。
 */

export interface Point {
  x: number;
  y: number;
}

/** 凸包（Andrew's monotone chain）。反時計回りに返す。 */
export function convexHull(points: Point[]): Point[] {
  if (points.length < 3) return [...points];
  const sorted = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  const cross = (o: Point, a: Point, b: Point) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

  const half = (source: Point[]): Point[] => {
    const stack: Point[] = [];
    for (const point of source) {
      while (stack.length >= 2 && cross(stack[stack.length - 2], stack[stack.length - 1], point) <= 0) {
        stack.pop();
      }
      stack.push(point);
    }
    stack.pop();
    return stack;
  };

  return [...half(sorted), ...half([...sorted].reverse())];
}

/** 点群の外接矩形の四隅。凸包が作れない（点が 1〜2 個）ときの代用。 */
export function boundingCorners(points: Point[]): Point[] {
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  return [
    { x: minX, y: minY },
    { x: maxX, y: minY },
    { x: maxX, y: maxY },
    { x: minX, y: maxY },
  ];
}

export function centroid(points: Point[]): Point {
  const sum = points.reduce((acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }), { x: 0, y: 0 });
  return { x: sum.x / points.length, y: sum.y / points.length };
}

/** 重心から外側へ一定量ふくらませる。 */
export function expand(points: Point[], padding: number): Point[] {
  const center = centroid(points);
  return points.map((point) => {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const length = Math.hypot(dx, dy);
    if (length === 0) return { x: point.x + padding, y: point.y };
    return { x: point.x + (dx / length) * padding, y: point.y + (dy / length) * padding };
  });
}

/** 外接矩形を各辺に padding だけ広げた四角形。 */
export function inflatedBox(points: Point[], padding: number): Point[] {
  const [topLeft, topRight, bottomRight, bottomLeft] = boundingCorners(points);
  return [
    { x: topLeft.x - padding, y: topLeft.y - padding },
    { x: topRight.x + padding, y: topRight.y - padding },
    { x: bottomRight.x + padding, y: bottomRight.y + padding },
    { x: bottomLeft.x - padding, y: bottomLeft.y + padding },
  ];
}

/**
 * 点群を囲う多角形を作る。
 *
 * 点が 1〜2 個のときや、点が一直線に並んで凸包が潰れるときは、
 * 重心からふくらませても面積が出ない。その場合は外接矩形を広げて代用する。
 */
export function enclosingPolygon(points: Point[], padding: number): Point[] {
  if (points.length === 0) return [];
  const hull = convexHull(points);
  if (hull.length < 3) return inflatedBox(points, padding);

  const expanded = expand(hull, padding);
  /* 潰れた領域は線にしか見えないので、矩形へ切り替える基準を面積で持つ */
  return polygonArea(expanded) < padding * padding ? inflatedBox(points, padding) : expanded;
}

/**
 * 点列を閉じた滑らかな曲線の SVG パスにする。
 *
 * 角丸の多角形だと、囲いの直線が図の中を横切って「境界線」に見えてしまう。
 * 曲線で囲うと、同じ所属の人をふわりと包んだ形になり、重なりも読み取りやすい。
 *
 * 各点を通る Catmull-Rom スプラインを 3 次ベジェに置き換えて繋ぐ。
 * `tension` は 0 で直線、1 で標準的な滑らかさ。
 */
export function smoothClosedPath(points: Point[], tension = 1): string {
  if (points.length === 0) return '';
  if (points.length < 3) return roundedPolygonPath(points, 0);

  const count = points.length;
  const commands = [`M ${round(points[0].x)} ${round(points[0].y)}`];

  for (let i = 0; i < count; i += 1) {
    const previous = points[(i - 1 + count) % count];
    const current = points[i];
    const next = points[(i + 1) % count];
    const after = points[(i + 2) % count];

    /* 前後の点の向きから、その点での接線を決める（Catmull-Rom の制御点） */
    const control1 = {
      x: current.x + ((next.x - previous.x) / 6) * tension,
      y: current.y + ((next.y - previous.y) / 6) * tension,
    };
    const control2 = {
      x: next.x - ((after.x - current.x) / 6) * tension,
      y: next.y - ((after.y - current.y) / 6) * tension,
    };

    commands.push(
      `C ${round(control1.x)} ${round(control1.y)} ${round(control2.x)} ${round(control2.y)} ${round(next.x)} ${round(next.y)}`,
    );
  }

  commands.push('Z');
  return commands.join(' ');
}

/** 多角形を角丸の SVG パスにする。 */
export function roundedPolygonPath(points: Point[], radius: number): string {
  if (points.length === 0) return '';
  if (points.length === 1) {
    const { x, y } = points[0];
    return `M ${x - radius} ${y} a ${radius} ${radius} 0 1 0 ${radius * 2} 0 a ${radius} ${radius} 0 1 0 ${-radius * 2} 0 Z`;
  }

  const commands: string[] = [];
  const count = points.length;
  for (let i = 0; i < count; i += 1) {
    const previous = points[(i - 1 + count) % count];
    const current = points[i];
    const next = points[(i + 1) % count];

    const start = shorten(current, previous, radius);
    const end = shorten(current, next, radius);

    if (i === 0) commands.push(`M ${round(start.x)} ${round(start.y)}`);
    else commands.push(`L ${round(start.x)} ${round(start.y)}`);
    commands.push(`Q ${round(current.x)} ${round(current.y)} ${round(end.x)} ${round(end.y)}`);
  }
  commands.push('Z');
  return commands.join(' ');
}

/** `from` から `toward` の向きへ、最大 radius だけ寄せた点（辺より長くは寄せない）。 */
function shorten(from: Point, toward: Point, radius: number): Point {
  const dx = toward.x - from.x;
  const dy = toward.y - from.y;
  const length = Math.hypot(dx, dy);
  if (length === 0) return { ...from };
  const distance = Math.min(radius, length / 2);
  return { x: from.x + (dx / length) * distance, y: from.y + (dy / length) * distance };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/** 点が多角形の内側にあるか（交差数判定）。衛星ノードを領域の外へ置くのに使う。 */
export function pointInPolygon(point: Point, polygon: Point[]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i, i += 1) {
    const a = polygon[i];
    const b = polygon[j];
    const crosses = a.y > point.y !== b.y > point.y;
    if (crosses && point.x < ((b.x - a.x) * (point.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/**
 * 路線図のように、45 度と直角だけで 2 点を繋ぐ折れ線。
 *
 * 斜めに引くと線が四方八方を向いて、どれがどこへ繋がっているのか
 * 追いにくい。向きを直角と 45 度に限ると、線が揃って読み取りやすくなる。
 *
 * 長いほうの向きへまっすぐ進んでから、残りを 45 度で詰める。
 * `elbow` は角を丸める半径（0 ならカクカクのまま）。
 */
export function orthogonalPath(from: Point, to: Point, elbow = 0): string {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const stepX = Math.sign(dx);
  const stepY = Math.sign(dy);
  const run = Math.abs(dx);
  const rise = Math.abs(dy);

  /* ほぼ真っ直ぐなら、そのまま 1 本で引く */
  if (run === 0 || rise === 0) {
    return `M ${round(from.x)} ${round(from.y)} L ${round(to.x)} ${round(to.y)}`;
  }

  /* 曲がる点。長いほうの向きへ進み、短いほうの長さだけ残して 45 度に入る */
  const diagonal = Math.min(run, rise);
  const corner =
    run > rise
      ? { x: to.x - stepX * diagonal, y: from.y }
      : { x: from.x, y: to.y - stepY * diagonal };

  if (elbow <= 0) {
    return `M ${round(from.x)} ${round(from.y)} L ${round(corner.x)} ${round(corner.y)} L ${round(to.x)} ${round(to.y)}`;
  }

  /* 角の手前と先を、実際の辺より長く削らない範囲で丸める */
  const before = shorten(corner, from, Math.min(elbow, Math.hypot(corner.x - from.x, corner.y - from.y) / 2));
  const after = shorten(corner, to, Math.min(elbow, Math.hypot(to.x - corner.x, to.y - corner.y) / 2));
  return [
    `M ${round(from.x)} ${round(from.y)}`,
    `L ${round(before.x)} ${round(before.y)}`,
    `Q ${round(corner.x)} ${round(corner.y)} ${round(after.x)} ${round(after.y)}`,
    `L ${round(to.x)} ${round(to.y)}`,
  ].join(' ');
}

/** 多角形の面積（描画順の判定に使う）。 */
export function polygonArea(points: Point[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i += 1) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    area += a.x * b.y - b.x * a.y;
  }
  return Math.abs(area) / 2;
}

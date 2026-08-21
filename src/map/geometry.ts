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
 * 2 点を結ぶ弧の SVG パス。
 *
 * 直線だと同じ相手に集まる線が重なって読めないので、線ごとに一定方向へ膨らませる。
 * `bow` が 0 なら直線と同じ。
 */
export function arcPath(from: Point, to: Point, bow: number): string {
  if (bow === 0) return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;
  const midX = (from.x + to.x) / 2;
  const midY = (from.y + to.y) / 2;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy) || 1;
  /* 線分に垂直な向きへ膨らませる */
  const controlX = midX - (dy / length) * bow;
  const controlY = midY + (dx / length) * bow;
  return `M ${from.x} ${from.y} Q ${controlX} ${controlY} ${to.x} ${to.y}`;
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

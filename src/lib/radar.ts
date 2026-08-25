/**
 * 多角形レーダー（プレイスタイルの図）の配置計算。
 *
 * 軸の名前は多角形の外側に置くので、字数が増えるほど外へ広がる。字数の分を
 * 見ずに半径を決め打ちにすると、横に伸びる軸の名前が枠の外へ出て切れる。
 *
 * そこでここでは **枠に収まる最大の半径** を先に求めてから図の寸法を返す。
 * コンポーネントは返ってきた値を属性へ渡すだけで、自分では位置を決めない。
 * 収まっているかどうかの検査は scripts/check-layout.ts が持つ。
 */
import { estimateTextHeight, estimateTextWidth } from './text';

export type TextAnchor = 'start' | 'middle' | 'end';

export interface Point {
  x: number;
  y: number;
}

/** 文字が占める見込みの範囲。はみ出しの検査はこれを見る。 */
export interface Box {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface RadarAxis {
  /** 軸に出す文字。見積りと実際の描画で同じ文字列を使う。 */
  label: string;
  /** 文字の基準点。dominantBaseline は central を前提にする。 */
  labelPoint: Point;
  /** 文字を左右どちらへ伸ばすか。 */
  anchor: TextAnchor;
  /** 文字が占める見込みの範囲。 */
  box: Box;
  /** 多角形の頂点（外周）。 */
  vertex: Point;
}

export interface RadarLayout {
  /** viewBox の一辺。 */
  size: number;
  /** 中心の座標（縦横とも同じ）。 */
  center: number;
  /** 多角形の外周半径。 */
  radius: number;
  /** 軸の名前を置く半径。 */
  labelRadius: number;
  /** 軸の名前の大きさ。 */
  fontSize: number;
  axes: RadarAxis[];
}

export interface RadarLayoutInput {
  /** 軸に出す文字。並び順がそのまま軸の順番になる（先頭が真上）。 */
  labels: string[];
  /** viewBox の一辺。 */
  size: number;
  /** 軸の名前の大きさ。 */
  fontSize: number;
  /** 枠の内側に必ず残す余白。 */
  padding: number;
  /** 多角形の外周と軸の名前の間隔。 */
  gap: number;
}

/** 真上から時計回り。先頭の軸が必ず真上に来る。 */
function direction(index: number, total: number): Point {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / total;
  return { x: Math.cos(angle), y: Math.sin(angle) };
}

/** 真上・真下に近い軸は中央寄せにする。これ以上横に寝ていたら外側へ流す。 */
const HORIZONTAL_THRESHOLD = 0.2;

function anchorFor(dx: number): TextAnchor {
  if (dx > HORIZONTAL_THRESHOLD) return 'start';
  if (dx < -HORIZONTAL_THRESHOLD) return 'end';
  return 'middle';
}

/** 基準点から見て、文字が左右にどれだけ張り出すか。 */
function horizontalSpread(anchor: TextAnchor, width: number): { left: number; right: number } {
  if (anchor === 'start') return { left: 0, right: width };
  if (anchor === 'end') return { left: -width, right: 0 };
  return { left: -width / 2, right: width / 2 };
}

/**
 * 1 つの向きについて、張り出しが [low, high] に収まる最大の半径。
 *
 * `center + radius * unit + spread` を範囲に収める。向きが 0 のとき
 * （その軸に沿って動かない）は、この向きからは半径を制限しない。
 */
function maxRadiusOnAxis(
  center: number,
  unit: number,
  spread: { min: number; max: number },
  low: number,
  high: number,
): number {
  if (unit > 0) return (high - spread.max - center) / unit;
  if (unit < 0) return (low - spread.min - center) / unit;
  return Number.POSITIVE_INFINITY;
}

/**
 * 枠に収まる配置を返す。
 *
 * 半径は「どの軸の名前も枠に収まる」上限まで広げる。字数が増えれば
 * 自動的に多角形が小さくなるので、文言を変えてもはみ出さない。
 */
export function radarLayout({ labels, size, fontSize, padding, gap }: RadarLayoutInput): RadarLayout {
  const center = size / 2;
  const height = estimateTextHeight(fontSize);
  const low = padding;
  const high = size - padding;

  const axes = labels.map((label, index) => {
    const unit = direction(index, labels.length);
    const anchor = anchorFor(unit.x);
    const width = estimateTextWidth(label, fontSize);
    const spread = horizontalSpread(anchor, width);
    return { label, unit, anchor, spread };
  });

  /* どの軸の名前も収まる半径。1 つでも外へ出るなら、その軸に合わせて縮める */
  const labelRadius = Math.max(
    0,
    Math.min(
      ...axes.map((axis) =>
        Math.min(
          maxRadiusOnAxis(center, axis.unit.x, { min: axis.spread.left, max: axis.spread.right }, low, high),
          maxRadiusOnAxis(center, axis.unit.y, { min: -height / 2, max: height / 2 }, low, high),
        ),
      ),
    ),
  );
  const radius = Math.max(0, labelRadius - gap);

  return {
    size,
    center,
    radius,
    labelRadius,
    fontSize,
    axes: axes.map((axis) => {
      const labelPoint = {
        x: center + axis.unit.x * labelRadius,
        y: center + axis.unit.y * labelRadius,
      };
      return {
        label: axis.label,
        labelPoint,
        anchor: axis.anchor,
        box: {
          minX: labelPoint.x + axis.spread.left,
          maxX: labelPoint.x + axis.spread.right,
          minY: labelPoint.y - height / 2,
          maxY: labelPoint.y + height / 2,
        },
        vertex: {
          x: center + axis.unit.x * radius,
          y: center + axis.unit.y * radius,
        },
      };
    }),
  };
}

/** 中心からの比率（0〜1）で頂点を並べた polygon の points。 */
export function radarPolygonPoints(layout: RadarLayout, ratios: number[] | number): string {
  return layout.axes
    .map((axis, index) => {
      const ratio = typeof ratios === 'number' ? ratios : (ratios[index] ?? 0);
      const x = layout.center + (axis.vertex.x - layout.center) * ratio;
      const y = layout.center + (axis.vertex.y - layout.center) * ratio;
      return `${x},${y}`;
    })
    .join(' ');
}

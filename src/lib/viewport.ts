/**
 * 拡大縮小と移動（パン・ズーム）の計算。純関数だけで構成する。
 *
 * ワールドマップ（画像）と相関図（SVG）で同じ操作感にするため、
 * 座標の計算はここに 1 つだけ置き、React 側（hooks/usePanZoom.ts）は
 * 入力の受け取りとこの関数の呼び出しに徹する。
 *
 * 座標系は 2 つある。
 *   内容座標  中身そのものの座標（画像なら画素、相関図なら viewBox の単位）
 *   画面座標  表示枠の左上を原点とした px
 * 変換は `画面 = 内容 × scale + offset` の 1 本だけ。
 */

export interface Size {
  width: number;
  height: number;
}

export interface Point {
  x: number;
  y: number;
}

/** いまどこをどれだけ拡大して見ているか。 */
export interface Viewport {
  /** 内容 1 単位を画面何 px で描くか。 */
  scale: number;
  /** 内容の原点が表示枠のどこに来るか（画面座標）。 */
  x: number;
  y: number;
}

/** 拡大率の上限と下限。 */
export interface ScaleRange {
  min: number;
  max: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/** 表示枠に全体が収まる拡大率。 */
export function fitScale(content: Size, box: Size): number {
  if (content.width <= 0 || content.height <= 0 || box.width <= 0 || box.height <= 0) return 1;
  return Math.min(box.width / content.width, box.height / content.height);
}

/**
 * 拡大率の実際の上下限。
 *
 * 設定は「全体を収めた大きさの何倍まで」で持つ（config/viewport.ts）。
 * 内容の大きさも表示枠の大きさも場面によって違うので、倍率で持たないと
 * 同じ設定が別の画面で意味を変えてしまう。
 */
export function scaleRange(content: Size, box: Size, zoom: { min: number; max: number }): ScaleRange {
  const base = fitScale(content, box);
  return { min: base * zoom.min, max: base * zoom.max };
}

/**
 * 内容が表示枠から離れないように位置を丸める。
 *
 * 表示枠より小さい向きは中央に寄せ、大きい向きは端に隙間ができないようにする。
 * 端を越えて引き出せると「戻し方が分からない」状態になりやすいので許さない。
 */
export function clampViewport(view: Viewport, content: Size, box: Size): Viewport {
  const scaled = { width: content.width * view.scale, height: content.height * view.scale };
  const axis = (offset: number, scaledLength: number, boxLength: number) =>
    scaledLength <= boxLength ? (boxLength - scaledLength) / 2 : clamp(offset, boxLength - scaledLength, 0);

  return {
    scale: view.scale,
    x: axis(view.x, scaled.width, box.width),
    y: axis(view.y, scaled.height, box.height),
  };
}

/** 全体を表示枠の中央に収めた状態。 */
export function fitViewport(content: Size, box: Size, range?: ScaleRange): Viewport {
  const scale = range ? clamp(fitScale(content, box), range.min, range.max) : fitScale(content, box);
  return clampViewport({ scale, x: 0, y: 0 }, content, box);
}

/**
 * 指定した画面上の 1 点を動かさずに拡大率を変える。
 *
 * 指した場所を基準に拡大するのが地図の作法。中央基準にすると、
 * 見たい場所が画面外へ逃げてしまう。
 */
export function zoomAt(
  view: Viewport,
  nextScale: number,
  focus: Point,
  content: Size,
  box: Size,
  range: ScaleRange,
): Viewport {
  const scale = clamp(nextScale, range.min, range.max);
  const ratio = scale / view.scale;
  return clampViewport(
    { scale, x: focus.x - (focus.x - view.x) * ratio, y: focus.y - (focus.y - view.y) * ratio },
    content,
    box,
  );
}

/** 表示枠の中央を基準に拡大率を変える（ボタン・キー操作用）。 */
export function zoomBy(
  view: Viewport,
  factor: number,
  content: Size,
  box: Size,
  range: ScaleRange,
): Viewport {
  const center = { x: box.width / 2, y: box.height / 2 };
  return zoomAt(view, view.scale * factor, center, content, box, range);
}

/** 画面座標のぶんだけ動かす。 */
export function panBy(view: Viewport, dx: number, dy: number, content: Size, box: Size): Viewport {
  return clampViewport({ scale: view.scale, x: view.x + dx, y: view.y + dy }, content, box);
}

/** 画面座標（表示枠の左上が原点）を内容座標にする。 */
export function toContent(view: Viewport, point: Point): Point {
  return { x: (point.x - view.x) / view.scale, y: (point.y - view.y) / view.scale };
}

/** 内容座標を画面座標（表示枠の左上が原点）にする。toContent の逆。 */
export function toScreen(view: Viewport, point: Point): Point {
  return { x: point.x * view.scale + view.x, y: point.y * view.scale + view.y };
}

/** 内容が表示枠のどの範囲に見えているか（内容座標）。 */
export function visibleArea(view: Viewport, box: Size): { from: Point; to: Point } {
  return {
    from: toContent(view, { x: 0, y: 0 }),
    to: toContent(view, { x: box.width, y: box.height }),
  };
}

/** CSS の transform。左上を原点に、移動してから拡大する。 */
export function transformStyle(view: Viewport): string {
  return `translate(${view.x}px, ${view.y}px) scale(${view.scale})`;
}

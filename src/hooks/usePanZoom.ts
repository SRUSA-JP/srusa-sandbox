import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VIEWPORT, type ZoomRange } from '../config/viewport';
import {
  clamp,
  clampViewport,
  fitViewport,
  panBy,
  scaleRange,
  toContent,
  zoomAt,
  zoomBy,
  type Point,
  type ScaleRange,
  type Size,
  type Viewport,
} from '../lib/viewport';

/**
 * 掴んで動かす・つまんで拡大するの入力をまとめて受け取る。
 *
 * 計算は lib/viewport.ts の純関数が持ち、ここは「入力を受け取って
 * どの関数を呼ぶか」だけを決める。ワールドマップと相関図で共有する。
 *
 * 操作は次の 4 通り。どれか 1 つしか使えない人がいないように揃える。
 *   マウス・指   掴んで動かす / 2 本指でつまんで拡大 / ダブルクリックで拡大
 *   ホイール     Ctrl（⌘）を押しながらで拡大縮小
 *   キーボード   矢印で移動、+ - で拡大縮小、0 で全体表示
 *   ボタン       ViewportControls（molecules）
 *
 * `onTap` を渡すと、動かさずに離した（掴んで動かしたのではない）ときだけ呼ぶ。
 * ワールドマップで、タップ / クリックした場所の座標を固定するのに使う。
 *
 * ホイール単体でページのスクロールを奪わないのは、記事の途中に図が
 * 埋まっているため。図の上を通っただけで記事が読めなくなるのを防ぐ。
 * 操作の説明は図の外（下）にだけ置く。図の上に重ねると地図が隠れる。
 */
export interface PanZoom {
  view: Viewport;
  /** 表示枠の大きさ（px）。測る前は 0。 */
  box: Size;
  range: ScaleRange;
  /**
   * 表示枠に広げる属性（ref・イベント・キーボード操作）。
   *
   * ref もここに入れて、受け取る側が ref を触らずに済むようにする
   * （描画中に ref を読むと React の決まりに反する）。
   */
  surfaceProps: {
    ref: React.RefObject<HTMLDivElement | null>;
    tabIndex: number;
    onPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void;
    onPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void;
    onPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void;
    onPointerCancel: (event: React.PointerEvent<HTMLDivElement>) => void;
    onDoubleClick: (event: React.MouseEvent<HTMLDivElement>) => void;
    onKeyDown: (event: React.KeyboardEvent<HTMLDivElement>) => void;
  };
  /** いま掴んで動かしている最中か（見た目を変えるのに使う）。 */
  isPanning: boolean;
  zoomIn: () => void;
  zoomOut: () => void;
  fit: () => void;
  canZoomIn: boolean;
  canZoomOut: boolean;
  /** ブラウザの座標を内容の座標にする（人物を掴んで動かすのに使う）。 */
  toContentPoint: (clientX: number, clientY: number) => Point;
}

/** 押されている指・ペン・マウスの位置（ブラウザの座標）。 */
type Pointers = Map<number, Point>;

function distance(points: Point[]): number {
  return Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
}

function midpoint(points: Point[]): Point {
  return { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 };
}

export function usePanZoom(
  contentWidth: number,
  contentHeight: number,
  zoom: ZoomRange,
  onTap?: (point: Point) => void,
): PanZoom {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Size>({ width: 0, height: 0 });
  const [view, setView] = useState<Viewport>({ scale: 1, x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);

  const content = useMemo(
    () => ({ width: contentWidth, height: contentHeight }),
    [contentWidth, contentHeight],
  );
  const range = useMemo(() => scaleRange(content, box, zoom), [content, box, zoom]);

  const pointers = useRef<Pointers>(new Map());
  const pinchDistance = useRef(0);
  /** 掴み始めた位置（画面座標）。onTap の判定に使う。 */
  const tapStart = useRef<Point | null>(null);
  /** 2 本指に触れたことがあるか。あればつまむ操作なので、離してもタップとは見なさない。 */
  const wasMultiTouch = useRef(false);

  /* ---------------------------------------------------------------- *
   * 表示枠の大きさを測る
   * ---------------------------------------------------------------- */

  useEffect(() => {
    const element = surfaceRef.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setBox((previous) =>
        previous.width === width && previous.height === height ? previous : { width, height },
      );
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  /* ---------------------------------------------------------------- *
   * 内容が変わったら全体表示に戻し、枠だけ変わったら位置を丸める
   * ---------------------------------------------------------------- */

  const fittedFor = useRef('');
  useEffect(() => {
    if (box.width === 0 || box.height === 0) return;
    const key = `${content.width}x${content.height}`;
    if (fittedFor.current !== key) {
      fittedFor.current = key;
      setView(fitViewport(content, box, range));
      return;
    }
    setView((previous) =>
      clampViewport({ ...previous, scale: clamp(previous.scale, range.min, range.max) }, content, box),
    );
  }, [content, box, range]);

  /** 表示枠の左上を原点とした座標にする。 */
  const localPoint = useCallback((clientX: number, clientY: number): Point => {
    const rect = surfaceRef.current?.getBoundingClientRect();
    return rect ? { x: clientX - rect.left, y: clientY - rect.top } : { x: 0, y: 0 };
  }, []);

  /* ---------------------------------------------------------------- *
   * ホイール（Ctrl / ⌘ を押しながらのときだけ拡大縮小）
   *
   * React の onWheel は既定で受け身なので preventDefault が効かない。
   * ブラウザの拡大に取られないよう、自前で受け身でない購読にする。
   * ---------------------------------------------------------------- */

  useEffect(() => {
    const element = surfaceRef.current;
    if (!element) return;

    const onWheel = (event: WheelEvent) => {
      /* ページのスクロールは奪わない。拡大縮小は Ctrl（⌘）を押しているときだけ */
      if (!event.ctrlKey && !event.metaKey) return;
      event.preventDefault();
      const factor = VIEWPORT.step ** (-event.deltaY / VIEWPORT.wheelDivisor);
      const focus = localPoint(event.clientX, event.clientY);
      setView((previous) => zoomAt(previous, previous.scale * factor, focus, content, box, range));
    };

    element.addEventListener('wheel', onWheel, { passive: false });
    return () => element.removeEventListener('wheel', onWheel);
  }, [content, box, range, localPoint]);

  /* ---------------------------------------------------------------- *
   * 掴んで動かす / 2 本指でつまんで拡大
   * ---------------------------------------------------------------- */

  const onPointerDown = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    /* 右クリックと中クリックは既定の動作に任せる */
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size === 1) {
      setIsPanning(true);
      tapStart.current = { x: event.clientX, y: event.clientY };
      wasMultiTouch.current = false;
    }
    if (pointers.current.size === 2) {
      pinchDistance.current = distance([...pointers.current.values()]);
      wasMultiTouch.current = true;
    }
  }, []);

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const previous = pointers.current.get(event.pointerId);
      if (!previous) return;
      const next = { x: event.clientX, y: event.clientY };
      pointers.current.set(event.pointerId, next);

      if (pointers.current.size >= 2) {
        const points = [...pointers.current.values()].slice(0, 2);
        const spread = distance(points);
        if (pinchDistance.current > 0 && spread > 0) {
          const factor = spread / pinchDistance.current;
          const center = midpoint(points);
          const focus = localPoint(center.x, center.y);
          setView((current) => zoomAt(current, current.scale * factor, focus, content, box, range));
        }
        pinchDistance.current = spread;
        return;
      }

      setView((current) => panBy(current, next.x - previous.x, next.y - previous.y, content, box));
    },
    [content, box, range, localPoint],
  );

  const endPointer = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      pointers.current.delete(event.pointerId);
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
      if (pointers.current.size < 2) pinchDistance.current = 0;
      if (pointers.current.size === 0) {
        setIsPanning(false);
        const start = tapStart.current;
        tapStart.current = null;
        if (onTap && start && !wasMultiTouch.current) {
          const moved = Math.hypot(event.clientX - start.x, event.clientY - start.y);
          if (moved < VIEWPORT.dragThreshold) onTap(toContent(view, localPoint(event.clientX, event.clientY)));
        }
      }
    },
    [onTap, view, localPoint],
  );

  const onDoubleClick = useCallback(
    (event: React.MouseEvent<HTMLDivElement>) => {
      const focus = localPoint(event.clientX, event.clientY);
      setView((current) => zoomAt(current, current.scale * VIEWPORT.step, focus, content, box, range));
    },
    [content, box, range, localPoint],
  );

  /* ---------------------------------------------------------------- *
   * ボタン・キーボード
   * ---------------------------------------------------------------- */

  const zoomIn = useCallback(
    () => setView((current) => zoomBy(current, VIEWPORT.step, content, box, range)),
    [content, box, range],
  );
  const zoomOut = useCallback(
    () => setView((current) => zoomBy(current, 1 / VIEWPORT.step, content, box, range)),
    [content, box, range],
  );
  const fit = useCallback(() => setView(fitViewport(content, box, range)), [content, box, range]);

  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>) => {
      const pan = (dx: number, dy: number) => {
        event.preventDefault();
        setView((current) => panBy(current, dx, dy, content, box));
      };
      switch (event.key) {
        case 'ArrowLeft': return pan(VIEWPORT.keyPan, 0);
        case 'ArrowRight': return pan(-VIEWPORT.keyPan, 0);
        case 'ArrowUp': return pan(0, VIEWPORT.keyPan);
        case 'ArrowDown': return pan(0, -VIEWPORT.keyPan);
        case '+': case '=': event.preventDefault(); return zoomIn();
        case '-': event.preventDefault(); return zoomOut();
        case '0': event.preventDefault(); return fit();
        default:
      }
    },
    [content, box, zoomIn, zoomOut, fit],
  );

  const toContentPoint = useCallback(
    (clientX: number, clientY: number) => toContent(view, localPoint(clientX, clientY)),
    [view, localPoint],
  );

  return {
    view,
    box,
    range,
    surfaceProps: {
      ref: surfaceRef,
      tabIndex: 0,
      onPointerDown,
      onPointerMove,
      onPointerUp: endPointer,
      onPointerCancel: endPointer,
      onDoubleClick,
      onKeyDown,
    },
    isPanning,
    zoomIn,
    zoomOut,
    fit,
    canZoomIn: view.scale < range.max,
    canZoomOut: view.scale > range.min,
    toContentPoint,
  };
}

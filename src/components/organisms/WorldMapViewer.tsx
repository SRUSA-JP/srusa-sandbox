import { useState } from 'react';
import { WORLD_LABELS, WORLD_MARK_LABELS } from '../../config/labels';
import { WORLD_MAP_TEXT } from '../../config/messages';
import { WORLD_MAP_ZOOM } from '../../config/viewport';
import { WORLD_MAP } from '../../config/worldMap';
import { usePanZoom } from '../../hooks/usePanZoom';
import { transformStyle, visibleArea, type Point } from '../../lib/viewport';
import {
  blockAt,
  coordinateStatus,
  correlationLines,
  isInside,
  markStyle,
  pixelOf,
  type BlockPoint,
  type PointerState,
} from '../../world/display';
import type { WorldMap } from '../../world/schema';
import type { VizTheme } from '../../theme/palette';
import { ViewportFrame } from './ViewportFrame';

export interface WorldMapViewerProps {
  map: WorldMap;
  theme: VizTheme;
}

/**
 * BlueMap の 2D 出力を掴んで見られるようにした地図。
 *
 * 中身は 1 枚の PNG（1 画素 = 1 ブロック）で、3D のモデルは載せていない。
 * 3D はレンダリング結果が数百 MB あるため、ページには写真だけを置く。
 *
 * 拡大・移動の状態は usePanZoom が、座標の変換は world/display.ts が持つ。
 * このコンポーネントは「どこを指しているか」「どこをタップして固定したか」だけを覚える。
 *
 * 呼び出し側（WorldMapPage）が `key={map.id}` を付けて、地図を切り替えたときに
 * このコンポーネントごと作り直す。前の地図の画素に基づく座標や拡大率を
 * 持ち越さないようにするため（React 公式の「state をリセットする」作法）。
 */
export function WorldMapViewer({ map, theme }: WorldMapViewerProps) {
  const [hovered, setHovered] = useState<BlockPoint | null>(null);
  const [pinned, setPinned] = useState<BlockPoint | null>(null);
  const panZoom = usePanZoom(map.pixels.width, map.pixels.height, WORLD_MAP_ZOOM, (point) => {
    const block = blockAt(map, point);
    setPinned(isInside(map, block) ? block : null);
  });

  const world = WORLD_LABELS[map.id] ?? map.id;
  const area = visibleArea(panZoom.view, panZoom.box);
  const center = blockAt(map, { x: (area.from.x + area.to.x) / 2, y: (area.from.y + area.to.y) / 2 });
  const mark = markStyle(theme, panZoom.view.scale);

  const pointer: PointerState | null = hovered
    ? { block: hovered, pinned: false }
    : pinned
      ? { block: pinned, pinned: true }
      : null;
  const correlations = pointer ? correlationLines(map.id, pointer.block) : [];

  /* 十字の目印。固定した座標も、config/worldMap.ts の目印（原点など）も同じ見た目で描く */
  const crosshair = (key: string, at: Point, label: string) => {
    const cross = [
      { x1: -mark.arm, y1: 0, x2: mark.arm, y2: 0 },
      { x1: 0, y1: -mark.arm, x2: 0, y2: mark.arm },
    ];
    return (
      <g key={key} transform={`translate(${at.x} ${at.y})`}>
        {/* 縁取りを先に敷く。雪の白でも海の紺でも十字が沈まないようにする */}
        {cross.map((line, index) => (
          <line key={`halo-${index}`} {...line} stroke={mark.haloColor} strokeWidth={mark.haloWidth} />
        ))}
        {cross.map((line, index) => (
          <line key={`line-${index}`} {...line} stroke={mark.color} strokeWidth={mark.strokeWidth} />
        ))}
        <text
          y={mark.labelOffset}
          textAnchor="middle"
          fill={mark.color}
          stroke={mark.haloColor}
          strokeWidth={mark.haloWidth}
          paintOrder="stroke"
          fontSize={mark.labelFontSize}
        >
          {label}
        </text>
      </g>
    );
  };

  return (
    <ViewportFrame
      panZoom={panZoom}
      label={WORLD_MAP_TEXT.card.alt(world)}
      status={
        <div className="flex flex-col gap-xxs">
          <span>{coordinateStatus(pointer, center)}</span>
          {correlations.map((line) => (
            <span key={line} className="text-xs text-subtle">
              {line}
            </span>
          ))}
        </div>
      }
    >
      <div
        className="relative origin-top-left"
        style={{
          width: map.pixels.width,
          height: map.pixels.height,
          transform: transformStyle(panZoom.view),
        }}
        onPointerMove={(event) => {
          const point = panZoom.toContentPoint(event.clientX, event.clientY);
          const block = blockAt(map, point);
          setHovered(isInside(map, block) ? block : null);
        }}
        onPointerLeave={() => setHovered(null)}
      >
        <img
          src={`${import.meta.env.BASE_URL}${map.image}`}
          alt={WORLD_MAP_TEXT.card.alt(world)}
          width={map.pixels.width}
          height={map.pixels.height}
          draggable={false}
          className="block h-full w-full max-w-none"
        />

        {/* 目印。拡大しても画面上の大きさが変わらないよう、寸法は拡大率で割ってある */}
        <svg
          className="pointer-events-none absolute top-0 left-0 h-full w-full"
          viewBox={`0 0 ${map.pixels.width} ${map.pixels.height}`}
          aria-hidden
        >
          {WORLD_MAP.marks
            .filter((entry) => isInside(map, entry))
            .map((entry) => crosshair(entry.id, pixelOf(map, entry), WORLD_MARK_LABELS[entry.id] ?? entry.id))}

          {/* タップ / クリックで固定した座標。指しているだけ（固定していない）ときは出さない */}
          {pinned && crosshair('pinned', pixelOf(map, pinned), WORLD_MAP_TEXT.pointer(pinned.x, pinned.z))}
        </svg>
      </div>
    </ViewportFrame>
  );
}

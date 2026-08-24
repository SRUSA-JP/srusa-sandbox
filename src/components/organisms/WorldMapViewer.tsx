import { useState } from 'react';
import { WORLD_LABELS, WORLD_MARK_LABELS } from '../../config/labels';
import { WORLD_MAP_TEXT } from '../../config/messages';
import { WORLD_MAP_ZOOM } from '../../config/viewport';
import { WORLD_MAP } from '../../config/worldMap';
import { usePanZoom } from '../../hooks/usePanZoom';
import { toScreen, transformStyle, visibleArea } from '../../lib/viewport';
import {
  blockAt,
  coordinateStatus,
  isInside,
  markStyle,
  pairedCoordinate,
  pixelOf,
  tooltipPlacement,
  type BlockPoint,
} from '../../world/display';
import type { WorldMap } from '../../world/schema';
import type { VizTheme } from '../../theme/palette';
import { ViewportFrame } from './ViewportFrame';

export interface WorldMapViewerProps {
  map: WorldMap;
  theme: VizTheme;
}

interface PointerTooltip {
  block: BlockPoint;
  /**
   * 指の操作で出した吹き出しか。
   *
   * マウスは離れれば消せばよいが、指はタップの直後に必ず離れる（pointerleave が来る）。
   * そこで消すと一瞬しか読めないので、指で出したものは地図に貼り付けたまま残す。
   */
  pinned: boolean;
  /** カーソル追従のときの位置（表示枠の左上が原点の px）。 */
  x: number;
  y: number;
}

/**
 * BlueMap の 2D 出力を掴んで見られるようにした地図。
 *
 * 中身は 1 枚の PNG（1 画素 = 1 ブロック）で、3D のモデルは載せていない。
 * 3D はレンダリング結果が数百 MB あるため、ページには写真だけを置く。
 *
 * 拡大・移動の状態は usePanZoom が、座標の変換は world/display.ts が持つ。
 * このコンポーネントは「どこを指しているか」だけを覚える。
 */
export function WorldMapViewer({ map, theme }: WorldMapViewerProps) {
  const panZoom = usePanZoom(map.pixels.width, map.pixels.height, WORLD_MAP_ZOOM);
  const [pointed, setPointed] = useState<BlockPoint | null>(null);
  const [selected, setSelected] = useState<BlockPoint | null>(null);
  const [tooltip, setTooltip] = useState<PointerTooltip | null>(null);

  const world = map.label ?? WORLD_LABELS[map.id] ?? map.id;
  const area = visibleArea(panZoom.view, panZoom.box);
  const center = blockAt(map, { x: (area.from.x + area.to.x) / 2, y: (area.from.y + area.to.y) / 2 });
  const mark = markStyle(theme, panZoom.view.scale);
  const paired = tooltip ? pairedCoordinate(map, tooltip.block) : null;
  /*
   * 貼り付けた吹き出しは、指の位置ではなくブロックの位置を基準に置き直す。
   * こうすると地図を動かしても、示している場所から吹き出しが離れない。
   */
  const anchor = tooltip
    ? tooltip.pinned
      ? toScreen(panZoom.view, pixelOf(map, tooltip.block))
      : { x: tooltip.x, y: tooltip.y }
    : null;
  const placement = anchor ? tooltipPlacement(anchor, panZoom.box) : null;

  return (
    <ViewportFrame
      panZoom={panZoom}
      label={WORLD_MAP_TEXT.card.alt(world)}
      status={coordinateStatus(pointed, center, selected)}
      overlay={
        tooltip && (
          <div
            className="pointer-events-none absolute z-10 grid min-w-[var(--sr-layout-tooltip-min-width)] gap-xxs rounded-md border-hairline border-divider bg-surface px-md py-xs font-mono text-sm text-muted tabular-nums"
            style={{ left: placement?.x ?? 0, top: placement?.y ?? 0 }}
          >
            <strong className="text-xs font-bold text-heading">{WORLD_MAP_TEXT.tooltip.title}</strong>
            <span>{WORLD_MAP_TEXT.tooltip.current(tooltip.block.x, tooltip.block.z)}</span>
            {paired && (
              <span>
                {paired.kind === 'nether'
                  ? WORLD_MAP_TEXT.tooltip.nether(paired.point.x, paired.point.z)
                  : WORLD_MAP_TEXT.tooltip.overworld(paired.point.x, paired.point.z)}
              </span>
            )}
          </div>
        )
      }
    >
      <div
        className="relative origin-top-left"
        style={{
          width: map.pixels.width,
          height: map.pixels.height,
          transform: transformStyle(panZoom.view),
        }}
        onPointerDown={(event) => {
          /*
           * 指とペンは「触れた場所」を貼り付ける。掴んで動かすあいだ pointermove は
           * 表示枠（capture 先）へ流れてこの要素には届かないので、押した時点で決める。
           */
          if (event.pointerType === 'mouse') return;
          const block = blockAt(map, panZoom.toContentPoint(event.clientX, event.clientY));
          setPointed(isInside(map, block) ? block : null);
          setTooltip(isInside(map, block) ? { block, pinned: true, x: 0, y: 0 } : null);
        }}
        onPointerMove={(event) => {
          if (event.pointerType !== 'mouse') return;
          const point = panZoom.toContentPoint(event.clientX, event.clientY);
          const block = blockAt(map, point);
          const inside = isInside(map, block);
          setPointed(inside ? block : null);
          if (!inside) {
            setTooltip(null);
            return;
          }
          const frame = event.currentTarget.parentElement?.getBoundingClientRect();
          setTooltip({
            block,
            pinned: false,
            x: frame ? event.clientX - frame.left : 0,
            y: frame ? event.clientY - frame.top : 0,
          });
        }}
        onClick={(event) => {
          const point = panZoom.toContentPoint(event.clientX, event.clientY);
          const block = blockAt(map, point);
          setSelected(isInside(map, block) ? block : null);
        }}
        onPointerLeave={() => {
          /*
           * 貼り付けた吹き出しはここで消さない。指はタップのたびに離れるため、
           * 消してしまうと一瞬しか読めなくなる。次に別の場所へ触れるまで残す。
           */
          if (tooltip?.pinned) return;
          setPointed(null);
          setTooltip(null);
        }}
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
          {WORLD_MAP.marks.filter((entry) => isInside(map, entry)).map((entry) => {
            const at = pixelOf(map, entry);
            const cross = [
              { x1: -mark.arm, y1: 0, x2: mark.arm, y2: 0 },
              { x1: 0, y1: -mark.arm, x2: 0, y2: mark.arm },
            ];
            return (
              <g key={entry.id} transform={`translate(${at.x} ${at.y})`}>
                {/* 縁取りを先に敷く。雪の白でも海の紺でも十字が沈まないようにする */}
                {cross.map((line, index) => (
                  <line key={`halo-${index}`} {...line} stroke={mark.haloColor} strokeWidth={mark.haloWidth} />
                ))}
                {cross.map((line, index) => (
                  <line key={index} {...line} stroke={mark.color} strokeWidth={mark.strokeWidth} />
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
                  {WORLD_MARK_LABELS[entry.id] ?? entry.id}
                </text>
              </g>
            );
          })}
          {selected && isInside(map, selected) && (
            <g transform={`translate(${pixelOf(map, selected).x} ${pixelOf(map, selected).y})`}>
              <circle
                r={mark.arm * 0.55}
                fill="none"
                stroke={mark.haloColor}
                strokeWidth={mark.haloWidth}
                vectorEffect="non-scaling-stroke"
              />
              <circle
                r={mark.arm * 0.55}
                fill="none"
                stroke={theme.accent}
                strokeWidth={mark.strokeWidth}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          )}
        </svg>
      </div>
    </ViewportFrame>
  );
}

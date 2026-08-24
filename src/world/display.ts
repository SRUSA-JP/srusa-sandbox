/**
 * ワールドマップの見せ方の決定。
 *
 * 画像の画素とワールドのブロック座標の行き来、目印の色と寸法をここで決める。
 * コンポーネントは戻り値を属性に渡すだけで、自分で計算しない。
 */
import { WORLD_MAP } from '../config/worldMap';
import { WORLD_MAP_TEXT } from '../config/messages';
import { figureColors } from '../config/colors';
import type { Point } from '../lib/viewport';
import type { VizTheme } from '../theme/palette';
import type { WorldMap } from './schema';

/** ワールドの座標（ブロック）。y は使わないので持たない。 */
export interface BlockPoint {
  x: number;
  z: number;
}

export type CoordinatePairKind = 'nether' | 'overworld';

export interface CoordinatePair {
  kind: CoordinatePairKind;
  point: BlockPoint;
}

function mapDimension(map: WorldMap): string {
  return map.dimension ?? map.id;
}

function isNetherMap(map: WorldMap): boolean {
  const dimension = mapDimension(map).toLowerCase();
  return dimension.includes('nether');
}

function isOverworldMap(map: WorldMap): boolean {
  const dimension = mapDimension(map).toLowerCase();
  return dimension.includes('overworld');
}

/** 画像の画素 → ワールドのブロック座標。 */
export function blockAt(map: WorldMap, point: Point): BlockPoint {
  return {
    x: Math.floor(map.bounds.minX + point.x * map.blocksPerPixel),
    z: Math.floor(map.bounds.minZ + point.y * map.blocksPerPixel),
  };
}

/** ワールドのブロック座標 → 画像の画素。 */
export function pixelOf(map: WorldMap, block: BlockPoint): Point {
  return {
    x: (block.x - map.bounds.minX) / map.blocksPerPixel,
    y: (block.z - map.bounds.minZ) / map.blocksPerPixel,
  };
}

/** ネザーと通常世界で対応する座標。Minecraft の 8:1 換算にする。 */
export function pairedCoordinate(map: WorldMap, block: BlockPoint): CoordinatePair | null {
  if (isNetherMap(map)) {
    return { kind: 'overworld', point: { x: block.x * 8, z: block.z * 8 } };
  }
  if (isOverworldMap(map)) {
    return { kind: 'nether', point: { x: Math.floor(block.x / 8), z: Math.floor(block.z / 8) } };
  }
  return null;
}

/** その座標が画像の中に入っているか。 */
export function isInside(map: WorldMap, block: BlockPoint): boolean {
  return (
    block.x >= map.bounds.minX &&
    block.x < map.bounds.maxX &&
    block.z >= map.bounds.minZ &&
    block.z < map.bounds.maxZ
  );
}

/** 地図が覆っている範囲の広さ（ブロック）。 */
export function coverage(map: WorldMap): { width: number; height: number } {
  return {
    width: map.bounds.maxX - map.bounds.minX,
    height: map.bounds.maxZ - map.bounds.minZ,
  };
}

/** 画面に出す地図の収録座標範囲。max は実際に含まれる最後のブロック座標にする。 */
export function coordinateBounds(map: WorldMap): { minX: number; maxX: number; minZ: number; maxZ: number } {
  return {
    minX: map.bounds.minX,
    maxX: map.bounds.maxX - 1,
    minZ: map.bounds.minZ,
    maxZ: map.bounds.maxZ - 1,
  };
}

/**
 * 目印の見た目。
 *
 * 大きさは画面上で一定にしたいので、拡大率で割った値を返す。
 * 拡大するほど図形は小さく描かれ、結果として画面上では変わらなく見える。
 */
export function markStyle(theme: VizTheme, scale: number) {
  const colors = figureColors(theme);
  const strokeWidth = WORLD_MAP.markStrokeWidth / scale;
  return {
    color: colors.strongText,
    /** 本体と反対の色。一回り太く先に描いて縁取りにする。 */
    haloColor: colors.labelOn(colors.strongText),
    haloWidth: strokeWidth * WORLD_MAP.markHaloScale,
    /** 十字の腕の長さ。 */
    arm: WORLD_MAP.markSize / 2 / scale,
    strokeWidth,
    labelOffset: WORLD_MAP.markLabelOffset / scale,
    labelFontSize: WORLD_MAP.markLabelFontSize / scale,
  };
}

/**
 * 座標の吹き出しを表示枠のどこに置くか（枠の左上が原点の px）。
 *
 * 指やカーソルの右下へずらしつつ、枠からはみ出さないところまで戻す。
 * 狭い画面ほど端に寄りやすいので、この寄せ直しが無いと吹き出しが切れる。
 */
export function tooltipPlacement(anchor: Point, box: { width: number; height: number }): Point {
  const { offset, edgeMargin, width, height } = WORLD_MAP.tooltip;
  return {
    x: Math.min(anchor.x + offset, Math.max(edgeMargin, box.width - width)),
    y: Math.min(anchor.y + offset, Math.max(edgeMargin, box.height - height)),
  };
}

/** 画面下に出す座標の表示。選択、ポインタ、中心の順に優先する。 */
export function coordinateStatus(
  pointed: BlockPoint | null,
  center: BlockPoint,
  selected: BlockPoint | null = null,
): string {
  if (selected) return WORLD_MAP_TEXT.selected(selected.x, selected.z);
  return pointed ? WORLD_MAP_TEXT.pointer(pointed.x, pointed.z) : WORLD_MAP_TEXT.center(center.x, center.z);
}

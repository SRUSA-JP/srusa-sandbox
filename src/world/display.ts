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

/** 画面下に出す座標の表示。指していないときは、いま見ている中心を出す。 */
export function coordinateStatus(block: BlockPoint | null, center: BlockPoint): string {
  return block ? WORLD_MAP_TEXT.pointer(block.x, block.z) : WORLD_MAP_TEXT.center(center.x, center.z);
}

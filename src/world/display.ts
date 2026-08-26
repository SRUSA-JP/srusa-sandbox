/**
 * ワールドマップの見せ方の決定。
 *
 * 画像の画素とワールドのブロック座標の行き来、目印の色と寸法をここで決める。
 * コンポーネントは戻り値を属性に渡すだけで、自分で計算しない。
 */
import { WORLD_MAP } from '../config/worldMap';
import { WORLD_MAP_TEXT } from '../config/messages';
import { figureColors } from '../config/colors';
import { WORLD_DIMENSION_ORDER, WORLD_LABELS } from '../config/labels';
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

export interface WorldMapOption {
  value: string;
  label: string;
}

export interface WorldMapLogRow {
  map: WorldMap;
  label: string;
  dimension: string;
  area: string;
  bounds: ReturnType<typeof coordinateBounds>;
  pixels: string;
  bytes: string;
  updatedOn: string;
}

export function mapDimension(map: WorldMap): string {
  return map.dimension ?? map.id;
}

export function mapDate(map: WorldMap, fallbackDate = ''): string {
  return map.updated_on ?? fallbackDate;
}

function dimensionOrder(dimension: string): number {
  const index = WORLD_DIMENSION_ORDER.findIndex((entry) => entry === dimension);
  return index === -1 ? WORLD_DIMENSION_ORDER.length : index;
}

export function sortDimensions(dimensions: string[]): string[] {
  return [...dimensions].sort(
    (a, b) =>
      dimensionOrder(a) - dimensionOrder(b) ||
      (WORLD_LABELS[a] ?? a).localeCompare(WORLD_LABELS[b] ?? b, 'ja'),
  );
}

function dateLabel(date: string, latestDate = ''): string {
  return latestDate && date === latestDate ? `最新 ${date}` : date;
}

export function mapLabel(map: WorldMap, fallbackDate = '', latestDate = ''): string {
  const dimension = mapDimension(map);
  const base = WORLD_LABELS[dimension] ?? WORLD_LABELS[map.id] ?? map.label ?? map.id;
  const date = mapDate(map, fallbackDate);
  return date ? `${base}（${dateLabel(date, latestDate)}）` : base;
}

function mapArea(map: WorldMap): number {
  const size = coverage(map);
  return size.width * size.height;
}

function mapFreshness(map: WorldMap, fallbackDate = ''): string {
  return mapDate(map, fallbackDate);
}

export function sortMapsForDisplay(maps: WorldMap[], fallbackDate = '', latestDate = ''): WorldMap[] {
  return [...maps].sort(
    (a, b) =>
      mapFreshness(b, fallbackDate).localeCompare(mapFreshness(a, fallbackDate)) ||
      mapArea(b) - mapArea(a) ||
      mapLabel(a, fallbackDate, latestDate).localeCompare(mapLabel(b, fallbackDate, latestDate), 'ja'),
  );
}

export function mapOptionsForDimension(
  maps: WorldMap[],
  dimension: string,
  fallbackDate = '',
  latestDate = '',
): WorldMapOption[] {
  return sortMapsForDisplay(
    maps.filter((entry) => mapDimension(entry) === dimension),
    fallbackDate,
    latestDate,
  ).map((map) => ({
    value: map.id,
    label: mapLabel(map, fallbackDate, latestDate),
  }));
}

export function mapById(maps: WorldMap[], id: string): WorldMap | undefined {
  return maps.find((map) => map.id === id);
}

export function latestWorldMapDate(maps: WorldMap[], fallbackDate = ''): string {
  return [...new Set(maps.map((entry) => mapDate(entry, fallbackDate)).filter(Boolean))].sort((a, b) =>
    b.localeCompare(a),
  )[0] ?? '';
}

export function worldMapLogRows(maps: WorldMap[], fallbackDate = '', latestDate = ''): WorldMapLogRow[] {
  return sortMapsForDisplay(maps, fallbackDate, latestDate).map((map) => {
    const size = coverage(map);
    return {
      map,
      label: mapLabel(map, fallbackDate, latestDate),
      dimension: WORLD_LABELS[mapDimension(map)] ?? mapDimension(map),
      area: `${size.width} x ${size.height}`,
      bounds: coordinateBounds(map),
      pixels: `${map.pixels.width} x ${map.pixels.height}`,
      bytes: `${(map.bytes / 1024 / 1024).toFixed(2)} MB`,
      updatedOn: map.updated_on ?? '-',
    };
  });
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

/**
 * 画面左下に出す座標の行。選択、ポインタ、中心の順に優先する。
 *
 * 対になるワールドがあるとき（オーバーワールド ⇔ ネザー）は、換算した座標を
 * 2 行目に足す。吹き出しを出していなくても行き先の座標が読めるようにするため。
 * ジ・エンドと黄昏の森には対になる相手がいないので 1 行のまま。
 *
 * JSX を返さず行の配列にしておく。ここは「何を出すか」だけを決める層で、
 * どう積むかは組み立てる側の仕事にする。
 */
export function coordinateStatus(
  map: WorldMap,
  pointed: BlockPoint | null,
  center: BlockPoint,
  selected: BlockPoint | null = null,
): string[] {
  const [block, here] = selected
    ? ([selected, WORLD_MAP_TEXT.selected(selected.x, selected.z)] as const)
    : pointed
      ? ([pointed, WORLD_MAP_TEXT.pointer(pointed.x, pointed.z)] as const)
      : ([center, WORLD_MAP_TEXT.center(center.x, center.z)] as const);

  const paired = pairedCoordinate(map, block);
  if (!paired) return [here];
  return [
    here,
    paired.kind === 'nether'
      ? WORLD_MAP_TEXT.paired.nether(paired.point.x, paired.point.z)
      : WORLD_MAP_TEXT.paired.overworld(paired.point.x, paired.point.z),
  ];
}

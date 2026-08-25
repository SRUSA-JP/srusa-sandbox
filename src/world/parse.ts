/**
 * ワールドマップのデータの検証。
 *
 * 自分で作った JSON でも、レンダリングし直したときに形が変わることがある。
 * 壊れたまま描いて座標がずれるより、読めないと言い切るほうが安全なので、
 * 足りない項目は例外にする（ページ側は「まだ無い」として扱う）。
 */
import { DATA_TEXT } from '../config/messages';
import type { WorldBounds, WorldMap, WorldMapDocument } from './schema';

export class WorldMapDataError extends Error {
  constructor(message: string, readonly field: string) {
    super(`${field}: ${message}`);
    this.name = 'WorldMapDataError';
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw new WorldMapDataError(DATA_TEXT.notObject, field);
  return value;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string') throw new WorldMapDataError(DATA_TEXT.notString, field);
  return value;
}

function optionalString(value: unknown, field: string): string | undefined {
  if (value === undefined) return undefined;
  return requireString(value, field);
}

function requireNumber(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new WorldMapDataError(DATA_TEXT.notNumber, field);
  }
  return value;
}

function parseBounds(raw: unknown, field: string): WorldBounds {
  const record = requireRecord(raw, field);
  return {
    minX: requireNumber(record.minX, `${field}.minX`),
    minZ: requireNumber(record.minZ, `${field}.minZ`),
    maxX: requireNumber(record.maxX, `${field}.maxX`),
    maxZ: requireNumber(record.maxZ, `${field}.maxZ`),
  };
}

function parseMap(raw: unknown, index: number): WorldMap {
  const field = `maps[${index}]`;
  const record = requireRecord(raw, field);
  const pixels = requireRecord(record.pixels, `${field}.pixels`);
  return {
    id: requireString(record.id, `${field}.id`),
    dimension: optionalString(record.dimension, `${field}.dimension`),
    label: optionalString(record.label, `${field}.label`),
    updated_on: optionalString(record.updated_on, `${field}.updated_on`),
    image: requireString(record.image, `${field}.image`),
    bounds: parseBounds(record.bounds, `${field}.bounds`),
    pixels: {
      width: requireNumber(pixels.width, `${field}.pixels.width`),
      height: requireNumber(pixels.height, `${field}.pixels.height`),
    },
    blocksPerPixel: requireNumber(record.blocksPerPixel, `${field}.blocksPerPixel`),
    bytes: requireNumber(record.bytes, `${field}.bytes`),
  };
}

export function parseWorldMapDocument(raw: unknown): WorldMapDocument {
  const record = requireRecord(raw, 'world-map');
  const maps = record.maps;
  if (!Array.isArray(maps)) throw new WorldMapDataError(DATA_TEXT.notArray, 'maps');
  const parsedMaps: WorldMap[] = [];
  const issues: string[] = [];
  maps.forEach((entry, index) => {
    try {
      parsedMaps.push(parseMap(entry, index));
    } catch (cause) {
      issues.push(cause instanceof Error ? cause.message : String(cause));
    }
  });
  return {
    generated_on: optionalString(record.generated_on, 'generated_on'),
    source: requireString(record.source, 'source'),
    maps: parsedMaps,
    issues,
  };
}

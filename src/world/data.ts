/**
 * `data/world-map.json` の取り込み。
 *
 * Vite 固有の記述（import.meta.glob）はこのファイルだけに閉じ込める。
 * ファイルが無い状態でもビルドが通るようにしてあるので、BlueMap の出力を
 * まだ用意していない環境でも開発できる。
 */
import { parseWorldMapDocument } from './parse';
import type { WorldMapDocument } from './schema';

const modules = import.meta.glob('../../data/world-map.json', { eager: true }) as Record<
  string,
  { default: unknown }
>;

/** 地図が用意できていれば返す。無ければ null。 */
export function loadWorldMaps(): WorldMapDocument | null {
  const entry = Object.values(modules)[0];
  if (!entry) return null;
  return parseWorldMapDocument(entry.default);
}

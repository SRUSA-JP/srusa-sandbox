/**
 * `data/srusa-relationship-*.json` の取り込み。
 *
 * Vite 固有の記述（import.meta.glob）はこのファイルだけに閉じ込める。
 * 別のバンドラや Node スクリプトから使う場合は、ここを差し替えれば良い。
 */
import { parseRelationshipData, type ParseResult } from './parse';

const modules = import.meta.glob('../../data/srusa-relationship-*.json', { eager: true }) as Record<
  string,
  { default: unknown }
>;

/** ファイル名からバージョン表記を取り出す（例: "v0.2"）。 */
function versionFromPath(path: string): string {
  return path.match(/srusa-relationship-(.+)\.json$/)?.[1] ?? path;
}

export interface RelationshipSource extends ParseResult {
  version: string;
}

/** 最も新しいバージョンのデータを 1 件返す。無ければ null。 */
export function loadRelationshipData(): RelationshipSource | null {
  const entries = Object.entries(modules).sort(([a], [b]) => versionFromPath(b).localeCompare(versionFromPath(a)));
  const latest = entries[0];
  if (!latest) return null;
  return { version: versionFromPath(latest[0]), ...parseRelationshipData(latest[1].default) };
}

import { DATA_TEXT } from '../config/messages';
import { parseStatsDocument } from './parse';
import type { StatsDocument } from './schema';

/**
 * リポジトリの `data/minecraft-stats-*.json` を自動的に取り込む。
 *
 * ファイルを追加すればビルドし直すだけで選択肢に増える（コード変更不要）。
 * 各 JSON は動的 import なので、初期バンドルには含まれない。
 *
 * このファイルだけが Vite 固有（import.meta.glob）に依存している。
 * 別のバンドラや Next.js に移す場合はここを差し替えれば良い。
 */
const modules = import.meta.glob('../../data/minecraft-stats-*.json') as Record<
  string,
  () => Promise<{ default: unknown }>
>;

export interface DatasetRef {
  /** ファイル名から作った ID（例: "20260818"）。 */
  id: string;
  /** UI 表示用のラベル（例: "2026-08-18"）。 */
  label: string;
  path: string;
}

function idFromPath(path: string): string {
  return path.match(/minecraft-stats-(.+)\.json$/)?.[1] ?? path;
}

function labelFromId(id: string): string {
  const m = id.match(/^(\d{4})(\d{2})(\d{2})$/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : id;
}

/** 利用可能なデータセット一覧（新しい順）。 */
export function listDatasets(): DatasetRef[] {
  return Object.keys(modules)
    .map((path) => {
      const id = idFromPath(path);
      return { id, label: labelFromId(id), path };
    })
    .sort((a, b) => b.id.localeCompare(a.id));
}

/** ID を指定してデータセットを読み込む。 */
export async function loadDataset(id: string): Promise<StatsDocument> {
  const entry = Object.entries(modules).find(([path]) => idFromPath(path) === id);
  if (!entry) throw new Error(DATA_TEXT.datasetNotFound(id));
  const mod = await entry[1]();
  return parseStatsDocument(mod.default);
}

/** 日付ごとの推移を描くために、利用可能なデータセットをすべて読み込む（古い順）。 */
export async function loadAllDatasets(): Promise<Array<DatasetRef & { doc: StatsDocument }>> {
  const refs = [...listDatasets()].reverse();
  return Promise.all(refs.map(async (ref) => ({ ...ref, doc: await loadDataset(ref.id) })));
}

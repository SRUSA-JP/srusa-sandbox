/**
 * 数値と ID の整形。
 *
 * 「値をどんな文字列にするか」だけを持つ。画面の文言は config/messages.ts、
 * データ ID の日本語名は config/labels.ts が持つ。
 */

const numberFormat = new Intl.NumberFormat('ja-JP');
const decimalFormats = [
  new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 3 }),
  new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 2 }),
  new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 1 }),
];
const compactFormat = new Intl.NumberFormat('ja-JP', { notation: 'compact', maximumFractionDigits: 1 });

export function formatInt(value: number): string {
  return numberFormat.format(Math.round(value));
}

/**
 * 小数の表示。
 *
 * 1時間あたりの換算値は 0.05 のような小さい数になるため、桁数を値の大きさで
 * 切り替える。そうしないと「0」ばかりのラベルになる。
 */
export function formatDecimal(value: number): string {
  const magnitude = Math.abs(value);
  const format = magnitude < 1 ? decimalFormats[0] : magnitude < 10 ? decimalFormats[1] : decimalFormats[2];
  return format.format(value);
}

/** 軸ラベル用の短縮表記（1.2万 など）。 */
export function formatCompact(value: number): string {
  return compactFormat.format(value);
}

export function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${formatInt(h)}時間${String(m).padStart(2, '0')}分`;
}

/** `minecraft:` 等の名前空間を落として ID 部分だけにする。 */
export function stripNamespace(id: string): string {
  const index = id.indexOf(':');
  return index === -1 ? id : id.slice(index + 1);
}

/** `cave_spider` → `Cave Spider`。翻訳辞書がない ID の既定表示。 */
export function prettifyId(id: string): string {
  return stripNamespace(id)
    .split(/[_/]/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/** 辞書に載っていれば日本語名、無ければ ID から作った既定表示。 */
export function labelFor(id: string, dictionary: Record<string, string>): string {
  return dictionary[stripNamespace(id)] ?? prettifyId(id);
}

/**
 * バイト数を MB で読ませる。
 *
 * 画面に出るのは「載せられる大きさか」を判断するための数なので、
 * 1024 進法で MB まで丸め、小数 1 桁に切り上げる。
 */
export function formatMegabytes(bytes: number): string {
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

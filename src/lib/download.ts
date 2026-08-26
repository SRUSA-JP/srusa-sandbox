/**
 * 画面から JSON を書き出す。
 *
 * 配置の持ち出しと、調整つまみの持ち出しで同じ手順を踏むので 1 か所に置く。
 * ブラウザにしかない仕組み（Blob・URL・a 要素）を使うので、
 * ここだけがそれを知っている状態にする。
 */
export function downloadJson(fileName: string, payload: unknown): void {
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(url);
}

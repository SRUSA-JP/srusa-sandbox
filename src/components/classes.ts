/**
 * 部品をまたいで同じ見た目にするクラスの組み合わせ。
 *
 * ボタン・プルダウン・入力欄のように「別の部品だが同じ操作部品に見えるべき」
 * ものは、ここで組み立てたクラスを共有する。個々の部品でクラスを書き写すと、
 * 片方だけ直し忘れて見た目がずれるため。
 *
 * ここに実値（色コード・px）は書かない。Tailwind のトークン名だけを並べ、
 * 実値は src/styles/index.css を通して theme/ の変数から来る。
 */

/** 操作部品（ボタン・プルダウン）の面と枠。 */
export const CONTROL =
  'cursor-pointer rounded-md border-hairline border-control-line bg-control px-lg py-sm text-control-ink';

/** 操作部品のうち、押せるあいだだけ枠を強調するもの。 */
export const CONTROL_HOVER = 'enabled:hover:border-control-line-hover';

/** 押せないときの薄さ。 */
export const CONTROL_DISABLED =
  'disabled:cursor-default disabled:opacity-[var(--sr-effect-disabled-opacity)]';

/** 見出し付きの入力欄（「下限 [___]」のような並び）。 */
export const FIELD = 'inline-flex items-center gap-sm text-md text-muted';

/** 入力欄そのもの。 */
export const FIELD_INPUT =
  'w-[var(--sr-layout-number-input-width)] rounded-md border-hairline border-control-line bg-control px-md py-sm text-control-ink';

/** 節（グラフ 1 枚 = 記事の 1 節）。枠で囲わず、余白だけで区切る。 */
export const SECTION = 'mb-section';

/** 見出しの右に並べる操作の列。 */
export const ACTIONS = 'flex flex-wrap items-center gap-md';

/** 表。統計の表と、読み物の中の表で同じ見た目にする。 */
export const TABLE = 'w-full border-collapse text-md';

/** 表のセル。数値を並べる表は、これに `whitespace-nowrap` を足す。 */
export const TABLE_CELL = 'border-b-hairline border-table-line px-lg py-sm';

/** 表の見出しセル。 */
export const TABLE_HEAD_CELL = 'bg-table-head font-medium text-table-head-ink';

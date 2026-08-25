import { IconButton } from '../atoms';

export interface DateStepperProps {
  /** いま出しているものの日付。 */
  current: string;
  /** 1 つ前（古い方）へ。移れないときは渡さない。 */
  onOlder?: () => void;
  /** 1 つ後（新しい方）へ。移れないときは渡さない。 */
  onNewer?: () => void;
  /** 古い方へ動かすボタンの説明。読み上げと、指したときの吹き出しに使う。 */
  olderLabel: string;
  /** 新しい方へ動かすボタンの説明。 */
  newerLabel: string;
}

/**
 * 日付を 1 つずつ行き来する操作。
 *
 * 選べる日付が 2 つ 3 つしか無いものに使う（プルダウンにすると、開くまで
 * 何日分あるか分からない）。ここには「何番目か」の判断を持たせず、
 * 動かせる向きだけを呼び出し側が渡す。
 *
 * ViewportControls と同じ面と枠を持たせて、図の隅に並べても高さが揃うようにする。
 */
export function DateStepper({ current, onOlder, onNewer, olderLabel, newerLabel }: DateStepperProps) {
  return (
    <div className="flex items-center gap-xxs rounded-md border-hairline border-divider bg-surface p-xxs">
      <IconButton icon="previous" label={olderLabel} onClick={onOlder ?? (() => {})} disabled={!onOlder} />
      <span className="px-xs font-mono text-sm text-muted tabular-nums">{current}</span>
      <IconButton icon="next" label={newerLabel} onClick={onNewer ?? (() => {})} disabled={!onNewer} />
    </div>
  );
}

import type { ReactNode } from 'react';
import { SECTION } from '../classes';

export interface TechnicalDetailsProps {
  /** 何の詳細かを示す見出し。 */
  title: string;
  /** 開かなくても分かる規模や日付。見出しの右に小さく出す。 */
  note?: string;
  /** 最初から開いておくか。既定は閉じる。 */
  defaultOpen?: boolean;
  children: ReactNode;
}

/**
 * 読まなくてもページは使える、作り手向けの詳細をたたんでおく枠。
 *
 * 生成ログ・出典・検証結果・JSON の読み書きのような、
 * 画面を見に来た人の目当てではないものをここに集めて末尾へ回す
 * （主役の画像とグラフを上に出すため）。
 *
 * NoticePanel と役割が違う。あちらは「読んでほしい注意書き」で常に開いている。
 * こちらは「必要な人だけが開く詳細」なので、既定では閉じておく。
 */
export function TechnicalDetails({ title, note, defaultOpen = false, children }: TechnicalDetailsProps) {
  return (
    <details className={`${SECTION} rounded-lg border-hairline border-divider bg-sunken`} open={defaultOpen}>
      <summary className="cursor-pointer px-xl py-lg text-md font-medium text-heading hover:bg-hover">
        {title}
        {note && <span className="ml-sm text-sm font-normal text-subtle">{note}</span>}
      </summary>
      <div className="grid gap-md border-t-hairline border-divider px-xl py-lg">{children}</div>
    </details>
  );
}

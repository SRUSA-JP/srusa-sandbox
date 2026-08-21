import { PROSE_WIDTH, SECTION } from '../classes';

export interface NoticePanelProps {
  title: string;
  children: string;
}

/**
 * ページ全体にかかる注意書き。
 *
 * 「試験的なコンテンツです」のような、読まなくてもページは使えるが
 * 知っておいてほしいこと。本文のいちばん下に置く。
 *
 * エラーの見た目（赤い枠）にはしない。赤は「いま困っていること」に取っておき、
 * 常に出ている注意書きに使うと、本当のエラーが埋もれるため。
 */
export function NoticePanel({ title, children }: NoticePanelProps) {
  return (
    <aside className={`${SECTION} rounded-lg border-hairline border-divider bg-sunken px-xl py-lg`}>
      <h2 className="text-md font-medium text-heading">{title}</h2>
      <p className={`${PROSE_WIDTH} mt-xs text-md leading-base text-muted`}>{children}</p>
    </aside>
  );
}

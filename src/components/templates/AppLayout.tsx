import type { ReactNode } from 'react';
import { ACTIONS } from '../classes';
import { Note } from '../atoms';

export interface AppLayoutProps {
  /** 画面の名前。 */
  title: string;
  /** 見出しの下に出す出典や規模の説明。 */
  note?: string;
  /** 見出しの右に置く操作（データの読み込み・書き出しなど）。 */
  actions?: ReactNode;
  /** 本文の前に出す知らせ（読み込みの失敗など）。 */
  messages?: ReactNode;
  children: ReactNode;
  /** 画面の末尾に出す出典。 */
  footer?: ReactNode;
}

/**
 * 画面 1 枚の骨格。
 *
 * 見出し・知らせ・本文・出典の並び方だけを決める。何を出すかは
 * ページ（pages/）が決め、この層は中身を知らない。
 * サイト全体の枠（タブ・配色の切り替え）は AppShell が持つ。
 */
export function AppLayout({ title, note, actions, messages, children, footer }: AppLayoutProps) {
  return (
    <div>
      <header className="mb-xl flex flex-wrap items-start justify-between gap-lg">
        <div>
          <h1 className="text-xl text-heading">{title}</h1>
          {note && <Note>{note}</Note>}
        </div>
        {actions && <div className={ACTIONS}>{actions}</div>}
      </header>

      {messages}

      <main>{children}</main>

      {footer && (
        <footer className="flex flex-col gap-xxs border-t-hairline border-divider pt-lg text-sm text-muted">
          {footer}
        </footer>
      )}
    </div>
  );
}

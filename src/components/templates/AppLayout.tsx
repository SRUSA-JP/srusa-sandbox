import type { ReactNode } from 'react';
import { ACTIONS, PROSE_WIDTH } from '../classes';
import { Note } from '../atoms';

export interface AppLayoutProps {
  /** 画面の名前。 */
  title: string;
  /** 見出しの下に出す、ひと目で分かる規模や日付。詳しい出典は footer へ。 */
  note?: string;
  /** 見出しの右に置く操作（データの読み込み・書き出しなど）。 */
  actions?: ReactNode;
  /** いま困っていることの知らせ（読み込みの失敗など）だけをここに出す。 */
  messages?: ReactNode;
  /** この画面の要約。本文の前に 1 段落だけ置く。 */
  lead?: string;
  children: ReactNode;
  /** 本文のあとに出す注意書き（試験的である、など）。 */
  footnotes?: ReactNode;
  /**
   * 作り手向けの詳細（生成ログ・出典・検証結果・JSON の読み書き）。
   *
   * 見に来た人の目当てではないので、注意書きより下・出典より上に置く。
   * たたんでおくかどうかは中身（TechnicalDetails）が決める。
   */
  technical?: ReactNode;
  /** 画面の末尾に出す出典。 */
  footer?: ReactNode;
}

/**
 * 画面 1 枚の骨格。
 *
 * 上から「見出し → 知らせ → 要約 → 本文 → 注意書き → 作り手向けの詳細 → 出典」の順に置く。
 * 主役（グラフ・図）を先に見せ、読まなくても困らない詳細は下へ回す。
 * 何を出すかはページ（pages/）が決め、この層は中身を知らない。
 * サイト全体の枠（タブ・配色の切り替え）は AppShell が持つ。
 */
export function AppLayout({
  title,
  note,
  actions,
  messages,
  lead,
  children,
  footnotes,
  technical,
  footer,
}: AppLayoutProps) {
  return (
    <div>
      <header className="mb-xl flex flex-wrap items-start justify-between gap-lg">
        <div className="min-w-0">
          <h1 className="text-xl tracking-tight text-heading">{title}</h1>
          {note && <Note>{note}</Note>}
        </div>
        {actions && <div className={ACTIONS}>{actions}</div>}
      </header>

      {messages}

      {lead && <p className={`${PROSE_WIDTH} mb-section leading-base`}>{lead}</p>}

      <main>{children}</main>

      {footnotes}

      {technical}

      {footer && (
        <footer className="flex flex-col gap-xxs border-t-hairline border-divider pt-lg text-sm text-subtle">
          {footer}
        </footer>
      )}
    </div>
  );
}

import type { ReactNode } from 'react';
import { ACTIONS } from '../classes';
import { Note } from '../atoms';

export interface SectionHeaderProps {
  title: string;
  /** 読み方や注意点。 */
  note?: string;
  /** 見出しの右に置く操作（プルダウン・ボタン）。 */
  actions?: ReactNode;
}

/** 節の見出し。見出し・注記・操作の並べ方をここだけで決める。 */
export function SectionHeader({ title, note, actions }: SectionHeaderProps) {
  return (
    <header className="mb-lg flex flex-wrap items-start justify-between gap-lg">
      <div>
        {/* 本文より一段大きい程度に留める（節どうしを浮かせない） */}
        <h2 className="text-lg text-heading">{title}</h2>
        {note && <Note>{note}</Note>}
      </div>
      {actions && <div className={ACTIONS}>{actions}</div>}
    </header>
  );
}

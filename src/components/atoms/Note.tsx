import type { ReactNode } from 'react';

export interface NoteProps {
  children: ReactNode;
  /** 読み方の注意は muted、失敗の知らせは error。 */
  tone?: 'muted' | 'error';
}

/** 本文に添える短い文。注記と、エラーの知らせに使う。 */
export function Note({ children, tone = 'muted' }: NoteProps) {
  return tone === 'error' ? (
    <p className="rounded-md border-hairline border-current px-lg py-md text-md break-words text-danger">
      {children}
    </p>
  ) : (
    <p className="mt-xxs text-sm break-words text-muted">{children}</p>
  );
}

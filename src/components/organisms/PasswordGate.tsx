import { useState, type FormEvent, type ReactNode } from 'react';
import { AUTH } from '../../config/auth';
import { APP_TEXT, AUTH_TEXT } from '../../config/messages';
import { CONTROL_BOX, CONTROL_HOVER } from '../classes';
import { Button, Note } from '../atoms';

export interface PasswordGateProps {
  children: ReactNode;
}

function isUnlocked(): boolean {
  try {
    return localStorage.getItem(AUTH.storageKey) === '1';
  } catch {
    /* プライベートモードなどで読めなくても、合言葉の画面を出すだけで済む */
    return false;
  }
}

/**
 * 最低限の認証（合言葉）。
 *
 * クライアント側だけの確認で、本物のアクセス制御ではない（config/auth.ts 参照）。
 * 公開範囲を検討している間、通りすがりを止める程度の初期実装として置く。
 */
export function PasswordGate({ children }: PasswordGateProps) {
  const [unlocked, setUnlocked] = useState(isUnlocked);
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  if (unlocked) return <>{children}</>;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (value !== AUTH.password) {
      setError(true);
      return;
    }
    try {
      localStorage.setItem(AUTH.storageKey, '1');
    } catch {
      /* 保存できなくても、今回開いた分だけは通す */
    }
    setUnlocked(true);
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-page p-xl">
      <form onSubmit={submit} className="grid w-full max-w-[var(--sr-layout-auth-form-width)] gap-lg">
        <div className="grid gap-xxs text-center">
          <h1 className="text-xl font-bold tracking-tight text-heading">{APP_TEXT.siteName}</h1>
          <p className="text-sm text-muted">{AUTH_TEXT.note}</p>
        </div>

        <label className="grid gap-xxs text-md text-muted">
          {AUTH_TEXT.label}
          <input
            type="password"
            autoFocus
            className={`${CONTROL_BOX} ${CONTROL_HOVER} w-full px-md`}
            value={value}
            onChange={(event) => {
              setValue(event.target.value);
              setError(false);
            }}
          />
        </label>

        {error && <Note tone="error">{AUTH_TEXT.error}</Note>}

        <Button label={AUTH_TEXT.submit} type="submit" />
      </form>
    </div>
  );
}

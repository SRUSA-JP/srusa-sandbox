import { type FormEvent, type ReactNode, useId, useState } from 'react';
import { APP_TEXT } from '../../config/messages';
import { CONTROL, CONTROL_DISABLED, CONTROL_HOVER } from '../classes';
import { PasswordField } from '../molecules';

const AUTH_PASSWORD = 'Srusa1234！';
const AUTH_STORAGE_KEY = 'srusa-authenticated';

export interface AuthGateProps {
  children: ReactNode;
}

function isStoredAuthenticated() {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    return window.localStorage.getItem(AUTH_STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
}

function normalizePassword(password: FormDataEntryValue | null) {
  return typeof password === 'string' ? password.trim().normalize('NFKC') : '';
}

export function AuthGate({ children }: AuthGateProps) {
  const [authenticated, setAuthenticated] = useState(isStoredAuthenticated);
  const [error, setError] = useState('');
  const inputId = useId();

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = normalizePassword(data.get('password'));

    if (password === normalizePassword(AUTH_PASSWORD)) {
      if (typeof window !== 'undefined') {
        try {
          window.localStorage.setItem(AUTH_STORAGE_KEY, 'true');
        } catch {
          // localStorage が使えないブラウザでも、その場の表示は通す。
        }
      }
      setAuthenticated(true);
      setError('');
      return;
    }

    setError(APP_TEXT.auth.error);
  }

  if (authenticated) {
    return children;
  }

  return (
    <main className="flex min-h-app items-center overflow-y-auto bg-page p-app-safe text-ink">
      <form
        className="mx-auto grid w-full max-w-[var(--sr-layout-auth-form-width)] gap-lg rounded-md border-hairline border-divider bg-surface p-lg sm:gap-xl sm:p-xl"
        onSubmit={handleSubmit}
      >
        <div className="min-w-0">
          <p className="text-sm font-medium text-muted">{APP_TEXT.siteName}</p>
          <h1 className="mt-xs text-xl font-bold leading-tight text-heading">{APP_TEXT.auth.title}</h1>
        </div>

        <div className="grid gap-sm">
          <label className="text-sm font-medium text-heading" htmlFor={inputId}>
            {APP_TEXT.auth.passwordLabel}
          </label>
          <PasswordField
            id={inputId}
            name="password"
            onInput={() => setError('')}
            invalid={Boolean(error)}
          />
          {error && (
            <p className="text-sm text-danger" role="alert">
              {error}
            </p>
          )}
        </div>

        <button
          type="submit"
          className={`${CONTROL} ${CONTROL_HOVER} ${CONTROL_DISABLED} w-full text-center font-medium`}
        >
          {APP_TEXT.auth.submit}
        </button>
      </form>
    </main>
  );
}

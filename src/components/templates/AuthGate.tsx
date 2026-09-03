import { type FormEvent, type ReactNode, useId, useState } from 'react';
import { AUTH_PASSWORD } from '../../config/auth';
import { APP_TEXT } from '../../config/messages';
import { CONTROL, CONTROL_DISABLED, CONTROL_HOVER } from '../classes';
import { PasswordField } from '../molecules';

const AUTH_STORAGE_KEY = 'srusa-authenticated';
const AUTH_LOG_STORAGE_KEY = 'srusa-auth-login-at';
const AUTH_COOKIE_NAME = 'srusa_auth';
const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 365;

export interface AuthGateProps {
  children: ReactNode;
}

function isStoredAuthenticated() {
  if (typeof window === 'undefined') {
    return false;
  }

  try {
    if (window.localStorage.getItem(AUTH_STORAGE_KEY) === 'true') {
      return true;
    }
  } catch {
    // localStorage が使えない環境では cookie を見る。
  }

  if (typeof document === 'undefined') {
    return false;
  }

  return document.cookie
    .split(';')
    .map((entry) => entry.trim())
    .some((entry) => entry === `${AUTH_COOKIE_NAME}=true`);
}

function normalizePassword(password: FormDataEntryValue | null) {
  return typeof password === 'string' ? password.trim().normalize('NFKC') : '';
}

function rememberAuthentication() {
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(AUTH_STORAGE_KEY, 'true');
      window.localStorage.setItem(AUTH_LOG_STORAGE_KEY, new Date().toISOString());
    } catch {
      // localStorage が使えないブラウザでも cookie 側でできるだけ保持する。
    }
  }

  if (typeof document !== 'undefined') {
    const secure = window.location.protocol === 'https:' ? '; Secure' : '';
    document.cookie = `${AUTH_COOKIE_NAME}=true; Max-Age=${AUTH_COOKIE_MAX_AGE_SECONDS}; Path=/; SameSite=Lax${secure}`;
  }
}

export function AuthGate({ children }: AuthGateProps) {
  const [authenticated, setAuthenticated] = useState(isStoredAuthenticated);
  const [error, setError] = useState('');
  const inputId = useId();
  const logoSrc = `${import.meta.env.BASE_URL}icons/srusa-32.png`;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const password = normalizePassword(data.get('password'));

    if (password === normalizePassword(AUTH_PASSWORD)) {
      rememberAuthentication();
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
        <div className="flex min-w-0 items-start gap-sm">
          <a href="#/" aria-label={APP_TEXT.homeLink} className="shrink-0 hover:bg-hover">
            <img
              src={logoSrc}
              alt={APP_TEXT.logoAlt}
              className="h-[var(--sr-layout-logo-size)] w-[var(--sr-layout-logo-size)] rounded-sm border-hairline border-divider bg-sunken"
            />
          </a>
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted">{APP_TEXT.siteName}</p>
            <h1 className="mt-xs text-xl font-bold leading-tight text-heading">{APP_TEXT.auth.title}</h1>
          </div>
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
          <p className="text-sm text-muted">{APP_TEXT.auth.passwordHint}</p>
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

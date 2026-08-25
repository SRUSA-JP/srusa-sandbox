import { useState } from 'react';
import { APP_TEXT } from '../../config/messages';
import { CONTROL, CONTROL_HOVER, FIELD_INPUT_FULL } from '../classes';

export interface PasswordFieldProps {
  id: string;
  name: string;
  invalid: boolean;
  onInput: () => void;
}

export function PasswordField({ id, name, invalid, onInput }: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);
  const label = visible ? APP_TEXT.auth.hidePassword : APP_TEXT.auth.showPassword;

  return (
    <div className="flex gap-sm">
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        onInput={onInput}
        className={`${FIELD_INPUT_FULL} min-w-0 flex-1 text-[var(--sr-layout-auth-input-font-size)]`}
        autoComplete="current-password"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        enterKeyHint="go"
        aria-invalid={invalid}
      />
      <button
        type="button"
        className={`${CONTROL} ${CONTROL_HOVER} shrink-0 font-medium`}
        onClick={() => setVisible((current) => !current)}
        aria-pressed={visible}
      >
        {label}
      </button>
    </div>
  );
}

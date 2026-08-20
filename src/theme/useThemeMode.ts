import { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { applySkin, type Skin } from '../config/skins';
import { applyDesignTokens } from './cssVariables';
import { DARK_THEME, LIGHT_THEME, type ThemeMode, type VizTheme } from './palette';

/**
 * 配色の選び方。
 *
 * `system` は OS の設定に従う（切り替えにも追随する）。
 * 利用者が明示的に選んだときだけ light / dark に固定する。
 */
export type ThemePreference = 'system' | 'light' | 'dark';

/** 選んだ配色の保存先。キーの定義はこのファイルだけが持つ。 */
const STORAGE_KEY = 'srusa-sandbox.theme';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/** OS の配色設定。 */
function systemMode(): ThemeMode {
  if (typeof window === 'undefined') return 'light';
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

/** 前回選んだ配色。保存が無い・壊れている場合は OS 設定に従う。 */
export function storedPreference(): ThemePreference {
  if (typeof window === 'undefined') return 'system';
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === 'light' || saved === 'dark' ? saved : 'system';
}

/** 選び方と OS 設定から、実際に使う配色を決める唯一の入口。 */
export function resolveMode(preference: ThemePreference): ThemeMode {
  return preference === 'system' ? systemMode() : preference;
}

/** 配色とスキンから、実際に使うテーマを組み立てる唯一の入口。 */
export function buildTheme(mode: ThemeMode, skin: Skin): VizTheme {
  return applySkin(mode === 'dark' ? DARK_THEME : LIGHT_THEME, skin);
}

export interface AppTheme {
  theme: VizTheme;
  preference: ThemePreference;
  setPreference: (preference: ThemePreference) => void;
}

/**
 * 表示中のテーマ。
 *
 * 利用者が選んだ配色（無ければ OS 設定）と、そのページのスキン
 * （config/skins.ts）を重ねて組み立てる。色とトークンは CSS カスタム
 * プロパティとして流し込むので、Tailwind 側に実値を書く必要がない。
 */
export function useAppTheme(skin: Skin): AppTheme {
  const [preference, setStoredPreference] = useState<ThemePreference>(storedPreference);
  const [mode, setMode] = useState<ThemeMode>(() => resolveMode(preference));

  /* OS 設定に従っている間は、その切り替えにも追随する */
  useEffect(() => {
    setMode(resolveMode(preference));
    if (preference !== 'system') return;
    const media = window.matchMedia(DARK_QUERY);
    const update = () => setMode(systemMode());
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    setStoredPreference(next);
    if (next === 'system') window.localStorage.removeItem(STORAGE_KEY);
    else window.localStorage.setItem(STORAGE_KEY, next);
  }, []);

  const theme = useMemo(() => buildTheme(mode, skin), [mode, skin]);

  /* 描画のあとに色が変わると一瞬ちらつくので、レイアウト確定前に流し込む */
  useLayoutEffect(() => {
    applyDesignTokens(theme, skin);
  }, [theme, skin]);

  return { theme, preference, setPreference };
}

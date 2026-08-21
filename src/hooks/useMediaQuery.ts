import { useCallback, useSyncExternalStore } from 'react';
import { BREAKPOINT } from '../theme/tokens';

/** 画面の幅が境目より狭いかを問い合わせるメディアクエリ。 */
export function maxWidthQuery(width: number): string {
  return `(max-width: ${width - 1}px)`;
}

/**
 * メディアクエリに合っているか。画面の回転やウィンドウ幅の変化にも追随する。
 *
 * ブラウザ側の状態を購読するので、`useState` + `useEffect` ではなく
 * `useSyncExternalStore` を使う。効果の中で状態を書き戻すと、初回に
 * 余分な再描画が挟まって画面がちらつくため。
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const media = window.matchMedia(query);
      media.addEventListener('change', onChange);
      return () => media.removeEventListener('change', onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    /* 画面が無い環境（ビルド時など）では広い画面として扱う */
    () => false,
  );
}

/** スマートフォン相当の狭い画面か。境目は theme/tokens.ts の BREAKPOINT が持つ。 */
export function useIsCompact(): boolean {
  return useMediaQuery(maxWidthQuery(BREAKPOINT.compact));
}

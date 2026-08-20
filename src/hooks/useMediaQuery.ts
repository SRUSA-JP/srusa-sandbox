import { useEffect, useState } from 'react';
import { BREAKPOINT } from '../theme/tokens';

/** 画面の幅が境目より狭いかを問い合わせるメディアクエリ。 */
export function maxWidthQuery(width: number): string {
  return `(max-width: ${width - 1}px)`;
}

/** メディアクエリに合っているか。画面の回転やウィンドウ幅の変化にも追随する。 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);

  useEffect(() => {
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, [query]);

  return matches;
}

/** スマートフォン相当の狭い画面か。境目は theme/tokens.ts の BREAKPOINT が持つ。 */
export function useIsCompact(): boolean {
  return useMediaQuery(maxWidthQuery(BREAKPOINT.compact));
}

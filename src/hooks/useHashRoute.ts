import { useCallback, useEffect, useState } from 'react';
import { routeFromHash, type Route } from '../routes';

/**
 * URL のハッシュで画面を切り替える。
 *
 * ルーティングのライブラリを入れるほどの画面数ではないので、
 * `#/相対パス` と `hashchange` だけで済ませる。ハッシュにしているのは、
 * 静的ホスティング（GitHub Pages など）でサーバー側の設定なしに
 * 再読み込みとブックマークができるため。
 */
export function useHashRoute(): { route: Route; navigate: (route: Route) => void } {
  const [route, setRoute] = useState<Route>(() => routeFromHash(window.location.hash));

  useEffect(() => {
    const update = () => setRoute(routeFromHash(window.location.hash));
    window.addEventListener('hashchange', update);
    return () => window.removeEventListener('hashchange', update);
  }, []);

  const navigate = useCallback((next: Route) => {
    window.location.hash = next.path;
  }, []);

  return { route, navigate };
}

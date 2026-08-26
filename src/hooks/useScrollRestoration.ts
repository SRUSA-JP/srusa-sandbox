import { useEffect, useLayoutEffect, useRef } from 'react';

/**
 * 画面ごとにスクロールの高さを覚えて、戻ってきたときに同じ位置へ返す。
 *
 * 図鑑からひとりの紹介ページへ入って戻ると、一覧の先頭に飛ばされて
 * どこを見ていたか分からなくなる。ブラウザの戻ると違って、このサイトの
 * 「図鑑へ戻る」は新しい履歴を積むので、ブラウザ側の復元も効かない。
 * そこで画面（URL のハッシュ）ごとに高さを覚えておき、同じ画面に
 * 入り直したときだけその高さへ戻す。
 *
 * 初めて開く画面には覚えている高さが無いので、先頭から見せる。
 */

/** 画面の URL → 最後に見ていた高さ。再読み込みまでの間だけ覚えていればよい。 */
const positions = new Map<string, number>();

/**
 * 高さが足りるまで待つ最大フレーム数。
 *
 * 画面を切り替えた直後は、アイコンの画像がまだ読み込まれておらず
 * ページが本来の高さになっていない。そこへ一度だけ scrollTo しても、
 * その時点で行ける一番下（＝ほぼ先頭）で止まってしまう。
 * 描画が進むのを待ちながら、届くまで数フレーム試す。
 */
const RESTORE_MAX_FRAMES = 40;

export function useScrollRestoration(key: string): void {
  /*
   * いま見ている画面。スクロールを覚えるときに使う。
   * 下の復元より先に更新するので、復元で起きるスクロールも
   * 新しい画面のものとして正しく記録される。
   */
  const activeKey = useRef(key);

  useLayoutEffect(() => {
    activeKey.current = key;
    const target = positions.get(key) ?? 0;

    window.scrollTo(0, target);
    if (target === 0) return;

    /*
     * まだページが短くて届かないときは、描画が進むのを待って試し直す。
     * 途中で自分でスクロールした人の邪魔をしないよう、操作があればやめる。
     */
    let frames = 0;
    let request = 0;
    let cancelled = false;

    const stop = () => {
      cancelled = true;
      cancelAnimationFrame(request);
    };

    const settle = () => {
      if (cancelled) return;
      if (Math.abs(window.scrollY - target) <= 1 || frames >= RESTORE_MAX_FRAMES) return;
      frames += 1;
      window.scrollTo(0, target);
      request = requestAnimationFrame(settle);
    };

    request = requestAnimationFrame(settle);
    window.addEventListener('wheel', stop, { passive: true, once: true });
    window.addEventListener('touchstart', stop, { passive: true, once: true });
    window.addEventListener('keydown', stop, { once: true });

    return () => {
      stop();
      window.removeEventListener('wheel', stop);
      window.removeEventListener('touchstart', stop);
      window.removeEventListener('keydown', stop);
    };
  }, [key]);

  /*
   * 画面を離れる直前の高さを覚える。
   *
   * スクロールのたびに覚えると、画面が切り替わってページが短くなった瞬間に
   * ブラウザが位置を丸め、その値（＝ほぼ先頭）で上書きしてしまう。
   * クリックと戻る操作は描き直しより先に起きるので、その時点なら
   * まだ前の画面の高さのまま読める。
   */
  useEffect(() => {
    const remember = () => positions.set(activeKey.current, window.scrollY);
    document.addEventListener('click', remember, { capture: true });
    window.addEventListener('popstate', remember);
    return () => {
      document.removeEventListener('click', remember, { capture: true });
      window.removeEventListener('popstate', remember);
    };
  }, []);
}

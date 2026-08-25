export interface ClipEntry {
  id: string;
  title: string;
  sourceUrl: string;
  note?: string;
}

/**
 * Clips ページに最初から並べる動画。
 *
 * URL を追加・差し替えたいときはここだけを編集する。YouTube / Twitch は
 * 通常の共有 URL でも iframe 用 URL に変換される。
 */
export const CLIP_ENTRIES: ClipEntry[] = [];

export const CLIP_TEXT = {
  title: 'Clips',
  note: '動画クリップを iframe で確認するページ',
  lead: 'SRUSA の動画クリップや配信切り抜きを、サイト内で見比べるための画面です。',
  picker: 'クリップ',
  customUrl: 'URL',
  customTitle: '入力したURL',
  show: '表示',
  empty: 'まだ登録済みのクリップはありません。URL を入力すると、この画面で表示できます。',
  invalidUrl: 'https:// または http:// で始まる URL を入力してください。',
  iframeTitle: (title: string) => `${title} の埋め込みプレイヤー`,
} as const;

export function clipOptions() {
  return CLIP_ENTRIES.map((clip) => ({ value: clip.id, label: clip.title }));
}

export function findClip(id: string): ClipEntry | undefined {
  return CLIP_ENTRIES.find((clip) => clip.id === id);
}

export function embedUrlFromClipUrl(sourceUrl: string, parentHost = globalThis.location?.hostname ?? ''): string {
  const trimmed = sourceUrl.trim();
  if (!trimmed) return '';

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return '';
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';

  const host = url.hostname.replace(/^www\./, '');

  if (host === 'youtu.be') {
    const videoId = url.pathname.split('/').filter(Boolean)[0];
    return videoId ? `https://www.youtube.com/embed/${videoId}` : '';
  }

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    const videoId = url.searchParams.get('v');
    const shortsId = url.pathname.match(/^\/shorts\/([^/]+)/)?.[1];
    const embedId = url.pathname.match(/^\/embed\/([^/]+)/)?.[1];
    const id = videoId ?? shortsId ?? embedId;
    return id ? `https://www.youtube.com/embed/${id}` : trimmed;
  }

  if (host === 'clips.twitch.tv') {
    const clip = url.pathname.split('/').filter(Boolean)[0];
    return clip
      ? `https://clips.twitch.tv/embed?clip=${encodeURIComponent(clip)}&parent=${encodeURIComponent(parentHost)}`
      : '';
  }

  if (host === 'twitch.tv') {
    const clip = url.pathname.match(/\/clip\/([^/]+)/)?.[1];
    return clip
      ? `https://clips.twitch.tv/embed?clip=${encodeURIComponent(clip)}&parent=${encodeURIComponent(parentHost)}`
      : trimmed;
  }

  return trimmed;
}

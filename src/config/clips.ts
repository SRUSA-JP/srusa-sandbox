import valorantClipsRaw from '../data/valorantClips.json';

export interface ClipEntry {
  id: string;
  title: string;
  sourceUrl: string;
  category: string;
  map?: string;
  agent?: string;
  views?: number;
  tags: string[];
  score?: Partial<ClipScore>;
  thumbnailUrl?: string;
  note?: string;
}

export interface ClipScore {
  smooth: number;
  clutch: number;
  tap: number;
  '6kills': number;
  onemag: number;
}

export interface ClipFilterOption {
  value: string;
  label: string;
  count: number;
}

export interface ClipFilterGroup {
  id: 'map' | 'agent' | 'play' | 'weapon';
  label: string;
  options: ClipFilterOption[];
}

export type ClipSortKey = 'score' | 'title' | 'views';

type ValorantClipRaw = {
  id: string;
  url: string;
  title: string;
  map: string;
  agent: string;
  views: number;
  tags?: string[];
  score?: Partial<ClipScore>;
};

const SCORE_DEFAULTS: ClipScore = { smooth: 2, clutch: 0, tap: 3, '6kills': 0, onemag: 0 };

const TAG_LABELS: Record<string, string> = {
  op: 'OP',
  guardian: 'Guardian',
  ghost: 'Ghost',
  bundit: 'Bundit',
  vandal: 'Vandal',
  bucky: 'Bucky',
  spectre: 'Spectre',
  classic: 'Classic',
  clutch: 'Clutch',
  smooth: 'Smooth',
  onemagazine: '1Mag',
  '6kills': '6kills',
  ult: 'Ult',
};

const PLAY_TAGS = ['clutch', 'ult', 'onemagazine', 'smooth', '6kills'] as const;
const WEAPON_TAGS = ['vandal', 'ghost', 'guardian', 'bundit', 'op', 'bucky', 'spectre', 'classic'] as const;

/**
 * Clips ページに最初から並べる動画。
 *
 * URL を追加・差し替えたいときはここだけを編集する。YouTube / Twitch は
 * 通常の共有 URL でも iframe 用 URL に変換される。
 */
export const CLIP_ENTRIES: ClipEntry[] = (valorantClipsRaw as ValorantClipRaw[]).map((clip) => ({
  id: clip.id,
  title: clip.title,
  sourceUrl: clip.url,
  category: 'valorant',
  map: clip.map,
  agent: clip.agent,
  views: clip.views,
  tags: clip.tags ?? [],
  score: clip.score,
  thumbnailUrl: `https://img.youtube.com/vi/${clip.id}/hqdefault.jpg`,
}));

export const CLIP_TEXT = {
  title: 'Clips',
  note: '動画クリップをタグで探して iframe で確認するページ',
  lead: 'Valorant のクリップをカード状に並べ、MAP・AGENT・タグで絞り込めるギャラリーです。',
  picker: 'クリップ',
  customUrl: 'URL',
  customTitle: '入力したURL',
  show: '表示',
  featured: '選択中のクリップ',
  gallery: 'Clip Gallery',
  result: (count: number, total: number) => `${count} / ${total} 件`,
  sort: '並び替え',
  filters: {
    all: 'ALL',
    map: 'MAP',
    agent: 'AGENT',
    play: 'PLAY',
    weapon: 'WEAPON',
  },
  sorts: {
    score: 'スコア順',
    title: 'タイトル順',
    views: '再生数順',
  },
  empty: 'まだ登録済みのクリップはありません。URL を入力すると、この画面で表示できます。',
  noMatch: '条件に合うクリップがありません。',
  invalidUrl: 'https:// または http:// で始まる URL を入力してください。',
  iframeTitle: (title: string) => `${title} の埋め込みプレイヤー`,
} as const;

export function clipOptions() {
  return CLIP_ENTRIES.map((clip) => ({ value: clip.id, label: clip.title }));
}

export function findClip(id: string): ClipEntry | undefined {
  return CLIP_ENTRIES.find((clip) => clip.id === id);
}

export function normalizedClipScore(clip: ClipEntry): ClipScore {
  return { ...SCORE_DEFAULTS, ...clip.score };
}

export function clipScoreTotal(clip: ClipEntry): number {
  const score = normalizedClipScore(clip);
  return score.smooth + score.clutch + score.tap + score['6kills'] + score.onemag;
}

export function capFirst(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export function clipKeywords(clip: ClipEntry): string[] {
  const keywords = new Set(clip.tags);
  if (clip.title.toLowerCase().includes('ult')) keywords.add('ult');
  return [...keywords];
}

export function clipKeywordLabel(value: string): string {
  return TAG_LABELS[value] ?? capFirst(value);
}

function countBy(values: string[]) {
  return values.reduce<Record<string, number>>((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1;
    return counts;
  }, {});
}

function optionsFromCounts(counts: Record<string, number>): ClipFilterOption[] {
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([value, count]) => ({ value, label: capFirst(value), count }));
}

function keywordOptions(entries: ClipEntry[], keywords: readonly string[]): ClipFilterOption[] {
  return keywords
    .map((value) => ({
      value,
      label: clipKeywordLabel(value),
      count: entries.filter((clip) => clipKeywords(clip).includes(value)).length,
    }))
    .filter((option) => option.count > 0);
}

export function clipFilterGroups(entries = CLIP_ENTRIES): ClipFilterGroup[] {
  return [
    {
      id: 'map',
      label: CLIP_TEXT.filters.map,
      options: optionsFromCounts(countBy(entries.map((clip) => clip.map).filter(Boolean) as string[])),
    },
    {
      id: 'agent',
      label: CLIP_TEXT.filters.agent,
      options: optionsFromCounts(countBy(entries.map((clip) => clip.agent).filter(Boolean) as string[])),
    },
    { id: 'play', label: CLIP_TEXT.filters.play, options: keywordOptions(entries, PLAY_TAGS) },
    { id: 'weapon', label: CLIP_TEXT.filters.weapon, options: keywordOptions(entries, WEAPON_TAGS) },
  ];
}

export function sortClips(entries: ClipEntry[], sortKey: ClipSortKey): ClipEntry[] {
  return [...entries].sort((a, b) => {
    if (sortKey === 'title') return a.title.localeCompare(b.title);
    if (sortKey === 'views') return (b.views ?? 0) - (a.views ?? 0);
    return clipScoreTotal(b) - clipScoreTotal(a);
  });
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

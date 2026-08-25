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

const SCORE_DEFAULTS: ClipScore = { smooth: 2, clutch: 0, tap: 3, '6kills': 0, onemag: 0 };

const TAG_LABELS: Record<string, string> = {
  clutch: 'クラッチ',
  miracle: 'ミラクル',
  comeback: '逆転',
  build: '建築',
  chaos: 'わちゃわちゃ',
  highlight: 'ハイライト',
  accident: '事故',
  teamwork: '連携',
  tutorial: '解説',
  memorial: '記念',
};

const SCENE_TAGS = ['clutch', 'miracle', 'comeback', 'build', 'chaos'] as const;
const TOPIC_TAGS = ['highlight', 'accident', 'teamwork', 'tutorial', 'memorial'] as const;

/**
 * ギャラリーページに最初から並べる動画。
 *
 * URL を追加・差し替えたいときはここだけを編集する。YouTube / Twitch は
 * 通常の共有 URL でも iframe 用 URL に変換される。
 */
export const CLIP_ENTRIES: ClipEntry[] = [
  {
    id: 'sample-minecraft',
    title: 'ダミー: Minecraft 建築名シーン',
    sourceUrl: '',
    category: 'sample',
    map: 'minecraft',
    agent: 'nodoamen',
    views: 0,
    tags: ['build', 'tutorial'],
    score: { smooth: 3, clutch: 0, tap: 2, '6kills': 0, onemag: 0 },
    note: '本番動画を入れる前の表示確認用データです。',
  },
  {
    id: 'sample-mahjong',
    title: 'ダミー: 麻雀 逆転名シーン',
    sourceUrl: '',
    category: 'sample',
    map: 'mahjong',
    agent: 'natch',
    views: 0,
    tags: ['comeback', 'highlight'],
    score: { smooth: 4, clutch: 0, tap: 3, '6kills': 0, onemag: 0 },
    note: '本番動画を入れる前の表示確認用データです。',
  },
  {
    id: 'sample-apex',
    title: 'ダミー: Apex 連携名シーン',
    sourceUrl: '',
    category: 'sample',
    map: 'apex',
    agent: 'mitiglia',
    views: 0,
    tags: ['clutch', 'teamwork'],
    score: { smooth: 2, clutch: 2, tap: 4, '6kills': 0, onemag: 0 },
    note: '本番動画を入れる前の表示確認用データです。',
  },
  {
    id: 'sample-splatoon',
    title: 'ダミー: Splatoon ミラクル名シーン',
    sourceUrl: '',
    category: 'sample',
    map: 'splatoon',
    agent: 'octbee',
    views: 0,
    tags: ['miracle', 'accident'],
    score: { smooth: 3, clutch: 1, tap: 3, '6kills': 0, onemag: 0 },
    note: '本番動画を入れる前の表示確認用データです。',
  },
  {
    id: 'sample-party',
    title: 'ダミー: パーティゲーム わちゃわちゃ名シーン',
    sourceUrl: '',
    category: 'sample',
    map: 'party',
    agent: 'sohei',
    views: 0,
    tags: ['chaos', 'memorial'],
    score: { smooth: 2, clutch: 0, tap: 2, '6kills': 0, onemag: 1 },
    note: '本番動画を入れる前の表示確認用データです。',
  },
];

export const CLIP_TEXT = {
  title: 'ギャラリー',
  note: 'SRUSA のいろんなゲームの名シーンをタグで探して iframe で確認するページ',
  lead: 'これから動画を入れる前の仮ギャラリーです。ゲーム、プレイヤー、シーン、タグで名シーンを探せる形だけ先に確認できます。',
  picker: '動画',
  customUrl: 'URL',
  customTitle: '入力したURL',
  show: '表示',
  featured: '選択中の名シーン',
  gallery: '名シーンギャラリー',
  result: (count: number, total: number) => `${count} / ${total} 件`,
  sort: '並び替え',
  filters: {
    all: 'ALL',
    map: 'GAME',
    agent: 'PLAYER',
    play: 'SCENE',
    weapon: 'TAG',
  },
  sorts: {
    score: 'スコア順',
    title: 'タイトル順',
    views: '再生数順',
  },
  empty: 'この名シーンにはまだ動画URLがありません。URL を入力すると、この画面で表示できます。',
  noMatch: '条件に合う名シーンがありません。',
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
    { id: 'play', label: CLIP_TEXT.filters.play, options: keywordOptions(entries, SCENE_TAGS) },
    { id: 'weapon', label: CLIP_TEXT.filters.weapon, options: keywordOptions(entries, TOPIC_TAGS) },
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

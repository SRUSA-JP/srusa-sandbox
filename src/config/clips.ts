/** 名シーンの中身。動画（埋め込み）か画像（そのまま表示）か、まだ URL が無いか。 */
export type ClipMedia = 'video' | 'image' | 'none';

export interface ClipEntry {
  id: string;
  title: string;
  /** 動画の共有 URL、または画像の URL（同梱画像は `images/…` の相対パス）。 */
  sourceUrl: string;
  category: string;
  /** ゲーム。表示名は GAME_LABELS が持つ。 */
  map?: string;
  /**
   * 登場人物（出てくる順）。
   *
   * 並びに意味があるので配列で持つ。1 人だけの名シーンでも配列にする
   * （人数で書き方が変わると、読む側も書く側も分岐が増える）。
   */
  cast?: string[];
  views?: number;
  tags: string[];
  score?: Partial<ClipScore>;
  thumbnailUrl?: string;
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

/**
 * ゲームの表示名。
 *
 * ID から機械的に作らない。PEAK や APEX のように、頭文字だけ大文字にすると
 * 違う名前になってしまうものがある。
 */
const GAME_LABELS: Record<string, string> = {
  peak: 'PEAK',
  apex: 'APEX',
  valorant: 'VALORANT',
  minecraft: 'Minecraft',
  mahjong: '麻雀',
  splatoon: 'Splatoon',
  party: 'パーティゲーム',
};

export function gameLabel(value: string): string {
  return GAME_LABELS[value] ?? capFirst(value);
}

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
 * ギャラリーページに最初から並べる名シーン。
 *
 * URL を追加・差し替えたいときはここだけを編集する。YouTube / Twitch は
 * 通常の共有 URL でも iframe 用 URL に変換される。
 * 画像（png / jpg / gif / webp など）もそのまま置ける。同梱の画像は
 * `public/` からの相対パス（`images/…`）で書く。
 *
 * ダミーデータは常設しない。ただし、実際に URL を用意する予定が
 * はっきりしている対象（下の `id` が示すゲーム）に限り、URL が届くまでの
 * 一時的なプレースホルダー（`sourceUrl: ''`）を置いてよい。届き次第、
 * その項目を実データに差し替える。
 */
export const CLIP_ENTRIES: ClipEntry[] = [
  {
    id: 'peak-goal-mae',
    title: 'ゴール目前',
    sourceUrl: 'https://youtu.be/3IXqfIS8A_Y',
    category: 'clip',
    map: 'peak',
    cast: ['taraba01414', 'gaburichan', 'detkent', 'nodoame'],
    tags: ['highlight'],
  },
  {
    id: 'apex-custom-placeholder',
    title: 'プレースホルダー: APEX カスタム',
    sourceUrl: '',
    category: 'placeholder',
    map: 'apex',
    tags: [],
  },
  {
    id: 'valorant-custom-placeholder',
    title: 'プレースホルダー: VALORANT カスタム',
    sourceUrl: '',
    category: 'placeholder',
    map: 'valorant',
    tags: [],
  },
];

export const CLIP_TEXT = {
  title: 'ギャラリー',
  note: 'SRUSA のいろんなゲームの名シーンと写真をタグで探して見るページ',
  lead: '動画と画像を並べたギャラリーです。ゲーム、プレイヤー、シーン、タグで名シーンを探せます。',
  picker: '名シーン',
  customUrl: '動画・画像の URL',
  customTitle: '入力したURL',
  show: '表示',
  gallery: '名シーンギャラリー',
  /** 画像の読み上げと、画像が出ないときの説明。 */
  imageAlt: (title: string) => `${title} の画像`,
  /** 動画の下敷き（サムネイル）を押して再生するボタンの読み上げ。 */
  playButton: (title: string) => `${title} を再生`,
  result: (count: number, total: number) => `${count} / ${total} 件`,
  /** 絞り込み・並び替えを折りたたむ帯の見出し。初期状態は閉じておく。 */
  filterPanel: '絞り込み・並び替え',
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
  empty: 'この名シーンにはまだ URL がありません。動画や画像の URL を入力すると、この画面で表示できます。',
  /** ギャラリーのカードで、動画・画像をまだ用意できていないときに出す説明。 */
  placeholder: '近日公開予定です。',
  noMatch: '条件に合う名シーンがありません。',
  invalidUrl: 'https:// または http:// で始まる動画・画像の URL を入力してください。',
  iframeTitle: (title: string) => `${title} の埋め込みプレイヤー`,
} as const;

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

/** ゲームの絞り込みの選択肢。表示名だけ GAME_LABELS を通す。 */
function gameOptions(entries: ClipEntry[]): ClipFilterOption[] {
  const counts = countBy(entries.map((clip) => clip.map).filter(Boolean) as string[]);
  return Object.entries(counts)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([value, count]) => ({ value, label: gameLabel(value), count }));
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
      options: gameOptions(entries),
    },
    {
      id: 'agent',
      label: CLIP_TEXT.filters.agent,
      options: optionsFromCounts(countBy(entries.flatMap((clip) => clip.cast ?? []))),
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

const IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.svg'] as const;

/** 拡張子だけで画像かどうかを決める（通信して確かめには行かない）。 */
function hasImageExtension(path: string): boolean {
  const lower = path.split(/[?#]/)[0].toLowerCase();
  return IMAGE_EXTENSIONS.some((extension) => lower.endsWith(extension));
}

/**
 * 画像として表示できる URL だけを返す。表示できないときは空文字。
 *
 * 同梱の画像は `images/…` のような相対パスで書く（Vite の base が './' のため）。
 * `javascript:` のような別の scheme は、img の src に渡す前にここで落とす。
 */
export function imageUrlFromClipUrl(sourceUrl: string): string {
  const trimmed = sourceUrl.trim();
  if (!trimmed) return '';

  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed)) {
    let url: URL;
    try {
      url = new URL(trimmed);
    } catch {
      return '';
    }
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return '';
    return hasImageExtension(url.pathname) ? trimmed : '';
  }

  /* 同梱の画像は公開ディレクトリからの相対パス。読み物の画像（ProsePanel）と同じ解決の仕方に揃える */
  return hasImageExtension(trimmed) ? `${import.meta.env.BASE_URL}${trimmed}` : '';
}

/** その名シーンを画面でどう見せるか。画像を先に見るのは、動画側が未知のホストも受けるため。 */
export function clipMedia(clip: ClipEntry): ClipMedia {
  return mediaOfUrl(clip.sourceUrl);
}

/** URL 1 本から見せ方を決める。入力欄に貼られた URL にも同じ判定を使う。 */
export function mediaOfUrl(sourceUrl: string): ClipMedia {
  if (imageUrlFromClipUrl(sourceUrl)) return 'image';
  if (embedUrlFromClipUrl(sourceUrl)) return 'video';
  return 'none';
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

/**
 * 動画の下敷き（再生前に見せる 1 枚絵）。
 *
 * 埋め込み URL が YouTube のものであれば、動画 ID から既定のサムネイルを作れる。
 * それ以外（Twitch など）は自動生成できないので、`thumbnailUrl` の手入力に任せる。
 */
export function youtubeThumbnailUrl(embedUrl: string): string {
  const videoId = embedUrl.match(/\/embed\/([^/?]+)/)?.[1];
  return videoId ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg` : '';
}

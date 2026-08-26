import {
  CLIP_TEXT,
  gameLabel,
  clipKeywordLabel,
  clipKeywords,
  clipMedia,
  clipScoreTotal,
  imageUrlFromClipUrl,
  type ClipEntry,
} from '../../config/clips';
import { TAG } from '../classes';

export interface ClipCardProps {
  clip: ClipEntry;
  active: boolean;
  onSelect: (clip: ClipEntry) => void;
  onFilter: (type: 'map' | 'agent' | 'keyword', value: string) => void;
}

/** 名シーン一覧のカード。情報密度は高く、再生操作はカード全体にまとめる。 */
export function ClipCard({ clip, active, onSelect, onFilter }: ClipCardProps) {
  const tagClass = `${TAG} cursor-pointer transition-colors hover:bg-hover`;
  const media = clipMedia(clip);
  /* 画像の名シーンは、その画像そのものが一番分かりやすい見出し絵になる */
  const thumbnailUrl = clip.thumbnailUrl ?? (media === 'image' ? imageUrlFromClipUrl(clip.sourceUrl) : '');
  const badge = media === 'image' ? CLIP_TEXT.overlay.image : CLIP_TEXT.overlay.play;

  return (
    <article
      className={`mb-md break-inside-avoid overflow-hidden rounded-md border-hairline bg-surface transition-colors ${
        active ? 'border-tab-marker' : 'border-divider hover:border-control-line-hover'
      }`}
    >
      <button type="button" className="block w-full text-left" onClick={() => onSelect(clip)}>
        <div className="relative bg-sunken">
          {thumbnailUrl ? (
            <img
              src={thumbnailUrl}
              alt=""
              loading="lazy"
              className="aspect-video w-full object-cover"
            />
          ) : (
            <div className="grid aspect-video w-full place-items-center bg-sunken px-md text-center text-sm text-muted">
              {clip.title}
            </div>
          )}
          {/* 見出し絵を隠さないよう、出せるものがある間は隅の小さな札だけにする */}
          {media === 'none' ? (
            <span className="absolute inset-0 grid place-items-center bg-overlay/70 text-lg text-heading">
              {CLIP_TEXT.overlay.pending}
            </span>
          ) : (
            <span className="absolute bottom-xs right-xs rounded-sm bg-overlay/70 px-xs py-xxs text-xs text-heading">
              {badge}
            </span>
          )}
        </div>
      </button>

      <div className="grid gap-sm p-md">
        <button type="button" className="text-left text-md font-medium text-heading" onClick={() => onSelect(clip)}>
          {clip.title}
        </button>

        <div className="flex flex-wrap gap-xs">
          {clip.map && (
            <button type="button" className={tagClass} onClick={() => onFilter('map', clip.map!)}>
              {gameLabel(clip.map)}
            </button>
          )}
          {/* 登場人物は出てくる順に並べる。並びに意味があるので並べ替えない */}
          {(clip.cast ?? []).map((person) => (
            <button
              key={person}
              type="button"
              className={tagClass}
              onClick={() => onFilter('agent', person)}
            >
              {person}
            </button>
          ))}
          {clipKeywords(clip).map((keyword) => (
            <button key={keyword} type="button" className={tagClass} onClick={() => onFilter('keyword', keyword)}>
              {clipKeywordLabel(keyword)}
            </button>
          ))}
        </div>

        <div className="flex items-center justify-between gap-sm text-sm text-muted">
          <span>Score {clipScoreTotal(clip)}</span>
          <span>{clip.views ?? 0} views</span>
        </div>
      </div>
    </article>
  );
}

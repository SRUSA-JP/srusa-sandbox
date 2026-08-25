import {
  capFirst,
  clipKeywordLabel,
  clipKeywords,
  clipScoreTotal,
  type ClipEntry,
} from '../../config/clips';
import { TAG } from '../classes';

export interface ClipCardProps {
  clip: ClipEntry;
  active: boolean;
  onSelect: (clip: ClipEntry) => void;
  onFilter: (type: 'map' | 'agent' | 'keyword', value: string) => void;
}

/** Clips 一覧のカード。情報密度は高く、再生操作はカード全体にまとめる。 */
export function ClipCard({ clip, active, onSelect, onFilter }: ClipCardProps) {
  const tagClass = `${TAG} cursor-pointer transition-colors hover:bg-hover`;

  return (
    <article
      className={`mb-md break-inside-avoid overflow-hidden rounded-md border-hairline bg-surface transition-colors ${
        active ? 'border-tab-marker' : 'border-divider hover:border-control-line-hover'
      }`}
    >
      <button type="button" className="block w-full text-left" onClick={() => onSelect(clip)}>
        <div className="relative bg-sunken">
          {clip.thumbnailUrl ? (
            <img
              src={clip.thumbnailUrl}
              alt=""
              loading="lazy"
              className="aspect-video w-full object-cover"
            />
          ) : (
            <div className="aspect-video w-full bg-sunken" />
          )}
          <span className="absolute inset-0 grid place-items-center bg-[rgb(0_0_0/0.20)] text-lg text-white">
            Play
          </span>
        </div>
      </button>

      <div className="grid gap-sm p-md">
        <button type="button" className="text-left text-md font-medium text-heading" onClick={() => onSelect(clip)}>
          {clip.title}
        </button>

        <div className="flex flex-wrap gap-xs">
          {clip.map && (
            <button type="button" className={tagClass} onClick={() => onFilter('map', clip.map!)}>
              {capFirst(clip.map)}
            </button>
          )}
          {clip.agent && (
            <button type="button" className={tagClass} onClick={() => onFilter('agent', clip.agent!)}>
              {capFirst(clip.agent)}
            </button>
          )}
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

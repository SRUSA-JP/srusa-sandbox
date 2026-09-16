import { clipTagColors } from '../../config/colors';
import {
  CLIP_TEXT,
  gameLabel,
  clipKeywordLabel,
  clipKeywords,
  clipMedia,
  embedUrlFromClipUrl,
  imageUrlFromClipUrl,
  type ClipEntry,
} from '../../config/clips';
import type { VizTheme } from '../../theme/palette';
import { TAG } from '../classes';
import { ClipFrame } from './ClipFrame';

export interface ClipCardProps {
  clip: ClipEntry;
  theme: VizTheme;
  onFilter: (type: 'map' | 'agent' | 'keyword', value: string) => void;
}

/**
 * 名シーン 1 件を展示するカード。
 *
 * サムネイルではなく画像・動画をそのまま貼り、タグだけを添える。
 * 見れば何のシーンか分かるため、題名や説明の文章は出さない
 * （読み上げ用の alt / iframe title には残す）。
 * タグはゲーム・登場人物・シーンの種類ごとに色を変え、押すと絞り込む。
 */
export function ClipCard({ clip, theme, onFilter }: ClipCardProps) {
  const media = clipMedia(clip);
  const imageUrl = media === 'image' ? imageUrlFromClipUrl(clip.sourceUrl) : '';
  const embedUrl = media === 'video' ? embedUrlFromClipUrl(clip.sourceUrl) : '';
  const tagColors = clipTagColors(theme);
  const tagClass = `${TAG} cursor-pointer transition-opacity hover:opacity-80`;

  return (
    <article className="w-full max-w-[var(--sr-layout-clip-card-max-width)] justify-self-center overflow-hidden rounded-md border-hairline border-divider bg-surface">
      <ClipFrame title={clip.title} embedUrl={embedUrl} imageUrl={imageUrl} message={CLIP_TEXT.empty} />

      <div className="flex flex-wrap gap-xs p-md">
        {clip.map && (
          <button
            type="button"
            className={tagClass}
            style={{ borderColor: tagColors.map, color: tagColors.map }}
            onClick={() => onFilter('map', clip.map!)}
          >
            {gameLabel(clip.map)}
          </button>
        )}
        {/* 登場人物は出てくる順に並べる。並びに意味があるので並べ替えない */}
        {(clip.cast ?? []).map((person) => (
          <button
            key={person}
            type="button"
            className={tagClass}
            style={{ borderColor: tagColors.agent, color: tagColors.agent }}
            onClick={() => onFilter('agent', person)}
          >
            {person}
          </button>
        ))}
        {clipKeywords(clip).map((keyword) => (
          <button
            key={keyword}
            type="button"
            className={tagClass}
            style={{ borderColor: tagColors.keyword, color: tagColors.keyword }}
            onClick={() => onFilter('keyword', keyword)}
          >
            {clipKeywordLabel(keyword)}
          </button>
        ))}
      </div>
    </article>
  );
}

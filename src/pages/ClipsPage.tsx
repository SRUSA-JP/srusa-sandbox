import { useState } from 'react';
import { AppLayout, Button, ClipFrame, ClipGallery, Note, TechnicalDetails } from '../components';
import { ACTIONS, CONTROL_BOX, FIELD } from '../components/classes';
import { CLIP_ENTRIES, CLIP_TEXT, embedUrlFromClipUrl, imageUrlFromClipUrl } from '../config/clips';
import { TECHNICAL_TEXT } from '../config/messages';
import type { VizTheme } from '../theme/palette';

export interface ClipsPageProps {
  theme: VizTheme;
}

/** ゲームの名シーン（動画と画像）をずらっと展示するギャラリーページ。 */
export function ClipsPage({ theme }: ClipsPageProps) {
  const [draftUrl, setDraftUrl] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  /* 画像を先に見る。動画側は知らないホストの URL もそのまま受けるため */
  const imageUrl = imageUrlFromClipUrl(previewUrl);
  const embedUrl = imageUrl ? '' : embedUrlFromClipUrl(previewUrl);
  const invalid = Boolean(previewUrl.trim()) && !embedUrl && !imageUrl;

  return (
    <AppLayout
      title={CLIP_TEXT.title}
      note={CLIP_TEXT.note}
      lead={CLIP_TEXT.lead}
      technical={
        /* URL を貼って確かめるのは作り手の使い方なので、一覧より下に置く */
        <TechnicalDetails title={TECHNICAL_TEXT.clips.title} note={TECHNICAL_TEXT.clips.note}>
          <div className={ACTIONS}>
            <label className={`${FIELD} min-w-0 flex-1`}>
              {CLIP_TEXT.customUrl}
              <input
                className={`${CONTROL_BOX} min-w-0 flex-1 px-md sm:min-w-[var(--sr-layout-column-min-width)]`}
                value={draftUrl}
                placeholder="https://..."
                onChange={(event) => setDraftUrl(event.target.value)}
              />
            </label>
            <Button
              label={CLIP_TEXT.show}
              icon="upload"
              onClick={() => {
                if (!draftUrl.trim()) return;
                setPreviewUrl(draftUrl);
              }}
            />
          </div>
          {invalid && <Note tone="error">{CLIP_TEXT.invalidUrl}</Note>}
          {previewUrl && !invalid && (
            <ClipFrame title={CLIP_TEXT.customTitle} embedUrl={embedUrl} imageUrl={imageUrl} message={CLIP_TEXT.empty} />
          )}
        </TechnicalDetails>
      }
    >
      <ClipGallery clips={CLIP_ENTRIES} theme={theme} />
    </AppLayout>
  );
}

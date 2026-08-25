import { useMemo, useState } from 'react';
import { AppLayout, Button, ChartCard, ClipFrame, ClipGallery, Note, TechnicalDetails } from '../components';
import { ACTIONS, CONTROL_BOX, FIELD } from '../components/classes';
import {
  CLIP_ENTRIES,
  CLIP_TEXT,
  clipMedia,
  embedUrlFromClipUrl,
  imageUrlFromClipUrl,
  type ClipEntry,
} from '../config/clips';
import { TECHNICAL_TEXT } from '../config/messages';

const CUSTOM_CLIP_ID = 'custom';

/** ゲームの名シーン（動画と画像）を見るページ。 */
export function ClipsPage() {
  /* 最初に出すのは、実際に見せられるものがある名シーン（空の枠を先頭に置かない） */
  const defaultClip = useMemo(
    () => CLIP_ENTRIES.find((clip) => clipMedia(clip) !== 'none') ?? CLIP_ENTRIES[0],
    [],
  );
  const [selectedClip, setSelectedClip] = useState<ClipEntry | undefined>(defaultClip);
  const [draftUrl, setDraftUrl] = useState('');
  const [customUrl, setCustomUrl] = useState('');

  const customClip = useMemo<ClipEntry | undefined>(
    () =>
      customUrl
        ? {
            id: CUSTOM_CLIP_ID,
            title: CLIP_TEXT.customTitle,
            sourceUrl: customUrl,
            category: 'custom',
            tags: [],
          }
        : undefined,
    [customUrl],
  );
  const activeClip = selectedClip ?? customClip;
  const sourceUrl = activeClip?.sourceUrl ?? '';
  /* 画像を先に見る。動画側は知らないホストの URL もそのまま受けるため */
  const imageUrl = imageUrlFromClipUrl(sourceUrl);
  const embedUrl = imageUrl ? '' : embedUrlFromClipUrl(sourceUrl);
  const title = activeClip?.title ?? CLIP_TEXT.customTitle;
  const invalid = Boolean(sourceUrl.trim()) && !embedUrl && !imageUrl;
  const frameMessage = invalid ? CLIP_TEXT.invalidUrl : CLIP_TEXT.empty;

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
                setCustomUrl(draftUrl);
                setSelectedClip(undefined);
              }}
            />
          </div>
          {invalid && <Note tone="error">{CLIP_TEXT.invalidUrl}</Note>}
        </TechnicalDetails>
      }
    >
      <ChartCard title={CLIP_TEXT.featured} note={activeClip?.note ?? title}>
        <ClipFrame title={title} embedUrl={embedUrl} imageUrl={imageUrl} message={frameMessage} />
      </ChartCard>

      <ClipGallery clips={CLIP_ENTRIES} selectedClip={selectedClip} onSelect={setSelectedClip} />
    </AppLayout>
  );
}

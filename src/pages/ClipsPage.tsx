import { useMemo, useState } from 'react';
import { AppLayout, Button, ChartCard, ClipFrame, ClipGallery, Note } from '../components';
import { CONTROL_BOX, FIELD } from '../components/classes';
import { CLIP_ENTRIES, CLIP_TEXT, embedUrlFromClipUrl, type ClipEntry } from '../config/clips';

const CUSTOM_CLIP_ID = 'custom';

/** 動画クリップを iframe で確認するページ。 */
export function ClipsPage() {
  const defaultClip = useMemo(() => CLIP_ENTRIES[0], []);
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
  const embedUrl = embedUrlFromClipUrl(sourceUrl);
  const title = activeClip?.title ?? CLIP_TEXT.customTitle;
  const invalid = Boolean(sourceUrl.trim()) && !embedUrl;
  const frameMessage = invalid ? CLIP_TEXT.invalidUrl : CLIP_TEXT.empty;

  return (
    <AppLayout title={CLIP_TEXT.title} note={CLIP_TEXT.note} lead={CLIP_TEXT.lead}>
      <ChartCard
        title={CLIP_TEXT.featured}
        note={activeClip?.note ?? title}
        actions={
          <>
            <label className={`${FIELD} min-w-0 flex-1`}>
              {CLIP_TEXT.customUrl}
              <input
                className={`${CONTROL_BOX} min-w-[min(22rem,100%)] flex-1 px-md`}
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
          </>
        }
      >
        {invalid && <Note tone="error">{CLIP_TEXT.invalidUrl}</Note>}
        <ClipFrame
          title={CLIP_TEXT.iframeTitle(title)}
          embedUrl={embedUrl}
          message={frameMessage}
        />
      </ChartCard>

      <ClipGallery clips={CLIP_ENTRIES} selectedClip={selectedClip} onSelect={setSelectedClip} />
    </AppLayout>
  );
}

import { useMemo, useState } from 'react';
import { AppLayout, Button, ChartCard, ClipFrame, Note, Picker } from '../components';
import { CONTROL_BOX, FIELD } from '../components/classes';
import {
  CLIP_ENTRIES,
  CLIP_TEXT,
  clipOptions,
  embedUrlFromClipUrl,
  findClip,
} from '../config/clips';

const CUSTOM_CLIP_ID = 'custom';

type ClipSelection = typeof CUSTOM_CLIP_ID | (typeof CLIP_ENTRIES)[number]['id'];

/** 動画クリップを iframe で確認するページ。 */
export function ClipsPage() {
  const options = useMemo(
    () => [{ value: CUSTOM_CLIP_ID, label: CLIP_TEXT.customTitle }, ...clipOptions()],
    [],
  );
  const [selectedId, setSelectedId] = useState<ClipSelection>(options[0]?.value ?? CUSTOM_CLIP_ID);
  const [draftUrl, setDraftUrl] = useState('');
  const [customUrl, setCustomUrl] = useState('');

  const selectedClip = selectedId === CUSTOM_CLIP_ID ? undefined : findClip(selectedId);
  const sourceUrl = selectedClip?.sourceUrl ?? customUrl;
  const embedUrl = embedUrlFromClipUrl(sourceUrl);
  const title = selectedClip?.title ?? CLIP_TEXT.customTitle;
  const invalid = Boolean(sourceUrl.trim()) && !embedUrl;
  const frameMessage = invalid ? CLIP_TEXT.invalidUrl : CLIP_TEXT.empty;

  return (
    <AppLayout title={CLIP_TEXT.title} note={CLIP_TEXT.note} lead={CLIP_TEXT.lead}>
      <ChartCard
        title={title}
        note={selectedClip?.note}
        actions={
          <>
            <Picker
              showLabel
              label={CLIP_TEXT.picker}
              value={selectedId}
              options={options}
              onChange={setSelectedId}
            />
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
                setCustomUrl(draftUrl);
                setSelectedId(CUSTOM_CLIP_ID);
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
    </AppLayout>
  );
}

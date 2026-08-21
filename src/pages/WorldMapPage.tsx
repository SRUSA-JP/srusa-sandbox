import { useMemo, useState } from 'react';
import { AppLayout, ChartCard, Note, NoticePanel, Picker, ProsePanel, WorldMapViewer } from '../components';
import { APP_TEXT, WORLD_MAP_TEXT } from '../config/messages';
import { WORLD_LABELS } from '../config/labels';
import { WORLD_MAP_CONTENT } from '../content';
import type { VizTheme } from '../theme/palette';
import { coverage } from '../world/display';
import { loadWorldMaps } from '../world/data';

export interface WorldMapPageProps {
  theme: VizTheme;
}

/**
 * ワールドマップの画面。
 *
 * 主役は操作できる 2D の地図なので先頭に置き、3D のスクリーンショットと
 * 経緯の説明はその下に回す（DESIGN.md の「主役を先に見せる」）。
 * 3D の出力そのもの（数百 MB）はこのリポジトリに持たない。
 *
 * 地図は data/world-map.json にあるだけ切り替えられる。ネザーやツワイライトフォレストを
 * `npm run build:world-map -- --map <id>` で足せば、コードを変えずに選択肢が増える。
 */
export function WorldMapPage({ theme }: WorldMapPageProps) {
  const document = useMemo(() => loadWorldMaps(), []);
  const maps = document?.maps ?? [];
  const [selectedId, setSelectedId] = useState('');
  const map = maps.find((entry) => entry.id === selectedId) ?? maps[0] ?? null;

  const size = map ? coverage(map) : null;

  return (
    <AppLayout
      title={WORLD_MAP_CONTENT.title}
      note={
        map && size
          ? WORLD_MAP_TEXT.summary(WORLD_LABELS[map.id] ?? map.id, size.width, size.height, map.bytes)
          : undefined
      }
      lead={WORLD_MAP_CONTENT.lead}
      footnotes={
        WORLD_MAP_CONTENT.disclaimer ? (
          <NoticePanel title={APP_TEXT.disclaimer}>{WORLD_MAP_CONTENT.disclaimer}</NoticePanel>
        ) : undefined
      }
    >
      <ChartCard
        title={WORLD_MAP_TEXT.card.title}
        note={WORLD_MAP_TEXT.card.note}
        actions={
          maps.length > 1 && map ? (
            <Picker
              label={WORLD_MAP_TEXT.mapPicker}
              value={map.id}
              onChange={setSelectedId}
              options={maps.map((entry) => ({ value: entry.id, label: WORLD_LABELS[entry.id] ?? entry.id }))}
            />
          ) : undefined
        }
      >
        {map ? <WorldMapViewer key={map.id} map={map} theme={theme} /> : <Note tone="error">{WORLD_MAP_TEXT.noData}</Note>}
      </ChartCard>

      <ProsePanel sections={WORLD_MAP_CONTENT.sections} />
    </AppLayout>
  );
}

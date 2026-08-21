import { AppLayout, NoticePanel, ProsePanel } from '../components';
import { APP_TEXT } from '../config/messages';
import { WORLD_MAP_CONTENT } from '../content';

/**
 * ワールドマップの画面。
 *
 * BlueMap の出力そのもの（数百 MB）はこのリポジトリに持たないので、
 * レンダリング結果の画像と実測値、決めることだけを載せる。
 */
export function WorldMapPage() {
  return (
    <AppLayout
      title={WORLD_MAP_CONTENT.title}
      lead={WORLD_MAP_CONTENT.lead}
      footnotes={
        WORLD_MAP_CONTENT.disclaimer ? (
          <NoticePanel title={APP_TEXT.disclaimer}>{WORLD_MAP_CONTENT.disclaimer}</NoticePanel>
        ) : undefined
      }
    >
      <ProsePanel sections={WORLD_MAP_CONTENT.sections} />
    </AppLayout>
  );
}

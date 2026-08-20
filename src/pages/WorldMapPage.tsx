import { AppLayout, Note, ProsePanel } from '../components';
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
      messages={
        WORLD_MAP_CONTENT.disclaimer ? (
          <Note tone="error">{WORLD_MAP_CONTENT.disclaimer}</Note>
        ) : undefined
      }
    >
      <p className="mb-section max-w-[var(--sr-layout-prose-max-width)] leading-base">
        {WORLD_MAP_CONTENT.lead}
      </p>
      <ProsePanel sections={WORLD_MAP_CONTENT.sections} />
    </AppLayout>
  );
}

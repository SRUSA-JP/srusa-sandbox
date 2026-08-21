import { VIEWPORT_TEXT } from '../../config/messages';
import type { PanZoom } from '../../hooks/usePanZoom';
import { IconButton } from '../atoms';

export interface ViewportControlsProps {
  panZoom: PanZoom;
}

/**
 * 拡大縮小と全体表示のボタン。
 *
 * 図の隅に重ねて置く前提なので、面と枠を持って地図から浮かせる。
 * 掴んで動かす・つまんで拡大が分からない人でも、ここだけで操作できるようにする
 * （操作の入口を 1 つに絞らないための冗長さ）。
 */
export function ViewportControls({ panZoom }: ViewportControlsProps) {
  return (
    <div className="flex items-center gap-xxs rounded-md border-hairline border-divider bg-surface p-xxs">
      <IconButton
        icon="zoom-out"
        label={VIEWPORT_TEXT.zoomOut}
        onClick={panZoom.zoomOut}
        disabled={!panZoom.canZoomOut}
      />
      <IconButton
        icon="zoom-in"
        label={VIEWPORT_TEXT.zoomIn}
        onClick={panZoom.zoomIn}
        disabled={!panZoom.canZoomIn}
      />
      <IconButton icon="fit" label={VIEWPORT_TEXT.fit} onClick={panZoom.fit} />
    </div>
  );
}

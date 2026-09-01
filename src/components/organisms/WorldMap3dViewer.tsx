import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { WORLD_MAP_TEXT } from '../../config/messages';
import { useIsCompact } from '../../hooks/useMediaQuery';
import { LAYOUT } from '../../theme/tokens';
import { Button, Note } from '../atoms';

export interface WorldMap3dViewerProps {
  src: string;
}

function assetUrl(src: string, path: string): string {
  const [asset] = src.split('#');
  const base = typeof window === 'undefined' ? 'http://localhost/' : window.location.href;
  return new URL(path, new URL(asset, base)).toString();
}

const BLUEMAP_VIEWER_STYLE_ID = 'srusa-bluemap-viewer-style';
const BLUEMAP_VIEWER_STYLE = `
html,
body,
#map-container,
#app {
  width: 100%;
  height: 100%;
  min-height: 100%;
}

body {
  overflow: hidden;
}

@media (max-width: 575.98px) {
  #app {
    font-size: .9rem;
  }

  .control-bar {
    height: 2em;
    min-height: 2em;
  }

  .control-bar .pos-input {
    max-width: calc(100% - 5em);
  }

  #ff-mobile-controls {
    font-size: min(8vw, 5.5dvh);
  }

  #ff-mobile-controls .move-fields,
  #ff-mobile-controls .height-fields {
    bottom: max(.2em, env(safe-area-inset-bottom));
  }

  #zoom-buttons {
    margin: .25em;
  }
}
`;

function applyBlueMapViewerStyle(frame: HTMLIFrameElement) {
  try {
    const document = frame.contentDocument;
    if (!document || document.getElementById(BLUEMAP_VIEWER_STYLE_ID)) return;

    const style = document.createElement('style');
    style.id = BLUEMAP_VIEWER_STYLE_ID;
    style.textContent = BLUEMAP_VIEWER_STYLE;
    document.head.appendChild(style);
  } catch (cause) {
    void cause;
  }
}

/** BlueMap のスポーン周辺 3D ビューア。 */
export function WorldMap3dViewer({ src }: WorldMap3dViewerProps) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [wideView, setWideView] = useState(false);
  const isCompact = useIsCompact();
  const frameRef = useRef<HTMLDivElement>(null);
  const checkUrls = useMemo(
    () => [
      assetUrl(src, 'index.html'),
      assetUrl(src, 'settings.json'),
      assetUrl(src, 'maps/overworld_spawn/settings.json'),
      assetUrl(src, 'maps/overworld_spawn/textures.json.gz'),
    ],
    [src],
  );

  useEffect(() => {
    const controller = new AbortController();
    Promise.all(checkUrls.map((url) => fetch(url, { method: 'HEAD', signal: controller.signal })))
      .then((responses) => setAvailable(responses.every((response) => response.ok)))
      .catch((cause) => {
        if ((cause as Error).name !== 'AbortError') setAvailable(false);
      });
    return () => controller.abort();
  }, [checkUrls]);

  useEffect(() => {
    const onFullscreenChange = () => {
      const fullscreen = document.fullscreenElement === frameRef.current;
      setIsFullscreen(fullscreen);
      if (!fullscreen) setIsExpanded(false);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
      return;
    }
    if (isExpanded) {
      setIsExpanded(false);
      return;
    }
    if (document.fullscreenEnabled && frameRef.current?.requestFullscreen) {
      void frameRef.current.requestFullscreen();
      return;
    }
    setIsExpanded(true);
  }, [isExpanded]);

  if (available === false) {
    return <Note tone="error">{WORLD_MAP_TEXT.threeD.missing}</Note>;
  }

  if (available === null) {
    return <Note>{WORLD_MAP_TEXT.threeD.loading}</Note>;
  }

  const immersive = isFullscreen || isExpanded;
  const zoomedOut = wideView;
  const frameScaleClass = zoomedOut
    ? 'h-[var(--sr-layout-world-map-3d-scaled-size)] w-[var(--sr-layout-world-map-3d-scaled-size)] origin-top-left scale-[var(--sr-layout-world-map-3d-scale)]'
    : 'h-full w-full';
  const viewerHeight = isCompact ? LAYOUT.worldMap3dCompactHeight : LAYOUT.worldMap3dHeight;
  const viewerStyle = immersive
    ? { height: LAYOUT.worldMap3dFullscreenHeight }
    : { height: viewerHeight, minHeight: LAYOUT.worldMap3dMinHeight };

  return (
    <div
      ref={frameRef}
      className={`overflow-hidden border-divider bg-sunken ${
        immersive ? 'fixed inset-0 z-50 border-0' : 'rounded-md border-hairline'
      }`}
    >
      <div className={`flex justify-end gap-sm border-b-hairline border-divider bg-surface px-sm py-xs ${immersive ? 'absolute right-0 top-0 z-10 bg-overlay' : ''}`}>
        <Button
          label={zoomedOut ? WORLD_MAP_TEXT.threeD.normal : WORLD_MAP_TEXT.threeD.wide}
          icon="zoom-out"
          onClick={() => setWideView((value) => !value)}
        />
        <Button
          label={immersive ? WORLD_MAP_TEXT.threeD.exitFullscreen : WORLD_MAP_TEXT.threeD.fullscreen}
          icon="fit"
          onClick={toggleFullscreen}
        />
      </div>
      <div
        className="overflow-hidden"
        style={viewerStyle}
      >
        <iframe
          title={WORLD_MAP_TEXT.threeD.title}
          src={src}
          className={`block border-0 ${frameScaleClass}`}
          loading="lazy"
          allow="fullscreen"
          onLoad={(event) => applyBlueMapViewerStyle(event.currentTarget)}
        />
      </div>
    </div>
  );
}

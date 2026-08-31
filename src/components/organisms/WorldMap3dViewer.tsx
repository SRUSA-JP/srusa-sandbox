import { useCallback, useEffect, useRef, useState } from 'react';
import { WORLD_MAP_TEXT } from '../../config/messages';
import { Button, Note } from '../atoms';

export interface WorldMap3dViewerProps {
  src: string;
}

/** BlueMap のスポーン周辺 3D ビューア。 */
export function WorldMap3dViewer({ src }: WorldMap3dViewerProps) {
  const [available, setAvailable] = useState<boolean | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const frameRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    const [asset] = src.split('#');
    fetch(asset, { method: 'HEAD', signal: controller.signal })
      .then((response) => setAvailable(response.ok))
      .catch((cause) => {
        if ((cause as Error).name !== 'AbortError') setAvailable(false);
      });
    return () => controller.abort();
  }, [src]);

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

  return (
    <div
      ref={frameRef}
      className={`overflow-hidden border-divider bg-sunken ${
        immersive ? 'fixed inset-0 z-50 border-0' : 'rounded-md border-hairline'
      }`}
    >
      <div className="flex justify-end border-b-hairline border-divider bg-surface px-sm py-xs">
        <Button
          label={immersive ? WORLD_MAP_TEXT.threeD.exitFullscreen : WORLD_MAP_TEXT.threeD.fullscreen}
          icon="fit"
          onClick={toggleFullscreen}
        />
      </div>
      <iframe
        title={WORLD_MAP_TEXT.threeD.title}
        src={src}
        className={`block w-full ${
          immersive
            ? 'h-[var(--sr-layout-world-map-3d-fullscreen-height)]'
            : 'h-[var(--sr-layout-world-map-3d-compact-height)] min-h-[var(--sr-layout-world-map-3d-min-height)] sm:h-[var(--sr-layout-world-map-3d-height)]'
        }`}
        loading="lazy"
        allow="fullscreen"
      />
    </div>
  );
}

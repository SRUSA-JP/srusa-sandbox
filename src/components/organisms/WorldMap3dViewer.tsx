import { useEffect, useState } from 'react';
import { WORLD_MAP_TEXT } from '../../config/messages';
import { Note } from '../atoms';

export interface WorldMap3dViewerProps {
  src: string;
}

/** BlueMap のスポーン周辺 3D ビューア。 */
export function WorldMap3dViewer({ src }: WorldMap3dViewerProps) {
  const [available, setAvailable] = useState<boolean | null>(null);

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

  if (available === false) {
    return <Note tone="error">{WORLD_MAP_TEXT.threeD.missing}</Note>;
  }

  if (available === null) {
    return <Note>{WORLD_MAP_TEXT.threeD.loading}</Note>;
  }

  return (
    <div className="overflow-hidden rounded-md border-hairline border-divider bg-sunken">
      <iframe
        title={WORLD_MAP_TEXT.threeD.title}
        src={src}
        className="block h-[var(--sr-layout-world-map-3d-compact-height)] min-h-[var(--sr-layout-world-map-3d-min-height)] w-full sm:h-[var(--sr-layout-world-map-3d-height)]"
        loading="lazy"
        allow="fullscreen"
      />
    </div>
  );
}

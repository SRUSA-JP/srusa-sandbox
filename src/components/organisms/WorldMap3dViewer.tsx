import { WORLD_MAP_TEXT } from '../../config/messages';

export interface WorldMap3dViewerProps {
  src: string;
}

/** BlueMap のスポーン周辺 3D ビューア。 */
export function WorldMap3dViewer({ src }: WorldMap3dViewerProps) {
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

import { ICON } from '../../theme/tokens';
import { ICON_PATHS, type IconName } from './iconPaths';

export interface PixelNavIconProps {
  name: IconName;
}

/** スマートフォン下部ナビ用。既存の線アイコンを角張らせて、ドット絵風に寄せる。 */
export function PixelNavIcon({ name }: PixelNavIconProps) {
  const filterId = `pixel-nav-${name}`;

  return (
    <svg
      aria-hidden
      focusable="false"
      width="var(--sr-layout-mobile-nav-icon-size)"
      height="var(--sr-layout-mobile-nav-icon-size)"
      viewBox={`0 0 ${ICON.gridSize} ${ICON.gridSize}`}
      fill="none"
      stroke="currentColor"
      strokeWidth={ICON.strokeWidth * 1.35}
      strokeLinecap="butt"
      strokeLinejoin="miter"
      shapeRendering="crispEdges"
      className="shrink-0"
    >
      <defs>
        <filter id={filterId}>
          <feComponentTransfer>
            <feFuncA type="discrete" tableValues="0 1" />
          </feComponentTransfer>
        </filter>
      </defs>
      <g filter={`url(#${filterId})`}>
        {ICON_PATHS[name].map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
}

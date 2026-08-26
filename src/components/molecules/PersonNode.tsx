import { avatarFor, nodeStyle, personLabel, personTooltip, type NodeState } from '../../map/display';
import { PixelAvatar } from '../atoms/PixelAvatar';
import type { PersonPlacement } from '../../map/layout';
import type { VizTheme } from '../../theme/palette';

export interface PersonNodeProps {
  placement: PersonPlacement;
  theme: VizTheme;
  state: NodeState;
  nameMode: string;
  onSelect?: (personId: string) => void;
  /**
   * 掴んで動かす操作。渡すとノードがつまめるようになる。
   *
   * 位置をどう動かすかは呼び出し側（organisms/RelationshipMap.tsx）が決める。
   * ここは受け取ったものをそのまま SVG に渡すだけで、座標の計算を持たない。
   */
  pointer?: {
    onPointerDown: (event: React.PointerEvent<SVGGElement>) => void;
    onPointerMove: (event: React.PointerEvent<SVGGElement>) => void;
    onPointerUp: (event: React.PointerEvent<SVGGElement>) => void;
  };
  /** いま掴まれているか。カーソルの見た目だけに使う。 */
  grabbed?: boolean;
  /** SVG の標準ツールチップを出すか。 */
  showTooltip?: boolean;
}

/** アイコンの中身。画像・顔・イニシャル・人型のどれをどの寸法で描くかは display.ts が決める。 */
function AvatarContentShape({
  placement,
  nameMode,
  radius,
  color,
  clipId,
}: {
  placement: PersonPlacement;
  nameMode: string;
  radius: number;
  color: string;
  clipId: string;
}) {
  const content = avatarFor(placement.person, nameMode, radius, color);

  if (content.kind === 'pixel') {
    return (
      <g clipPath={`url(#${clipId})`}>
        <PixelAvatar pixels={content.pixels} size={radius * 2} />
      </g>
    );
  }

  if (content.kind === 'image') {
    return (
      <image
        href={content.src}
        x={-radius}
        y={-radius}
        width={radius * 2}
        height={radius * 2}
        clipPath={`url(#${clipId})`}
        preserveAspectRatio="xMidYMid slice"
      />
    );
  }

  if (content.kind === 'initial') {
    return (
      <text
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontSize={content.fontSize}
        fontWeight={content.fontWeight}
      >
        {content.text}
      </text>
    );
  }

  /* 人型（頭と肩）。寸法は display.ts が半径から作るので、大きさが変わっても崩れない */
  const shape = content.shape;
  return (
    <g clipPath={`url(#${clipId})`} fill={color}>
      <circle cy={shape.headOffsetY} r={shape.headRadius} />
      <path
        d={`M ${-shape.shoulderWidth} ${radius} v ${-shape.shoulderHeight} a ${shape.shoulderWidth} ${shape.shoulderWidth * shape.shoulderCurve} 0 0 1 ${shape.shoulderWidth * 2} 0 v ${shape.shoulderHeight} Z`}
        transform={`translate(0 ${shape.offsetY})`}
      />
    </g>
  );
}

/** 人物 1 人分のノード。1 人につき 1 つだけ描く。 */
export function PersonNode({
  placement,
  theme,
  state,
  nameMode,
  onSelect,
  pointer,
  grabbed = false,
  showTooltip = true,
}: PersonNodeProps) {
  const style = nodeStyle(theme, state);
  const label = personLabel(placement.person, nameMode);
  const clipId = `avatar-clip-${placement.person.id}`;
  const interactive = Boolean(onSelect || pointer);

  /*
   * 掴めるノードは grab / grabbing、押すだけなら pointer。
   * 「動かせる」ことはカーソルでしか伝わらないので、状態ごとに変える。
   */
  const cursor = pointer ? (grabbed ? 'cursor-grabbing' : 'cursor-grab') : onSelect ? 'cursor-pointer' : '';

  return (
    <g
      transform={`translate(${placement.x} ${placement.y})`}
      className={cursor}
      {...pointer}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      onKeyDown={
        onSelect
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect(placement.person.id);
              }
            }
          : undefined
      }
    >
      {showTooltip && <title>{personTooltip(placement.person, nameMode)}</title>}
      {/* Minecraft のスキンが四角なので、囲いも四角にして顔が欠けないようにする */}
      <defs>
        <clipPath id={clipId}>
          <rect x={-style.radius} y={-style.radius} width={style.size} height={style.size} />
        </clipPath>
      </defs>
      <rect
        x={-style.radius}
        y={-style.radius}
        width={style.size}
        height={style.size}
        fill={style.fill}
        stroke={style.ring}
        strokeWidth={style.ringWidth}
      />
      <AvatarContentShape
        placement={placement}
        nameMode={nameMode}
        radius={style.radius}
        color={style.glyphColor}
        clipId={clipId}
      />
      <rect
        x={-style.radius}
        y={-style.radius}
        width={style.size}
        height={style.size}
        fill="none"
        stroke={style.ring}
        strokeWidth={style.ringWidth}
        pointerEvents="none"
      />
      <text
        y={style.labelOffsetY}
        textAnchor="middle"
        fill={style.labelColor}
        fontSize={style.labelFontSize}
        fontWeight={style.labelFontWeight}
      >
        {label}
      </text>
    </g>
  );
}

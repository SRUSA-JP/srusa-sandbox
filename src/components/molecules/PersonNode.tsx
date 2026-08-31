import { avatarFor, nodeStyle, personLabel, personTooltip, type NodeState } from '../../map/display';
import { PixelAvatar } from '../atoms/PixelAvatar';
import type { PersonPlacement } from '../../map/layout';
import type { VizTheme } from '../../theme/palette';

export interface PersonNodeProps {
  placement: PersonPlacement;
  /**
   * 枠線の色。外側から順に 1 本ずつ。決めるのは map/display.ts。
   *
   * 所属の線と同じ色にしてあるので、アイコンを見ただけでどこの人か分かる。
   * 空なら所属の無い人で、その場合だけ既定の枠線 1 本になる。
   */
  ringColors?: string[];
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
  /** 関係している人の名前。多い場合は呼び出し側で省略して渡す。 */
  relatedNames?: string[];
  /** 省略した関係人数。 */
  relatedRest?: number;
}

/** アイコンの中身。画像・顔・イニシャル・人型のどれをどの寸法で描くかは display.ts が決める。 */
function AvatarContentShape({
  content,
  radius,
  color,
  clipId,
}: {
  content: ReturnType<typeof avatarFor>;
  radius: number;
  color: string;
  clipId: string;
}) {
  if (content.kind === 'pixel') {
    return <PixelAvatar pixels={content.pixels} size={radius * 2} />;
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
  ringColors,
  onSelect,
  pointer,
  grabbed = false,
  showTooltip = true,
  relatedNames = [],
  relatedRest = 0,
}: PersonNodeProps) {
  const style = nodeStyle(theme, state);
  /* 所属が無い人は今までどおりの 1 本。所属があればその色を外側から重ねる */
  const rings = ringColors && ringColors.length > 0 ? ringColors : [style.ring];
  /* 枠線の内側に顔を収める。顔が枠に食われないよう、絵は枠の分だけ小さくする */
  const innerRadius = Math.max(1, style.radius - rings.length * style.ringWidth);
  const label = personLabel(placement.person, nameMode);
  const clipId = `avatar-clip-${placement.person.id}`;
  const content = avatarFor(placement.person, nameMode, innerRadius, style.glyphColor);
  const needsClip = content.kind === 'image';
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
      {showTooltip && <title>{personTooltip(placement.person, nameMode, relatedNames, relatedRest)}</title>}
      {/* Minecraft のスキンが四角なので、囲いも四角にして顔が欠けないようにする */}
      {needsClip && (
        <defs>
          <clipPath id={clipId}>
            <rect x={-innerRadius} y={-innerRadius} width={innerRadius * 2} height={innerRadius * 2} />
          </clipPath>
        </defs>
      )}
      <rect
        x={-style.radius}
        y={-style.radius}
        width={style.size}
        height={style.size}
        fill={style.fill}
      />
      <AvatarContentShape
        content={content}
        radius={innerRadius}
        color={style.glyphColor}
        clipId={clipId}
      />
      {/* 所属の数だけ枠線を重ねる。外側が 1 つ目で、内側へ向かって並ぶ */}
      {rings.map((color, index) => {
        /* 線は中心をなぞるので、半分ずつ内側へ寄せると線と線が隙間なく並ぶ */
        const inset = index * style.ringWidth + style.ringWidth / 2;
        const half = style.radius - inset;
        return (
          <rect
            key={`${color}-${index}`}
            x={-half}
            y={-half}
            width={half * 2}
            height={half * 2}
            fill="none"
            stroke={color}
            strokeWidth={style.ringWidth}
            pointerEvents="none"
          />
        );
      })}
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

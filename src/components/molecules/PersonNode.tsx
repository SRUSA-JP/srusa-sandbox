import { avatarFor, nodeStyle, personLabel, personTooltip, type NodeState } from '../../map/display';
import type { PersonPlacement } from '../../map/layout';
import type { VizTheme } from '../../theme/palette';

export interface PersonNodeProps {
  placement: PersonPlacement;
  theme: VizTheme;
  state: NodeState;
  nameMode: string;
  onSelect?: (personId: string) => void;
}

/** アイコンの中身。画像・イニシャル・人型のどれをどの寸法で描くかは display.ts が決める。 */
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
  const content = avatarFor(placement.person, nameMode, radius);

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
export function PersonNode({ placement, theme, state, nameMode, onSelect }: PersonNodeProps) {
  const style = nodeStyle(theme, state);
  const label = personLabel(placement.person, nameMode);
  const clipId = `avatar-clip-${placement.person.id}`;

  return (
    <g
      transform={`translate(${placement.x} ${placement.y})`}
      onClick={onSelect ? () => onSelect(placement.person.id) : undefined}
      style={onSelect ? { cursor: 'pointer' } : undefined}
      role={onSelect ? 'button' : undefined}
      tabIndex={onSelect ? 0 : undefined}
      onKeyDown={
        onSelect
          ? (event) => {
              if (event.key === 'Enter' || event.key === ' ') onSelect(placement.person.id);
            }
          : undefined
      }
    >
      <title>{personTooltip(placement.person, nameMode)}</title>
      <defs>
        <clipPath id={clipId}>
          <circle r={style.radius} />
        </clipPath>
      </defs>
      <circle r={style.radius} fill={style.fill} stroke={style.ring} strokeWidth={style.ringWidth} />
      <AvatarContentShape
        placement={placement}
        nameMode={nameMode}
        radius={style.radius}
        color={style.glyphColor}
        clipId={clipId}
      />
      <circle
        r={style.radius}
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

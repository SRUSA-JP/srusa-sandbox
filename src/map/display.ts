/**
 * 表示のための関数。
 *
 * 「何をどう見せるか」の決定はここに集約する。コンポーネントは
 * ここが返した値をそのまま属性へ渡すだけで、色・寸法・文言を自分で決めない。
 *
 * - 寸法・分類ごとの設定 → config.ts
 * - どの部品に何色を使うか → config/colors.ts
 * - 色そのもの・コントラスト計算 → theme/palette.ts
 * - 文言          → config/messages.ts
 *
 * このファイルは両者を組み合わせるだけで、独自の色コードや数値を持たない。
 */
import { CONTRAST_MIN_LARGE, CONTRAST_MIN_TEXT, ensureContrast, withAlpha, type VizTheme } from '../theme/palette';
import { figureColors } from '../config/colors';
import { skinnedFontSize } from '../config/skins';
import { MAP_TEXT } from '../config/messages';
import { AVATAR, EDGE, NODE, REGION, groupTypeSetting } from './config';
import type { Group, Person, Relation } from './schema';

/* ------------------------------------------------------------------ *
 * 文言
 * ------------------------------------------------------------------ */

/** 人物の表示名。`project.nameMode` で切り替える。 */
export function personLabel(person: Person, nameMode: string): string {
  if (nameMode === 'nickname' && person.nicknames.length > 0) return person.nicknames[0];
  if (nameMode === 'alias' && person.aliases && person.aliases.length > 0) return person.aliases[0];
  return person.onlineName;
}

/** グループの表示名。 */
export function groupLabel(group: Group): string {
  return group.name;
}

/** グループの分類名（凡例の見出し）。 */
export function groupTypeLabel(type: string): string {
  return groupTypeSetting(type).label;
}

/** 関係の説明文（ツールチップ）。 */
export function relationLabel(relation: Relation, nameOf: (id: string) => string): string {
  return MAP_TEXT.tooltip.relation(
    nameOf(relation.source),
    nameOf(relation.target),
    relation.context,
    relation.uncertain,
  );
}

/** グループ領域の説明文（ツールチップ）。 */
export function groupTooltip(group: Group, memberCount: number): string {
  return MAP_TEXT.tooltip.group(groupLabel(group), memberCount);
}

/** 人物ノードの説明文（ツールチップ）。所属があれば添える。 */
export function personTooltip(person: Person, nameMode: string): string {
  return MAP_TEXT.tooltip.person(personLabel(person, nameMode), person.attributes);
}

/* ------------------------------------------------------------------ *
 * 色と寸法
 * ------------------------------------------------------------------ */

export interface RegionStyle {
  stroke: string;
  fill: string;
  labelColor: string;
  strokeWidth: number;
  cornerRadius: number;
  labelFontSize: number;
  labelOffsetY: number;
  labelFontWeight: number;
}

/**
 * グループ領域の見た目。
 *
 * 枠線と塗りは分類ごとの色スロットから作り、文字色は背景に対して
 * コントラスト比を満たすところまで寄せる。
 */
export function regionStyle(group: Group, theme: VizTheme, highlighted: boolean): RegionStyle {
  const colors = figureColors(theme);
  const setting = groupTypeSetting(group.type);
  const base = colors.slot(setting.colorSlot);
  const stroke = ensureContrast(base, colors.background, CONTRAST_MIN_LARGE);
  return {
    stroke,
    fill: withAlpha(stroke, highlighted ? REGION.highlightFillAlpha : REGION.fillAlpha),
    labelColor: ensureContrast(base, colors.background, CONTRAST_MIN_TEXT),
    strokeWidth: REGION.strokeWidth,
    cornerRadius: REGION.cornerRadius,
    labelFontSize: skinnedFontSize(REGION.labelFontSize),
    labelOffsetY: REGION.labelOffsetY,
    labelFontWeight: REGION.labelFontWeight,
  };
}

/** 領域の重ね順。面積が大きいものを先に描き、内側のグループを上に載せる。 */
export function regionPaintOrder(a: { area: number; group: Group }, b: { area: number; group: Group }): number {
  return b.area - a.area || groupTypeSetting(a.group.type).order - groupTypeSetting(b.group.type).order;
}

export interface NodeStyle {
  /** アイコンの直径。 */
  size: number;
  radius: number;
  /** アイコンの背景。画像が無いときはこの上に代替表示を描く。 */
  fill: string;
  /** 枠線。 */
  ring: string;
  ringWidth: number;
  /** 代替表示（人型・イニシャル）の色。背景に対して読める色を返す。 */
  glyphColor: string;
  labelColor: string;
  labelFontSize: number;
  labelOffsetY: number;
  labelFontWeight: number;
}

export interface NodeState {
  isCenter: boolean;
  /** 中心人物と関係のある人物。 */
  isRelated: boolean;
  /** 絞り込みの対象外。 */
  isDimmed: boolean;
}

/** 人物ノードの見た目。アイコンの有無に関わらず同じ寸法を返す。 */
export function nodeStyle(theme: VizTheme, state: NodeState): NodeStyle {
  const colors = figureColors(theme);
  const accent = ensureContrast(colors.primary, colors.background, CONTRAST_MIN_LARGE);
  const size = state.isCenter ? NODE.size * NODE.centerScale : NODE.size;
  const fill = colors.background;

  return {
    size,
    radius: size / 2,
    fill,
    ring: state.isDimmed ? colors.dimmed : state.isCenter || state.isRelated ? accent : colors.axis,
    ringWidth: state.isCenter ? NODE.ringWidth * NODE.centerRingScale : NODE.ringWidth,
    /* 代替表示はアイコン背景の上に載るので、その背景に対して選ぶ */
    glyphColor: state.isDimmed ? colors.dimmed : colors.labelOn(fill, CONTRAST_MIN_LARGE),
    labelColor: state.isDimmed
      ? colors.dimmed
      : state.isCenter || state.isRelated
        ? colors.strongText
        : colors.axis,
    labelFontSize: skinnedFontSize(NODE.labelFontSize),
    labelOffsetY: size / 2 + NODE.labelOffsetY,
    labelFontWeight: state.isCenter ? NODE.centerLabelFontWeight : NODE.labelFontWeight,
  };
}

/**
 * ノードに出す絵の指定。
 *
 * 画像 URL があれば画像、無ければ config の代替表示（人型 / イニシャル）。
 * データに `avatarUrl` を足すだけで、この関数の戻り値が変わって
 * 全てのノードがアイコン表示になる。
 */
export type AvatarContent =
  | { kind: 'image'; src: string }
  | { kind: 'initial'; text: string; fontSize: number; fontWeight: number }
  | { kind: 'silhouette'; shape: SilhouetteShape };

/** 人型（頭と肩）の実寸。比率に半径を掛けた値だけを返す。 */
export interface SilhouetteShape {
  headRadius: number;
  headOffsetY: number;
  shoulderWidth: number;
  shoulderHeight: number;
  shoulderCurve: number;
  offsetY: number;
}

function silhouetteShape(radius: number): SilhouetteShape {
  const ratio = AVATAR.silhouette;
  return {
    headRadius: radius * ratio.headRadius,
    headOffsetY: radius * ratio.headOffsetY,
    shoulderWidth: radius * ratio.shoulderWidth,
    shoulderHeight: radius * ratio.shoulderHeight,
    shoulderCurve: ratio.shoulderCurve,
    offsetY: radius * ratio.offsetY,
  };
}

export function avatarFor(person: Person, nameMode: string, radius: number): AvatarContent {
  if (person.avatarUrl) return { kind: 'image', src: person.avatarUrl };
  if (NODE.fallback === 'initial') {
    return {
      kind: 'initial',
      text: [...personLabel(person, nameMode)][0]?.toUpperCase() ?? '?',
      fontSize: radius * AVATAR.initialFontScale,
      fontWeight: AVATAR.initialFontWeight,
    };
  }
  return { kind: 'silhouette', shape: silhouetteShape(radius) };
}

export interface EdgeStyle {
  stroke: string;
  strokeWidth: number;
  strokeDasharray?: string;
  opacity: number;
  /** 弧の膨らみ（座標単位）。0 なら直線。 */
  bow: number;
}

/** 線の長さから弧の膨らみを決める。長い線ほど曲げて、束になった線をほどく。 */
function bowFor(length: number): number {
  return Math.min(length * EDGE.curvature, EDGE.maxBow);
}

/** 関係線の見た目。長さを渡すと、その長さに応じた弧の膨らみも返す。 */
export function edgeStyle(
  relation: Relation,
  theme: VizTheme,
  highlighted: boolean,
  length = 0,
): EdgeStyle {
  const colors = figureColors(theme);
  return {
    stroke: highlighted
      ? ensureContrast(colors.primary, colors.background, CONTRAST_MIN_LARGE)
      : colors.axis,
    strokeWidth: highlighted ? EDGE.highlightWidth : EDGE.width,
    strokeDasharray: relation.uncertain ? EDGE.uncertainDash : undefined,
    opacity: EDGE.opacity,
    bow: bowFor(length),
  };
}

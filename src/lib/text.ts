/**
 * 文字が占める幅の見積り。
 *
 * SVG の中の文字は、実際に描いてみるまで幅が分からない。それでも図の外へ
 * はみ出さない配置を先に決めたいので、字種ごとの平均的な幅（フォントの
 * 大きさに対する比）から見積もる。
 *
 * **迷ったら広い側に倒す。** 実測より狭く見積もると、その分だけ図がはみ出す。
 */

/** 字種ごとの幅（フォントの大きさに対する比）。 */
const WIDTH_EM = {
  /** 全角（日本語）。 */
  fullWidth: 1.05,
  /** 大文字。太字だとさらに広がるので広めに見る。 */
  upper: 0.72,
  /** 小文字。 */
  lower: 0.58,
  /** 数字。 */
  digit: 0.62,
  /** 細い字（i・l・記号）。 */
  narrow: 0.34,
  /** 空白。 */
  space: 0.3,
  /** それ以外。 */
  other: 0.62,
} as const;

const NARROW_CHARS = new Set([...'ilj.,:;\'`|!()[]{}']);

/** 全角と見なす境目。CJK と全角記号はここから上に来る。 */
const FULL_WIDTH_FROM = 0x2e80;

function charWidthEm(char: string): number {
  if (char === ' ') return WIDTH_EM.space;
  if (NARROW_CHARS.has(char)) return WIDTH_EM.narrow;
  if (char >= '0' && char <= '9') return WIDTH_EM.digit;
  if (char >= 'A' && char <= 'Z') return WIDTH_EM.upper;
  if (char >= 'a' && char <= 'z') return WIDTH_EM.lower;
  return (char.codePointAt(0) ?? 0) >= FULL_WIDTH_FROM ? WIDTH_EM.fullWidth : WIDTH_EM.other;
}

/** その文字列が占める幅の見積り。 */
export function estimateTextWidth(text: string, fontSize: number): number {
  return [...text].reduce((total, char) => total + charWidthEm(char) * fontSize, 0);
}

/**
 * 文字が占める高さの見積り。
 *
 * 縦の中央に置く（dominantBaseline="central"）前提で、上下に半分ずつ使う。
 * 大文字の高さに、はみ出しを見込んだ余裕を足す。
 */
export function estimateTextHeight(fontSize: number): number {
  return fontSize * 1.15;
}

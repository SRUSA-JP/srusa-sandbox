/**
 * プレイヤー名から固定生成する Minecraft 風のアイコン。
 *
 * スキン画像があるのは 82 人中 15 人だけなので、残りはここで作った絵を出す。
 * 名前から作るので、同じ人はどの画面でも必ず同じ顔になる。
 *
 * React にも SVG にも依存しない。図鑑（HTML の升目）も相関図（SVG の四角）も
 * この 64 個の色を並べるだけで、同じ顔が出る。
 */
import { PLAYER_ICON_COLORS } from '../config/playerIcons';

/** アイコンの一辺の升目の数。 */
export const PLAYER_ICON_GRID = 8;

function hashName(name: string): number {
  return [...name].reduce((acc, char) => Math.imul(acc ^ char.charCodeAt(0), 16777619), 2166136261) >>> 0;
}

function pick<T>(values: readonly T[], seed: number): T {
  return values[seed % values.length];
}

function fillRow(pixels: string[], row: number, color: string, from = 0, to = 8): void {
  for (let column = from; column < to; column += 1) pixels[row * 8 + column] = color;
}

function setPixel(pixels: string[], column: number, row: number, color: string): void {
  pixels[row * 8 + column] = color;
}

export function playerIconPixels(name: string, accent: string): string[] {
  const seed = hashName(name);
  const skin = pick(PLAYER_ICON_COLORS.skin, seed);
  const hair = pick(PLAYER_ICON_COLORS.hair, seed >> 3);
  const eyes = pick(PLAYER_ICON_COLORS.eyes, seed >> 6);
  const detail = pick(PLAYER_ICON_COLORS.detail, seed >> 9);
  const pixels = Array.from({ length: 64 }, () => skin);
  const hairStyle = seed % 4;
  const mouthStyle = (seed >> 12) % 3;
  const hasGlasses = (seed & 0b100000) !== 0;

  fillRow(pixels, 0, hair);
  if (hairStyle === 0) {
    fillRow(pixels, 1, hair, 0, 7);
    setPixel(pixels, 0, 2, hair);
  } else if (hairStyle === 1) {
    fillRow(pixels, 1, hair);
    setPixel(pixels, 1, 2, hair);
    setPixel(pixels, 6, 2, hair);
  } else if (hairStyle === 2) {
    fillRow(pixels, 1, hair, 0, 6);
    setPixel(pixels, 5, 2, hair);
    setPixel(pixels, 6, 2, hair);
  } else {
    fillRow(pixels, 1, hair, 2, 8);
    setPixel(pixels, 1, 2, hair);
    setPixel(pixels, 7, 2, hair);
  }

  setPixel(pixels, 2, 3, eyes);
  setPixel(pixels, 5, 3, eyes);
  if (hasGlasses) {
    setPixel(pixels, 1, 3, detail);
    setPixel(pixels, 3, 3, detail);
    setPixel(pixels, 4, 3, detail);
    setPixel(pixels, 6, 3, detail);
  }

  if (mouthStyle === 0) {
    setPixel(pixels, 3, 5, eyes);
    setPixel(pixels, 4, 5, eyes);
  } else if (mouthStyle === 1) {
    setPixel(pixels, 3, 5, detail);
    setPixel(pixels, 4, 5, detail);
    setPixel(pixels, 5, 5, detail);
  } else {
    setPixel(pixels, 2, 5, eyes);
    setPixel(pixels, 3, 5, eyes);
    setPixel(pixels, 4, 5, eyes);
  }

  fillRow(pixels, 6, accent);
  fillRow(pixels, 7, accent);
  if ((seed & 1) === 0) {
    setPixel(pixels, 3, 6, detail);
    setPixel(pixels, 4, 6, detail);
    setPixel(pixels, 3, 7, detail);
    setPixel(pixels, 4, 7, detail);
  } else {
    fillRow(pixels, 7, detail, 2, 6);
  }

  return pixels;
}

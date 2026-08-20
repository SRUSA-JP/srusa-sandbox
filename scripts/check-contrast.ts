/**
 * 画面に出る文字色が背景とのコントラスト比を満たすかを検査する。
 *
 * 色は theme/palette.ts の関数だけが決める決まりなので、ここではその出力を検証する。
 * 見た目のプリセット（config/skins.ts）は色を差し替えるので、スキンごとに検査する。
 * 配色・しきい値・スキンを変えたら `npm run check:contrast` を通すこと。
 */
import {
  CONTRAST_MIN_LARGE, CONTRAST_MIN_TEXT, DARK_THEME, LIGHT_THEME,
  chartText, contrastRatio, readableTextOn, tooltipSurface,
} from '../src/theme/palette';
import { GROUP_TYPE_SETTINGS } from '../src/map/config';
import { SKINS, applySkin } from '../src/config/skins';
import { edgeStyle, nodeStyle, regionStyle } from '../src/map/display';

/** 検査する配色の組み合わせ（スキン × ライト / ダーク）。 */
const cases = SKINS.flatMap((skin) =>
  [LIGHT_THEME, DARK_THEME].map((theme) => ({
    label: `${skin.label} / ${theme.mode}`,
    theme: applySkin(theme, skin),
  })),
);

let failed = 0;
const check = (name: string, fg: string, bg: string, min: number) => {
  const ratio = contrastRatio(fg, bg);
  const ok = ratio >= min;
  if (!ok) failed++;
  console.log(`${ok ? 'OK ' : 'NG '} ${name.padEnd(42)} ${ratio.toFixed(2)} (下限 ${min})`);
};

for (const { label, theme } of cases) {
  console.log(`\n--- ${label} ---`);
  const tip = tooltipSurface(theme);
  check('ツールチップ 見出し / 背景', tip.titleColor, tip.background, CONTRAST_MIN_TEXT);
  check('ツールチップ 本文 / 背景', tip.textColor, tip.background, CONTRAST_MIN_TEXT);
  check('軸ラベル / グラフ面', chartText(theme), theme.surface, CONTRAST_MIN_TEXT);
  check('主要文字 / グラフ面', chartText(theme, 'primary'), theme.surface, CONTRAST_MIN_TEXT);
  theme.categorical.forEach((color, i) => {
    check(`系列${i + 1} ドット / ツールチップ背景`, tip.seriesColor(color), tip.background, CONTRAST_MIN_LARGE);
    check(`系列${i + 1} 上の値ラベル`, readableTextOn(color, theme), color, CONTRAST_MIN_TEXT);
  });
}

/* 相関図: 領域・ノード・関係線の色も同じ基準で検査する */
for (const { label, theme } of cases) {
  console.log(`\n--- 相関図 / ${label} ---`);
  for (const type of Object.keys(GROUP_TYPE_SETTINGS)) {
    const group = { id: type, name: type, type };
    const style = regionStyle(group, theme, false);
    check(`領域 ${type} 枠線 / 背景`, style.stroke, theme.surface, CONTRAST_MIN_LARGE);
    check(`領域 ${type} ラベル / 背景`, style.labelColor, theme.surface, CONTRAST_MIN_TEXT);
  }
  for (const state of [
    { isCenter: true, isRelated: false, isDimmed: false },
    { isCenter: false, isRelated: true, isDimmed: false },
    { isCenter: false, isRelated: false, isDimmed: false },
  ]) {
    const style = nodeStyle(theme, state);
    const name = state.isCenter ? '中心人物' : state.isRelated ? '関係あり' : '通常';
    check(`ノード ${name} ラベル / 背景`, style.labelColor, theme.surface, CONTRAST_MIN_TEXT);
    check(`ノード ${name} 人型 / アイコン背景`, style.glyphColor, style.fill, CONTRAST_MIN_LARGE);
    check(`ノード ${name} 枠線 / 背景`, style.ring, theme.surface, CONTRAST_MIN_LARGE);
  }
  const relation = { source: 'a', target: 'b', type: 'friend' };
  check('関係線 通常 / 背景', edgeStyle(relation, theme, false).stroke, theme.surface, CONTRAST_MIN_LARGE);
  check('関係線 強調 / 背景', edgeStyle(relation, theme, true).stroke, theme.surface, CONTRAST_MIN_LARGE);
}

console.log(failed === 0 ? '\nすべて基準を満たしています' : `\n未達: ${failed} 件`);
process.exit(failed === 0 ? 0 : 1);

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
import { GROUP_BIOMES, GROUP_TYPE_SETTINGS } from '../src/map/config';
import { SKINS, applySkin } from '../src/config/skins';
import { roleColors } from '../src/config/colors';
import { edgeStyle, nodeStyle, regionStyle } from '../src/map/display';
import { calendarDayColors, calendarMarkAccent } from '../src/lib/display';

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

  /*
   * 画面部品の色は config/colors.ts の役割を通して決まるので、テーマの生の値
   * ではなく役割の色を検査する（実際に画面へ出るのはこちら）。
   * 文字は 3 段とも、文字が載りうる面すべてに対して基準を満たすこと。
   * 段の違いは強さの表現であって、コントラストを下げる口実にしない。
   */
  const role = roleColors(theme);
  const surfaces: Array<[string, string]> = [
    ['ページの地', role.background],
    ['カードの面', role.surface],
    ['持ち上げた面', role.raised],
    ['沈めた面', role.sunken],
    ['指したときの面', role.hover],
    ['浮かせた面', role.overlay],
    ['強調を薄く敷いた面', role.accentSubtle],
  ];
  const texts: Array<[string, string]> = [
    ['本文', role.text],
    ['補足', role.muted],
    ['添え物', role.subtle],
  ];
  for (const [surfaceName, surface] of surfaces) {
    for (const [textName, color] of texts) {
      check(`${textName} / ${surfaceName}`, color, surface, CONTRAST_MIN_TEXT);
    }
  }
  check('エラーの文字 / カードの面', role.danger, role.surface, CONTRAST_MIN_TEXT);
  check('強調色の上の文字', role.onAccent, role.accent, CONTRAST_MIN_TEXT);
  check('強調色 / カードの面', role.accent, role.surface, CONTRAST_MIN_LARGE);
  check('指したときの強調色 / カードの面', role.accentHover, role.surface, CONTRAST_MIN_LARGE);
  theme.categorical.forEach((color, i) => {
    check(`系列${i + 1} ドット / ツールチップ背景`, tip.seriesColor(color), tip.background, CONTRAST_MIN_LARGE);
    check(`系列${i + 1} 上の値ラベル`, readableTextOn(color, theme), color, CONTRAST_MIN_TEXT);
  });
}

/* 相関図: 領域・ノード・関係線の色も同じ基準で検査する */
for (const { label, theme } of cases) {
  console.log(`\n--- 相関図 / ${label} ---`);
  /*
   * 囲いの色はグループごとのバイオームで決まるので、分類ではなくバイオームを
   * 全部見る。使われていないバイオームも検査しておく（グループが増えたときに
   * 割り当てても、読めない色にならないように）。
   */
  for (const [id, biome] of Object.entries(GROUP_BIOMES)) {
    const group = { id, name: id, type: 'unknown' as const };
    const style = regionStyle(group, theme, false);
    check(`領域 ${biome} 枠線 / 背景`, style.stroke, theme.surface, CONTRAST_MIN_LARGE);
    check(`領域 ${biome} ラベル / 背景`, style.labelColor, theme.surface, CONTRAST_MIN_TEXT);
  }
  for (const type of Object.keys(GROUP_TYPE_SETTINGS)) {
    const group = { id: `type:${type}`, name: type, type };
    const style = regionStyle(group, theme, false);
    check(`領域 分類${type} 枠線 / 背景`, style.stroke, theme.surface, CONTRAST_MIN_LARGE);
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
  check('活動カレンダー 出来事の札 / 背景', calendarMarkAccent(theme), theme.surface, CONTRAST_MIN_TEXT);
  /*
   * 暦の枠は人数で濃さが変わる。薄い日と濃い日で文字色の選び方が変わるので、
   * 両端と真ん中を見る。ここを外すと、混み合った日だけ数字が読めなくなる。
   */
  for (const [label, people] of [['薄い日', 1], ['中くらいの日', 6], ['濃い日', 11]] as const) {
    const day = { date: '', people, joins: 0, deaths: 0, firstSeen: '', marks: [] };
    const cell = calendarDayColors(day, 11, theme);
    check(`活動カレンダー ${label}の数字 / 枠`, cell.text, cell.background, CONTRAST_MIN_TEXT);
  }

  const relation = { source: 'a', target: 'b', type: 'friend' };
  check('関係線 通常 / 背景', edgeStyle(relation, theme, false).stroke, theme.surface, CONTRAST_MIN_LARGE);
  check('関係線 強調 / 背景', edgeStyle(relation, theme, true).stroke, theme.surface, CONTRAST_MIN_LARGE);
}

console.log(failed === 0 ? '\nすべて基準を満たしています' : `\n未達: ${failed} 件`);
process.exit(failed === 0 ? 0 : 1);

/**
 * 図が「枠からはみ出さない」「小さすぎない」ことを検査する。
 *
 * 画面を見れば分かる壊れ方だが、スキン（文字の倍率）や文言を変えたときに
 * 気づかないまま壊れるのがこの 2 つ。配置の計算は lib/ の純関数が持っているので、
 * ここではその関数と config の値を、実際に画面へ出る組み合わせで確かめる。
 *
 * - はみ出し: 図の中の文字が viewBox の外へ出ていないか
 * - 小さすぎ: 図の中の文字が可読性の下限（FONT_SIZE.xxs）を下回っていないか
 * - 潰れ: 名前に場所を取られて、図そのものが小さくなりすぎていないか
 *
 * 文字の幅は実測できないので lib/text.ts の見積り（広めに見る）を使う。
 */
import { AXIS, LEGEND, RADAR, TOOLTIP, VALUE_LABEL } from '../src/config/charts';
import { STATS_TEXT } from '../src/config/messages';
import { SKINS, setActiveSkin, skinnedFontSize, type Skin } from '../src/config/skins';
import { WORLD_MAP } from '../src/config/worldMap';
import { radarLayout } from '../src/lib/radar';
import { PLAYSTYLE_IDS } from '../src/lib/statsExperience';
import { LEGEND as MAP_LEGEND, NODE, REGION } from '../src/map/config';
import { FONT_SIZE } from '../src/theme/tokens';
import { svgTextOverflow } from './svg-text-fit';

type Finding = {
  target: string;
  rule: string;
  detail: string;
};

/** 図の中の文字の下限。これを下回ると読めない（theme/tokens.ts の説明どおり）。 */
const MIN_FONT_SIZE = FONT_SIZE.xxs;

/** 軸に添える値は 0〜100。桁が増えるほど外へ出るので、最大値で見る。 */
const WORST_VALUE = 100;

const findings: Finding[] = [];

function fail(target: string, rule: string, detail: string) {
  findings.push({ target, rule, detail });
}

/** 図の中で使う文字の大きさ。スキンの倍率をかけたあとで下限を下回らないこと。 */
const FIGURE_FONT_SIZES: Array<{ name: string; size: number }> = [
  { name: 'グラフの軸', size: AXIS.fontSize },
  { name: 'グラフの値ラベル', size: VALUE_LABEL.fontSize },
  { name: 'グラフの点の名前', size: VALUE_LABEL.captionFontSize },
  { name: 'グラフの凡例', size: LEGEND.fontSize },
  { name: 'グラフの吹き出し', size: TOOLTIP.fontSize },
  { name: 'レーダーの軸名', size: RADAR.fontSize },
  { name: '相関図の人の名前', size: NODE.labelFontSize },
  { name: '相関図の領域名', size: REGION.labelFontSize },
  { name: '相関図の凡例', size: MAP_LEGEND.fontSize },
  { name: 'ワールドマップの目印', size: WORLD_MAP.markLabelFontSize },
];

function checkFontSizes(skin: Skin) {
  for (const entry of FIGURE_FONT_SIZES) {
    const size = skinnedFontSize(entry.size);
    if (size < MIN_FONT_SIZE) {
      fail(
        `${skin.label} / ${entry.name}`,
        '文字が小さすぎる',
        `${size}px は下限 ${MIN_FONT_SIZE}px を下回ります（元の値 ${entry.size}px × 倍率 ${skin.fontScale}）`,
      );
    }
  }
}

function checkPlaystyleRadar(skin: Skin) {
  const short = STATS_TEXT.experience.playstyle.stylesShort;
  const layout = radarLayout({
    labels: PLAYSTYLE_IDS.map((id) => `${short[id]}:${WORST_VALUE}`),
    size: RADAR.size,
    fontSize: skinnedFontSize(RADAR.fontSize),
    padding: RADAR.padding,
    gap: RADAR.labelGap,
  });
  const target = `${skin.label} / プレイスタイルのレーダー`;

  for (const axis of layout.axes) {
    const outside =
      axis.box.minX < 0 || axis.box.minY < 0 || axis.box.maxX > layout.size || axis.box.maxY > layout.size;
    if (outside) {
      fail(
        target,
        '枠からはみ出す',
        `「${axis.label}」が X ${axis.box.minX.toFixed(1)}..${axis.box.maxX.toFixed(1)} / ` +
          `Y ${axis.box.minY.toFixed(1)}..${axis.box.maxY.toFixed(1)} まで伸び、0..${layout.size} を超えます`,
      );
    }
  }

  const ratio = (layout.radius * 2) / layout.size;
  if (ratio < RADAR.minDiameterRatio) {
    fail(
      target,
      '図が潰れている',
      `多角形の直径が枠の ${(ratio * 100).toFixed(0)}% しかありません（下限 ${(RADAR.minDiameterRatio * 100).toFixed(0)}%）。` +
        '軸の名前を短くするか、図の一辺を大きくしてください',
    );
  }
}

/**
 * はみ出しの見つけ役そのものの検査。
 *
 * 描き上がった SVG のはみ出しは check-ui-render.tsx が svgTextOverflow で見ている。
 * 見つけ役が何も見つけられなくなっていると、検査が全部通っていても意味がないので、
 * 分かっている「はみ出す図」と「収まる図」を 1 つずつ通して確かめる。
 *
 * 例に使うのは、実際にはみ出していた頃のレーダー（枠 120 に対して軸名が 143 まで伸びていた）。
 */
const OVERFLOWING_SVG =
  '<svg viewBox="0 0 120 120"><g><text x="111.7" y="71.8" text-anchor="start" font-size="5.4">2 FIGHTER</text></g></svg>';
const FITTING_SVG =
  '<svg viewBox="0 0 120 120"><g transform="translate(60 60)"><text x="0" y="0" text-anchor="middle" font-size="6">OK</text></g></svg>';

function checkOverflowDetector() {
  if (svgTextOverflow(OVERFLOWING_SVG).length === 0) {
    fail('はみ出しの見つけ役', '見つけられていない', '枠からはみ出した文字を見逃しています');
  }
  const falsePositives = svgTextOverflow(FITTING_SVG);
  if (falsePositives.length > 0) {
    fail(
      'はみ出しの見つけ役',
      '収まっているのに落ちる',
      `収まっている文字を ${falsePositives.length} 件はみ出しと見ています`,
    );
  }
}

checkOverflowDetector();

for (const skin of SKINS) {
  /* 画面と同じ手順。スキンを適用してから、その倍率込みの値を見る */
  setActiveSkin(skin);
  checkFontSizes(skin);
  checkPlaystyleRadar(skin);
}

if (findings.length === 0) {
  console.log(`図のはみ出し・大きさの検査はすべて通りました（スキン ${SKINS.length} 種）`);
  process.exit(0);
}

for (const finding of findings) {
  console.log(`NG  ${finding.target} [${finding.rule}] ${finding.detail}`);
}
console.log(`\n未達: ${findings.length} 件`);
process.exit(1);

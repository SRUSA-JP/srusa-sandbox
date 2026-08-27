/**
 * アプリのアイコン（タブ・ホーム画面）を、元絵から各寸法に作り直す。
 *
 * 元絵はドット絵なので、縮めるときに混ぜてはいけない。混ぜると輪郭が
 * ぼやけて、サイト全体のドット絵風の見た目から浮く。いちばん近い画素を
 * そのまま取る（ニアレストネイバー）。
 *
 * 元絵の一辺が出力の整数倍でなくても、割り切れる位置を選ぶので
 * 画素の大きさが場所によってばらつく。それを避けるため、まず元絵を
 * 「1 マス何画素か」で読み直してから、マス単位で縮める。
 *
 * 使い方: npm run build:icons
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { APP_ICONS, APP_ICON_SOURCE } from '../src/config/pwa';
import { decodePng, encodePng, type Rgba } from './png';

/** いちばん近い画素をそのまま取って縮める。 */
function resizeNearest(source: Rgba, size: number): Rgba {
  const data = Buffer.alloc(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    /* 出力の画素の「真ん中」が元絵のどこに当たるかで選ぶ。端に寄らせない */
    const sourceY = Math.min(source.height - 1, Math.floor(((y + 0.5) * source.height) / size));
    for (let x = 0; x < size; x += 1) {
      const sourceX = Math.min(source.width - 1, Math.floor(((x + 0.5) * source.width) / size));
      const from = (sourceY * source.width + sourceX) * 4;
      const to = (y * size + x) * 4;
      source.data.copy(data, to, from, from + 4);
    }
  }
  return { width: size, height: size, data };
}

const source = decodePng(readFileSync(APP_ICON_SOURCE));
if (source.width !== source.height) {
  console.log(`NG  元絵が正方形ではありません（${source.width}x${source.height}）`);
  process.exit(1);
}

for (const icon of APP_ICONS) {
  const resized = resizeNearest(source, icon.size);
  writeFileSync(`public/${icon.path}`, encodePng(resized));
  console.log(`OK  ${icon.path}（${icon.size}x${icon.size}）`);
}

console.log(`アイコンを ${APP_ICONS.length} 種類つくりました（元絵 ${source.width}x${source.height}）`);

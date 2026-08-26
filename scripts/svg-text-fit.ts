/**
 * 描き上がった SVG の中の文字が、枠（viewBox）に収まっているかを調べる。
 *
 * 図の中の文字は viewBox の外へ出ると黙って切り取られる。画面を見れば分かるが、
 * データや文言が変わったときに気づけないので、レンダリング結果の文字列から
 * 機械的に調べる。文字の幅は実測できないので lib/text.ts の見積りを使う。
 *
 * 解釈できない座標変換（拡大・回転）が掛かった中の文字は、位置を誤って
 * 責めないように見送る。**見落とすことはあっても、誤って落とさない**方に倒す。
 */
import { estimateTextHeight, estimateTextWidth } from '../src/lib/text';

export interface SvgTextFinding {
  /** どの図か（viewBox）。 */
  frame: string;
  /** はみ出した文字。 */
  text: string;
  detail: string;
}

interface Offset {
  x: number;
  y: number;
  /** 解釈できない座標変換の中にいるか。 */
  skip: boolean;
}

function attribute(tag: string, name: string): string | undefined {
  const match = tag.match(new RegExp(`\\s${name}="([^"]*)"`));
  return match?.[1];
}

function numberAttribute(tag: string, name: string): number {
  const raw = attribute(tag, name);
  const value = raw === undefined ? Number.NaN : Number.parseFloat(raw);
  return Number.isFinite(value) ? value : 0;
}

/** translate だけ読む。それ以外が混ざっていたら、その中は見送る。 */
function translateOf(tag: string): Offset | 'unknown' | undefined {
  const transform = attribute(tag, 'transform');
  if (!transform) return undefined;
  const translate = transform.match(/^translate\(\s*(-?[\d.]+)[\s,]+(-?[\d.]+)\s*\)$/);
  if (!translate) return 'unknown';
  return { x: Number.parseFloat(translate[1]), y: Number.parseFloat(translate[2]), skip: false };
}

function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, '');
}

/** アンカーに応じて、基準点から左右にどれだけ張り出すか。 */
function spread(anchor: string, width: number): { left: number; right: number } {
  if (anchor === 'end') return { left: -width, right: 0 };
  if (anchor === 'middle') return { left: -width / 2, right: width / 2 };
  return { left: 0, right: width };
}

/**
 * 描き上がった HTML の中の SVG を 1 つずつ見て、はみ出した文字を返す。
 *
 * @param html renderToString の結果
 */
export function svgTextOverflow(html: string): SvgTextFinding[] {
  const findings: SvgTextFinding[] = [];

  for (const svg of html.matchAll(/<svg\b[^>]*>([\s\S]*?)<\/svg>/g)) {
    const open = svg[0].slice(0, svg[0].indexOf('>') + 1);
    const viewBox = attribute(open, 'viewBox')?.split(/[\s,]+/).map(Number);
    if (!viewBox || viewBox.length !== 4 || viewBox.some((value) => !Number.isFinite(value))) continue;
    const [minX, minY, width, height] = viewBox;

    const stack: Offset[] = [{ x: 0, y: 0, skip: false }];
    const body = svg[1];
    const tags = [...body.matchAll(/<(\/?)([a-zA-Z]+)\b([^>]*)>/g)];

    for (let index = 0; index < tags.length; index += 1) {
      const [tag, closing, name] = tags[index];
      const top = stack[stack.length - 1];

      if (closing) {
        if (stack.length > 1) stack.pop();
        continue;
      }

      const translate = translateOf(tag);
      const here: Offset =
        translate === 'unknown'
          ? { ...top, skip: true }
          : translate
            ? { x: top.x + translate.x, y: top.y + translate.y, skip: top.skip }
            : { ...top };

      if (name === 'text' && !here.skip) {
        const from = (tags[index].index ?? 0) + tag.length;
        const closeAt = body.indexOf('</text>', from);
        const content = stripTags(body.slice(from, closeAt === -1 ? undefined : closeAt)).trim();
        if (content) {
          const fontSize = numberAttribute(tag, 'font-size');
          const x = here.x + numberAttribute(tag, 'x');
          const y = here.y + numberAttribute(tag, 'y');
          const textWidth = estimateTextWidth(content, fontSize);
          const textHeight = estimateTextHeight(fontSize);
          const sides = spread(attribute(tag, 'text-anchor') ?? 'start', textWidth);
          const box = {
            minX: x + sides.left,
            maxX: x + sides.right,
            /* 縦の基準は文字によって違うので、上下とも高さの分だけ見て取りこぼさないようにする */
            minY: y - textHeight,
            maxY: y + textHeight,
          };
          if (box.minX < minX || box.maxX > minX + width || box.minY < minY || box.maxY > minY + height) {
            findings.push({
              frame: `viewBox ${viewBox.join(' ')}`,
              text: content,
              detail:
                `X ${box.minX.toFixed(1)}..${box.maxX.toFixed(1)} / Y ${box.minY.toFixed(1)}..${box.maxY.toFixed(1)} は ` +
                `X ${minX}..${minX + width} / Y ${minY}..${minY + height} に収まりません`,
            });
          }
        }
      }

      if (!tag.endsWith('/>')) stack.push(here);
    }
  }

  return findings;
}

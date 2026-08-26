/**
 * DESIGN.md のうち機械で見つけやすい破損を検査する。
 *
 * コントラスト比は check-contrast.ts が数値で見る。
 * ここでは UI 層に色や寸法の実値が戻ってこないこと、カードを入れ子にしないことなど、
 * レビューで見落としやすいデザイン規約を軽く静的検査する。
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { relative, resolve } from 'node:path';

type Finding = {
  file: string;
  line: number;
  rule: string;
  detail: string;
};

const ROOT = process.cwd();
const TARGETS = [
  'src/App.tsx',
  'src/main.tsx',
  'src/components',
  'src/pages',
  'src/styles/index.css',
];

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.css']);
const findings: Finding[] = [];

function walk(path: string): string[] {
  const fullPath = resolve(ROOT, path);
  const stat = statSync(fullPath);
  if (stat.isFile()) return [fullPath];
  return readdirSync(fullPath).flatMap((entry) => walk(relative(ROOT, resolve(fullPath, entry))));
}

function extensionOf(path: string): string {
  const index = path.lastIndexOf('.');
  return index === -1 ? '' : path.slice(index);
}

function withoutComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, (match) => '\n'.repeat(match.split('\n').length - 1))
    .replace(/\/\/.*$/gm, '');
}

function addFinding(file: string, source: string, index: number, rule: string, detail: string) {
  findings.push({
    file,
    line: source.slice(0, index).split('\n').length,
    rule,
    detail,
  });
}

function isAllowedArbitraryClass(className: string): boolean {
  if (className.includes('var(--sr-')) return true;

  /*
   * grid-template-columns の式は、auto-fit/minmax でテキストの折り返しと列崩れを防ぐためのもの。
   * 寸法トークンへ寄せる余地はあるが、現状のレスポンシブ設計では例外として許可する。
   */
  if (/^(?:sm:|md:|lg:|xl:|2xl:)?grid-cols-\[/.test(className)) return true;

  return false;
}

function checkColorLiterals(file: string, source: string) {
  const colorLiteral = /#[0-9a-fA-F]{3,8}\b|\b(?:rgb|rgba|hsl|hsla)\(/g;
  for (const match of source.matchAll(colorLiteral)) {
    addFinding(file, source, match.index, '色の直書き', `${match[0]} は theme/config の役割色へ移してください`);
  }

  const namedColorClass = /\b(?:bg|text|border)-(?:white|black)\b/g;
  for (const match of source.matchAll(namedColorClass)) {
    addFinding(file, source, match.index, '色の直書き', `${match[0]} は Tailwind 標準色ではなく役割色を使ってください`);
  }
}

function checkArbitraryClasses(file: string, source: string) {
  const arbitraryClass = /[A-Za-z0-9:-]+-\[[^\]\s]+(?:[^\]`"'<>]*)\]/g;
  for (const match of source.matchAll(arbitraryClass)) {
    const className = match[0];
    if (isAllowedArbitraryClass(className)) continue;
    addFinding(
      file,
      source,
      match.index,
      '任意値クラス',
      `${className} は var(--sr-*) か DESIGN.md で説明された例外へ寄せてください`,
    );
  }
}

/**
 * SVG の文字の大きさを数値で直接書いていないか。
 *
 * SVG は CSS のクラスを通せないので、つい `fontSize="5.4"` のように書いてしまう。
 * するとスキンの倍率が効かず、拡大縮小する図の中では読めない大きさになる
 * （実際にレーダーの軸名がそうなっていた）。トークンか、寸法を計算した値を渡す。
 */
function checkLiteralFontSize(file: string, source: string) {
  const literal = /\bfontSize=(?:"[\d.]+"|\{\s*[\d.]+\s*\})/g;
  for (const match of source.matchAll(literal)) {
    addFinding(
      file,
      source,
      match.index,
      '文字の大きさの直書き',
      `${match[0]} は FONT_SIZE と skinnedFontSize（または配置計算の結果）から渡してください`,
    );
  }
}

function checkNestedCards(file: string, source: string) {
  let chartCardDepth = 0;
  let offset = 0;
  for (const line of source.split('\n')) {
    if (line.includes('</ChartCard>')) chartCardDepth = Math.max(0, chartCardDepth - 1);
    const opens = line.match(/<ChartCard\b/g) ?? [];
    for (const open of opens) {
      if (chartCardDepth > 0) {
        addFinding(file, source, offset + line.indexOf(open), 'カード入れ子', 'ChartCard の中に ChartCard を置かないでください');
      }
      if (!line.includes('/>')) chartCardDepth++;
    }
    offset += line.length + 1;
  }

  const nestedSurfaceCard = /\b(?:rounded-md|rounded-lg)\b[^"'`<>]*\bbg-surface\b[\s\S]{0,1200}\b(?:rounded-md|rounded-lg)\b[^"'`<>]*\bbg-surface\b/g;
  const surfaceMatch = nestedSurfaceCard.exec(source);
  if (surfaceMatch) {
    addFinding(file, source, surfaceMatch.index, 'カード入れ子', 'bg-surface のカード内に別の bg-surface カードを置いていないか確認してください');
  }
}

for (const filePath of TARGETS.flatMap(walk)) {
  if (!SOURCE_EXTENSIONS.has(extensionOf(filePath))) continue;
  const file = relative(ROOT, filePath);
  const source = withoutComments(readFileSync(filePath, 'utf8'));
  checkColorLiterals(file, source);
  checkArbitraryClasses(file, source);
  checkLiteralFontSize(file, source);
  checkNestedCards(file, source);
}

if (findings.length === 0) {
  console.log('デザイン静的検査はすべて通りました');
  process.exit(0);
}

for (const finding of findings) {
  console.log(`NG  ${finding.file}:${finding.line} [${finding.rule}] ${finding.detail}`);
}
console.log(`\n未達: ${findings.length} 件`);
process.exit(1);

/**
 * ブラウザでしか分からないことを確かめる。
 *
 * 1. 図の拡大縮小が、触る場所によらず効くか
 * 2. どの画面にも、細長く潰れた箱が無いか
 *
 * 相関図には人物アイコンが並んでいるので、つまむ 1 本目がアイコンの上に
 * 乗ることがよくある。アイコンは指を捕まえる（setPointerCapture）ので、
 * 指の本数が表示枠に伝わらないと、そのときだけ縮小できなくなる。
 * 「たまに効かない」形で出るぶん目で見て気づきにくいので、検査で押さえる。
 *
 * 他の検査と違ってブラウザが要る（Playwright と Chromium）。入っていない
 * ところでは落とさずに「飛ばした」と伝えるので、CI に置いても壊れない。
 * プレビューは自分で立てて、終わったら片付ける。
 */
import { spawn } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import { AUTH_PASSWORD } from '../src/config/auth';

const PORT = 4178;
const ORIGIN = `http://127.0.0.1:${PORT}`;

/**
 * Playwright の型は入っていないので、使うところだけを自分で書く。
 *
 * 実物の型を持ってこられないぶん、ここに書いた形と実物がずれると
 * 実行時に落ちる。使うのは下の 6 つだけなので、ずれたらすぐ分かる。
 */
interface Surface {
  waitFor(options: { timeout: number }): Promise<void>;
  scrollIntoViewIfNeeded(): Promise<void>;
  boundingBox(): Promise<{ x: number; y: number; width: number; height: number }>;
  focus(): Promise<void>;
  count(): Promise<number>;
  fill(text: string): Promise<void>;
}
interface Page {
  goto(url: string, options?: { waitUntil?: string; timeout?: number }): Promise<unknown>;
  waitForTimeout(ms: number): Promise<void>;
  locator(selector: string): Surface & { first(): Surface };
  keyboard: { press(key: string): Promise<void> };
  evaluate<T>(fn: (arg: never) => T, arg?: unknown): Promise<T>;
}
interface Context {
  newPage(): Promise<Page>;
  newCDPSession(page: Page): Promise<{ send(method: string, params: unknown): Promise<unknown> }>;
}
interface Browser {
  newContext(options: unknown): Promise<Context>;
  close(): Promise<void>;
}
interface Chromium {
  launch(options: unknown): Promise<Browser>;
}

/**
 * Playwright を読み込む。無ければ検査そのものを飛ばす。
 *
 * このリポジトリの依存には入れていない（ブラウザまで落ちてきて重いため）。
 * 別の場所に入っているときは PLAYWRIGHT_MODULE に、その入口のパスを渡す。
 */
async function loadChromium(): Promise<Chromium | null> {
  /* 変数にしておく。文字列のまま書くと、入っていない環境で型検査が落ちる */
  const candidates = [process.env.PLAYWRIGHT_MODULE, 'playwright'].filter(
    (entry): entry is string => Boolean(entry),
  );

  for (const specifier of candidates) {
    try {
      const playwright = (await import(specifier)) as { chromium: Chromium };
      if (playwright.chromium) return playwright.chromium;
    } catch {
      /* 次の候補を試す */
    }
  }
  return null;
}

async function waitForServer(): Promise<boolean> {
  for (let attempt = 0; attempt < 40; attempt += 1) {
    try {
      if ((await fetch(ORIGIN)).ok) return true;
    } catch {
      /* まだ立ち上がっていない */
    }
    await delay(250);
  }
  return false;
}

const chromium = await loadChromium();
if (!chromium) {
  console.log('SKIP 表示枠の検査（Playwright が入っていません）');
  process.exit(0);
}

const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT)], { stdio: 'ignore' });
let failed = 0;

/** 見て回る画面。routes.ts に足したらここにも足す。 */
const ROUTES = [
  '#/minecraft',
  '#/minecraft/world-map',
  '#/minecraft/calendar',
  '#/relationships',
  '#/zukan',
  '#/history',
  '#/events',
  '#/gallery',
  '#/players/nodoamenn',
];

/**
 * 文字が入っているのに細長く潰れた箱が無いか。
 *
 * 幅の指定を間違えると（余白の名前を幅に使うなど）、箱が数 px の柱になり、
 * 中の文字が 1 文字ずつ縦に積まれる。実際に人物の吹き出しが
 * 28 x 381px になっていた。組み方の誤りは型でも lint でも出ないので、
 * 実際に並べたあとの寸法で見つける。
 *
 * SVG は対象にしない。グラフの縦軸のように、細長いのが正しいものがある。
 */
async function checkNarrowBoxes(page: Page) {
  for (const route of ROUTES) {
    await page.goto(`${ORIGIN}/${route}`, { waitUntil: 'load', timeout: 20000 });
    await page.waitForTimeout(1500);

    const broken = await page.evaluate<Array<{ text: string; width: number; height: number }>>(() => {
      const found: Array<{ text: string; width: number; height: number }> = [];
      for (const element of document.querySelectorAll('body *')) {
        /* SVG の中は見ない（縦軸のように細長いのが正しいものがある） */
        if (element.namespaceURI && element.namespaceURI !== 'http://www.w3.org/1999/xhtml') continue;

        const box = element.getBoundingClientRect();
        if (box.width === 0 || box.height === 0) continue;
        const text = (element.textContent ?? '').trim();
        if (text.length <= 3) continue;

        if (box.width < 70 && box.height > box.width * 3) {
          /* 親も潰れているときは、いちばん外側だけを出す */
          const parent = element.parentElement?.getBoundingClientRect();
          if (parent && parent.width < 70) continue;
          found.push({ text: text.slice(0, 24), width: Math.round(box.width), height: Math.round(box.height) });
        }
      }
      return found.slice(0, 5);
    });

    if (broken.length > 0) {
      const detail = broken.map((entry) => `${entry.width}x${entry.height}「${entry.text}」`).join(', ');
      console.log(`NG  ${route} に細長く潰れた箱があります: ${detail}`);
      failed += 1;
      continue;
    }
    console.log(`OK  ${route} に潰れた箱なし`);
  }
}

try {
  if (!(await waitForServer())) {
    console.log('NG  プレビューが立ち上がりませんでした（先に npm run build が要ります）');
    process.exit(1);
  }

  const browser = await chromium.launch({
    executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined,
    args: ['--no-sandbox'],
  });
  /* 指の操作を見たいので、触れる端末として開く */
  const context = await browser.newContext({
    viewport: { width: 900, height: 800 },
    hasTouch: true,
    isMobile: true,
  });
  const page = await context.newPage();

  await page.goto(`${ORIGIN}/#/relationships`, { waitUntil: 'load', timeout: 20000 });
  await page.waitForTimeout(600);

  const password = page.locator('input[type="password"]');
  if ((await password.count()) > 0) {
    await password.fill(AUTH_PASSWORD);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(2000);
  }

  const surface = page.locator('[role="group"]').first();
  await surface.waitFor({ timeout: 10000 });
  await page.waitForTimeout(1200);
  await surface.scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);

  /** いまの拡大率。図に当てている transform から読む。 */
  const scaleOf = () =>
    page.evaluate(() => {
      const element = document.querySelector('svg[role="img"]')?.parentElement;
      if (!element) return 0;
      return new DOMMatrixReadOnly(getComputedStyle(element).transform).a;
    });

  const client = await context.newCDPSession(page);

  /** 2 本目の指を 1 本目へ寄せる＝縮小。 */
  async function pinchIn(anchor: { x: number; y: number }, startGap: number) {
    const points = (gap: number) => [
      { x: anchor.x, y: anchor.y, id: 1 },
      { x: anchor.x + gap, y: anchor.y, id: 2 },
    ];
    await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(startGap) });
    for (let step = 1; step <= 10; step += 1) {
      const gap = startGap + (25 - startGap) * (step / 10);
      await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(gap) });
      await page.waitForTimeout(16);
    }
    await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(250);
  }

  const frame = await surface.boundingBox();

  /* 枠の中に見えている人物アイコンを 1 つ選ぶ */
  const node = await page.evaluate<{ x: number; y: number } | null>(
    (box: { x: number; y: number; width: number; height: number }) => {
      for (const group of document.querySelectorAll('svg[role="img"] g')) {
        const rect = group.getBoundingClientRect();
        if (rect.width < 8 || rect.width > 60) continue;
        const x = rect.x + rect.width / 2;
        const y = rect.y + rect.height / 2;
        /* 右上は操作ボタンが重なっているので避ける */
        if (x > box.x + 120 && x < box.x + box.width - 260 && y > box.y + 60 && y < box.y + box.height - 60) {
          return { x, y };
        }
      }
      return null;
    },
    frame,
  );

  const cases: Array<[string, { x: number; y: number } | null]> = [
    ['何もない所から', { x: frame.x + frame.width * 0.25, y: frame.y + frame.height * 0.5 }],
    ['人物アイコンの上から', node],
  ];

  for (const [label, anchor] of cases) {
    if (!anchor) {
      console.log(`NG  ${label}: つまむ場所が見つかりませんでした`);
      failed += 1;
      continue;
    }

    /* 毎回いちど全体表示に戻してから測る */
    await surface.focus();
    await page.keyboard.press('0');
    await page.waitForTimeout(300);

    const before = await scaleOf();
    await pinchIn(anchor, 220);
    const after = await scaleOf();

    if (after < before - 1e-6) {
      console.log(`OK  ${label} つまんで縮小できる（${before.toFixed(3)} → ${after.toFixed(3)}）`);
    } else {
      console.log(`NG  ${label} つまんでも縮まりません（${before.toFixed(3)} のまま）`);
      failed += 1;
    }
  }

  await checkNarrowBoxes(page);

  await browser.close();
} finally {
  preview.kill();
}

console.log(failed === 0 ? '表示枠の検査はすべて通りました' : `\n未達: ${failed} 件`);
process.exit(failed === 0 ? 0 : 1);

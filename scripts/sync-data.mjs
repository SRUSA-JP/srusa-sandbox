/**
 * ../aws_minecraft と BlueMap の出力から、このアプリが読むデータを更新する。
 *
 * データの出どころは 2 つある。
 *
 *   統計・日別・スキン  ../aws_minecraft/data/ にある書き出し済みのファイル
 *   ワールドマップ      ../srusa-portal/bluemap/web/ にある BlueMap の出力
 *
 * どちらも「新しいファイルを持ってきて、日付つきの名前を差し替えて、
 * 派生する JSON を作り直す」までが 1 セットになる。手で順番にやると
 * data-registry.json や src/data/current.ts の書き換えを忘れやすいので、
 * この 1 コマンドにまとめてある。
 *
 *   npm run sync:data                              # 全部
 *   npm run sync:data -- map                       # マップだけ
 *   npm run sync:data -- map --dimension overworld # オーバーワールドだけ
 *   npm run sync:data -- stats daily               # 統計と日別だけ
 *   npm run sync:data -- --list                    # 取り込める元データを見るだけ
 *   npm run sync:data -- --dry-run                 # 何をするかだけ出す
 *
 * BlueMap のレンダリング自体（Java が要る）はこのコマンドの外。
 * ワールドを描き直すときは先に ../srusa-portal/bluemap/render.sh を実行する。
 */
import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

/* npm script から実行する前提。常にリポジトリの根を基準にする */
const ROOT = process.cwd();
const REGISTRY_PATH = join(ROOT, 'data/data-registry.json');
const CURRENT_TS_PATH = join(ROOT, 'src/data/current.ts');

const registry = JSON.parse(readFileSync(REGISTRY_PATH, 'utf8'));

/** 対象の一覧。引数を省いたときは all（＝ここの全部）。 */
const TARGETS = {
  stats: 'Minecraft 統計 JSON',
  daily: 'プレイヤー日別データと、そこから作る派生 JSON',
  logs: 'サーバーログの日別集計',
  skins: 'プレイヤーのスキンとアイコン',
  map: 'ワールドマップ（2D）の PNG と範囲 JSON',
};

/**
 * map の別名。
 *
 * このリポジトリが持つ地図は BlueMap の真上から見た 2D だけで、3D は写真として
 * public/images/ に置いている。「2d」と打っても同じ場所に着くようにしておく。
 */
const MAP_ALIASES = ['2d', '2D'];

/**
 * ../aws_minecraft から持ってくる、日付つきのファイル。
 *
 * `registryKey` があるものは data-registry.json の paths も差し替える。
 * `optional` は無くても止めない（書き出していない日がある）。
 */
const SOURCE_FILES = [
  { target: 'stats', prefix: 'minecraft-stats', ext: 'json', registryKey: 'minecraftStats', redact: true },
  { target: 'daily', prefix: 'player-data-by-date', ext: 'json', registryKey: 'playerDataByDate' },
  { target: 'daily', prefix: 'player-data-by-date', ext: 'md', optional: true },
  { target: 'logs', prefix: 'mc-log-daily-summary', ext: 'json', registryKey: 'playLogSource', optional: true },
  { target: 'logs', prefix: 'mc-log-daily-summary', ext: 'csv', optional: true },
  { target: 'logs', prefix: 'mc-log-daily-summary', ext: 'md', optional: true },
];

/**
 * 取り込んだあとに、このリポジトリ側で作り直すファイル。
 *
 * 実体は npm script が書き出す。ここでは「新しい日付の名前に変える」ことだけを持つ。
 */
const DERIVED_FILES = [
  { registryKey: 'playerDailySummary', prefix: 'player-daily-summary', ext: 'json' },
  { registryKey: 'playerDailySummaryCsv', prefix: 'player-daily-summary', ext: 'csv' },
  { registryKey: 'playerFeaturedUsedItems', prefix: 'player-featured-used-items', ext: 'json' },
];

/** 派生ファイルを作り直す npm script（この順に実行する）。 */
const DERIVED_COMMANDS = ['build:player-daily', 'build:item-rankings'];

/** ログを取り込んだときに作り直すもの。日別データとは出どころが違う。 */
const LOG_DERIVED = {
  files: [{ registryKey: 'playLog', prefix: 'play-days', ext: 'json' }],
  commands: ['build:play-days'],
};

/** このリポジトリでは作れない（../aws_minecraft 側で作る）もの。 */
const EXTERNAL_FILES = [{ registryKey: 'playerDb', prefix: 'player-db', ext: 'json' }];

function parseArgs(argv) {
  const options = {
    targets: [],
    dimensions: [],
    source: registry.paths.awsDataSource,
    blueMap: registry.paths.blueMapSource,
    dryRun: false,
    list: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--dimension' || arg === '--dim' || arg === '--map') options.dimensions.push(argv[++i]);
    else if (arg === '--source') options.source = argv[++i];
    else if (arg === '--bluemap') options.blueMap = argv[++i];
    else if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--list') options.list = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg.startsWith('-')) throw new Error(`知らない引数: ${arg}`);
    else if (arg === 'all') options.targets.push(...Object.keys(TARGETS));
    else if (arg in TARGETS) options.targets.push(arg);
    else if (MAP_ALIASES.includes(arg)) options.targets.push('map');
    else if (registry.worldMaps.includes(arg)) {
      /* `overworld` のようにマップ名だけを書いたら、その 1 枚だけを作り直す */
      options.targets.push('map');
      options.dimensions.push(arg);
    } else {
      throw new Error(
        `知らない対象: ${arg}\n` +
          `  まとまり: ${Object.keys(TARGETS).join(' / ')} / all\n` +
          `  地図 1 枚: ${registry.worldMaps.join(' / ')}`,
      );
    }
  }

  if (options.targets.length === 0) options.targets = Object.keys(TARGETS);
  if (options.dimensions.length > 0 && !options.targets.includes('map')) {
    throw new Error('--dimension は map（2d）を対象にしたときだけ使える');
  }
  for (const dimension of options.dimensions) {
    if (!registry.worldMaps.includes(dimension)) {
      throw new Error(`知らないマップ: ${dimension}（${registry.worldMaps.join(' / ')} のどれか）`);
    }
  }
  return { ...options, targets: [...new Set(options.targets)] };
}

function help() {
  console.log(`使い方: npm run sync:data -- [対象...] [オプション]

対象（省略すると全部）:
${Object.entries(TARGETS)
  .map(([id, note]) => `  ${id.padEnd(14)} ${note}`)
  .join('\n')}
  ${'2d'.padEnd(14)} map と同じ（この地図は 2D だけ。3D は public/images/ の写真）
  ${'all'.padEnd(14)} 上の全部

地図は名前だけでも指定できる（その 1 枚だけを作り直す）:
${registry.worldMaps.map((id) => `  ${id}`).join('\n')}

オプション:
  --dimension <名前>  作り直す地図を絞る。複数指定できる
  --source <パス>     取り込み元（既定 ${registry.paths.awsDataSource}）
  --bluemap <パス>    BlueMap の出力（既定 ${registry.paths.blueMapSource}）
  --list              取り込める元データと、いま使っているファイルを並べる
  --dry-run           ファイルを触らず、何をするかだけ出す
  -h, --help          この説明

例:
  npm run sync:data -- overworld       # オーバーワールドだけ作り直す
  npm run sync:data -- 2d              # 2D の地図を全部作り直す
  npm run sync:data -- nether end      # ネザーとエンドだけ
  npm run sync:data -- stats daily     # 統計と日別だけ
  npm run sync:data -- --list`);
}

/** `名前-YYYYMMDD.拡張子` のうち、いちばん新しい日付のもの。 */
function latestDated(dir, prefix, ext) {
  if (!existsSync(dir)) return null;
  const pattern = new RegExp(`^${prefix}-(\\d{8})\\.${ext}$`);
  const found = readdirSync(dir)
    .map((name) => ({ name, date: name.match(pattern)?.[1] }))
    .filter((entry) => entry.date)
    .sort((a, b) => b.date.localeCompare(a.date));
  return found[0] ?? null;
}

/**
 * 統計 JSON から、公開してはいけない値を伏せる。
 *
 * ../aws_minecraft 側は生の値（プレイヤーの UUID、EC2 のインスタンス ID、
 * AWS アカウント、リージョン、サーバー上のパス）を持っている。このリポジトリは
 * そのまま Netlify で公開されるので、取り込む時点で必ず伏せ字にする。
 * 伏せる項目は data-registry.json の redaction が持つ。
 */
function redactStats(text) {
  const { placeholder, minecraftStats } = registry.redaction;
  const json = JSON.parse(text);

  /* 伏せる値を集める。値そのものを置き換えるので、同じ値がどこに出ても消える */
  const secrets = new Set();
  for (const key of minecraftStats.sourceKeys) {
    if (typeof json.source?.[key] === 'string') secrets.add(json.source[key]);
  }
  for (const player of Object.values(json.players ?? {})) {
    for (const key of minecraftStats.playerKeys) {
      if (typeof player[key] === 'string') secrets.add(player[key]);
    }
  }

  /*
   * 置き換えは本文の文字列に対して行い、JSON として書き直さない。
   * 一度 JSON.parse / stringify を通すと 1108.0 が 1108 になるなど、
   * 伏せ字と関係のない差分が全体に出てしまうため。
   */
  let redacted = text;
  for (const secret of secrets) {
    /* 短い値の全文置換は巻き添えが怖いので、確実に固有と言える長さだけ扱う */
    if (secret.length < 8) throw new Error(`伏せる値が短すぎて安全に置き換えられない: ${secret}`);
    redacted = redacted.split(JSON.stringify(secret)).join(JSON.stringify(placeholder));
  }
  /* 取り込み元は末尾の改行が無いことがある。このリポジトリの他の JSON に合わせる */
  return redacted.endsWith('\n') ? redacted : `${redacted}\n`;
}

/**
 * 伏せ忘れが無いか、書き出す直前に本文をもう一度見る。
 *
 * 元データの形が変われば redactStats は静かに素通りしてしまう。
 * 公開データに機微な値を混ぜないための最後の関門なので、見つけたら止める。
 */
function assertRedacted(text, label) {
  for (const pattern of registry.redaction.forbiddenPatterns) {
    const found = text.match(new RegExp(pattern));
    if (found) {
      throw new Error(
        `${label} に伏せていない値が残っている: ${found[0]}\n` +
          'data-registry.json の redaction を見直すこと（そのまま公開してはいけない）。',
      );
    }
  }
}

/** 中身が同じならコピーしない（更新日時だけ変えても差分が読みにくくなる）。 */
function sameContent(from, to) {
  if (!existsSync(to)) return false;
  return readFileSync(from).equals(readFileSync(to));
}

function copyFile(from, to, { dryRun }, redact = false) {
  /* 伏せ字にしてから比べる。生のまま比べると毎回「違う」と出てしまう */
  const body = redact ? redactStats(readFileSync(from, 'utf8')) : null;
  if (body !== null) assertRedacted(body, basename(to));

  const same = body === null ? sameContent(from, to) : existsSync(to) && readFileSync(to, 'utf8') === body;
  if (same) {
    console.log(`  = ${basename(to)}（同じ内容なので触らない）`);
    return false;
  }

  console.log(`  ${existsSync(to) ? '→' : '+'} ${basename(to)}${redact ? '（伏せ字にして取り込む）' : ''}`);
  if (!dryRun) {
    mkdirSync(join(to, '..'), { recursive: true });
    if (body === null) cpSync(from, to);
    else writeFileSync(to, body);
  }
  return true;
}

function copyDirectory(from, to, { dryRun }) {
  if (!existsSync(from)) {
    console.log(`  ! ${from} が無いので飛ばす`);
    return false;
  }
  const count = readdirSync(from).length;
  console.log(`  → ${basename(to)}/（${count} 件）`);
  if (!dryRun) {
    mkdirSync(to, { recursive: true });
    cpSync(from, to, { recursive: true });
  }
  return true;
}

/** `名前-旧日付.拡張子` の日付だけを差し替える。 */
function withDate(path, date) {
  return path.replace(/-\d{8}(\.[a-z]+)$/, `-${date}$1`);
}

function list(sourceDir, blueMapDir) {
  console.log(`取り込み元: ${sourceDir}${existsSync(sourceDir) ? '' : '（無い）'}`);
  for (const file of SOURCE_FILES) {
    const found = latestDated(sourceDir, file.prefix, file.ext);
    console.log(`  ${file.prefix}.${file.ext}: ${found ? found.name : '見つからない'}`);
  }

  console.log(`\nBlueMap の出力: ${blueMapDir}${existsSync(blueMapDir) ? '' : '（無い）'}`);
  const mapsDir = join(blueMapDir, 'maps');
  const rendered = existsSync(mapsDir) ? readdirSync(mapsDir) : [];
  for (const id of registry.worldMaps) {
    console.log(`  ${id}: ${rendered.includes(id) ? 'レンダリング済み' : 'まだ無い'}`);
  }

  console.log(`\nいま使っているファイル（data-registry.json / version ${registry.version}）:`);
  for (const [key, value] of Object.entries(registry.paths)) {
    /* 取り込み元の場所と、public/ 配下の置き場は「いま使っているファイル」ではない */
    if (value.startsWith('..') || key.endsWith('Dir')) continue;
    console.log(`  ${key}: ${value}${existsSync(join(ROOT, value)) ? '' : '（無い）'}`);
  }
}

/** `名前-YYYYMMDD.拡張子` から日付を取り出す。 */
function dateOf(path) {
  return path.match(/-(\d{8})\.[a-z]+$/)?.[1] ?? '';
}

/**
 * data-registry.json と src/data/current.ts の日付を差し替える。
 *
 * 日付はファイルごとに見る。取り込み元がこちらより古いことがあるため
 * （例: 統計だけ古い日のものしか書き出されていない）、まとめて 1 つの日付に
 * 揃えてしまうと、存在しないファイルを指してしまう。
 */
function applyVersion(changed, { dryRun }) {
  const next = { ...registry, paths: { ...registry.paths } };
  const renamed = [];

  for (const { registryKey: key, date } of changed) {
    const before = next.paths[key];
    const after = withDate(before, date);
    if (before === after) continue;
    if (dateOf(before) > date) {
      console.log(`  ! ${key} は ${basename(before)} のほうが新しいので差し替えない`);
      continue;
    }
    next.paths[key] = after;
    renamed.push(`${key}: ${basename(before)} → ${basename(after)}`);
  }

  /* 版はいま指しているファイルの中でいちばん新しい日付 */
  next.version = Object.values(next.paths).map(dateOf).filter(Boolean).sort().at(-1) ?? registry.version;

  const newestDate = changed.map((entry) => entry.date).sort().at(-1) ?? '';
  for (const file of EXTERNAL_FILES) {
    const after = withDate(next.paths[file.registryKey], newestDate);
    if (newestDate && existsSync(join(ROOT, after))) {
      next.paths[file.registryKey] = after;
    } else {
      console.log(
        `  ! ${basename(after)} が無いので ${basename(next.paths[file.registryKey])} のまま。` +
          '（../aws_minecraft 側で作り直してから置くこと）',
      );
    }
  }

  for (const line of renamed) console.log(`  ${line}`);
  if (dryRun) return;

  writeFileSync(REGISTRY_PATH, `${JSON.stringify(next, null, 2)}\n`);

  /* current.ts は import 文に日付を直書きしている（Vite に静的に解決させるため） */
  let source = readFileSync(CURRENT_TS_PATH, 'utf8');
  for (const key of ['playerFeaturedUsedItems', 'playerDailySummary', 'playerDb', 'playLog']) {
    const path = next.paths[key];
    source = source.replace(
      new RegExp(`\\.\\./\\.\\./data/${path.replace(/^data\//, '').replace(/-\d{8}(\.json)$/, '-\\d{8}$1')}`),
      `../../${path}`,
    );
  }
  writeFileSync(CURRENT_TS_PATH, source);
  console.log('  data-registry.json と src/data/current.ts を更新した');
}

function run(script, args, { dryRun }) {
  const shown = ['npm', 'run', script, ...(args.length > 0 ? ['--', ...args] : [])].join(' ');
  console.log(`  $ ${shown}`);
  if (dryRun) return;
  execFileSync('npm', ['run', script, ...(args.length > 0 ? ['--', ...args] : [])], { stdio: 'inherit' });
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const sourceDir = resolve(ROOT, options.source);
  const blueMapDir = resolve(ROOT, options.blueMap);

  if (options.help) return help();
  if (options.list) return list(sourceDir, blueMapDir);

  const needsSource = options.targets.some((target) => target !== 'map');
  if (needsSource && !existsSync(sourceDir)) {
    throw new Error(`取り込み元が無い: ${sourceDir}（--source で場所を指定できる）`);
  }

  console.log(`対象: ${options.targets.join(' / ')}${options.dryRun ? '（--dry-run）' : ''}\n`);

  /* ---- ../aws_minecraft から持ってくる ---- */
  const changed = [];
  let dailyDate = null;
  let logsDate = null;

  for (const target of ['stats', 'daily', 'logs']) {
    if (!options.targets.includes(target)) continue;
    console.log(`[${target}] ${TARGETS[target]}`);
    for (const file of SOURCE_FILES.filter((entry) => entry.target === target)) {
      const found = latestDated(sourceDir, file.prefix, file.ext);
      if (!found) {
        if (!file.optional) throw new Error(`${file.prefix}-*.${file.ext} が ${sourceDir} に無い`);
        console.log(`  ! ${file.prefix}-*.${file.ext} が無いので飛ばす`);
        continue;
      }
      copyFile(join(sourceDir, found.name), join(ROOT, 'data', found.name), options, file.redact === true);
      if (file.registryKey) changed.push({ registryKey: file.registryKey, date: found.date });
      if (file.registryKey === 'playerDataByDate') dailyDate = found.date;
      if (file.registryKey === 'playLogSource') logsDate = found.date;
    }
    console.log('');
  }

  if (options.targets.includes('skins')) {
    console.log(`[skins] ${TARGETS.skins}`);
    const skinsDir = join(sourceDir, 'player-skins');
    copyFile(join(skinsDir, 'manifest.json'), join(ROOT, 'data/player-skins/manifest.json'), options);
    copyDirectory(join(skinsDir, 'icons'), join(ROOT, 'public/player-skins/icons'), options);
    copyDirectory(join(skinsDir, 'skins'), join(ROOT, 'public/player-skins/skins'), options);
    console.log('');
  }

  /* ---- 日付を揃えて、派生する JSON を作り直す ---- */
  if (options.targets.includes('logs') && logsDate) {
    changed.push(...LOG_DERIVED.files.map((file) => ({ registryKey: file.registryKey, date: logsDate })));
  }
  if (options.targets.includes('daily') && dailyDate) {
    /* 派生 JSON は日別データから作るので、日付もそれに合わせる */
    changed.push(...DERIVED_FILES.map((file) => ({ registryKey: file.registryKey, date: dailyDate })));
  }
  if (changed.length > 0) {
    console.log('[version] data-registry.json の指し先を更新する');
    applyVersion(changed, options);
    console.log('');
  }
  if (options.targets.includes('daily') || (options.targets.includes('logs') && logsDate)) {
    console.log('[derived] 派生する JSON を作り直す');
    const scripts = [
      ...(options.targets.includes('daily') ? DERIVED_COMMANDS : []),
      ...(options.targets.includes('logs') && logsDate ? LOG_DERIVED.commands : []),
    ];
    for (const script of scripts) run(script, [], options);
    console.log('');
  }

  /* ---- ワールドマップ ---- */
  if (options.targets.includes('map')) {
    if (!existsSync(join(blueMapDir, 'settings.json'))) {
      throw new Error(
        `BlueMap の出力が無い: ${blueMapDir}\n` +
          '先に ../srusa-portal/bluemap/render.sh でワールドを描き直すこと。',
      );
    }

    /*
     * まだ描かれていないマップは飛ばす。BlueMap の設定で無効にしている
     * ディメンション（いまはネザー）を指すと、貼り合わせがそこで止まってしまう。
     */
    const mapsDir = join(blueMapDir, 'maps');
    const rendered = existsSync(mapsDir) ? readdirSync(mapsDir) : [];
    const wanted = options.dimensions.length > 0 ? options.dimensions : registry.worldMaps;
    const maps = wanted.filter((id) => rendered.includes(id));

    for (const id of wanted.filter((entry) => !maps.includes(entry))) {
      console.log(`  ! ${id} はまだレンダリングされていないので飛ばす（${join(mapsDir, id)}）`);
    }
    if (maps.length === 0) {
      throw new Error(
        `貼り合わせられるマップが無い: ${wanted.join(' / ')}\n` +
          '先に ../srusa-portal/bluemap/render.sh でワールドを描き直すこと。',
      );
    }

    console.log(`[map] ${maps.join(' / ')} を貼り合わせる`);
    run('build:world-map', ['--source', options.blueMap, ...maps.flatMap((id) => ['--map', id])], options);
    console.log('');
  }

  console.log(
    options.dryRun
      ? '--dry-run なので何も書き換えていない。'
      : '完了。npm run build で通ることを確かめてからコミットする。',
  );
}

main();

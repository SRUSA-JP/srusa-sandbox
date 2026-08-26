/**
 * AWS 認証、../aws_minecraft 側の抽出、このリポジトリへの取り込みを 1 コマンドにまとめる。
 *
 *   npm run update:data
 *   npm run update:data -- logs
 *   npm run update:data -- daily inventory skins
 *   npm run update:data -- --dry-run
 *
 * AWS SSO は完全な無人化ができないので、期限切れのときだけ
 * `aws sso login --use-device-code` を起動し、表示された URL とコード入力を利用者に任せる。
 */
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();

const TARGETS = ['stats', 'daily', 'inventory', 'logs', 'skins', 'map'];
const MAP_ALIASES = ['2d', '2D', 'overworld', 'nether', 'end', 'twilightforest'];
const EXTRACT_BY_TARGET = {
  daily: 'extract:player-data',
  logs: 'extract:logs',
  skins: 'extract:skins',
};

function parseArgs(argv) {
  const options = {
    targets: [],
    profile: process.env.AWS_PROFILE || 'minecraft-cdk',
    awsDir: '../aws_minecraft',
    source: undefined,
    blueMap: undefined,
    dryRun: false,
    list: false,
    help: false,
    skipLogin: false,
    skipExtract: false,
    skipSync: false,
    browserLogin: false,
    syncArgs: [],
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--profile') options.profile = argv[++i];
    else if (arg === '--aws-dir') options.awsDir = argv[++i];
    else if (arg === '--source') {
      options.source = argv[++i];
      options.syncArgs.push('--source', options.source);
    } else if (arg === '--bluemap') {
      options.blueMap = argv[++i];
      options.syncArgs.push('--bluemap', options.blueMap);
    } else if (arg === '--dimension' || arg === '--dim' || arg === '--map') {
      options.syncArgs.push(arg, argv[++i]);
    } else if (arg === '--dry-run') {
      options.dryRun = true;
      options.syncArgs.push(arg);
    } else if (arg === '--list') {
      options.list = true;
      options.syncArgs.push(arg);
    } else if (arg === '--skip-login') options.skipLogin = true;
    else if (arg === '--skip-extract') options.skipExtract = true;
    else if (arg === '--skip-sync') options.skipSync = true;
    else if (arg === '--browser-login') options.browserLogin = true;
    else if (arg === '--device-code') options.browserLogin = false;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg.startsWith('-')) throw new Error(`知らない引数: ${arg}`);
    else {
      options.targets.push(arg);
      options.syncArgs.push(arg);
    }
  }

  if (options.targets.includes('all')) options.targets = [...TARGETS];
  if (options.targets.length === 0) options.targets = [...TARGETS];

  for (const target of options.targets) {
    if (!TARGETS.includes(target) && !MAP_ALIASES.includes(target)) {
      throw new Error(`知らない対象: ${target}（${[...TARGETS, ...MAP_ALIASES, 'all'].join(' / ')}）`);
    }
  }

  return options;
}

function help() {
  console.log(`使い方: npm run update:data -- [対象...] [オプション]

AWS SSO の確認 → ../aws_minecraft 側の抽出 → npm run sync:data を順に実行します。
対象を省略すると all です。

対象:
  all              stats / daily / inventory / logs / skins / map
  stats            既存の minecraft-stats-*.json を取り込む（抽出コマンドはまだ無し）
  daily            player-data-by-date を作って取り込む
  inventory        最新在庫から所有資産を作って取り込む（抽出コマンドはまだ無し）
  logs             mc-log-daily-summary を作って取り込む
  skins            スキンと顔アイコンを取り直して取り込む
  map / 2d         BlueMap の 2D 出力を取り込む
  overworld 等     sync:data と同じく地図 1 枚だけ

オプション:
  --profile <name>      AWS profile（既定: AWS_PROFILE または minecraft-cdk）
  --aws-dir <path>      aws_minecraft の場所（既定: ../aws_minecraft）
  --source <path>       sync:data に渡す取り込み元
  --bluemap <path>      sync:data に渡す BlueMap 出力元
  --dimension <name>    sync:data に渡す地図名
  --dry-run             AWSログイン・抽出をせず、sync:data --dry-run だけ確認
  --list                AWSログイン・抽出をせず、sync:data --list だけ確認
  --skip-login          AWS SSO 確認を飛ばす
  --skip-extract        aws_minecraft 側の抽出を飛ばす
  --skip-sync           sync:data を飛ばす
  --browser-login       aws sso login でブラウザを開く（既定はデバイスコード表示）
  --device-code         URL とコードを表示してログインする

例:
  npm run update:data
  npm run update:data -- daily inventory logs
  npm run update:data -- skins --skip-login
  npm run update:data -- --dry-run`);
}

function run(command, args, options = {}) {
  const cwd = options.cwd ?? ROOT;
  const shown = [command, ...args].join(' ');
  console.log(`$ ${shown}${cwd === ROOT ? '' : `  (cwd: ${cwd})`}`);
  const result = spawnSync(command, args, {
    cwd,
    stdio: options.stdio ?? 'inherit',
    encoding: 'utf8',
    env: { ...process.env, ...(options.env ?? {}) },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    throw new Error(`${shown} が失敗しました（exit ${result.status}）`);
  }
  return result;
}

function canRun(command, args) {
  const result = spawnSync(command, args, { stdio: 'ignore' });
  return !result.error && result.status === 0;
}

function ensureAwsLogin(options) {
  if (options.skipLogin) {
    console.log('[aws] --skip-login のため AWS SSO 確認を飛ばします');
    return;
  }

  if (!canRun('aws', ['--version'])) {
    throw new Error('AWS CLI が見つかりません。aws コマンドを使える状態にしてください。');
  }

  console.log(`[aws] profile ${options.profile} の認証を確認します`);
  const ok = spawnSync('aws', ['sts', 'get-caller-identity', '--profile', options.profile], {
    stdio: 'ignore',
  });
  if (ok.status === 0) {
    console.log('[aws] 既存の SSO セッションを使えます');
    return;
  }

  const loginArgs = ['sso', 'login', '--profile', options.profile];
  if (!options.browserLogin) loginArgs.push('--use-device-code');
  console.log('[aws] SSO セッションが切れているためログインします');
  run('aws', loginArgs);
  run('aws', ['sts', 'get-caller-identity', '--profile', options.profile]);
}

function extractScripts(targets) {
  if (targets.includes('all')) return ['extract:all'];
  const scripts = [];
  for (const target of targets) {
    const script = EXTRACT_BY_TARGET[target];
    if (script && !scripts.includes(script)) scripts.push(script);
  }
  if (scripts.length === Object.keys(EXTRACT_BY_TARGET).length) return ['extract:all'];
  return scripts;
}

function runExtract(options) {
  if (options.skipExtract || options.dryRun || options.list) {
    console.log('[extract] 確認モードまたは --skip-extract のため抽出を飛ばします');
    return;
  }

  const awsDir = resolve(ROOT, options.awsDir);
  if (!existsSync(join(awsDir, 'package.json'))) {
    throw new Error(`aws_minecraft が見つかりません: ${awsDir}（--aws-dir で指定できます）`);
  }

  const scripts = extractScripts(options.targets);
  if (scripts.length === 0) {
    console.log('[extract] この対象に対応する aws_minecraft 側の抽出コマンドはありません');
    return;
  }

  console.log(`[extract] ${scripts.join(' / ')} を実行します`);
  for (const script of scripts) run('npm', ['run', script], { cwd: awsDir });
}

function runSync(options) {
  if (options.skipSync) {
    console.log('[sync] --skip-sync のため取り込みを飛ばします');
    return;
  }
  console.log('[sync] srusa-sandbox 側へ取り込みます');
  run('npm', ['run', 'sync:data', ...(options.syncArgs.length > 0 ? ['--', ...options.syncArgs] : [])]);
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return help();

  if (!options.dryRun && !options.list) ensureAwsLogin(options);
  else console.log('[aws] 確認モードのため AWS SSO 確認を飛ばします');

  runExtract(options);
  runSync(options);
}

try {
  main();
} catch (error) {
  console.error(`\nupdate:data エラー: ${error.message}`);
  process.exitCode = 1;
}

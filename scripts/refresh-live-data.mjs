import { createHash } from 'node:crypto';
import fs from 'node:fs';
import http from 'node:http';
import { join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const INSTANCE_ID = 'i-021f16c26507b74ae';
const PORT = 18123;

function jstStamp() {
  const now = new Date();
  const jst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  return jst.toISOString().slice(0, 10).replaceAll('-', '');
}

function parseArgs(argv) {
  const options = {
    date: process.env.DATASET_DATE ?? jstStamp(),
    profile: process.env.AWS_PROFILE ?? 'minecraft-cdk',
    awsDir: '../aws_minecraft',
    targets: ['stats', 'daily', 'logs'],
    skipLogin: false,
    keepInstance: false,
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--date') options.date = argv[++i].replaceAll('-', '');
    else if (arg === '--profile') options.profile = argv[++i];
    else if (arg === '--aws-dir') options.awsDir = argv[++i];
    else if (arg === '--skip-login') options.skipLogin = true;
    else if (arg === '--keep-instance') options.keepInstance = true;
    else if (arg === '--help' || arg === '-h') options.help = true;
    else if (arg.startsWith('-')) throw new Error(`知らない引数: ${arg}`);
    else options.targets = [...new Set(arg.split(',').filter(Boolean))];
  }

  if (!/^\d{8}$/.test(options.date)) throw new Error(`日付は YYYYMMDD で指定してください: ${options.date}`);
  return options;
}

function help() {
  console.log(`使い方: npm run refresh:live -- [対象] [オプション]

ライブサーバーからプレイヤーデータとログを取得し、aws_minecraft で抽出して、このリポジトリへ同期します。

対象:
  stats,daily,logs  既定。統計ページ、日別データ、活動カレンダーを更新

オプション:
  --date YYYYMMDD     書き出す日付（既定: 今日のJST）
  --profile <name>    AWS profile（既定: AWS_PROFILE または minecraft-cdk）
  --aws-dir <path>    aws_minecraft の場所（既定: ../aws_minecraft）
  --skip-login        AWS SSO確認を飛ばす
  --keep-instance     最後にEC2を停止しない
  -h, --help          この説明

例:
  npm run refresh:live
  npm run refresh:live -- --date 20260830
  npm run refresh:live -- stats,daily,logs --keep-instance`);
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? ROOT,
    stdio: options.stdio ?? 'inherit',
    encoding: 'utf8',
    env: { ...process.env, ...(options.env ?? {}) },
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${[command, ...args].join(' ')} が失敗しました（exit ${result.status}）`);
  return result.stdout ?? '';
}

function aws(args, options) {
  return run('aws', [...args, '--profile', options.profile], { stdio: 'pipe' }).trim();
}

function sendCommand(commands, options, timeoutSeconds = 900) {
  const paramsPath = join('/tmp', `srusa-refresh-live-${Date.now()}.json`);
  fs.writeFileSync(paramsPath, `${JSON.stringify({ commands })}\n`);
  const id = aws(
    [
      'ssm',
      'send-command',
      '--instance-ids',
      INSTANCE_ID,
      '--document-name',
      'AWS-RunShellScript',
      '--timeout-seconds',
      String(timeoutSeconds),
      '--parameters',
      `file://${paramsPath}`,
      '--query',
      'Command.CommandId',
      '--output',
      'text',
    ],
    options,
  );
  fs.rmSync(paramsPath, { force: true });
  return id;
}

function commandInvocation(commandId, options) {
  const raw = aws(
    [
      'ssm',
      'get-command-invocation',
      '--command-id',
      commandId,
      '--instance-id',
      INSTANCE_ID,
      '--query',
      '{Status:Status,Stdout:StandardOutputContent,Stderr:StandardErrorContent}',
      '--output',
      'json',
    ],
    options,
  );
  return JSON.parse(raw);
}

async function waitCommand(commandId, options) {
  for (let i = 0; i < 90; i += 1) {
    const invocation = commandInvocation(commandId, options);
    if (['Success', 'Failed', 'Cancelled', 'TimedOut'].includes(invocation.Status)) {
      if (invocation.Status !== 'Success') {
        throw new Error(`SSM command ${commandId} failed: ${invocation.Status}\n${invocation.Stderr}`);
      }
      return invocation;
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error(`SSM command ${commandId} が時間内に終わりませんでした`);
}

function ensureLogin(options) {
  if (options.skipLogin) return;
  const ok = spawnSync('aws', ['sts', 'get-caller-identity', '--profile', options.profile], { stdio: 'ignore' });
  if (ok.status === 0) return;
  run('aws', ['sso', 'login', '--profile', options.profile, '--use-device-code']);
}

async function ensureInstance(options) {
  const state = aws(
    ['ec2', 'describe-instances', '--instance-ids', INSTANCE_ID, '--query', 'Reservations[].Instances[].State.Name', '--output', 'text'],
    options,
  );
  if (state === 'stopped') {
    aws(['ec2', 'start-instances', '--instance-ids', INSTANCE_ID], options);
    run('aws', ['ec2', 'wait', 'instance-running', '--profile', options.profile, '--instance-ids', INSTANCE_ID], { stdio: 'pipe' });
    return true;
  }
  return false;
}

async function waitSsmOnline(options) {
  for (let i = 0; i < 30; i += 1) {
    const status = aws(
      [
        'ssm',
        'describe-instance-information',
        '--query',
        `InstanceInformationList[?InstanceId=='${INSTANCE_ID}'].PingStatus`,
        '--output',
        'text',
      ],
      options,
    );
    if (status === 'Online') return;
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error('SSM が Online になりませんでした');
}

async function download(url, path) {
  await new Promise((resolve, reject) => {
    const file = fs.createWriteStream(path);
    http.get(url, (response) => {
      if (response.statusCode !== 200) {
        reject(new Error(`${url} returned ${response.statusCode}`));
        response.resume();
        return;
      }
      response.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', reject);
  });
}

function sha256(path) {
  return createHash('sha256').update(fs.readFileSync(path)).digest('hex');
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (options.help) return help();

  const awsDir = resolve(ROOT, options.awsDir);
  const dataDir = join(awsDir, 'data');
  fs.mkdirSync(dataDir, { recursive: true });

  ensureLogin(options);
  const started = await ensureInstance(options);
  await waitSsmOnline(options);

  console.log(`[archive] ${options.date} のプレイヤーデータとログをサーバー上で固めます`);
  const archiveCommand = sendCommand(
    [
      [
        'set -e',
        'cd /opt/minecraft',
        `rm -f /var/tmp/mc-player-data-${options.date}.tar.gz /var/tmp/mc-logs-${options.date}.tar.gz`,
        `tar --exclude='world/session.lock' -czf /var/tmp/mc-player-data-${options.date}.tar.gz world/stats world/advancements`,
        `tar -C /opt/minecraft/logs -czf /var/tmp/mc-logs-${options.date}.tar.gz .`,
        `sha256sum /var/tmp/mc-player-data-${options.date}.tar.gz /var/tmp/mc-logs-${options.date}.tar.gz`,
        `ls -lh /var/tmp/mc-player-data-${options.date}.tar.gz /var/tmp/mc-logs-${options.date}.tar.gz`,
      ].join('; '),
    ],
    options,
  );
  const archive = await waitCommand(archiveCommand, options);
  console.log(archive.Stdout.trim());
  const expected = Object.fromEntries(
    archive.Stdout.split('\n')
      .map((line) => line.match(/^([0-9a-f]{64})\s+\/var\/tmp\/(.+)$/))
      .filter(Boolean)
      .map((match) => [match[2], match[1]]),
  );

  console.log('[transfer] インスタンス内HTTPサーバーとSSMポートフォワードで取得します');
  const serveCommand = sendCommand(
    [
      [
        'set -e',
        "pkill -f 'http.server 8123' || true",
        'rm -rf /var/tmp/mc-serve && mkdir -p /var/tmp/mc-serve',
        `ln -f /var/tmp/mc-player-data-${options.date}.tar.gz /var/tmp/mc-serve/mc-player-data-${options.date}.tar.gz`,
        `ln -f /var/tmp/mc-logs-${options.date}.tar.gz /var/tmp/mc-serve/mc-logs-${options.date}.tar.gz`,
        'setsid nohup python3 -m http.server 8123 --bind 127.0.0.1 --directory /var/tmp/mc-serve > /var/tmp/mc-serve.log 2>&1 < /dev/null &',
        'sleep 2',
        "ss -Htln '( sport = :8123 )'",
      ].join('; '),
    ],
    options,
  );
  await waitCommand(serveCommand, options);

  const forward = spawn(
    'aws',
    [
      'ssm',
      'start-session',
      '--profile',
      options.profile,
      '--target',
      INSTANCE_ID,
      '--document-name',
      'AWS-StartPortForwardingSession',
      '--parameters',
      `{"portNumber":["8123"],"localPortNumber":["${PORT}"]}`,
    ],
    { env: { ...process.env, PATH: `${process.env.HOME}/.local/bin:${process.env.PATH}` }, stdio: 'ignore' },
  );
  await new Promise((resolve) => setTimeout(resolve, 2500));

  const playerArchive = join(dataDir, `mc-player-data-${options.date}.tar.gz`);
  const logsArchive = join(dataDir, `mc-logs-${options.date}.tar.gz`);
  await download(`http://127.0.0.1:${PORT}/mc-player-data-${options.date}.tar.gz`, playerArchive);
  await download(`http://127.0.0.1:${PORT}/mc-logs-${options.date}.tar.gz`, logsArchive);
  forward.kill('SIGINT');

  for (const [name, path] of [
    [`mc-player-data-${options.date}.tar.gz`, playerArchive],
    [`mc-logs-${options.date}.tar.gz`, logsArchive],
  ]) {
    const actual = sha256(path);
    if (expected[name] && expected[name] !== actual) throw new Error(`${name} の sha256 が一致しません`);
    console.log(`  ${actual}  ${path}`);
  }

  const logsDir = join(dataDir, `mc-logs-${options.date}`);
  fs.rmSync(logsDir, { recursive: true, force: true });
  fs.mkdirSync(logsDir, { recursive: true });
  run('tar', ['-xzf', logsArchive, '-C', logsDir]);

  console.log('[extract] aws_minecraft 側で集計JSONを作ります');
  run('npm', ['run', 'extract:player-data'], { cwd: awsDir });
  run('npm', ['run', 'extract:logs'], { cwd: awsDir });

  console.log('[sync] srusa-sandbox 側へ同期します');
  run('npm', ['run', 'sync:data', '--', ...options.targets]);

  console.log('[cleanup] サーバー側の一時ファイルを片付けます');
  const cleanupCommand = sendCommand(
    [
      [
        'set -e',
        "pkill -f 'http.server 8123' || true",
        'rm -rf /var/tmp/mc-serve',
        `rm -f /var/tmp/mc-player-data-${options.date}.tar.gz /var/tmp/mc-logs-${options.date}.tar.gz /var/tmp/mc-serve.log`,
        'df -h /var/tmp | tail -1',
      ].join('; '),
    ],
    options,
  );
  await waitCommand(cleanupCommand, options);

  if (started && !options.keepInstance) {
    console.log('[aws] このコマンドで起動したEC2を停止します');
    aws(['ec2', 'stop-instances', '--instance-ids', INSTANCE_ID], options);
  }
}

try {
  await main();
} catch (error) {
  console.error(`\nrefresh:live エラー: ${error.message}`);
  process.exitCode = 1;
}

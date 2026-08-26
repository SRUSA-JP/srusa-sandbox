/**
 * サーバーログの日別集計から、アプリが読む「日ごとの在席」だけを抜き出す。
 *
 * 元の mc-log-daily-summary-*.json は 479 KB あり、その大半は
 * 死亡メッセージと出来事の一覧が占める。連続プレイ日数に要るのは
 * 「その日だれが入っていたか」だけなので、ここで 18 KB まで削ってから
 * バンドルに載せる（画面が読むのはこちらの方）。
 *
 *   npm run build:play-days
 */
import fs from 'node:fs';

const config = JSON.parse(fs.readFileSync('data/data-registry.json', 'utf8'));
const sourcePath = config.paths.playLogSource;
const outputPath = config.paths.playLog;

const source = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));

const days = (source.days ?? []).map((day) => ({
  date: day.date,
  joins: day.joins ?? 0,
  leaves: day.leaves ?? 0,
  deaths: day.deaths ?? 0,
  players: Object.fromEntries(
    Object.entries(day.players ?? {}).map(([name, player]) => [
      name,
      {
        joins: player.joins ?? 0,
        leaves: player.leaves ?? 0,
        deaths: player.deaths ?? 0,
        first_seen_jst: player.first_seen_jst ?? '',
        last_seen_jst: player.last_seen_jst ?? '',
      },
    ]),
  ),
}));

const document = {
  generated_on: source.generated_on ?? '',
  source: sourcePath,
  days,
};

fs.writeFileSync(outputPath, `${JSON.stringify(document, null, 2)}\n`);

const players = new Set(days.flatMap((day) => Object.keys(day.players)));
console.log(
  `Wrote ${outputPath} with ${days.length} days and ${players.size} players ` +
    `(${(fs.statSync(outputPath).size / 1024).toFixed(0)} KB).`,
);

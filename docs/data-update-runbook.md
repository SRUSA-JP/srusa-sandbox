# データ更新 Runbook

データを更新したときに、画面へ反映される場所と再生成する派生ファイルの一覧。
基本は `npm run refresh:data` を使い、AWS 側の再取得を飛ばして手元の `../aws_minecraft/data/` だけ同期するなら `npm run refresh:data:local` を使う。

## 取得元

このリポジトリは公開用の軽い JSON / PNG だけを持つ。生データや BlueMap のレンダリング結果は別リポジトリで作り、ここへ同期する。

| 種類 | 取得・生成する場所 | このリポジトリへの取り込み |
| --- | --- | --- |
| Minecraft 統計・日別・ログ・在庫・スキン | `../aws_minecraft/data/` | `npm run refresh:data` または `npm run refresh:data:local` |
| ワールドマップ 2D | `../srusa-portal/bluemap/web/` | `npm run refresh:data:local -- map` |
| スポーン周辺 3D | `../srusa-portal/bluemap/web/maps/overworld_spawn/` | `public/bluemap-spawn/` に BlueMap ビューア一式と対象マップだけを置く。生成物本体は Git 追跡しない |

AWS 側から取り直すときは `npm run refresh:data` を使う。SSO セッションが切れている場合は、表示された URL とコードでログインしてから続行する。

BlueMap 側は Java を使うため、このリポジトリの同期コマンドからはレンダリングしない。通常の地形色マップを更新するときは、先に `../srusa-portal/bluemap` でレンダリングしておく。

```bash
cd ../srusa-portal/bluemap
./render.sh
cd -
npm run refresh:data:local -- map
```

1 つのディメンションだけ描き直すときは、BlueMap 側と同期側の両方で対象を絞る。

```bash
cd ../srusa-portal/bluemap
./render.sh -r nether
cd -
npm run refresh:data:local -- nether
```

## ワールドマップ更新手順

1. `../srusa-portal/bluemap/web/settings.json` と `../srusa-portal/bluemap/web/maps/` があることを確認する
2. BlueMap 側で必要な範囲をレンダリングする
3. このリポジトリで `npm run refresh:data:local -- map --dry-run` を実行し、貼り合わせ対象を確認する
4. `npm run refresh:data:local -- map` を実行する
5. `git diff -- data/world-map.json` と `git status --short` で、更新された PNG と範囲を確認する
6. `npm run check:world-map` を実行し、公開 PNG とメタデータの整合性を確認する
7. 画面で見る変更なら `npm run build`、少なくとも `npm run typecheck` と `npm run lint` を実行する

`npm run refresh:data:local -- map` は、`data/data-registry.json` の `worldMaps` に並ぶ `overworld` / `nether` / `end` / `twilightforest` を対象にする。未レンダリングのマップは飛ばす。

より直接に貼り合わせだけ行う場合は、次のコマンドも使える。

```bash
npm run build:world-map
npm run build:world-map -- --source ../srusa-portal/bluemap/web --map overworld
```

ただし通常作業では、対象選択と dry-run が分かりやすい `npm run refresh:data:local -- map` を使う。

## 更新コマンド

```bash
npm run refresh:live
npm run refresh:live -- --date 20260830
npm run refresh:data
npm run refresh:data -- daily inventory logs
npm run refresh:data:local -- --list
npm run refresh:data:local -- --dry-run
npm run refresh:data:local -- inventory
npm run refresh:data:local -- map
npm run refresh:data:local -- end
```

| コマンド | 使う場面 | 実行内容 |
| --- | --- | --- |
| `npm run refresh:live` | 稼働サーバーから今日の統計・日別・カレンダーを取り直す | EC2起動、SSM接続、プレイヤーデータ/ログ取得、`../aws_minecraft` 側の抽出、ローカル同期 |
| `npm run refresh:data` | 最新化をまとめて行う | AWS SSO 確認、`../aws_minecraft` 側の抽出、ローカル同期 |
| `npm run refresh:data -- daily inventory logs` | プレイヤー日別・所有資産・ログだけ更新 | 指定対象だけ抽出して同期 |
| `npm run refresh:data:local` | 既に `../aws_minecraft/data/` や BlueMap 出力がある | 抽出をせず、このリポジトリへ同期 |
| `npm run refresh:data:local -- inventory` | 資産ランキングだけ更新 | 在庫集計から `player-inventory-assets-YYYYMMDD.json` を作り直す |
| `npm run refresh:data:local -- map` | ワールドマップだけ更新 | BlueMap の 2D タイルから PNG と `world-map.json` を作り直す |

## ライブサーバーから網羅更新する

統計ページ、プレイヤー日別、活動カレンダーを現在のサーバー状態で揃えるときは、`npm run refresh:live` を使う。

```bash
npm run refresh:live
npm run refresh:live -- --date 20260830
```

このコマンドが行うこと:

1. AWS SSO セッションを確認する
2. EC2 が止まっていれば起動し、SSM が `Online` になるまで待つ
3. サーバー上で `world/stats` と `world/advancements` を `mc-player-data-YYYYMMDD.tar.gz` に固める
4. サーバー上で `/opt/minecraft/logs` を `mc-logs-YYYYMMDD.tar.gz` に固める
5. SSM ポートフォワードとインスタンス内限定 HTTP サーバーで `../aws_minecraft/data/` へ取得する
6. sha256 を照合する
7. `mc-logs-YYYYMMDD/` へログを展開する
8. `../aws_minecraft` 側で `extract:player-data` と `extract:logs` を実行する
9. このリポジトリで `sync:data -- stats daily logs` を実行する
10. サーバー側の `/var/tmp` の一時ファイルを削除する
11. このコマンドが起動した EC2 は停止する

`--keep-instance` を付けると最後に EC2 を停止しない。すでに誰かが遊んでいる時間帯や、続けて BlueMap レンダリング用の取得をする場合だけ使う。

```bash
npm run refresh:live -- --keep-instance
```

注意:

- このコマンドは 3D 地図データを取得しない。取得するのは統計ページ・日別・活動カレンダーに必要な `world/stats`、`world/advancements`、サーバーログだけ。
- 定例バックアップやライブ更新用アーカイブにも、BlueMap の 3D タイルやワールド全体のレンダリング結果は含めない。必要な公開ビューから逆算し、最小限の元データだけを固める。
- `minecraft-stats-YYYYMMDD.json` は `player-data-by-date-YYYYMMDD.json` の最新スナップショットから公開用に生成する。UUID と AWS 情報は伏せ字で出す。
- ログ集計は `mc-logs-YYYYMMDD/` という展開済みディレクトリを読む。tar.gz を置くだけでは `extract:logs` の入力にならない。
- 取得に使うポートフォワードは `127.0.0.1:18123`。使用中なら先に別の転送やローカルプロセスを止める。
- `session-manager-plugin` が `PATH` に無い環境があるため、スクリプト内で `$HOME/.local/bin` を足している。

## スポーン周辺 3D を差し替える

スポーン周辺 3D は、通常のライブ統計更新とは別扱いにする。`npm run refresh:live` では取得しない。
ワールド全体の 3D データも入れず、BlueMap 側で作った `overworld_spawn` だけを公開用に置く。

差し替えるもの:

- `../srusa-portal/bluemap/web/index.html`
- `../srusa-portal/bluemap/web/assets/`
- `../srusa-portal/bluemap/web/lang/`
- `../srusa-portal/bluemap/web/maps/overworld_spawn/`

置き先は `public/bluemap-spawn/`。スポーン周辺 3D ビューア一式と `maps/overworld_spawn/` は
Git 追跡し、GitHub/Netlify ビルドへ含める。`maps/` 配下の他マップや全体 3D タイルは
`.gitignore` で除外する。
`public/bluemap-spawn/settings.json` は `maps` を `["overworld_spawn"]` に絞り、他の BlueMap マップを読ませない。
Vite/Netlify は `.gz` ファイルを `Content-Encoding: gzip` 付きで配りやすい。BlueMap がさらに
`DecompressionStream` で展開すると壊れるため、圧縮済みファイルは `.gzraw` にリネームして配る。
`clientDecompression` は `true` のままにし、BlueMap 側で gzip 展開する。

確認する URL:

```bash
npm run dev
curl -I http://localhost:5173/bluemap-spawn/index.html
curl -I http://localhost:5173/bluemap-spawn/maps/overworld_spawn/settings.json
```

画面側は `#/minecraft/world-map` の表示切り替えで `スポーン3D` を選ぶ。
生成物が置かれていない環境では、3D ビューアの代わりに同期案内を表示する。

## 更新対象と反映先

| 対象 | 元データ | このリポジトリのファイル | 主な反映先 |
| --- | --- | --- | --- |
| Minecraft 統計 | `../aws_minecraft/data/minecraft-stats-YYYYMMDD.json` | `data/minecraft-stats-YYYYMMDD.json` | Minecraft統計のKPI、ランキング、散布図、指数推移の拾得/採掘ベース |
| プレイヤー日別 | `../aws_minecraft/data/player-data-by-date-YYYYMMDD.json` | `data/player-data-by-date-YYYYMMDD.json` | Player Daily Log、日別の伸び、使用アイテム差分 |
| 日別サマリー | プレイヤー日別とサーバーログから生成 | `data/player-daily-summary-YYYYMMDD.json` / `.csv` | プレイヤー別の日次テーブル、日ごとの比較。`playtime_hours` はログの入退室セッションから再計算 |
| 使用アイテムランキング | プレイヤー日別から生成 | `data/player-featured-used-items-YYYYMMDD.json` | セミ、溶岩バケツなどの切替ランキング |
| 所有資産 | `../aws_minecraft/data/item-inventory-stats-YYYYMMDD-latest-player*.json` | `data/player-inventory-assets-YYYYMMDD.json` | 資産ランキング、ダイヤ/エメラルド内訳、所有ベースの鉱物指数 |
| サーバーログ | `../aws_minecraft/data/mc-log-daily-summary-YYYYMMDD.json` | `data/mc-log-daily-summary-YYYYMMDD.json` | ログ由来のプレイ日、継続日数 |
| プレイ日 | サーバーログから生成 | `data/play-days-YYYYMMDD.json` | SRUSA図鑑の継続日数、プレイヤー紹介ページ |
| スキン/アイコン | `../aws_minecraft/data/player-skins/` | `data/player-skins/manifest.json` / `public/player-skins/` | 図鑑、相関図、散布図、プレイヤー表示のアイコン |
| ワールドマップ | `../srusa-portal/bluemap/web/` | `public/world-map/*.png` / `data/world-map.json` | ワールドマップページ、日付/ディメンション切替 |
| プレイヤーDB | `../aws_minecraft/data/player-db-YYYYMMDD.json` | `data/player-db-YYYYMMDD.json` | SRUSA図鑑、人物タグ、紹介ページ |

## 派生ファイルの更新順

1. `data/data-registry.json` の指し先を更新する
2. `src/data/current.ts` の静的 import を更新する
3. `npm run build:player-daily`
4. `npm run build:item-rankings`
5. `npm run build:inventory-assets`
6. `npm run build:play-days`
7. マップ対象がある場合は `npm run build:world-map`
8. 最後に `npm run build` で公開ビルドを確認する

`npm run refresh:data` と `npm run refresh:data:local` は、この順番を `scripts/update-data.mjs` と `scripts/sync-data.mjs` でまとめて実行する。
`npm run build:player-daily` は、`data/mc-log-daily-summary-YYYYMMDD.json` があれば `joined the game` と
`left the game` をペアにして公開用のプレイ時間を再計算する。

## 注意

- 公開される統計JSONは UUID、AWSアカウント、EC2インスタンスID、リージョン、サーバーパスを伏せ字にする。
- `mc-log-daily-summary-YYYYMMDD.json` の `first_seen_jst` から `last_seen_jst` までの差は、途中の離席やサーバー停止を含むためプレイ時間として使わない。プレイ時間は入退室ログのセッションだけから作る。
- 所有資産の換算係数と内訳の分類（原石・ブロック・鉱石・装備・ツール）は`data/economy-assets.json` が唯一の管理場所。アイテムを足すときは `category` も付ける。
- BlueMap のレンダリング自体はこのリポジトリの外。通常地形色のマップを更新するには、先に BlueMap 側を再レンダリングしてから同期する。
- **3D（hires）はワールド全体では作らない。** `../srusa-portal/bluemap/config/maps/*.conf` は
  `enable-hires: false` を既定にする。取り込むのは 2D の lowres タイル（`tiles/1`）だけで、hires（`tiles/0`）は読まない。
  全体で有効にするとレンダリングが大幅に遅くなり、出力の大半が使わない 3D データになる
  （実測: overworld で hires 220MB に対し lowres 2.9MB）。無効化しても既存タイルは消えず、2D の取り込みには影響しない。
- **3D で見せたい狭い範囲は専用のマップ設定を別に足す。** 現状は `overworld-spawn.conf`
  （スポーン (0,0) から半径 256 ブロック＝16 チャンク、`enable-hires: true`）のみ。
  BlueMap のビューアで見るためのマップなので、`data/data-registry.json` の `worldMaps` には入れない。
- `player-db-YYYYMMDD.json` はこのリポジトリでは生成しない。必要なら `../aws_minecraft` 側で作ってから同期する。

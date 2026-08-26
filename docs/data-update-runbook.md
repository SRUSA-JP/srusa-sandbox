# データ更新 Runbook

データを更新したときに、画面へ反映される場所と再生成する派生ファイルの一覧。
基本は `npm run refresh:data` を使い、AWS 側の再取得を飛ばして手元の `../aws_minecraft/data/` だけ同期するなら `npm run refresh:data:local` を使う。

## 更新コマンド

```bash
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
| `npm run refresh:data` | 最新化をまとめて行う | AWS SSO 確認、`../aws_minecraft` 側の抽出、ローカル同期 |
| `npm run refresh:data -- daily inventory logs` | プレイヤー日別・所有資産・ログだけ更新 | 指定対象だけ抽出して同期 |
| `npm run refresh:data:local` | 既に `../aws_minecraft/data/` や BlueMap 出力がある | 抽出をせず、このリポジトリへ同期 |
| `npm run refresh:data:local -- inventory` | 資産ランキングだけ更新 | 在庫集計から `player-inventory-assets-YYYYMMDD.json` を作り直す |
| `npm run refresh:data:local -- map` | ワールドマップだけ更新 | BlueMap の 2D タイルから PNG と `world-map.json` を作り直す |

## 更新対象と反映先

| 対象 | 元データ | このリポジトリのファイル | 主な反映先 |
| --- | --- | --- | --- |
| Minecraft 統計 | `../aws_minecraft/data/minecraft-stats-YYYYMMDD.json` | `data/minecraft-stats-YYYYMMDD.json` | Minecraft統計のKPI、ランキング、散布図、指数推移の拾得/採掘ベース |
| プレイヤー日別 | `../aws_minecraft/data/player-data-by-date-YYYYMMDD.json` | `data/player-data-by-date-YYYYMMDD.json` | Player Daily Log、日別の伸び、使用アイテム差分 |
| 日別サマリー | プレイヤー日別から生成 | `data/player-daily-summary-YYYYMMDD.json` / `.csv` | プレイヤー別の日次テーブル、日ごとの比較 |
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

## 注意

- 公開される統計JSONは UUID、AWSアカウント、EC2インスタンスID、リージョン、サーバーパスを伏せ字にする。
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

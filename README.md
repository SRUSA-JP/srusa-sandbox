# srusa-sandbox

**公開先: <https://srusa-sandbox.netlify.app/>**

SRUSA の**試験用コンテンツを公開しているサイト**です。
まだ形の定まっていないものを、実際に触れる状態で置いて試す場所として使います。
現在は Minecraft サーバーの統計、ワールドマップ、相関図、SRUSA 図鑑があります。

掲載内容・タブ構成・公開範囲はいずれも検討中で、予告なく変わったり消えたりします。

コンテンツとビューアの実装は [srusa-portal](../srusa-portal) から移植しました。
srusa-portal では MkDocs のページに iframe で埋め込んでいましたが、こちらは単体で動く SPA として作り直しています。

## 画面

| 画面 | URL | 内容 |
| --- | --- | --- |
| Minecraft 統計 | `#/minecraft` | プレイヤー比較・内訳・系列比較・日付ごとの推移・2指標の関係の 5 グラフ。絞り込み、表への切り替え、CSV / JSON 書き出し |
| ワールドマップ | `#/minecraft/world-map` | BlueMap の 2D 出力を掴んで動かせる地図。3D はスクリーンショットで掲載 |
| 相関図 | `#/relationships` | 人物同士のつながりと所属を 1 枚にまとめた SVG の図。掴んで動かす・拡大縮小・人物の移動、中心人物・グループの強調・関係線の切り替え |
| SRUSA 図鑑 | `#/zukan` | 相関図と Minecraft に出てくる人の名簿。所属・種類で絞り込み、ひとりずつの紹介ページへ渡す |
| プレイヤー紹介 | `#/players/<名前>` | ひとりぶんのまとめ。統計・連続プレイ日数・日別ログ・使用アイテム・ランキング・相関図の所属。タブには並ばず、図鑑の下に入る |
| イベント | `#/events` | Minecraft の外でやったイベントの成績 |

配色は最初は端末の設定に従い、画面右上のボタンで明るい ⇄ 暗いを切り替えられます（選択はブラウザに保存されます）。
Minecraft のページはドット絵風のスキン（書体・直角・太い線・緑のテーマ色）で表示されます。

スマートフォンでも見られます。狭い画面ではグラフの寸法と余白が切り替わり、
相関図と表は枠の中で横スクロールします。
ホーム画面に追加すると、アドレスバーのないアプリとして開けます（PWA のマニフェストを配信しています）。

## 技術スタック

- React 19 + TypeScript 5.9
- Vite 7
- Tailwind CSS v4（`@tailwindcss/vite` プラグイン経由）
- Recharts 3（グラフ）／相関図は自前の SVG
- パッケージ管理は npm

## セットアップ

Node.js 20 以上が必要です。

```shell
npm install
npm run dev
```

表示された URL（通常は <http://localhost:5173/>）をブラウザで開きます。

## コマンド

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバーを起動する（`--host` 付き。同じ Wi-Fi のスマホからも開ける） |
| `npm run build` | 型検査 → ESLint → コントラスト検査を通してから `dist/` に出力する |
| `npm run preview` | ビルド成果物をローカルで確認する |
| `npm run typecheck` | 型検査だけを実行する |
| `npm run lint` | ESLint を実行する |
| `npm run check:contrast` | 配色が WCAG のコントラスト比を満たすか検査する |
| `npm run build:world-map` | BlueMap の 2D タイルを 1 枚の PNG に貼り合わせる（下の「ワールドマップを作り直すとき」） |
| `npm run update:data` | AWS SSO の確認、`../aws_minecraft` 側の抽出、こちらへの取り込みをまとめて行う |
| `npm run sync:data` | `../aws_minecraft` と BlueMap の出力からデータを取り込む（下の「データを差し替えるとき」） |

`main` への push と Pull Request では、GitHub Actions が同じ検査を実行します
（[.github/workflows/ci.yml](.github/workflows/ci.yml)）。

`npm run build` の成果物は相対パス（`base: './'`）で出力するので、静的ホスティングのサブディレクトリにそのまま置けます。

## ファイル構成

| パス | 内容 |
| --- | --- |
| [data/](data/) | ビルド時に取り込む JSON。Minecraft の集計、相関図のデータ、ワールドマップの範囲 |
| [public/images/](public/images/) | BlueMap の 3D 表示のスクリーンショット |
| [public/world-map/](public/world-map/) | 貼り合わせた 2D のワールドマップ（`npm run build:world-map` が作る） |
| [scripts/sync-data.mjs](scripts/sync-data.mjs) | `../aws_minecraft` と BlueMap の出力からのデータ取り込み |
| [scripts/check-contrast.ts](scripts/check-contrast.ts) | 配色のコントラスト検査 |
| [scripts/build-world-map.ts](scripts/build-world-map.ts) | BlueMap の 2D タイルの貼り合わせ |
| [scripts/png.ts](scripts/png.ts) | PNG の読み書き（依存を増やさないための最小実装） |
| [public/icons/](public/icons/) | アプリのアイコン（タブ・ホーム画面） |
| [src/config/pwa.ts](src/config/pwa.ts) | ホーム画面に追加したときの名前・説明・アイコン・配色 |
| [netlify.toml](netlify.toml) | 公開設定（ビルドコマンドと出力先） |
| [.claude/](.claude/) | Claude Code の共有設定とスラッシュコマンド |
| [.github/workflows/ci.yml](.github/workflows/ci.yml) | push と Pull Request で走る検査 |
| [src/hooks/](src/hooks/) | 画面の切り替えと、画面幅の問い合わせ |
| [src/routes.ts](src/routes.ts) | 画面の一覧・URL・タブ名・使うスキン |
| [src/pages/](src/pages/) | 画面そのもの |
| [src/components/](src/components/) | 画面を組み立てる部品。アトミックデザインの 4 層（atoms → molecules → organisms → templates） |
| [src/config/](src/config/) | 指標・文言・グラフ設定・色の割り当て・スキン |
| [src/content/](src/content/) | ページの解説文 |
| [src/data/](src/data/) | Minecraft 統計の型・検証・読み込み |
| [src/map/](src/map/) | 相関図の型・検証・配置計算・見た目の決定 |
| [src/world/](src/world/) | ワールドマップの型・検証・座標変換 |
| [src/lib/](src/lib/) | 集計・整形・書き出しの純関数（拡大縮小・移動の計算を含む） |
| [src/theme/](src/theme/) | 配色・デザイントークン・CSS 変数の流し込み |
| [src/styles/index.css](src/styles/index.css) | Tailwind の入口。実行時の変数を Tailwind のトークン名に割り当てる |

## 見た目を変えるとき

色コードや px は、コンポーネントではなく次のファイルだけが持ちます。

| 変えたいもの | 編集するファイル |
| --- | --- |
| 色 | [src/theme/palette.ts](src/theme/palette.ts) |
| 文字の大きさ・書体・余白・角丸・線の太さ・寸法 | [src/theme/tokens.ts](src/theme/tokens.ts) |
| 部品ごとの色の割り当て | [src/config/colors.ts](src/config/colors.ts) |
| ページごとの見た目（スキン） | [src/config/skins.ts](src/config/skins.ts) |
| グラフの寸法・軸・ラベル | [src/config/charts.ts](src/config/charts.ts) |
| 指標の一覧・単位・表示件数 | [src/config/metrics.ts](src/config/metrics.ts) |
| 画面の文言 | [src/config/messages.ts](src/config/messages.ts) |
| データ ID の日本語名 | [src/config/labels.ts](src/config/labels.ts) |
| 相関図の配置・ノード・領域 | [src/map/config.ts](src/map/config.ts) |
| ワールドマップの目印 | [src/config/worldMap.ts](src/config/worldMap.ts) |
| 拡大縮小・移動の操作（刻み幅・拡大の上下限） | [src/config/viewport.ts](src/config/viewport.ts) |

これらの値は実行時に `--sr-*` というカスタムプロパティとして `<html>` に流し込まれ、
[src/styles/index.css](src/styles/index.css) の `@theme inline` が Tailwind のトークン名（`bg-surface`、`p-lg` など）に割り当てます。
コンポーネントでは `text-[13px]` `p-[12px]` `bg-[#ffffff]` のような直書きをせず、`text-sm` `p-lg` `bg-surface` のようにトークン名のクラスを使ってください。
新しい文字の大きさが必要なら、まず `src/theme/tokens.ts` の `FONT_SIZE` に名前付きで足します。

部品はアトミックデザインの 4 層（atoms → molecules → organisms → templates）で組み、下の層は上の層を参照しません。

見た目の決まり（文字の大きさの段、余白の目盛り、色の役割、ページの並び、レスポンシブの境目）は [DESIGN.md](DESIGN.md)、
実装の決まりは [CLAUDE.md](CLAUDE.md) にあります。

配色を変えたら `npm run check:contrast` を通してください（スキン × ライト/ダークの全組み合わせを検査します）。

## ワールドマップを作り直すとき

地図の実体は BlueMap の出力から作ります。BlueMap の 3D タイル（オーバーワールドだけで 308 MB）は
このリポジトリに持たず、真上から見た 2D タイル（3 MB）だけを 1 枚の PNG（1.2 MB）に貼り合わせて置きます。

```shell
# 1. srusa-portal でワールドをレンダリングする（Java 25 が要る）
cd ../srusa-portal/bluemap && ./render.sh

# 2. このリポジトリで 2D の地図を作り直す
cd -
npm run build:world-map
```

`public/world-map/<マップ名>.png` と、範囲・縮尺を書いた [data/world-map.json](data/world-map.json) が更新されます。
BlueMap の出力が別の場所にあるときは `npm run build:world-map -- --source <パス> --map nether` で指定します。
ネザーだけ差し替えるときは `cd ../srusa-portal/bluemap && ./render.sh -r nether` のあとに、
このリポジトリで `npm run build:world-map -- --map nether` を実行します。

3D の見た目はページに載せられないので、BlueMap の 3D 表示を撮った画像を `public/images/` に置き、
[src/content/worldMap.ts](src/content/worldMap.ts) の節に追記します。
操作できる地図と取り違えられないよう、画像には必ず `tag` を付けます。

## データを差し替えるとき

AWS からの再取得も含めて更新するときは `npm run update:data` を使います。
SSO セッションが切れている場合は、URL とコードが表示されるので、ブラウザで開いて入力すると続きが自動で進みます。

```shell
npm run update:data                  # AWS認証 → 抽出 → 取り込み
npm run update:data -- daily logs    # 日別データとログだけ
npm run update:data -- skins         # スキンと顔アイコンだけ
npm run update:data -- --dry-run     # AWS認証・抽出なしで、取り込み予定だけ確認
npm run update:data -- --list        # 取り込める元データを見るだけ
```

元データは 2 か所にあります。`npm run sync:data` が、取り込みから派生 JSON の作り直しまでをまとめて行います。

```shell
npm run sync:data                 # 全部
npm run sync:data -- 2d           # 2D の地図を全部作り直す（map と同じ）
npm run sync:data -- overworld    # オーバーワールドだけ
npm run sync:data -- nether end   # ネザーとエンドだけ
npm run sync:data -- stats daily  # 統計と日別だけ
npm run sync:data -- --list       # 取り込める元データを見るだけ
npm run sync:data -- --dry-run    # 何をするかだけ出す
```

| 対象 | 何が入るか | 出どころ |
| --- | --- | --- |
| `stats` | Minecraft 統計 JSON | `../aws_minecraft/data/` |
| `daily` | 日別データ。取り込み後に派生 JSON を作り直す | `../aws_minecraft/data/` |
| `logs` | サーバーログの日別集計。取り込み後に「日ごとの在席」だけを抜き出した JSON を作り直す | `../aws_minecraft/data/` |
| `skins` | スキンとアイコン（`public/player-skins/`） | `../aws_minecraft/data/` |
| `map` / `2d` | ワールドマップ（2D）の PNG と範囲 JSON | `../srusa-portal/bluemap/web/` |
| 地図の名前 | その 1 枚だけ（`overworld` / `nether` / `end` / `twilightforest`） | `../srusa-portal/bluemap/web/` |

取り込むと [data/data-registry.json](data/data-registry.json) の指し先と
[src/data/current.ts](src/data/current.ts) の import が新しい日付に揃います。
取り込み元のほうが古い日付のときは差し替えません。

**統計 JSON は取り込むときに伏せ字にします。** 元データはプレイヤーの UUID、EC2 のインスタンス ID、
AWS アカウント、リージョン、サーバー上のパスを生で持っているので、手でコピーして持ち込まないでください。
伏せ忘れがあれば書き出す前に止まります。

ワールドを描き直すときは先に `../srusa-portal/bluemap/render.sh` を実行します（下の節）。
レンダリングには Java が要るため、`sync:data` からは呼びません。

その他:

- `data/` に `minecraft-stats-YYYYMMDD.json` を追加すると、コードを変えずにデータセットの選択肢と「日付ごとの推移」の点が増えます
- 画面右上の「JSON を読み込む」からも手元のファイルを読み込めます。読み込んだファイルはブラウザ内でのみ処理され、どこへも送信されません
- 相関図は `data/srusa-relationship-vX.Y.json` のうち、いちばん新しいバージョンを読みます
- `player-db-*.json` はこのリポジトリでは作れません。`../aws_minecraft` 側で作り直して置きます

## 公開

作業は `main` では行いません（`.githooks/pre-commit` が `main` への直接コミットを止めます）。
作業用ブランチでコミットし、`main` へはマージで入れます。

`main` に push すると Netlify が `npm run build` を実行して公開します
（設定は [netlify.toml](netlify.toml)）。ビルドには型検査・ESLint・配色のコントラスト検査が
含まれるので、これらが落ちると公開もされません。

ページのタイトル・説明・アイコン・マニフェストは `index.html` に直接書かず、
[src/config/pwa.ts](src/config/pwa.ts) と [src/config/messages.ts](src/config/messages.ts) の値から
[vite.config.ts](vite.config.ts) のプラグインが組み立てます。画面に出る名前と食い違わないようにするためです。

## 注意

- **試験的なコンテンツです。** 掲載の可否と公開範囲はまだ決まっていません
- 相関図の学校名・会社名・研究室名は頭文字だけの表記です。統計 JSON の取得元 AWS 情報とプレイヤー UUID は伏字になっています
- ワールドマップの実体（BlueMap の出力、317 MB）はこのリポジトリには含めていません。レンダリング環境は srusa-portal の `bluemap/` にあります

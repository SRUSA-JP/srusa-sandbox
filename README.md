# srusa-sandbox

SRUSA の **Minecraft サーバー統計** と **メンバー相関図** を 1 つにまとめた Web アプリです。

コンテンツとビューアの実装は [srusa-portal](../srusa-portal) から移植しました。
srusa-portal では MkDocs のページに iframe で埋め込んでいましたが、こちらは単体で動く SPA として作り直しています。

## 画面

| 画面 | URL | 内容 |
| --- | --- | --- |
| Minecraft 統計 | `#/minecraft` | プレイヤー比較・内訳・系列比較・日付ごとの推移・2指標の関係の 5 グラフ。絞り込み、表への切り替え、CSV / JSON 書き出し |
| ワールドマップ | `#/minecraft/world-map` | BlueMap でレンダリングしたオーバーワールドの画像と、配信方法の検討メモ |
| 相関図 | `#/relationships` | メンバーのつながりと所属を 1 枚にまとめた SVG の図。中心人物・グループの強調・関係線の切り替え |

配色は画面右上で「端末に合わせる / 明るい / 暗い」から選べます（選択はブラウザに保存されます）。
Minecraft のページはドット絵風のスキン（書体・直角・太い線・緑のテーマ色）で表示されます。

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
| `npm run dev` | 開発サーバーを起動する |
| `npm run build` | 型検査とコントラスト検査を通してから `dist/` に出力する |
| `npm run preview` | ビルド成果物をローカルで確認する |
| `npm run typecheck` | 型検査だけを実行する |
| `npm run check:contrast` | 配色が WCAG のコントラスト比を満たすか検査する |

`npm run build` の成果物は相対パス（`base: './'`）で出力するので、静的ホスティングのサブディレクトリにそのまま置けます。

## ファイル構成

| パス | 内容 |
| --- | --- |
| [data/](data/) | ビルド時に取り込む JSON。Minecraft の集計と相関図のデータ |
| [public/images/](public/images/) | ワールドマップのレンダリング結果 |
| [scripts/check-contrast.ts](scripts/check-contrast.ts) | 配色のコントラスト検査 |
| [src/routes.ts](src/routes.ts) | 画面の一覧・URL・タブ名・使うスキン |
| [src/pages/](src/pages/) | 画面そのもの |
| [src/components/](src/components/) | 画面を組み立てる部品（atoms → molecules → organisms → templates） |
| [src/config/](src/config/) | 指標・文言・グラフ設定・色の割り当て・スキン |
| [src/content/](src/content/) | ページの解説文 |
| [src/data/](src/data/) | Minecraft 統計の型・検証・読み込み |
| [src/map/](src/map/) | 相関図の型・検証・配置計算・見た目の決定 |
| [src/lib/](src/lib/) | 集計・整形・書き出しの純関数 |
| [src/theme/](src/theme/) | 配色・デザイントークン・CSS 変数の流し込み |
| [src/styles/index.css](src/styles/index.css) | Tailwind の入口。実行時の変数を Tailwind のトークン名に割り当てる |

## 見た目を変えるとき

色コードや px は、コンポーネントではなく次のファイルだけが持ちます。

| 変えたいもの | 編集するファイル |
| --- | --- |
| 色 | [src/theme/palette.ts](src/theme/palette.ts) |
| 書体・余白・角丸・寸法 | [src/theme/tokens.ts](src/theme/tokens.ts) |
| 部品ごとの色の割り当て | [src/config/colors.ts](src/config/colors.ts) |
| ページごとの見た目（スキン） | [src/config/skins.ts](src/config/skins.ts) |
| グラフの寸法・軸・ラベル | [src/config/charts.ts](src/config/charts.ts) |
| 指標の一覧・単位・表示件数 | [src/config/metrics.ts](src/config/metrics.ts) |
| 画面の文言 | [src/config/messages.ts](src/config/messages.ts) |
| データ ID の日本語名 | [src/config/labels.ts](src/config/labels.ts) |
| 相関図の配置・ノード・領域 | [src/map/config.ts](src/map/config.ts) |

これらの値は実行時に `--sr-*` というカスタムプロパティとして `<html>` に流し込まれ、
[src/styles/index.css](src/styles/index.css) の `@theme inline` が Tailwind のトークン名（`bg-surface`、`p-lg` など）に割り当てます。
コンポーネントでは `p-[12px]` や `bg-[#ffffff]` のような直書きをせず、トークン名のクラスを使ってください。

配色を変えたら `npm run check:contrast` を通してください（スキン × ライト/ダークの全組み合わせを検査します）。

## データを差し替えるとき

- `data/` に `minecraft-stats-YYYYMMDD.json` を追加すると、コードを変えずにデータセットの選択肢と「日付ごとの推移」の点が増えます
- 画面右上の「JSON を読み込む」からも手元のファイルを読み込めます。読み込んだファイルはブラウザ内でのみ処理され、どこへも送信されません
- 相関図は `data/srusa-relationship-vX.Y.json` のうち、いちばん新しいバージョンを読みます

## 注意

- **試験的なコンテンツです。** 掲載の可否と公開範囲はまだ決まっていません
- 相関図の学校名・会社名・研究室名は頭文字だけの表記です。統計 JSON の取得元 AWS 情報とプレイヤー UUID は伏字になっています
- ワールドマップの実体（BlueMap の出力、317 MB）はこのリポジトリには含めていません。レンダリング環境は srusa-portal の `bluemap/` にあります

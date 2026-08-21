# srusa-sandbox

**公開先: <https://srusa-sandbox.netlify.app/>**

SRUSA の**試験用コンテンツを公開しているサイト**です。
まだ形の定まっていないものを、実際に触れる状態で置いて試す場所として使います。
現在は Minecraft サーバーの統計と、メンバーの相関図があります。

掲載内容・タブ構成・公開範囲はいずれも検討中で、予告なく変わったり消えたりします。

コンテンツとビューアの実装は [srusa-portal](../srusa-portal) から移植しました。
srusa-portal では MkDocs のページに iframe で埋め込んでいましたが、こちらは単体で動く SPA として作り直しています。

## 画面

| 画面 | URL | 内容 |
| --- | --- | --- |
| Minecraft 統計 | `#/minecraft` | プレイヤー比較・内訳・系列比較・日付ごとの推移・2指標の関係の 5 グラフ。絞り込み、表への切り替え、CSV / JSON 書き出し |
| ワールドマップ | `#/minecraft/world-map` | BlueMap でレンダリングしたオーバーワールドの画像と、配信方法の検討メモ |
| 相関図 | `#/relationships` | メンバーのつながりと所属を 1 枚にまとめた SVG の図。中心人物・グループの強調・関係線の切り替え |

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

`main` への push と Pull Request では、GitHub Actions が同じ検査を実行します
（[.github/workflows/ci.yml](.github/workflows/ci.yml)）。

`npm run build` の成果物は相対パス（`base: './'`）で出力するので、静的ホスティングのサブディレクトリにそのまま置けます。

## ファイル構成

| パス | 内容 |
| --- | --- |
| [data/](data/) | ビルド時に取り込む JSON。Minecraft の集計と相関図のデータ |
| [public/images/](public/images/) | ワールドマップのレンダリング結果 |
| [scripts/check-contrast.ts](scripts/check-contrast.ts) | 配色のコントラスト検査 |
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
| [src/lib/](src/lib/) | 集計・整形・書き出しの純関数 |
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

これらの値は実行時に `--sr-*` というカスタムプロパティとして `<html>` に流し込まれ、
[src/styles/index.css](src/styles/index.css) の `@theme inline` が Tailwind のトークン名（`bg-surface`、`p-lg` など）に割り当てます。
コンポーネントでは `text-[13px]` `p-[12px]` `bg-[#ffffff]` のような直書きをせず、`text-sm` `p-lg` `bg-surface` のようにトークン名のクラスを使ってください。
新しい文字の大きさが必要なら、まず `src/theme/tokens.ts` の `FONT_SIZE` に名前付きで足します。

部品はアトミックデザインの 4 層（atoms → molecules → organisms → templates）で組み、下の層は上の層を参照しません。

見た目の決まり（文字の大きさの段、余白の目盛り、色の役割、ページの並び、レスポンシブの境目）は [DESIGN.md](DESIGN.md)、
実装の決まりは [CLAUDE.md](CLAUDE.md) にあります。

配色を変えたら `npm run check:contrast` を通してください（スキン × ライト/ダークの全組み合わせを検査します）。

## データを差し替えるとき

- `data/` に `minecraft-stats-YYYYMMDD.json` を追加すると、コードを変えずにデータセットの選択肢と「日付ごとの推移」の点が増えます
- 画面右上の「JSON を読み込む」からも手元のファイルを読み込めます。読み込んだファイルはブラウザ内でのみ処理され、どこへも送信されません
- 相関図は `data/srusa-relationship-vX.Y.json` のうち、いちばん新しいバージョンを読みます

## 公開

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

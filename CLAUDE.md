# CLAUDE.md — srusa-sandbox 開発ガイド

## プロジェクト概要

SRUSA の **Minecraft サーバー統計** と **メンバー相関図** を 1 つにまとめた単体の Web アプリ。

コンテンツとビューアの実装は [srusa-portal](../srusa-portal)（MkDocs サイト）から移植した。
srusa-portal 側は MkDocs のページに iframe で埋め込む前提だったが、こちらは**単体で動く SPA** として作り直している。

- 埋め込み用の仕組み（親ページへの高さ通知、ホストの配色の読み取り）は持たない
- 配色の切り替えは自前で持つ（端末に合わせる / 明るい / 暗い）
- 画面の切り替えは URL のハッシュ（`#/minecraft` など）

## 技術スタック

| 領域 | 採用技術 |
| --- | --- |
| 言語 | TypeScript 5.9（`strict`） |
| UI | React 19 |
| ビルド | Vite 7 |
| スタイル | Tailwind CSS v4（`@tailwindcss/vite` プラグイン経由） |
| グラフ | Recharts 3 |
| 相関図 | 自前の SVG（ライブラリなし） |
| パッケージ管理 | npm |

ルーティングライブラリ・状態管理ライブラリ・UI コンポーネントライブラリは入れない。
画面数が少なく、状態はページ内に閉じているため。

## コマンド

```bash
npm install
npm run dev             # 開発サーバー（http://localhost:5173/）
npm run build           # 型検査 → コントラスト検査 → dist/ に出力
npm run preview         # ビルド成果物のプレビュー
npm run typecheck       # tsc --noEmit
npm run check:contrast  # 配色の WCAG コントラスト検査
```

配色・スキン・コントラストのしきい値を変えたら、必ず `npm run check:contrast` を通すこと。

## ディレクトリ方針

```text
data/                     # ビルド時に取り込む JSON（アプリの入力）
  minecraft-stats-YYYYMMDD.json
  srusa-relationship-vX.Y.json
public/images/            # ワールドマップのレンダリング結果など
scripts/check-contrast.ts # 配色の検査
src/
  main.tsx                # 入口。初回描画の前にトークンを流し込む
  App.tsx                 # 画面の切り替えとスキン・配色の結びつけ
  routes.ts               # 画面の一覧・URL・タブ名・使うスキン
  hooks/                  # ハッシュによる画面切り替え、画面幅の問い合わせ
  pages/                  # 画面そのもの（StatsPage / WorldMapPage / MapPage）
  components/             # アトミックデザイン（atoms → molecules → organisms → templates）
    classes.ts            # 部品をまたいで共有する Tailwind クラスの組み合わせ
  config/                 # 指標・文言・グラフ設定・色の割り当て・スキン
  content/                # ページの解説文（元は MkDocs の Markdown）
  data/                   # Minecraft 統計の型・検証・読み込み
  map/                    # 相関図の型・検証・配置計算・見た目の決定
  lib/                    # 集計・整形・書き出しの純関数
  theme/                  # 配色・デザイントークン・CSS 変数の流し込み
  styles/index.css        # Tailwind の入口とトークンの割り当て
```

新しい画面を足すときは `src/routes.ts` に 1 行足し、`src/App.tsx` の `PAGES` に対応を追加する。

## 設計方針

この 2 つが、このリポジトリで最も守ってほしい決まり。

1. **画面はアトミックデザインの層で組む**（下の層は上の層を知らない）
2. **見た目の値は一元管理する**（コンポーネントに色・px・文字列を直書きしない）

見た目そのものの決まり（文字の大きさの段、余白の目盛り、色の役割、ページの並び、
レスポンシブの境目）は [DESIGN.md](DESIGN.md) にまとめてある。
画面を触る前にそちらも読むこと。

### アトミックデザイン

画面を組み立てる部品は [src/components/](src/components/) に 4 層で置く。
**下の層は上の層を import しない。** 常に `atoms` → `molecules` → `organisms` → `templates` の一方向で組み上げる。

| 層 | 役割 | 置いてあるもの |
| --- | --- | --- |
| `atoms/` | これ以上分けられない部品。単体では意味を持たない | Button / Picker / NumberField / Segmented / Note / Swatch |
| `molecules/` | atoms を組み合わせた小さなまとまり | SectionHeader / KpiTile / ChartTooltip / PersonNode / RelationEdge / GroupRegion |
| `organisms/` | それだけで意味を持つ塊。データを受け取って見せる | ChartCard / DataTable / FilterPanel / KpiGrid / MapLegend / ProsePanel / 各グラフ / RelationshipMap |
| `templates/` | 画面の骨格。何を出すかは知らず、並べ方だけを決める | AppLayout（画面 1 枚）/ AppShell（サイト全体の枠） |

画面そのもの（どのデータをどの organism に渡すか）は [src/pages/](src/pages/) にあり、components には置かない。

#### 部品を追加するときのチェックリスト

- [ ] どの層に置くか決めたか（迷ったら「他の部品を組み合わせているか」で判断する。組み合わせていなければ atom）
- [ ] 下の層から上の層を import していないか（`atoms/` が `molecules/` を読んでいないか）
- [ ] 色・px・日本語を直書きしていないか（下の「ハードコード禁止・一元管理」）
- [ ] props の型を書いたか。各 prop に「何のためのものか」のコメントを付けたか
- [ ] その層の `index.ts` に export を足したか
- [ ] 同じ見た目の部品が既にないか。あるなら新設せず、そちらに props を足す

### ハードコード禁止・一元管理

**コンポーネントに色コード・px・日本語の文字列を直書きしない。** 必ず下の表のファイルを参照する。
値は 1 か所で定義し、使う側は参照するだけにする。

| 変えたいもの | 編集するファイル |
| --- | --- |
| 色そのもの | [src/theme/palette.ts](src/theme/palette.ts) |
| **文字の大きさ**・書体・余白・角丸・線の太さ・寸法 | [src/theme/tokens.ts](src/theme/tokens.ts) |
| 部品ごとの色の割り当て | [src/config/colors.ts](src/config/colors.ts) |
| ページごとの見た目（スキン） | [src/config/skins.ts](src/config/skins.ts) |
| グラフの寸法・軸・ラベル | [src/config/charts.ts](src/config/charts.ts) |
| 指標の一覧・単位・表示件数 | [src/config/metrics.ts](src/config/metrics.ts) |
| 画面の文言 | [src/config/messages.ts](src/config/messages.ts) |
| データ ID の日本語名 | [src/config/labels.ts](src/config/labels.ts) |
| 相関図の配置・ノード・領域 | [src/map/config.ts](src/map/config.ts) |
| ページの解説文 | [src/content/](src/content/) |
| タブ名・URL | [src/routes.ts](src/routes.ts) |

どの値をどう使い分けるかは [DESIGN.md](DESIGN.md) に書いてある。

#### 書いてよい形 / いけない形

| 種類 | いけない | よい |
| --- | --- | --- |
| 文字の大きさ | `text-[13px]` `style={{ fontSize: 13 }}` | `text-sm`（JS で数値が要るなら `FONT_SIZE.sm`） |
| 色 | `bg-[#ffffff]` `fill="#2a78d6"` | `bg-surface` / `figureColors(theme).primary` |
| 余白 | `p-[12px]` `mb-4` | `p-lg` `mb-section` |
| 角丸 | `rounded-[8px]` | `rounded-md`（SVG では `skinnedRadius(RADIUS.md)`） |
| 線の太さ | `border-2` | `border-hairline` / `border-thick` |
| 文言 | `<h2>絞り込み</h2>` | `<h2>{STATS_TEXT.filter.title}</h2>` |

- **文字の大きさは `theme/tokens.ts` の `FONT_SIZE` が唯一の定義場所。** 新しい大きさが要るならまずここに名前付きで足し、
  クラス（`text-<名前>`）から使う。既存の値に近ければ流用する
- SVG やグラフ（Recharts）は CSS クラスを通せないので、`FONT_SIZE` の値を
  `skinnedFontSize()` に通してから属性へ渡す。生の数値を書かない
- 全体を大きく／小さくしたいときは `FONT_SIZE` の表だけを書き換える。ページごとの調整は
  [src/config/skins.ts](src/config/skins.ts) の `fontScale`

### Tailwind と実行時トークンのつなぎ方

色・余白・書体の実値は **実行時に** `theme/cssVariables.ts` が `--sr-*` として `<html>` に流し込む
（配色の切り替えとスキンの差し替えを 1 か所で効かせるため）。
[src/styles/index.css](src/styles/index.css) の `@theme inline` が、その変数を Tailwind のトークン名に割り当てる。

- 接頭辞 `--sr-` は必須。Tailwind の `--color-*` `--spacing-*` `--radius-*` と衝突させない
- クラスは `bg-surface` `text-muted` `p-lg` `rounded-md` のようにトークン名で書く。`p-[12px]` や `bg-[#fff]` は書かない
- Tailwind に無い寸法（表の高さなど）は `max-h-[var(--sr-layout-table-max-height)]` の形で変数を引く
- 線の太さはスキンで倍率が変わるので、`border-2` ではなく `border-hairline` / `border-thick`（`@utility` で定義）を使う
- 複数の部品で同じ見た目になるものは [src/components/classes.ts](src/components/classes.ts) に定数として置く

### データと表示の分け方

アトミックデザインが「部品の大きさ」の分け方なら、こちらは「決定の種類」の分け方。

1. **純関数の層**（`lib/` `map/geometry.ts` `map/layout.ts`）は React にも SVG にも依存しない。
   同じ入力なら同じ出力を返し、入力を変更しない
2. **見せ方を決める層**（`lib/display.ts` `map/display.ts`）が、config と theme を組み合わせて
   色・寸法・文言を組み立てて返す。ここが「何をどう見せるか」の決定を全部持つ
3. **コンポーネント**は 2 が返した値を属性へ渡すだけ。自分で色・寸法・文言を決めない

新しい見せ方の判断（この状態のときは色を薄くする、件数に応じて高さを変える、など）が要るときは、
コンポーネントに書かず `display.ts` に関数として足す。

### アクセシビリティ

文字色は背景に対して WCAG AA（本文 4.5:1、大きい文字・図形 3:1）を満たすこと。
`theme/palette.ts` の `ensureContrast` / `readableTextOn` を通してから使い、
`npm run check:contrast` で検証する（スキン × ライト/ダークの全組み合わせを検査する）。

キーボード操作のフォーカス可視化は `src/styles/index.css` の `:focus-visible` に一元化済み。
個別のコンポーネントで outline を消さない。

### データ

- `data/` の JSON は `import.meta.glob` でビルド時に取り込む。Vite 固有の記述は
  [src/data/datasets.ts](src/data/datasets.ts) と [src/map/data.ts](src/map/data.ts) だけに閉じ込める
- 統計 JSON を `data/` に足せば、コードを変えずにデータセットの選択肢と推移グラフの点が増える
- 外部から来た JSON は必ず `parse.ts` の検証を通す。壊れたデータで画面が落ちないようにする

## 禁止事項（非可逆的な操作）

ユーザーの明示的な指示がない限り、以下を**実行しない**。

- `git commit` / `git push`（`--force` は指示があっても再確認する）
- `git checkout` / `git switch` によるブランチ切替・ファイルの復元
- `git reset --hard` / `git clean` / `git stash drop` / `git rm`
- `rm -rf` などの再帰的・強制的な削除、`mv` での上書き
- リベース・ブランチ削除・タグ削除など履歴を書き換える操作

迷ったら実行せず、必ずユーザーに確認する。

## コミット規則

- コミットメッセージは `[prefix]要約` の形式（srusa-portal と揃える）
  - `[add]`: ファイルまたは機能の追加
  - `[update]`: 既存機能の更新
  - `[remove]`: ファイルの削除
  - `[clean]`: 動作を変えないリファクタリング
- **1 コミット = 1 論理単位**。「ビルド設定」「画面実装」「ドキュメント」は別コミットに分ける
- `git add` は対象ファイルを明示する（`git add -A` でまとめない）
- 生成物（`dist/`）と `node_modules/` はコミットしない

## 作業ルール

- ユーザー向けの説明、ドキュメント、コミットメッセージ、コード内のコメントは日本語で書く
- 作業前に README とこのファイル、既存の差分を確認する
- 団体、活動、日程、場所、連絡先などの事実を推測で補わない。不明なものは TODO として明示する
- 個人情報の扱いに注意する。相関図のデータは頭文字表記で、統計 JSON の UUID と AWS 情報は伏字になっている。
  この匿名化を弱める変更をしない
- token、secret、credential、private key、個人用 `.env` を追加しない

## 変更時の確認

- `npm run build`（型検査とコントラスト検査を含む）が通ること
- 追加した部品が正しい層（atoms / molecules / organisms / templates）に置かれ、
  下の層から上の層を import していないこと
- 色コード・px・日本語の文字列を直書きしていないこと。次の検索で何も出ないこと

  ```shell
  # var(--sr-*) 以外の Tailwind 任意値（例: text-[13px]、bg-[#fff]）
  grep -rnoE '\b[a-z-]+-\[[^]]*\]' --include='*.tsx' src/ | grep -v 'var(--sr-'
  ```

- 配色を変えたら、ライト / ダーク × 標準 / ドット絵風の 4 通りで見え方を確認する
- README の説明と実際のファイル構成・コマンドが一致していること

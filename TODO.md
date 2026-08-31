### RULES
- やった日のログと原文を残して，やったらDONEに移動する

### TODO
- 拠点回り(overworld 0 0 付近, 黄昏の森 ? ? )だけは3D表示に対応させる


### DONE

#### 2026-08-31

- 原文: `ヘッダー，―フッターは固定で張り付き．あとはそれぞれのフッターのスマホアイコンに応じて，上に切り替えが表示されるように．ゲームでの表示みたいな感じで，人？のアイコンではメンバーと相関図が切り替えられるみたいな．で．ホームではそれを一覧？インデントで見てジャンプできるみたいな感じでどっちからもアクセスできるように．包含関係に気を付けて．適切にジャンル分け，命名してね．ベストプラクティスで` / `アトミックデザインで` / `フッターのアイコンもドット絵にしてほしい．`
  - `routes.ts` に親ジャンル `ホーム / ゲーム / 人 / 記録 / ギャラリー` を追加し、PC ヘッダー、スマホ下部ナビ、ホームのジャンプ一覧が同じ包含関係を見るようにした
  - ナビ部品を `PixelNavIcon` atom、`NavigationButton` molecule、`AppNavigation` organism に分け、`AppShell` template は組み立てに寄せた
  - スマートフォン下部ナビは親ジャンルだけを固定表示し、その直上に現在ジャンル内の切替を固定表示する形にした
  - 下部ナビのアイコンをドット絵 atom に統一し、選択状態は上端インジケータとアイコン色で示す
  - ホームのジャンプを親ジャンルから子ページへインデントする一覧にし、Minecraft 配下に統計・ワールドマップ・活動カレンダーを置いた
  - [DESIGN.md](DESIGN.md) と [CLAUDE.md](CLAUDE.md) に、ナビの包含関係、アトミックデザイン、ドット絵アイコンの規格を追記した

- 原文: `あとプレイデータで２３時間プレイとかは絶対間違いだから，それは修正しよう．もしかしたら前日のログアウト25:30～当日のログイン22:00で逆で数字を管理してるかもStart～Endじゃなくて，End～Startの時刻計算をしてるかもだからプレイヤー全員再計算してみて．ログを網羅的に．` / `cont`
  - [scripts/build-player-daily-summary.mjs](scripts/build-player-daily-summary.mjs) で、`mc-log-daily-summary` の `joined the game` / `left the game` をペアにしてプレイ時間を再計算するようにした
  - `first_seen_jst` から `last_seen_jst` までの差はプレイ時間に使わず、複数日にまたがる集計区間ではセッションとの交差時間だけを足す
  - 退出ログが無いセッションは過大計上を避けて閉じず、サーバー停止ログがあればその時刻で閉じる
  - `data/player-daily-summary-20260830.json` / `.csv` を再生成し、`playtime_source` にログ由来であることを残した
  - UI のプレイヤー日別パネルとタイムラインに、プレイ時間がログの入退室から再計算されている注記を追加した
  - 1日程度の区間で 20h 超のプレイ時間が出た場合に生成を止める検査を追加した
  - [docs/data-update-runbook.md](docs/data-update-runbook.md) と [CLAUDE.md](CLAUDE.md) に、ログの first/last 差分をプレイ時間に使わない運用ルールを追記した
  - 確認: `npm run build:player-daily` で最大プレイ時間が 14.55h になり、単日 20h 超の行が無いことを確認

- 原文: `ボドゲスコア記録もベストプラクティスで，既存のスコア記録やボドゲ集計表とかのノウハウを調べて記録表とするように．あとは配置とかレイアウトも既存研究を参考に設計して．`
  - ボドゲのスコア画面を、順位表先行ではなく「記録シート」先行の構成にした
  - [src/pages/BoardScorePage.tsx](src/pages/BoardScorePage.tsx) の得点表へ、入力状況、未入力数、先頭プレイヤー、行合計、合計行を追加した
  - 表の `caption`、列見出し `scope="col"`、行見出し `scope="row"` を追加し、読み上げでも得点セルの文脈が分かるようにした
  - 列が多いボドゲ記録でも比較しやすいように、表の枠だけ横スクロールし、ヘッダーと左端の項目列を固定する設計を維持した
  - [DESIGN.md](DESIGN.md) と [CLAUDE.md](CLAUDE.md) に、スコア記録表は紙の得点表に近い行列構造、入力表優先、空欄は未入力、合計は同じ表内、アクセシブルな表構造にする方針を追記した
  - UI 初期レンダリング検査に、ボドゲ記録表の `caption`、`scope`、未入力表示、合計行があることを追加した
  - 確認: `npm run typecheck`、`npm run test:ui`、`npm run lint`、`npm run check:design`、`npm run build` が通ることを確認

- 原文: `ボドゲのプレイヤーはいったんデフォルトをアクティブメンバーの人で，アイコンも出すように，この相関図でのユーザはいろいろ使う予定だｋら，CLAUDE.mdにも書いておくように．プレイヤーに紐づいて，ログのデータとかも管理できるように．テーブル設計が必要かもな．まだJsonで管理で良いけど移しやすい形で設計するように．ベストプラクティスで．`
  - [src/data/participants.ts](src/data/participants.ts) を追加し、相関図の `アクティブメンバー` と `player-db` を突き合わせて参加者ID・相関図ID・プレイヤーslug・表示名を返すようにした
  - [src/pages/BoardScorePage.tsx](src/pages/BoardScorePage.tsx) の初期プレイヤーをアクティブメンバーにし、合計・参加者一覧・得点表に顔アイコンを表示した
  - ボドゲ保存JSONを `participants` / `rounds` / `scores` に分けた v2 形式へ移行し、旧 v1 JSON / localStorage も読み込めるようにした
  - [CLAUDE.md](CLAUDE.md) に、相関図の人物IDを横断IDとして使う方針と、DB移行しやすいJSONテーブル設計を追記した
  - UI 初期レンダリング検査に、ボドゲ初期表示がアクティブメンバーとアイコンを含むことを追加した
  - 確認: `npm run typecheck`、`npm run test:ui`、`npm run lint`、`npm run check:design`、`npm run build` が通ることを確認

- 原文: `何かデザインがダサいな押したときの切り替わりでフッターの四角の強調表示と，フッターの上端がずれてるからとかかな，ベストプラクティスで．`
  - スマートフォン下部ナビの選択状態から角丸の塗り面を外し、アイコン色と上端の細いインジケータで示す形にした
  - フッター上部の余白を詰め、上端線と選択インジケータが競合しないようにした
  - UI 初期レンダリング検査に、下部ナビが `bg-selected` を使わず `bg-tab-marker` のインジケータを持つことを追加した
  - [DESIGN.md](DESIGN.md) に、スマホ下部ナビは角丸の四角で囲わず上端インジケータで示す方針を追記した
  - 確認: `npm run typecheck`、`npm run lint`、`npm run test:ui`、`npm run check:design`、`npm run build` が通ることを確認

- 原文: `スマホフッタのアイコンを大きく，文字は無くても一旦いいかも，アイコンメインで，フッターのサイズは少し小さく，UIテストも少し増やして，`
  - スマートフォン下部ナビの高さを `56px` に縮め、アイコンサイズを大きくした
  - 画面上のラベルは非表示にし、読み上げ用の `sr-only` ラベルだけを残した
  - UI 初期レンダリング検査に `AppShell` の下部ナビ構造チェックを追加した
  - [DESIGN.md](DESIGN.md) に、スマホ下部ナビはアイコン主役・ラベルは読み上げ用に残す方針を追記した
  - 確認: `npm run typecheck`、`npm run lint`、`npm run test:ui`、`npm run check:design`、`npm run build` が通ることを確認

- 原文: `まだBlueマップの縦幅小さいな．．．これ物理的に不可能なのか？縦横比率の問題？横幅小さくして，縦横比を押さえたら表示できるとかない？色々試してみて，縦幅広くなるように`
  - BlueMap 生成物の CSS を確認し、外側 iframe だけでなく BlueMap 内部の固定 UI とキャンバス領域が見え方に効いていることを確認した
  - 3D ビューアの通常高さを `min(1400px,96dvh)`、スマホ高さを `calc(100dvh - mobileNavHeight)`、全画面高さを `100dvh` に広げた
  - スマートフォンでは既定で、PC では `広く見る` ボタンで、iframe 内部を `worldMap3dScale` で縮小して論理ビューポートを広げる表示にした
  - 初期カメラ距離を 700 から 1100 に引き、開いた直後に見える範囲を増やした
  - [DESIGN.md](DESIGN.md) に、物理高さが足りない場合は iframe 内部の縮小表示で見える範囲を増やす方針を追記した
  - 確認: `npm run typecheck`、`npm run lint`、`npm run check:design`、`npm run build` が通ることを確認。ローカルでは `http://127.0.0.1:5174/` と BlueMap iframe の HTTP 200 を確認

- 原文: `netlify deploy --prod　を npm run deploy で実行できるように．テストは知らせて問題なかったら，勝手にこれやっていいよ．`
  - `npm run deploy` を追加し、`npm run build` が通ったあとに `npx netlify-cli deploy --prod --dir=dist` で本番公開するようにした
  - [README.md](README.md) のコマンド一覧に本番デプロイ用コマンドを追加した
  - 確認: `npm run build` と `npm run deploy` が通り、Netlify 本番へ公開できた

- 原文: `スマホではフッターでPaypayとかラインとかと似たUIになるように．多少まとめても良いかも近い概念は．ベストプラクティスで．`
  - スマートフォン幅では親カテゴリの切替を下部固定タブへ移し、ホーム / ゲーム / 人 / 記録 / ギャラリーの 5 項目にまとめた
  - 相関図とメンバーは「人」、年表とイベントは「記録」として近い概念をまとめ、各グループ内の詳細切替は既存の本文側ナビで続ける構成にした
  - 下部タブにアイコンと短いラベルを付け、本文が隠れないよう `mobileNavPagePadding` を追加した
  - [DESIGN.md](DESIGN.md) に、スマートフォン下部ナビの規格を追記した
  - 確認: `npm run typecheck`、`npm run lint`、`npm run check:design`、`npm run build` が通ることを確認

- 原文: `ボドゲとかのポイント集計を出来るように，dbが無いからjsonのエクスポートインポートで再現できるように途中からでも．` / `ゲーム名とかプレイヤーとかカスタムできるように．`
  - `ゲーム > ボドゲ > ポイント集計` ルートを追加し、ボードゲームやミニゲームの得点を記録できるページを追加した
  - ゲーム名、プレイヤー名、各回の名前、各プレイヤーの得点を画面上で編集できるようにした
  - ブラウザのローカル保存で途中作業を保持し、JSON の読み込み・書き出しで別端末や後日の再開に使えるようにした
  - 順位表とCSV出力を追加し、確認用の集計表も持てるようにした
  - 確認: `npm run typecheck`、`npm run lint`、`npm run check:design`、`npm run build` が通ることを確認

- 原文: `ヘッダーはウィンドウ固定でくっつくように，二列にならないように`
  - ヘッダーを `sticky top-0` にし、スクロールしてもウィンドウ上端に固定されるようにした
  - ロゴ、サイト名、上位ナビ、配色切替を 1 段の横並びにまとめ、折り返さず横スクロールで吸収するようにした
  - ゲーム内ナビなどのサブナビも折り返しをやめ、横スクロールにした
  - [DESIGN.md](DESIGN.md) に、ヘッダーは固定・1段・折り返さない規格を追記した
  - 確認: `npm run typecheck`、`npm run lint`、`npm run check:design`、`npm run build` が通ることを確認

- 原文: `ヘッダーに説明文章は要らないな．ヘッダーはある程度コンパクトに．くっついてそこで情報切替できるように`
  - ヘッダーからサイト説明文を外し、ロゴとサイト名を 1 行で表示するコンパクトな形にした
  - ヘッダー上部とナビ前後の余白を詰め、情報カテゴリの切替がヘッダー直下にまとまって見えるようにした
  - [DESIGN.md](DESIGN.md) に、ヘッダーは説明文ではなくロゴ・サイト名・配色切替・情報カテゴリ切替だけを持つ規格を追記した
  - 確認: `npm run typecheck`、`npm run lint`、`npm run check:design` が通ることを確認

- 原文: `PCでもブルーマップの縦幅小さすぎるわ`
  - PC 向けの BlueMap iframe 高さを `min(1180px,92dvh)` に広げ、通常表示でも画面高の大半を使うようにした
  - BlueMap iframe の最小高さを `760px` に広げ、全画面時の高さを `calc(100dvh - 40px)` にした
  - BlueMap 内部 CSS 補正の名前をスマホ限定からビューア全体の補正へ整理した
  - [DESIGN.md](DESIGN.md) に、3D ビューアは PC でもスマートフォンでも通常表示から画面高の大半を使う方針を追記した
  - 確認: `npm run typecheck`、`npm run lint`、`npm run check:design` が通ることを確認

- 原文: `３ｄマップ表示は多分ブルーマップ側の表示設定で縦幅が狭いからそこを調整できないか試してみて，スマホで`
  - BlueMap 生成物の CSS を確認し、スマホ時に `#app { font-size: 1.5rem }` と `#ff-mobile-controls { font-size: 15vh }` が効いて操作UIが縦幅を圧迫しやすいことを確認した
  - `WorldMap3dViewer` で iframe 読み込み後に同一オリジンの BlueMap へスマホ用 CSS を注入し、`100dvh` 基準の高さ、上部バー、モバイル操作ボタン、ズームボタンのサイズを補正するようにした
  - BlueMap 生成物本体は Git 追跡しない方針のため、生成物の `settings.json` や CSS を直接編集せず、追跡対象のビューア側に補正を閉じ込めた
  - [DESIGN.md](DESIGN.md) に、BlueMap 内部 UI のスマホ補正は `WorldMap3dViewer` の iframe 注入に閉じ込める方針を追記した
  - 確認: `npm run typecheck`、`npm run lint`、`npm run check:design`、`npm run build` が通ることを確認。実機スマートフォンでの見え方は未確認

- 原文: `詳細設定とか，あまりに長い文字とか設定は折りたたむように．相関図の設定とかね長いやつ．あとは，まだ，３ｄマップの全画面も通常も，スマホだと縦幅狭すぎて見にくい．あとは，３ｄマップ→２ｄマップ（全て）って順で表示されるように．下のスクショはもういらないからマップのスクショは消して，細かい情報も橋折るか折りたたんで．`
  - ワールドマップを `スポーン周辺 3D` → `2D マップ` の順に常時表示する構成に変更し、2D は初期状態で全ディメンションを表示するようにした
  - 2D マップのディメンション、履歴、ツールチップ切替を `2D マップ設定` に折りたたんだ
  - ワールドマップ下部の 3D スクリーンショット節を削除し、生成ログや作り直し手順は `地図の詳細` に折りたたむ形に寄せた
  - スマホの 3D iframe 高さを `90dvh`、最小高さを `680px` に広げ、全画面時は `calc(100dvh - 48px)` を使うようにした
  - 相関図の長い表示設定を `表示設定` に折りたたみ、デバッグ用の調整パネルを `データの詳細` 内へ移した
  - [DESIGN.md](DESIGN.md) に、長い設定欄の折りたたみ規格とワールドマップの表示順・3D 高さ方針を追記した
  - 確認: `npm run typecheck`、`npm run lint`、`npm run check:design`、`npm run build` が通ることを確認

- 原文: `デザインは統一してね．DESIGNmdにも規格を書くように`
  - [DESIGN.md](DESIGN.md) にホームの更新ログ兼ジャンプページの規格を追加した
  - 更新カードは既存の `SectionHeader`、`TAG`、`bg-surface`、`border-hairline` に揃え、節全体をカード化しない方針を明記した
  - 写真は更新内容を直接示す既存画像だけを使い、文言・リンク・画像パスは `src/content/home.ts` に集約する方針を明記した
  - 確認: `npm run check:design` が通ることを確認

- 原文: `トップページを追加してほしいルーティングで？でそこにどんな更新が入ったか，ログ兼お知らせで紹介するような感じで，そのページの追加情報とその写真もあったら貼って，ジャンプページって感じで．`
  - `#/` / 空ハッシュ / `#/home` で開くトップページを追加し、上部ナビに `ホーム` を追加した
  - 最近の更新を `src/content/home.ts` にまとめ、写真がある更新は既存のワールドマップ画像や BlueMap 画像を添えて紹介するようにした
  - 主要ページへのジャンプ欄を追加し、Minecraft 統計、ワールドマップ、活動カレンダー、メンバー、相関図、ギャラリーへ移動できるようにした
  - UI 初期レンダリング検査に `home` ルートを追加した
  - 確認: `npm run typecheck`、`npm run lint`、`npm run check:design`、`npm run build` が通ることを確認

- 原文: `スマホの幅が縦幅小さいから見にくすぎるから広げる方向だねやってほしいの．あとは全画面表示切替ボタンも？３ｄマップの`
  - スマートフォンのスポーン周辺 3D iframe 高さを `min(820px,82vh)`、最小高さを `520px` に広げた
  - スポーン周辺 3D ビューア上部に `全画面` / `全画面を終了` ボタンを追加した
  - 全画面表示中は iframe を画面高さいっぱいに近い高さへ切り替えるようにした
  - 確認: `npm run typecheck`、`npm run lint`、`npm run check:design`、`npm run build` が通ることを確認

- 原文: `多くない？406追跡しなくてよいよ`
  - BlueMap スポーン周辺 3D の生成物 371 件を Git 追跡から外し、`public/bluemap-spawn/README.md` だけを追跡する方針に変更した
  - `.gitignore` で `public/bluemap-spawn/` 配下の生成物を除外し、README だけを例外にした
  - 3D ビューアは `index.html` の有無を確認し、生成物がない環境では iframe ではなく同期案内を表示するようにした
  - README、Runbook、`srusa-data-refresh` skill に、BlueMap 生成物本体をコミットしないことを明記した
  - 確認: `npm run typecheck`、`npm run lint`、`npm run check:design`、`npm run build` が通ることを確認

- 原文: `ワールドマップとか統計も過去のログ？時系列で切り替えられるように．グラフとかで見れるのは切替する必要はないかな．マップみたいな１時点でのログが必要なのは切り替えできるように．過去分があれば`
  - ワールドマップの 2D 表示に `履歴` ピッカーを追加し、`最新` または保存済みの日付で地図を絞り込めるようにした
  - `最新` は各ディメンションの最新地図を表示し、日付指定時はその日に存在する地図だけを表示する
  - 統計ページは既に `data/minecraft-stats-*.json` を自動取り込みし、画面右上の `データセット` で過去分へ切り替えられるため、単一時点グラフへの追加切替は増やさない判断にした
  - Minecraft の技術説明に、統計データがワイルドカード取り込みでデータセット切替対象になることを明記した
  - 確認: `npm run typecheck`、`npm run lint`、`npm run check:world-map`、`npm run build` が通ることを確認

- 原文: `スマホでの３ｄマップ表示の縦幅を適切に` / `ワールドマップで３ｄがあるのは３ｄをデフォルトで．`
  - ワールドマップページの初期表示を `スポーン3D` に変更した
  - スマートフォンでは BlueMap iframe の高さを `min(560px,65vh)` にし、デスクトップでは従来の `min(760px,75vh)` を使うようにした
  - 確認: `npm run typecheck`、`npm run lint`、`npm run check:design`、`npm run build` が通ることを確認

- 原文: `サーバー維持費の請求を四捨五入で丸めたり，固定値でカスタムも出来るように` / `固定値っていうかカスタム値だな` / `値の入力は一時的に何も入らないのを許容するように．`
  - 維持費パネルに丸め単位を追加し、配分額を指定した円単位で四捨五入できるようにした
  - プレイヤー別のカスタム額を指定できるようにし、カスタム額を総額から引いた残りを未指定プレイヤーへ配分するようにした
  - カスタム額の合計が総額を超えた場合は、カスタム対象者の中で総額に収まるよう按分し、警告を出すようにした
  - 数値入力は入力中の空欄を許容し、空欄の間は親の値を `NaN` や `0` に変えないようにした
  - 確認: `npm run typecheck`、`npm run lint`、`npm run check:design`、`npm run build` が通ることを確認

#### 2026-08-30

- 原文: `gitignoreに適切に`
  - [`.gitignore`](.gitignore) に、データ取得時に誤って置きやすい `data/*.tar.gz` / `data/*.zip` と、公開に不要な BlueMap sourcemap `public/bluemap-spawn/assets/*.map` を追加した
  - その後、BlueMap 生成物本体はファイル数が多すぎるため、`public/bluemap-spawn/README.md` だけを追跡し、ビューア本体やタイルは Git 追跡しない方針に変更した
  - 確認: `git status --ignored --short` で BlueMap sourcemap が ignored になることを確認

- 原文: `プレイ時間でマイクラ鯖の維持費の傾斜をつけたいカスタムも・．DESIGN.ｍｄにも気を付けて`
  - Minecraft 統計ページに「サーバー維持費の傾斜」パネルを追加した
  - 総額、基本割%、傾斜係数を画面上で変更でき、プレイ時間がある対象者へ基本割 + `プレイ時間^傾斜` の従量分で配分する
  - 負担額ランキングを横棒グラフで表示し、表ビューではプレイ時間、割合、基本割、従量分、負担額、円/h を CSV 出力できるようにした
  - 計算は [src/lib/serviceCost.ts](src/lib/serviceCost.ts) に分離し、端数配分後も合計が入力総額に一致するようにした
  - [DESIGN.md](DESIGN.md) に、維持費試算パネルの見せ方と使う部品の方針を追記した
  - 確認: `npm run typecheck`、`npm run lint`、`npm run check:design`、`npm run build` が通ることを確認

- 原文: `2026/08/30のデータに更新したい`
  - AWS SSO 承認後、ライブサーバーから `mc-player-data-20260830.tar.gz` と `mc-logs-20260830.tar.gz` を取得した
  - `../aws_minecraft` 側で `player-data-by-date-20260830.*` と `mc-log-daily-summary-20260830.*` を生成し、srusa-sandbox に同期した
  - `data/minecraft-stats-20260830.json`、`data/player-daily-summary-20260830.*`、`data/player-featured-used-items-20260830.json`、`data/play-days-20260830.json` を生成した
  - `data/data-registry.json` と `src/data/current.ts` の参照先を `20260830` に更新した
  - サーバー側の一時ファイルを削除し、取得のために起動した EC2 は停止済み
  - 確認: `npm run build` が通ることを確認

- 原文: `カレンダーとかも含めて網羅的に更新するコマンドとそのノウハウも`
  - `npm run refresh:live` を追加し、ライブサーバーから統計・日別・活動カレンダー用データを取得して同期する一発コマンドにした
  - `scripts/build-minecraft-stats.mjs` を追加し、`player-data-by-date-YYYYMMDD.json` の最新スナップショットから公開用の `minecraft-stats-YYYYMMDD.json` を生成するようにした
  - `scripts/sync-data.mjs` の派生生成に `build:minecraft-stats` を組み込み、`daily` 更新時に統計ページ用 JSON も同じ日付へ揃うようにした
  - [docs/data-update-runbook.md](docs/data-update-runbook.md) にライブ更新の流れ、取得対象、3D データを取らないこと、SSM ポートフォワード、ログ展開、sha256 照合の注意を追記した
  - [srusa-data-refresh skill](.codex/skills/srusa-data-refresh/SKILL.md) を追加し、次回以降のデータ更新手順を Codex が拾えるようにした
  - 確認: `npm run refresh:live -- --help` と skill の validation が通ることを確認

- 原文: `バックアップはむやみに３ｄで取らなくてよいからね`
  - 定例バックアップやライブ更新用アーカイブには BlueMap の 3D タイルやワールド全体のレンダリング結果を含めない方針を明記した
  - [docs/data-update-runbook.md](docs/data-update-runbook.md) と [srusa-data-refresh skill](.codex/skills/srusa-data-refresh/SKILL.md) に、必要な公開ビューから逆算した最小限の元データだけを固めることを追記した
  - 確認: Markdown の文面確認のみ

- 原文: `3dログは要らないからね．` / `あとは３ｄデータが一個だけ？あると思うからリスポーン地点の１６ｘ１６チャンクを３ｄで表示できるように新たな，マップの表示の種類として表示する感じで`
  - ライブ更新コマンドは 3D データを取得しない方針にした
  - 既存の BlueMap `overworld_spawn` 出力だけを `public/bluemap-spawn/` にコピーし、フルワールド 3D ではなくスポーン周辺 3D として公開するようにした
  - ワールドマップページに `2D` / `スポーン3D` の表示切り替えを追加し、`スポーン3D` では BlueMap ビューアを iframe で表示する
  - 3D iframe の高さは `src/theme/tokens.ts` のレイアウトトークンで管理する
  - 確認: ローカル dev server で BlueMap の主要ファイルが 200 で返ることを確認

- 原文: `あとは，ゲームの表示で包含関係で順に表示するように例えばマイクラとかＡＰＥＸのゲームの下にマイクラのゲームをクリックしたときにマップとかカレンダーとかが表示されるように．今はコンテンツ→あるゲームのコンテンツ→ゲームタイトルで最後二つが逆になってるから．`
  - `src/routes.ts` に `gameId` / `gameLabel` を追加し、ゲームセクションの親ゲームと中の画面を分けた
  - `AppShell` のゲームナビを「ゲーム一覧（Minecraft / VALORANT / LOL / APEX）→ 選んだゲーム内の画面（統計 / ワールドマップ / 活動カレンダー）」の順に変更した
  - VALORANT / LOL / APEX はゲーム名を親タブに出し、中の画面は `概要` として扱うようにした
  - 確認: `npm run build` が通ることを確認

- 原文: `このデータの取得方法ってマニュアル化されてなかったらしてほしい`
  - 既存の [docs/data-update-runbook.md](docs/data-update-runbook.md) に、取得元の作り方を追記した
  - AWS 由来データは `../aws_minecraft/data/`、ワールドマップは `../srusa-portal/bluemap/web/` を元にし、このリポジトリには公開用 JSON / PNG だけを同期することを明記した
  - BlueMap のレンダリング → `npm run refresh:data:local -- map --dry-run` → `npm run refresh:data:local -- map` → `npm run check:world-map` の手順を追加した
  - 確認: Markdown の文面確認のみ

#### 2026-08-25

- 原文: `コントラスト比とかデザインもチェックできるようんい`
  - `scripts/check-design.ts` を追加し、UI層の色直書き、トークンなしの任意値クラス、典型的なカード入れ子を検査できるようにした
  - `npm run check:design` を追加し、`npm run build` と CI の検査列へ組み込んだ
  - 既存の `npm run check:contrast` はコントラスト比の数値検査として継続し、CLAUDE.md / DESIGN.md に使い分けを追記した
  - `ClipCard` の直書きオーバーレイ色と `ClipsPage` の入力欄幅をトークン・役割色経由に寄せた
  - 確認: `npm run check:design`、`npm run check:contrast`、`npm run typecheck`、`npm run lint`、`npm run build` を実行し、すべて通ることを確認

- 原文: `各UIのレンダリングとか，壊れていないかとかのテストが走るように`
  - `scripts/check-ui-render.tsx` を追加し、公開ルートと代表的なプレイヤーURLを React SSR で初期レンダリングするスモークテストを作った
  - `npm run test:ui` を追加し、`npm run build` の検査列にも組み込んだ
  - Vite 固有の `import.meta.glob` を使うため、テストも Vite SSR ビルド経由で実行する
  - 確認: `npm run test:ui`、`npm run typecheck`、`npm run lint`、`npm run build` を実行し、すべて通ることを確認

- 原文: `アクティブメンバーも表示されるように，エラーになってる不整合で`
  - 相関図データの `groups` に `アクティブメンバー` を追加し、人物属性の参照切れ不整合を解消する
  - 図鑑カードで `アクティブメンバー` が所属数上限に隠れないよう、優先表示タグとして扱う
  - 確認: 相関図属性の参照切れが 0 件であること、`npm run typecheck`、`npm run lint`、`npm run build` が通ることを確認

- 原文: `適宜skills育てる方針をCLAUDEｍｄにも`
  - [CLAUDE.md](CLAUDE.md) の作業ルールに、繰り返し作業・更新手順・判断基準・注意点を `.codex/skills/` の skill として育てる方針を追記した
  - [CODEX.md](CODEX.md) にも同じ入口を短く追記した
  - 確認: Markdown の文面確認のみ

- 原文: `指数推移とかマップとか，ランキングとかデータを更新するたびに反映するところを洗い出しして，それをどう更新していくかっていうログ？を作ってほしい，あとはそれを自動で更新？最新にするコマンドとかも．`
  - データ更新時に何がどこへ反映されるかを [docs/data-update-runbook.md](docs/data-update-runbook.md) に整理した
  - `npm run refresh:data`（AWS再取得込み）と `npm run refresh:data:local`（抽出済みデータ同期のみ）を追加した
  - `sync:data` / `update:data` の対象に `inventory` を追加し、所有資産の `build:inventory-assets` も自動派生に含めた
  - `CLAUDE.md` のデータ取り込み手順に Runbook と `inventory` 対象を追記した
  - 確認: `npm run refresh:data:local -- --dry-run`、`npm run refresh:data:local -- inventory --dry-run`、`npm run refresh:data:local -- --list`、`npm run refresh:data -- --dry-run`、`npm run typecheck`、`npm run lint` を実行し、引数転送も修正済み

- 原文: `タグにアクティブメンバーってのも追加して．nodoame alias mitiglia detkent rik gurando natch kagyki shonenn juniama gotti panndasanngou(?) gomakusa t0myをそのタグで．`
  - 図鑑表示用の `data/player-db-20260823.json` と、相関図元データの
    `data/srusa-relationship-v0.2.json` に `アクティブメンバー` 属性を追加した
  - 表記ゆれは既存DBに合わせ、`t0my` → `tomy`、`shonenn` → `shounenn`、
    `juniama` → `juniamal`、`gotti` → `gottigoti` として扱った
  - `mitiglia` は Minecraft 側の `Mitigli4` と相関図側の `mitiglia` の両方に付与した
  - 確認: 対象全員にタグが付いていることを Node で検査し、`npm run build` が通ることを確認

- 原文: `デフォルトの並び替えは連携数順の降順で．図鑑ね．`
  - SRUSA図鑑の初期ソートを `name` から `related` に変更した
  - `related` は `src/lib/playerDirectory.ts` の `relatedPeopleCount()` で直接つながっている人数を数え、
    多い順、同数なら名前順で並べる
  - 確認: `npm run typecheck` が通ることを確認

- 原文: `相関図のクラスタの手法を何パターンか．適している手法を調べていくつか作って．`
  - 相関図の配置プルダウンに `所属ハイブリッド`、`関係コミュニティ`、`距離ストレス` を追加した
  - `所属ハイブリッド` は所属クラスタを保ちながら関係線を短く寄せる
  - `関係コミュニティ` は関係線からラベル伝播に近い決定的ヒューリスティックでまとまりを作る
  - `距離ストレス` はグラフ距離が平面距離に近づくよう、MDS / stress 系の考え方を軽い反復法で実装した
  - 設計メモとして [DESIGN.md](DESIGN.md) に使い分けと参考にした考え方を追記した
  - 確認: `npm run build` が通ることを確認
  - **未確認: ブラウザでの見え方。** 実際に各配置を切り替えて、デフォルト候補を選ぶこと

- 原文: `マップでツールチップの表示のオンオフを切り替えられるように`
  - 相関図とワールドマップのカード上部に `ツールチップ` の `表示 / 非表示` 切り替えを追加した
  - 相関図は人物・領域・関係線の SVG 標準 `<title>` をまとめて制御する
  - ワールドマップは座標吹き出しの描画とポインタ追従更新をオフにできる
  - 相関図のエクスポート / インポートには `showTooltips` も含め、作業状態を戻したときに同じ表示になる
  - 確認: `npm run build` が通ることを確認

- 原文: `ヘッダーにstusa図鑑を作ってそこに人のページを、相関図とかからそこへ飛べるように`
  - ヘッダーに「SRUSA 図鑑」タブを追加（`#/zukan`）。相関図と Minecraft に出てくる人 82 名の名簿
  - 1 人 1 枚のカードにして、カード全体を紹介ページ（`#/players/<名前>`）へのリンクにした
  - 所属（K社・塾・M大学 …）と種類（すべて / Minecraft に参加 / 相関図のみ）で絞り込める
  - カードの色は絞り込む前の並びで固定する。条件を変えても同じ人の色が変わらないようにするため
  - 紹介ページはタブに並べないが、`tabId` で図鑑のタブを選択中に見せる。
    見出しの右に「図鑑へ戻る」を置いた
  - 知らない名前で紹介ページを開いたときは、そのまま図鑑を出して選び直せるようにした
    （それまでは名前だけの一覧を別に持っていたので、`PlayerDirectory` に寄せて重複を消した）
  - 相関図の図の上にも「図鑑を見る」を追加。図の中から探すより名簿から選ぶほうが早いことがあるため
  - 名前は相関図のデータにある表記のまま出す（頭文字だけの人はそのまま）。匿名化は弱めていない
  - 絞り込みの判定は `src/lib/playerDirectory.ts`（純関数）、札と所属の出し方は
    `src/lib/display.ts` の `playerCardContent()`、並べ方は `PlayerDirectory`（organism）
  - `playStreakRanking()` をここで使うようにした（前回作って未使用だったもの）。
    継続中の人のカードに「継続 N 日」を出す
  - 確認: `npm run build` が通ること、絞り込みと数え上げの入出力、
    `#/zukan` `#/zukan/` `#/players/<名前>` `#/nope` のハッシュ解決
  - **未確認: ブラウザでの見え方。** `npm run preview` で 4 通りの配色を見ること

- 原文: （未記録。連続プレイ日数を出す作業の続き）
  - サーバーログの日別集計（`mc-log-daily-summary-*.json`）から「その日ログインしたか」だけを抜き出す
    `npm run build:play-days` を追加。479 KB → 27 KB に削ってからバンドルに載せる
  - `npm run sync:data -- logs` で取り込むと、この派生 JSON も一緒に作り直すようにした
  - `src/data/playLog.ts` に読み込みと検証、`src/lib/playStreak.ts` に数え方（純関数）、
    `src/lib/display.ts` の `playStreakSummary()` に見出しの決め方、
    `src/config/colors.ts` の `playStreakMarkColors()` に帯の色を置いた
  - プレイヤー紹介ページに `PlayerStreakPanel` を追加。直近 21 日ぶんの帯で
    「毎日きているのか、週末だけなのか」が見えるようにした
  - 途切れている人には「現在の連続」ではなく「最後の連続」と出す。
    最終日はまだ集計途中なので、前日まで遊んでいれば継続中と見なす
  - 確認: `npm run build`（型・ESLint・コントラスト）が通ること、
    `build:play-days` を再実行しても差分が出ないこと、
    ログのプレイヤー名 15 人が統計 JSON の名前と完全に一致すること
  - `playStreakRanking()` は当日時点では未使用だった（翌日、図鑑のカードの「継続 N 日」で使うようにした）

#### 2026-08-24

- 原文: `ｎ角形のグラフで，どこにfightとかを表示するってのを固定に，違うプレイヤーでずれると見にくい`
  - 原因: `PlayerStatus.scores` を「強い順」に並べていたため、レーダーの角の割り当てがプレイヤーごとに変わっていた
  - `src/lib/statsExperience.ts` に固定順の `PLAYSTYLE_IDS` を追加し、`PlaystyleScore` に `rank`（そのプレイヤー内の順位）を持たせた
  - `src/lib/display.ts` に `playstyleAxisOrder()` を追加。軸は必ず固定順に並べ直す
  - 角のラベルの数字は「並び順」から「順位」に変更。軸を固定しても強弱は読める
  - 右側の一覧は従来どおり強い順のまま（先頭の色分けは `rank === 1` で判定）

- 原文: `ここのコマンドを作って？shかnpmか何かで../aws_minecraftのデータを更新できるように．マップだけとかオーバーワールドだけとか全部とかいくつかオプションも出来るように`
  - `npm run sync:data`（`scripts/sync-data.mjs`）を追加
  - 対象: `stats` / `daily` / `logs` / `skins` / `map` / `all`（省略時は全部）
  - `--dimension overworld` でマップを絞れる。`--list` `--dry-run` `--source` `--bluemap` も用意
  - 取り込み後に `data/data-registry.json` の指し先と `src/data/current.ts` の import を新しい日付へ揃え、派生 JSON（`build:player-daily` / `build:item-rankings`）を作り直す
  - **統計 JSON は取り込み時に伏せ字にする。** 元データは UUID・EC2 インスタンス ID・AWS アカウント・
    リージョン・サーバー上のパスを生で持っていた。規則は `data/data-registry.json` の `redaction`。
    伏せ忘れがあれば書き出す前に止まる
  - まだレンダリングされていないマップ（現状ネザー）は飛ばす
  - BlueMap のレンダリング自体（Java が要る）はこのコマンドの外。`../srusa-portal/bluemap/render.sh` を先に実行する
  - 動作確認: `--list` / `--dry-run` / `stats logs skins` / `daily` / `map --dimension end` を実行し、
    いずれも意図しない差分が出ないことを確認

- 原文: `プレイヤーページを作ってプレースホルダーだけでも`
  - 調査の結果、コミット `bf20cc6` で実装済みだった（`src/pages/PlayerPage.tsx`）
  - URL は `#/players/<名前>`。統計ページ・イベントページ・相関図から遷移できる
  - プレースホルダーどころか、統計タイル・日別ログ・使用アイテム・ランキング・相関図の所属まで載っている
  - 追加実装は不要と判断

- 原文: `スマホでマップのツールチップ一瞬しか表示されない`
  - 原因: タップ直後に必ず `pointerleave` が来て消えていた。加えて掴んで動かす間は
    `pointermove` が表示枠（pointer capture 先）へ流れ、地図側に届いていなかった
  - 指・ペンは `pointerdown` で座標を確定し、吹き出しを貼り付け（`pinned`）て `pointerleave` では消さない
  - 貼り付けた吹き出しは指の位置ではなくブロック座標を基準に置き直すので、地図を動かしても離れない
    （`src/lib/viewport.ts` に `toScreen()` を追加）
  - マウスの挙動は従来どおり（カーソル追従、離れたら消える）
  - 直書きだった `min-w-[180px]` と位置の数値を `LAYOUT.tooltipMinWidth` / `WORLD_MAP.tooltip` に移し、
    寄せ直しの計算は `src/world/display.ts` の `tooltipPlacement()` に出した
  - **未確認: スマホ実機での見え方。** `npm run dev` を実機で開いて確かめること

- 原文: `メインで作業していたかもだから全部ブランチeditにして` / `mainをプロテクト，作業できないように，claudemdにも`
  - `edit` は `main` より 2 コミット遅れていたので、作業を stash して fast-forward し、戻した
  - `.githooks/pre-commit` で `main` / `master` への直接コミットを拒否
  - `package.json` の `prepare` で `npm install` のたびに `core.hooksPath` が有効になる
  - `.claude/settings.json` に `git commit --no-verify` と `core.hooksPath` 変更の deny を追加
  - CLAUDE.md に「main ブランチは保護する」節を追加、禁止事項と README にも追記
  - 記録: main への直接コミットは過去に 1 件だけ（`5571fde`、2026-08-23 23:40）

### RULES
- やった日のログと原文を残して，やったらDONEに移動する

### TODO
- （なし）

### DONE

#### 2026-08-25

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

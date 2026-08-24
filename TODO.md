### RULES
- やった日のログと原文を残して，やったらDONEに移動する

### TODO
- （なし）

### DONE

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

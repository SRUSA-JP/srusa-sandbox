---
description: 型・lint・配色・デザインの決まりをまとめて検査する
---

このリポジトリの検査をすべて実行して、結果を報告して。

1. `npm run typecheck`（型検査）
2. `npm run lint`（ESLint。警告も 0 にする）
3. `npm run check:contrast`（配色のコントラスト。スキン × ライト / ダークの全 4 通り）
4. `npm run check:layout`（図の文字が枠からはみ出さない・小さすぎない。スキンごと）
5. 実値の直書きが無いこと。次を実行して何も出ないこと

   ```shell
   grep -rnoE '\b[a-z-]+-\[[^]]*\]' --include='*.tsx' src/ | grep -v 'var(--sr-'
   ```

6. アトミックデザインの層の向き。下の層が上の層を import していないこと

   ```shell
   grep -rhoE "from '\.\./[a-z]+" src/components/atoms/     # classes だけ
   grep -rhoE "from '\.\./[a-z]+" src/components/molecules/ # atoms / classes だけ
   grep -rhoE "from '\.\./[a-z]+" src/components/templates/ # atoms / classes だけ
   grep -rn "pages" src/components/                         # コメント以外に出ないこと
   ```

7. `npm run build`

失敗したものがあれば、抑制やコメントアウトで黙らせず原因を直す。
直せない理由があるときは、その理由とともに報告して止める。

判断の基準は [DESIGN.md](../../DESIGN.md) と [CLAUDE.md](../../CLAUDE.md) にある。

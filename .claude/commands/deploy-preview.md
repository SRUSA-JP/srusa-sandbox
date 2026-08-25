---
description: Netlify のプレビューデプロイを作成する（本番公開しない）
---

Netlify のプレビューデプロイを作成して、確認用 URL を報告して。

1. `git status --short --branch` で作業ツリーを確認する。
   未コミット変更があっても止めなくてよいが、どの変更を含むビルドになるか報告する。
2. `npm run deploy:preview` を実行する。
   これは `npm run build` の後に Netlify CLI の draft deploy を実行する。
3. Netlify CLI がログイン確認や認証 URL を出したら、ユーザーに必要な操作を短く伝えて待つ。
4. 成功したら、出力された Deploy URL / Draft URL を報告する。
5. 失敗したら、失敗した段階（build / Netlify CLI / 認証 / upload）と原因を報告する。

本番公開はしない。Production deploy が必要な場合は、別途ユーザーの明示指示を待つ。

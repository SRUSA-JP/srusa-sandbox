# CODEX.md — Codex 作業メモ

Codex でこのリポジトリを触るときも、基本ルールは [CLAUDE.md](CLAUDE.md) と [DESIGN.md](DESIGN.md) に従う。

- UI は必ずアトミックデザインで組む
- `atoms` → `molecules` → `organisms` → `templates` の一方向で import する
- page は画面の組み立てに留め、再利用できる表示・操作は components に分ける
- 色・px・日本語文言はコンポーネントへ直書きせず、config / theme / classes に一元管理する
- 作業ログ・引き継ぎ・TODO/DONE を触るときは `work-log` skill と [TODO.md](TODO.md) の `RULES` を見る
- 変更後は少なくとも `npm run typecheck` と `npm run lint`、見た目や公開物に関わる変更は `npm run build` を通す

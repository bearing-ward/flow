# Plan 158: Shape nodes and palette

This plan implements unit "7. Shape nodes and palette" of `plans/149-pro-delivery.md` in full: its "Shared core", "Per host" and "Acceptance" bullets. Use the D7 policy that the maintainer adopted on 2026-10-25. Each committed gesture is one undo step, through the history from Plan 150 (`docs/transaction-history.md`). Copy and paste (Plan 153, `docs/graph-clipboard.md`) must preserve any new document fields.

When every acceptance test passes in Vanilla, Vue and Foldkit, set the catalog entry "Shapes · Pro" to C. D7 left one question open: whether resize is part of the first delivery. Include resize, because shapes scale to explicit node bounds. Add a `reaudit` record that cites the evidence, and recompute the summary counts from the entries.

## Execution

- Only ADD to `verification.config.json`; never remove or narrow anything.
- Take the browser lock separately for each browser command, as in `scripts/with-flow-browser-lock.sh bun run playwright test ... --workers=1`. Never hold it while you edit code or across an interactive shell.
- Compiler-API code must import `typescript-api`.
- Tests use `it` inside `describe`.
- Write a research trace that ends with a Conformity and deviations section, then run `research:check-traces` and `docs:check`.
- Finish with the locked `bun run verify --check reference-host`.
- Commit on `plan/158-shape-nodes` with the trailer `Co-Authored-By: GPT-6.1 Sol via Codex <noreply@openai.com>`. Do not push or merge.

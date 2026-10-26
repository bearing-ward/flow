# Plan 160: Dynamic tree editing and expand/collapse

This plan implements unit "6. Dynamic tree editing and expand/collapse" of `plans/149-pro-delivery.md` in full: its "Shared core", "Per host" and "Acceptance" bullets. Use the D6 policy that the maintainer adopted on 2026-10-25. Each committed gesture is one undo step, through the history from Plan 150 (`docs/transaction-history.md`). Copy and paste (Plan 153, `docs/graph-clipboard.md`) must preserve any new document fields.

When every acceptance test passes in Vanilla, Vue and Foldkit, set the catalog entries "Expand and Collapse · Pro" and "Dynamic Layouting · Pro" to C. Build on the layout engines from Plan 157 (`docs/layout-engines.md`) and the node animation from Plan 159 (`docs/node-animation.md`). Add a `reaudit` record that cites the evidence, and recompute the summary counts from the entries.

## Execution

- Only ADD to `verification.config.json`; never remove or narrow anything.
- Take the browser lock separately for each browser command, as in `scripts/with-flow-browser-lock.sh bun run playwright test ... --workers=1`. Never hold it while you edit code or across an interactive shell.
- Compiler-API code must import `typescript-api`.
- Tests use `it` inside `describe`.
- Write a research trace that ends with a Conformity and deviations section, then run `research:check-traces` and `docs:check`.
- Finish with the locked `bun run verify --check reference-host`.
- Commit on `plan/160-expand-collapse` with the trailer `Co-Authored-By: GPT-6.1 Sol via Codex <noreply@openai.com>`. Do not push or merge.

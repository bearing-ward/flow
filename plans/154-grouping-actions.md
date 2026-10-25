# Plan 154: Complete grouping actions and sizing

This plan implements unit "3. Complete grouping actions and sizing" of `plans/149-pro-delivery.md` in full: its "Shared core", "Per host" and "Acceptance" bullets. Use the D3 policy that the maintainer adopted on 2026-10-25. Build on the transaction history from Plan 150 (`docs/transaction-history.md`), so that each command is one undo step.

When every acceptance test passes in Vanilla, Vue and Foldkit, set the catalog entries for Selection Grouping · Pro and Parent Child Relation · Pro to C. Add a `reaudit` record that cites the evidence.

## Execution

- Only ADD to `verification.config.json`; never remove or narrow anything.
- Compiler-API code must import `typescript-api`.
- Tests use `it` inside `describe`, as ultracite 8 requires.
- Write a research trace that ends with a Conformity and deviations section, then run `research:check-traces` and `docs:check`.
- Finish with the locked `bun run verify` (`scripts/with-flow-browser-lock.sh`, one worker).
- Commit on `plan/154-grouping-actions` with the trailer `Co-Authored-By: GPT-6.1 Sol via Codex <noreply@openai.com>`. Do not push or merge.

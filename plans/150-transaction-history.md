# Plan 150: transaction history (undo and redo)

This is unit 1 of `plans/149-pro-delivery.md`. It covers the Undo and Redo Pro entry. Use the D1 policy that the maintainer adopted on 2026-10-25:

- session-only bounded history;
- 100 transactions by default, configurable by the application;
- no viewport or selection history;
- history is not persisted across reloads.

Implement the unit's "Shared core", "Per host" and "Acceptance" bullets in full.

Constraints:

- The transaction-origin API must leave room for local-origin collaborative undo later (Yjs, D12) and for the remapping that the clipboard (unit 2) will need.
- Promote the history semantics from `apps/shared/schema-studio/model.ts:230` into `packages/core`; don't import app-domain types.
- Telemetry follows `packages/core/src/telemetry/flow-telemetry.ts`.

When every acceptance test passes in Vanilla, Vue and Foldkit, set the catalog entry "Undo and Redo · Pro" to C, with a `reaudit` record that cites the evidence.

## Execution

- Add entries to `verification.config.json`; never remove any.
- Write a research trace that ends with a Conformity and deviations section, then run `research:check-traces` and `docs:check`.
- Finish with the locked `bun run verify` (`scripts/with-flow-browser-lock.sh`, one worker).
- Commit on `plan/150-history` with the trailer `Co-Authored-By: GPT-6.1 Sol via Codex <noreply@openai.com>`. Do not push or merge.

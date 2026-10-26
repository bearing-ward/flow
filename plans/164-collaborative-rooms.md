# Plan 164: Collaborative rooms

This plan implements unit "12. Collaborative rooms" of `plans/149-pro-delivery.md` in full: its "Shared core", "Per host" and "Acceptance" bullets. Use the D12 decision that the maintainer made on 2026-10-25 (see "Maintainer decisions recorded 2026-10-25" in that file).

The document now carries every earlier extension, and this plan must handle all of them:

- group membership (Plan 154);
- tree expansion data (Plan 160);
- shape data (Plan 158);
- manual routes (Plan 156);
- wire-tie bundles (Plan 163, persistence v5).

Each committed change is one undo step through the history from Plan 150. Any new optional dependency goes in its own optional package, never in core or the host adapters. Record it in `docs/dependencies.md` with its owner, licence, alternatives and removal boundary, and add an architecture rule for it, as Plan 162 did.

When every acceptance test passes in Vanilla, Vue and Foldkit, set the catalog entry "Collaborative · Pro" to C. Add a `reaudit` record that cites the evidence, and recompute the summary counts from the entries.

## Execution

- Only ADD to `verification.config.json`; never remove or narrow anything.
- Take the browser lock separately for each browser command, never wrap an interactive shell in it, and never leave dev or test servers running.
- Compiler-API code must import `typescript-api`.
- Tests use `it` inside `describe`.
- Write a research trace that ends with a Conformity and deviations section, then run `research:check-traces` and `docs:check`.
- Finish with the locked `bun run verify --check reference-host`.
- Commit on `plan/164-collaborative-rooms` with the trailer `Co-Authored-By: GPT-6.1 Sol via Codex <noreply@openai.com>`. Do not push or merge.

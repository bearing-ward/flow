# Plan 171: validation reports and execution preparation

This plan implements "Unit 3: validation reports and execution preparation" of `plans/168-workflow-delivery.md` in full, using the decisions adopted on 2026-10-26 (see the end of that file). It builds on the `@flow/workflow` contracts from Plan 169 and the palette from Plan 170 (`packages/workflow/README.md`). Core and the host adapters must not depend on it; add an architecture rule for that, as Plans 162, 164 and 165 did. Workflow documents must interoperate with the existing document extensions:

- groups;
- trees;
- shapes;
- routes;
- bundles;
- rotation (Plan 167).

They must also work with history, the clipboard and collaboration.

## Execution

- Only ADD to `verification.config.json`; never remove or narrow anything.
- Take the browser lock separately for each browser command, and stop only the processes you started, using their recorded PIDs. Never kill processes by name or by port.
- Compiler-API code must import `typescript-api`.
- Tests use `it` inside `describe`.
- Write a research trace that ends with a Conformity and deviations section.
- Finish with the locked `bun run verify --check reference-host`.
- Commit on `plan/171-workflow-validation` with the trailer `Co-Authored-By: GPT-6.1 Sol via Codex <noreply@openai.com>`. Do not push or merge.

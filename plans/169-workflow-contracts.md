# Plan 169: workflow document and port contracts

This plan implements "Unit 1: workflow document and port contracts" of `plans/168-workflow-delivery.md` in full, using the decisions adopted on 2026-10-26 (see the end of that file). It creates `packages/workflow` as an optional package. Core and the host adapters must not depend on it; add an architecture rule for that, as Plans 162, 164 and 165 did. Workflow documents must interoperate with the existing document extensions:

- groups;
- trees;
- shapes;
- routes;
- bundles;
- rotation (if Plan 167 has merged).

They must also work with history, the clipboard and collaboration.

## Execution

- Only ADD to `verification.config.json`; never remove or narrow anything.
- Take the browser lock separately for each browser command, and never leave servers running.
- Compiler-API code must import `typescript-api`.
- Tests use `it` inside `describe`.
- Write a research trace that ends with a Conformity and deviations section.
- Finish with the locked `bun run verify --check reference-host`.
- Commit on `plan/169-workflow-contracts` with the trailer `Co-Authored-By: GPT-6.1 Sol via Codex <noreply@openai.com>`. Do not push or merge.

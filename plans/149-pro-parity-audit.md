# Plan 149: Pro parity audit and delivery plans

Starting point: main after the 2026-10-25 scope change. Ten Pro example entries in `research/catalogs/react-flow-parity-audit-2026-10-13.json` moved from stretch to parity scope:

- Node Position Animation
- Shapes
- Edge Routing
- Editable Edge
- Helper Lines
- Collaborative
- Copy and Paste
- Undo and Redo
- Expand and Collapse
- Server Side Image Creation

Their ratings date from 2026-10-13. Six other Pro examples were already rated close:

- Selection Grouping
- Parent Child Relation
- Auto Layout
- Force Layout
- Dynamic Layouting
- Freehand Draw

## Scope and acceptance

This is research only. No product code changes.

1. For each of the 16 Pro examples, read the current public page and the source it describes at reactflow.dev (`/examples/...`). Record the URL and the access date. Pro source code may be behind a subscription; when it is, work from the public description, video and docs, and say so.
2. List the distinct user-visible outcomes for each example: gestures, states, persistence and edge cases.
3. Rate each outcome C, P or G in Vanilla, Vue and Foldkit from current code, recipes and tests. Cite `path:line`.
4. Re-verify the six examples that are already rated close against those outcomes.

Write the ratings back into the audit catalog's entries, with a `reaudit` record dated 2026-10-25 and citations. Then update the summary counts.

Write `plans/149-pro-delivery.md`, which groups the gaps into delivery plans of one page or less each. Order them by dependency. For example, Undo/Redo and Copy/Paste come before Collaborative; Editable Edge comes before Edge Routing, and both come before the wire-ties feature in `research/desired-features.md`. Each plan states:

- the shared core capability;
- the per-host work;
- the acceptance tests;
- any decisions that need the maintainer.

Server Side Image Creation and Collaborative may need an integration choice, such as a renderer or a CRDT library. List the options and recommend one.

## Execution

- Run `bun run docs:check` and the catalog checks, then finish with the locked `bun run verify`.
- Commit on `plan/149-pro-audit` with the trailer `Co-Authored-By: GPT-6.1 Sol via Codex <noreply@openai.com>`. Do not push or merge.

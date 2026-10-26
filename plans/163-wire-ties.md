# Plan 163: wire ties

This plan implements unit "11. Wire ties" of `plans/149-pro-delivery.md` in full: its "Shared core", "Per host" and "Acceptance" bullets. The behaviour is specified in the breakdown in `research/desired-features.md`, taken from the maintainer's recording. This is a desired feature beyond parity, so it has no catalog entry. Mark it done in `research/PROGRESS.md` when all three hosts pass.

Use the D11 policy that the maintainer adopted on 2026-10-25:

- an explicit toolbar tie mode;
- focusable, selectable tie markers that the Delete key removes;
- each edge belongs to at most one bundle, and a bundle can have many ties;
- an explicit action to remove an edge from its bundle;
- bundles are saved in the versioned document, which bumps the persistence version from v4;
- deleting edges prunes bundles that become empty;
- reconnecting an edge keeps its bundle membership and tie points;
- lanes are 4 graph units apart;
- a bundle has at least 2 edges.

Build on the following:

- the route schema and point schemas from Plan 156 (`docs/editable-edges.md`);
- the `FlowRouter` capability from Plan 162 (`docs/edge-routing.md` or its trace). Obstacle constraints apply when a router is configured;
- history (Plan 150), so each tie, drag or removal is one undo step;
- the clipboard (Plan 153), which must remap edge IDs inside bundles.

Acceptance also covers the behaviour in the recording:

- the live slash guide line, with its "Tie N wires" count;
- "Add a second tie" when slashing an existing ribbon;
- the perpendicular marker;
- live rerouting while a tie is dragged;
- stability under pan and zoom;
- mixed colours, and lane order following the order in which the slash crossed the edges.

## Execution

- Only ADD to `verification.config.json`; never remove or narrow anything.
- Take the browser lock separately for each browser command, never wrap an interactive shell in it, and never leave dev servers running.
- Compiler-API code must import `typescript-api`.
- Tests use `it` inside `describe`.
- Write a research trace that ends with a Conformity and deviations section, then run `research:check-traces` and `docs:check`.
- Finish with the locked `bun run verify --check reference-host`.
- Commit on `plan/163-wire-ties` with the trailer `Co-Authored-By: GPT-6.1 Sol via Codex <noreply@openai.com>`. Do not push or merge.

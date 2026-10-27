# Plan 167: rotatable node

Catalog entry "Rotatable Node" (https://reactflow.dev/examples/nodes/rotatable-node) entered parity scope on 2026-10-26. It is currently G in every host.

## Scope and acceptance

1. Read the public example page and its source. Record the URL and access date. List the outcomes:
   - a rotation handle on the node;
   - dragging the handle rotates the node;
   - rotation is stored on the node;
   - handles and edges follow the rotated geometry, or don't, depending on what the example actually shows.
2. **Shared core:** a decoded rotation field and a pure rotation-gesture reducer. Define how rotation interacts with:
   - bounds;
   - culling;
   - fitView;
   - helper lines (Plan 155);
   - grouping (Plan 154);
   - shapes (Plan 158);
   - image export (Plan 165). Saved documents, the clipboard and collaboration must preserve rotation. Bump the persistence version if the document schema changes.
3. **Per host:** a recipe in Vanilla, Vue and Foldkit, with a rotation handle that uses the existing capture, cancel and auto-pan rules. Each completed rotation is one undo step.
4. **Acceptance:**
   - the drag-to-rotate angle is correct;
   - connected edges are drawn correctly;
   - pan and zoom work;
   - undo works;
   - save and load, and copy and paste, keep rotation;
   - cancel and dispose work. These must pass in every host.

When the acceptance tests pass in all hosts, set "Rotatable Node" to C. Add a `reaudit` record that cites the evidence, and recompute the summary counts.

## Execution

- Only ADD to `verification.config.json`; never remove or narrow anything.
- Take the browser lock separately for each browser command, and never leave servers running.
- Compiler-API code must import `typescript-api`.
- Tests use `it` inside `describe`.
- Write a research trace that ends with a Conformity and deviations section.
- Finish with the locked `bun run verify --check reference-host`.
- Commit on `plan/167-rotatable-node` with the trailer `Co-Authored-By: GPT-6.1 Sol via Codex <noreply@openai.com>`. Do not push or merge.

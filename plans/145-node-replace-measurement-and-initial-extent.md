# Plan 145: node replace measurement and initial nodeExtent

Starting point: `e780ee8`. Pinned xyflow revision `0a1f9575b25679f2880175de8d3eae21aedde921`. User decision dated 2026-10-24: match upstream. Imported artifacts remain immutable.

## UP-128-044: replace item carries new measurement (all hosts)

Upstream `examples/react/cypress/components/reactflow/on-nodes-change.cy.tsx:36` expects the `replace` change's `item.measured` to be `{ width: 200, height: 100 }` after the style update, followed by a `dimensions` change. Every Flow host reports the retained old measurement `100x40`.

First trace the pinned production path that builds that replace item (start at `packages/react/src/hooks/useNodesState.ts` / store `setNodes` / `adoptUserNodes` in `packages/system/src/utils/store.ts`, and the component fixture's update button). Decide from source, with exact citations, whether upstream's emitted item really carries the new measurement, or whether the assertion depends on the test's own fixture (for example its style→measured mapping or React render timing).

- If upstream source produces it, fix Flow once in core where possible so all three hosts emit it. Leave the upstream assertion unchanged and remove its `test.fail()`.
- If the expectation depends on fixture or React timing, not on product behavior, record the case as `intentional-difference` or `not-applicable` with the cited reason. Do not change product code to satisfy an artifact of the test setup.

## UP-128-072: initial nodeExtent clamping (match upstream in all hosts)

Upstream `view-props.cy.tsx:193` expects a 150x44 node at `(200,200)` with `nodeExtent [[0,0],[50,50]]` to render at `(50,50)`. Vue and Foldkit don't clamp at all. Vanilla clamps but centers the oversized node, giving `(-50,6)`, which is documented in `research/traces/node-extents.md` as an intentional difference.

The user chose to match upstream. Trace pinned `adoptUserNodes`, `clampPosition` and the measurement reclamp (`packages/system/src/utils/store.ts`, `packages/system/src/utils/general.ts`), and define exactly what upstream does at each stage:

- before measurement;
- after measurement;
- for an oversized node;
- during drag.

Implement that one rule in core (`packages/core/src/domain/flow-node-extent.schema.ts`) and apply it at initial adoption, document update and measurement in all three hosts. This replaces the oversized-centering policy, including group drag, unless the pinned source keeps it.

Update the affected Flow tests with pinned citations, and do not weaken the upstream assertions. Rewrite the `Conformity and deviations` section of `research/traces/node-extents.md`, and update `docs/public-api.md` if it describes centering.

## Execution

- Add entries to `verification.config.json`; never remove any.
- Run every upstream runner (Playwright, Cypress, component) and the affected extent, drag, node-change and follow-up suites in Vanilla, Vue and Foldkit under `scripts/with-flow-browser-lock.sh` with one worker.
- Remap any trace citations that shift, then run `bun run research:check-traces`, the ledger check and `bun run docs:check`.
- Update the ledger statuses and reasons, and report before/after counts per phase and host.
- Finish with the locked `bun run verify`, and report its profile and scope.
- Commit on `plan/145-node-replace-extent` with the trailer `Co-Authored-By: GPT-6.1 Sol via Codex <noreply@openai.com>`. Do not push or merge.

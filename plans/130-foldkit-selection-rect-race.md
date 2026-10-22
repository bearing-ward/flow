# Plan 130: Foldkit selection rectangle race

## Problem and root cause

UP-126-022 intermittently misses `.flow-foldkit-selection-rect` in the controlled `/upstream/nodes/general` fixture. The untouched `66a94e2` baseline passes 19/20 repetitions, with one missing-element timeout at `apps/shared-e2e/upstream/nodes.ts:45`. Two diagnostic runs each pass 48/50.

The planner's Shift/controlled-acknowledgement hypothesis is refuted for the captured failures. Both detailed traces show native Shift, queued `SetCanvasKey`, and accepted `selectionKeyPressed: true`, then a press at client `(-150, -25)` on `<html>`. The test had measured Node-1 at its initial `(0, 0)` position. By keydown, the fitted node was at `(550.5590209960938, 72)`. No `GestureDown` reaches the runtime and no replacement clears selection.

At baseline, `apps/foldkit/src/upstream-fixture.ts:139` announced readiness after one animation frame following `fitView()`. The public response reports terminal model state at `packages/foldkit/src/application.ts:1093`; Foldkit can defer the DOM patch while draining messages. The fixture incorrectly treated that frame as proof of rendered geometry. The complete production/test trace is [foldkit-selection-rect-race.md](../research/traces/foldkit-selection-rect-race.md).

## Fix

Fix the fixture's use of the public API. Observe the rendered viewport until its browser-normalized transform matches the fit result at `apps/foldkit/src/upstream-fixture.ts:146`, then publish readiness and disconnect. Also disconnect on pagehide. Observe the root because Runtime.embed replaces its input container. Preserve product input ordering, controlled ownership, upstream inputs/assertions, ledger outcomes, and retry policy.

The focused regression deliberately holds the fitted CSS update while animation frames proceed. Baseline incorrectly announces readiness; the repair waits for the real update, then native Shift immediately before pointerdown selects the expected nodes and renders active and persistent bounds. This controlled DOM-delay proof is separate from ordinary upstream repetitions. Vanilla applies viewport CSS synchronously at `apps/vanilla/src/mount-flow.ts:1683`; Vue fits after its measurement flush at `packages/vue/src/flow-canvas.ts:5431`. Neither uses this Foldkit fixture marker.

## Results

The new regression fails on baseline and passes 5/5 after repair. The unchanged UP-126-022 passes 50/50 in each of Foldkit, Vanilla, and Vue. Locked `bun run verify` passes all 18 focused gates, including 97 unit files / 2,514 tests and browser results of Vanilla 690 passed / 2 existing skips, Vue 805 passed, and Foldkit 461 passed. The saved scope contains 45 Vanilla, 37 Vue, and 53 Foldkit files. No verifier reruns were needed. Configuration adds only the regression file and appends activeWork; previous scope remains intact. Research citations are remapped and checked.

## Conformity and deviations

Conforming at the unchanged upstream and focused regression boundaries: the active rectangle, expected selected nodes, and persistent bounds. Intentionally different internally: Foldkit retains typed queued input and batched rendering; the fixture explicitly observes rendered readiness. Full-profile acceptance, other engines, live React comparison, and collector-side OTLP delivery remain unverified.

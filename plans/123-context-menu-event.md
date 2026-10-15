# Plan 123: context-menu browser events

## Problem and root cause

Schema Studio opened its menu without suppressing the browser menu. Vanilla's shared canvas callback payload retained the pointer position and element IDs but discarded the DOM event, so applications could not call `preventDefault()` synchronously. Vue's pane event had the same omission. Selection and wheel callbacks already had host-owned cancellation or native-event precedents.

## Reference and production paths

The pinned React pane handler checks an explicit `panOnDrag` array for button `2`, prevents the native menu, and returns without calling `onPaneContextMenu`: `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/container/Pane/index.tsx:123-130`. Boolean `true` does not take that branch. Imported evidence is unchanged.

Vanilla starts at the canvas `contextmenu` browser listener in `apps/vanilla/src/mount-flow.ts:12383`. Target classification at `apps/vanilla/src/mount-flow.ts:713` distinguishes pane, node and edge. The handler at `apps/vanilla/src/mount-flow.ts:12021` implements the explicit-right-button pane rule before shared dispatch. `dispatchCanvasEvent` at `apps/vanilla/src/mount-flow.ts:11984` preserves the original event, computes canvas-relative position from the current DOM bounds, adds element IDs, and invokes the existing callback boundary at `apps/vanilla/src/mount-flow.ts:12013`. These callbacks do not mutate the graph. Selection retains accepted selected IDs and its existing cancellation at `apps/vanilla/src/mount-flow.ts:12040` and now includes the event at line 12059. `FlowCanvasEventPayload` and the narrower wheel payload are declared at `apps/vanilla/src/mount-flow.ts:695-703`.

Schema Studio's pane and node callbacks cancel the event before converting the canvas-relative point through `screenToFlowPosition` in `apps/vanilla/schema-studio/main.ts:1052-1069`. `showMenu` at `apps/vanilla/schema-studio/main.ts:589` converts back to screen coordinates, constrains the menu to the window, and renders the same menu actions. No edge context-menu callback opens a menu. Its existing edge click behavior is unchanged.

Vue's rendered canvas handler at `packages/vue/src/flow-canvas.ts:10645` applies the right-button rule, then emits the original event after the unchanged position. `clientToFlow` at `packages/vue/src/flow-canvas.ts:2994` owns the flow-coordinate conversion. Node and edge handlers already retain the event at `packages/vue/src/flow-canvas.ts:8986` and `packages/vue/src/flow-canvas.ts:9169`. Vue previously accepted only boolean `panOnDrag`; the prop and pointer admission now support explicit button arrays so `[2]` has consistent meaning for both panning and context-menu cancellation.

Foldkit already solves native-menu suppression. The document listener in `packages/foldkit/src/mouse-observation.ts:302` routes to `contextMenu` at line 191. It first scopes to its own canvas, calls `event.preventDefault()` at line 198, and then emits serializable node, edge or pane records at lines 203-216. `packages/foldkit/src/graph.ts:6769` installs that observer; `observeMouse` at line 6415 queues the schema-backed message. `packages/foldkit/src/application.ts:2676-2694` publishes interaction records and the legacy selection event. Subscribers cannot cancel a native event later, but they need no new option because the observer already cancels it synchronously. No Foldkit implementation change is needed.

Existing boundary callback error handling and telemetry remain in use. Native cancellation changes browser default behavior; it creates no graph semantic change or new Effect workflow. No collector-delivery claim is made.

## Fix and public contracts

- Vanilla exposes the original `event: MouseEvent` to every callback routed through shared canvas dispatch, plus selection context-menu callbacks. `FlowPaneScrollPayload.event` remains `WheelEvent`.
- Schema Studio cancels pane and table context menus in its own callbacks without changing S14 actions or coordinates.
- Vue adds a second `MouseEvent` argument to `paneContextMenu`, preserving its first argument, and supports the explicit-right-button rule.
- Foldkit retains its existing synchronous blanket cancellation and serializable messages.
- `docs/public-api.md` documents each host's callback and cancellation ownership.
- `verification.config.json` selects Plan 123 and the touched host browser scope.

## Test paths and evidence

Production Schema Studio uses its actual app entry point. Its S14 test adds a bubbling window listener to record `defaultPrevented` after the canvas callback, right-clicks the pane and a rendered table, and verifies both cancellations while retaining the add-at-pointer assertions.

The Vanilla browser test mounts `apps/vanilla/src/context-menu-event-fixture.ts` through the real public host implementation. Real Playwright mouse input covers pane, node and edge native events, synchronous callback cancellation observed at window, default-menu behavior with boolean and non-right-button configurations, explicit `[2]` and `[0, 2]` suppression without a pane callback, unaffected node delivery, and the selection event.

The Vue browser test mounts `apps/vue/src/context-menu-event-fixture.ts` through `@flow/vue`. It covers the unchanged position plus native-event argument, cancellation observed at window, the button configurations, and right-versus-left panning admission with `[2]`. Existing Vue event and activation suites guard surrounding behavior.

The Foldkit events suite retains its real app-message and rendered-menu path and now verifies window-observed cancellation for node, edge and pane right clicks.

All browser commands use the supplied `/tmp/flow-browser.lock` ownership and EXIT-trap wrapper, with `OTEL_SDK_DISABLED=true` and one worker. Commands inside that wrapper:

```sh
bun run playwright test --workers=1 apps/vanilla/e2e/context-menu-event.e2e.ts apps/vanilla/e2e/schema-studio.e2e.ts
bun run playwright test -c apps/vue/playwright.config.ts --workers=1 apps/vue/e2e/context-menu-event.e2e.ts apps/vue/e2e/events-and-changes.e2e.ts apps/vue/e2e/activation-callbacks.e2e.ts
bun run playwright test -c apps/foldkit/playwright.config.ts --workers=1 apps/foldkit/e2e/events-and-changes.e2e.ts
bun run verify
```

The complete corrected Vanilla run passed **35 tests**, including all 7 new host tests and all 28 Schema Studio tests. Output: `35 passed (1.1m)`, exit 0, `/tmp/plan123-vanilla-browser-pass.log`.

`bun run typecheck` passed after correcting the new fixture's required mount options. Existing callers, including `apps/vanilla/src/main.ts`, required no hand-built payload updates in this checkout. `bun run check` passed, including formatting and linting.

### Failures during implementation

- Initial formatter attempt exited 1 because dependencies were not installed: `Cannot find package 'oxfmt' imported from .../oxfmt.config.ts`. `bun install --frozen-lockfile` installed the pinned dependencies; subsequent formatting passed without a lockfile diff.
- Initial typecheck exited 2: `error TS2345 ... is missing ... viewport, documentMode`. The new Vanilla fixture now supplies both required mount options. The matching first browser run reported `SchemaError: Missing key at ["documentMode"]` in all 7 new tests.
- That first browser run ended `9 failed`, `26 passed (1.6m)`, exit 1. In addition to the 7 fixture failures, S13 reported `Execution context was destroyed, most likely because of a navigation` while concurrent local builds/edits triggered Vite reload, and S14 timed out because the minimap intercepted the added table's heading. Builds are now serialized with the browser runs, and S14 focuses its added table before the right-click. Both pass in the complete corrected Vanilla run.
- Two diagnostic Vanilla attempts were stopped with exit 130 after identifying the new edge test's locator issue. First it used Vue's `flow-edge-hit-target` test ID instead of Vanilla's `flow-edge-hit`; then locator click could not act on the zero-height horizontal SVG path. The test now uses the path's real bounding-box midpoint with `page.mouse.click`, as the existing host tests do. All 7 tests pass in the complete corrected run.
- Initial quality checks exited 1 for callback-factory naming, a conditional empty-object spread, statement spacing, and `unicorn(prefer-ternary)` in the new tests. Those issues were fixed; the final standalone quality check passed.
- Initial Vue run ended `8 failed`, `14 passed (13.1s)`, exit 1. All new tests failed with `FlowCanvas requires document/defaultDocument or nodes and edges`; the fixture used unsupported `defaultNodes/defaultEdges` attributes. It now supplies supported `nodes/edges`. Existing event and activation tests already passed in that run.

- The corrected Vue fixture exposed a test-coordinate mistake: locator-relative clicks include the canvas's 1px border, producing `{ x: 801, y: 401 }` against `{ x: 800, y: 400 }`. That run ended `4 failed`, `18 passed (11.6s)`, exit 1. The helper now clicks the requested client coordinates relative to the actual bounding rectangle. Production geometry is unchanged.

Final touched-file browser results:

| Host | Files | Passed | Output | Log |
| --- | --- | --: | --- | --- |
| Vanilla | `context-menu-event.e2e.ts`, `schema-studio.e2e.ts` | 35 | `35 passed (1.1m)` | `/tmp/plan123-vanilla-browser-pass.log` |
| Vue | `context-menu-event.e2e.ts`, `events-and-changes.e2e.ts`, `activation-callbacks.e2e.ts` | 22 | `22 passed (9.4s)` | `/tmp/plan123-vue-browser-final.log` |
| Foldkit | `events-and-changes.e2e.ts` | 9 | `9 passed (8.4s)` | `/tmp/plan123-foldkit-browser.log` |

All three commands exited 0, with **66 browser tests passed**. Vue's 8 new tests include both right- and left-button panning admission. Foldkit's 9 tests include native cancellation observed at window for all three context-menu targets. The Foldkit run emitted its existing slow-update diagnostic; it did not fail a test or establish a performance result.

`OTEL_SDK_DISABLED=true bun run verify` completed under the same browser lock, **exit 0**, using the **focused** profile and Plan 123 scope. All **14 selected checks passed**: quality, architecture, package builds, whole-workspace typechecking, unit tests, API inventory, catalog, packed consumer, docs, examples, Vanilla app build, and the three host browser checks for the six files above.

The verifier reran **95 unit files / 2,506 tests** and **66 browser tests**: Vanilla 35, Vue 22, Foldkit 9. Its final output was:

```text
Test Files  95 passed (95)
     Tests  2506 passed (2506)
35 passed (1.1m)
22 passed (9.8s)
9 passed (8.4s)
Verification passed {
  profile: "focused",
  fullSuite: false,
  elapsedMs: 118581,
}
```

Full verifier output is in `/tmp/plan123-verify.log`. No verifier gate failed. Packed-consumer invalid-document probes deliberately logged `Typed Flow boundary failed` while checking rejected inputs; the packed-consumer gate passed. Earlier failed diagnostic commands and their corrections are listed above. This is focused acceptance only; `bun run verify:full` was not run.

The final source diff in `apps/vanilla/src/mount-flow.ts` touches only the two event payload interfaces and shared canvas/context-menu dispatch. It does not touch Plan 122's internal-node or drag-preview code. No source file under `research/artifacts/` changed.

## Conformity and deviations

- Conforming by source comparison and bounded browser assertions: Vanilla and Vue skip the pane callback and suppress the native menu only for an explicit `panOnDrag` array containing `2`. Applications can cancel their received native event in ordinary context-menu callbacks.
- Intentionally different: Vanilla callbacks wrap the native event with canvas-relative coordinates and IDs. Vue retains its flow-coordinate first argument. These host contracts preserve existing callers rather than copy React's callback shape. The tests check each host's own position contract.
- Intentionally different: Vanilla selection keeps its pre-existing automatic cancellation and selected-ID reporting. Foldkit cancels every scoped context menu before serializing messages, regardless of subscribers; its message design cannot defer synchronous browser cancellation to an application update.
- Unverified: exact React callback scheduling, React synthetic-event identity, native menu UI appearance outside Chromium's `defaultPrevented` contract, other browser engines, and full-suite or broad React Flow parity. The tests run Flow's actual hosts, not a live React reference application.

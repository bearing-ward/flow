# Behavior fixtures

`reference-captures.json` stores three browser-observed behaviors from xyflow commit `0a1f9575b25679f2880175de8d3eae21aedde921`. The immutable imported tree omits the `tooling/` workspace and built package outputs, so it cannot start by itself. The captures were run from a disposable full checkout at the exact pinned commit; its install and build did not change `research/artifacts/`.

Reproduce the first two captures from that full checkout with:

```sh
pnpm install --frozen-lockfile
pnpm build
cd tests/playwright
FRAMEWORK=react pnpm exec playwright test -c playwright.react.config.ts --project=chromium -g 'draggable=false prevents dragging|custom drag handle works'
```

The commands run the named pinned tests. A temporary Playwright probe read the same nodes' inline transforms before and after each action. The JSON retains those observed values and reduces them to `transformChanged` booleans; `packages/conformance/src/index.test.ts` checks the pinned commit and normalized results. Flow's custom-handle E2E independently asserts the same outside/inside booleans in `apps/vanilla/e2e/graph-renderers.e2e.ts`. This is a normalized comparison of those two outcomes, not a claim about matching coordinates, timing, or the rest of either adapter.

The `xyflow-left-resize-direct-child` capture used a temporary React example route with a fixed 960×640 browser viewport and graph viewport `{ x: 0, y: 0, zoom: 1 }`. It rendered a 90×60 parent at document position `(80, 100)` with a 20×20 direct child at local position `(15, 15)`. Chromium dragged the parent's left resize control from screen point `(80, 170)` to `(100, 170)` twice. Both observed runs ended with parent position `(100, 100)`, size `70×60`, child world position `(95, 115)`, and derived child local position `(-5, 15)`. Raw rendered bounds retain the example shell's 40 px vertical layout offset; normalized document coordinates use inline transform translations and omit that offset. The temporary probe route was not added to the imported upstream tree.

Re-run this capture from the disposable full checkout by adding the temporary route and running:

```sh
FRAMEWORK=react pnpm exec playwright test -c playwright.react.config.ts --project=chromium e2e/resize-probe.spec.ts
```

The route must render the stated nodes with React Flow's `NodeResizer`, use the stated fixed viewport, and read both node transforms and rendered bounds before and after the exact pointer action. `packages/conformance/src/index.test.ts` checks that the two normalized recorded captures match and asserts the parent bounds and child world/local positions. Flow's `controlled left resize restores parent and child positions until the atomic bounds change is acknowledged` E2E uses the same graph geometry and pointer delta, then checks the acknowledged result.

## Shared Flow fixtures

The shared suite remains six scenarios. The same fixture definitions run through the vanilla, Vue, and Foldkit drivers (`apps/vanilla/e2e/shared-conformance.e2e.ts`, `apps/vue/e2e/shared-conformance.e2e.ts`, and `apps/foldkit/e2e/shared-conformance.e2e.ts`). These rows mean that the scenario is covered within Flow; they do not establish xyflow parity because no equivalent reference run was made.

| Scenario | Observable contract | Reference comparison |
| --- | --- | --- |
| `keyed-update` | Retained node identity, order, label, and position after controlled update | Unverified |
| `nested-absolute-position` | Child renders at parent plus local position | Unverified |
| `controlled-acknowledgement` | Drag emits a candidate and waits for document acknowledgement | Unverified |
| `connection-validity` | Rejected target adds no edge; approved target emits one `edge-add` | Unverified |
| `gesture-cancellation` | Escape restores drag geometry without a semantic change | Unverified |
| `viewport-culling` | Viewport change culls one node and reveals the other | Unverified |

The unit tests keep the fixture ids unique and versioned, reject invalid duplicate-node documents, and validate the two pinned captures. Do not extend this shared set with an interaction that only one adapter currently tests.

## Capability and evidence matrix

Labels describe checked-in automated evidence, not a statement that an unlisted adapter cannot implement a behavior. `Unverified` means this repository has no equivalent test for that adapter or no supported test environment for the behavior.

| Capability | Vanilla evidence | Vue evidence | Foldkit evidence | Reference status |
| --- | --- | --- | --- | --- |
| Six shared Flow scenarios above | Shared conformance browser test | Shared conformance browser test | Shared conformance browser test | Unverified for these six exact fixtures |
| Eight-direction pointer resize, child compensation, cancellation, and derived UI | Vanilla-only: `advanced-gestures.e2e.ts:361-579` | Unverified | Unverified | Unverified overall; conforms for the captured left-edge +20 px case with a direct child, based on parent bounds and child world/local positions |
| Keyboard resize, key ownership, native descendant editing, focus, and Escape | Vanilla-only: `advanced-gestures.e2e.ts:590-775`, `graph-renderers.e2e.ts:246-412` | Unverified | Unverified | Unverified |
| Custom drag handle and nested no-drag control | Vanilla-only: `graph-renderers.e2e.ts:143-267` | Unverified | Unverified | Conforms only for normalized outside/inside transform-change booleans in the pinned capture and Flow E2E; nested no-drag remains Flow-only |
| Six canvas-relative panel positions, caller element restoration, and host-local portals | Vanilla-only: `canvas-ui.e2e.ts:166-434` | Unverified | Unverified | Unverified; no placement or ownership output capture |
| Vue-scoped injection and keyed custom components | Unverified | Vue-only evidence: `apps/vue/e2e/shared-conformance.e2e.ts:32-39` | Unverified | Unverified |
| Foldkit disposal and controlled connection acknowledgement | Unverified | Unverified | Foldkit-only evidence: `apps/foldkit/e2e/shared-conformance.e2e.ts:26-90` | Unverified |
| Native concurrent pointer capture and two-contact pinch cancellation | Unverified: two native-only cases remain `test.fixme` in `advanced-gestures.e2e.ts:356-359` | Unverified | Unverified | Unverified; the cited xyflow touch cancellation is not an equivalent pinch lifecycle test |
| Screen-reader review, Safari/Firefox, mobile touch device, property coverage, and large-graph budgets | Unverified | Unverified | Unverified | Outside this evidence set |

The `draggable: false` capture also remains unverified for direct parity: Flow's mixed-group test shows a locked selected node stays still while other members move (`apps/vanilla/e2e/movement-slices.e2e.ts:138-165`), whereas the reference capture exercises a standalone node. Inputs and surrounding group behavior differ.

## Evidence limits

The six shared fixtures establish only the listed Flow contracts across three adapters. Feature-specific vanilla tests do not imply Vue or Foldkit support. The custom drag-handle comparison is deliberately narrow: both runs reduce the node transform to unchanged outside the handle and changed inside it. The resize comparison is limited to one left-edge drag at zoom 1 with a 90×60 parent and a 20×20 direct child; other directions, nested extent behavior, cancellation, panel positions, portals, native multi-pointer cancellation, broader accessibility, cross-browser behavior, property coverage, and performance budgets remain unverified against xyflow or outside the tested scope.

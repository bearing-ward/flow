# Behavior fixtures

`reference-captures.json` stores two browser-observed behaviors from xyflow commit `0a1f9575b25679f2880175de8d3eae21aedde921`. The immutable imported tree omits the `tooling/` workspace and built package outputs, so it cannot start by itself. The captures were run from a disposable full checkout at the exact pinned commit; its install and build did not change `research/artifacts/`.

Reproduce both captures from that full checkout with:

```sh
pnpm install --frozen-lockfile
pnpm build
cd tests/playwright
FRAMEWORK=react pnpm exec playwright test -c playwright.react.config.ts --project=chromium -g 'draggable=false prevents dragging|custom drag handle works'
```

The commands run the named pinned tests and assert the normalized outcomes. The inline style values in the JSON were additionally read from the same nodes before and after the actions in a temporary Playwright probe. The normalization retains each observed inline transform and records whether it changed. The stored fixture test reloads the JSON and checks its shape and boolean comparisons.

Flow now supports declared `draggable: false` (defaulting to draggable in the host). Its mixed-group browser test verifies that a locked selected node stays selectable while movable selected members retain their spacing (`apps/vanilla/e2e/movement-slices.e2e.ts:113`). The xyflow capture and Flow test were not run through one equivalent shared fixture, so direct parity remains unverified. Flow still does not implement a custom drag handle; the corresponding capture is reference-only and Flow intentionally differs.

## Coverage mapping

| Researched behavior | Shared Flow scenario/test | Classification | Evidence boundary |
| --- | --- | --- | --- |
| Keyed update retains the existing node element | `keyed-update`, `shared-conformance.e2e.ts` | Conforms within Flow | Same Flow node receives an identity marker before reorder/update; browser asserts marker, order, text, and transform. No cross-framework comparison. |
| Nested child uses parent plus local position | `nested-absolute-position`, `shared-conformance.e2e.ts` | Conforms within Flow | Browser reads rendered transforms. Reference output was not captured for this scenario. |
| Controlled movement waits for authoritative acknowledgement | `controlled-acknowledgement`, `shared-conformance.e2e.ts` | Conforms within Flow | Browser asserts candidate event and final acknowledged position. Reference output was not captured. |
| Validator rejects one connection and accepts another | `connection-validity`, `shared-conformance.e2e.ts` | Conforms within Flow | Browser observes one `edge-add` and the accepted edge. Reference output was not captured. |
| Escape cancels a node drag | `gesture-cancellation`, `shared-conformance.e2e.ts` | Conforms within Flow | Browser asserts restored geometry and no semantic change. Reference parity unverified. |
| Viewport culling follows viewport update | `viewport-culling`, `shared-conformance.e2e.ts` | Conforms within Flow | Browser asserts visible rendered ids and flow coordinates. Reference parity unverified. |
| Non-draggable selected node remains stationary in a mixed group | `movement-slices.e2e.ts:113` | Flow behavior is covered; direct parity unverified | Plan 015 browser test proves the locked node remains stationary/selectable while other selected nodes move. The reference capture uses a separate test and was not exercised through an equivalent shared fixture. |
| Custom drag handle gates dragging | `reference-captures.json`, xyflow pinned `nodes.spec.ts` test | Reference-only; Flow intentionally differs | Reference test passes; Flow does not currently expose a custom drag-handle contract. |

This runner is currently implemented only by the vanilla browser driver. Foldkit and Vue adapter runs remain unverified. Touch-specific behavior, accessibility, visual comparison, property coverage, lifecycle stress, and large-graph performance budgets are outside this suite.

# Native canvas border coordinate caller audit

Read-only inspection,2026-09-30, of `/Users/richardmcandrews/.codex/worktrees/origin-connection-hosts/flow`. All candidate citations below refer to that checkout, not main. No source edits, tests, builds, browser/port operations or acceptance claims. The reported Vue execution failures are primary-provided context; this audit independently inspected their coordinate seam, not their runtime logs. Border policy still requires independent cold review before source changes.

## Actual render and conversion mismatch

Vue reusable CSS has canvas border1 at `packages/vue/src/style.css:27-40`, absolute viewport inset0 at `:178-184`, absolute SVG edges inset0 at `:346-353`. The host renders viewport translation/scale on those sibling node and edge layers at `packages/vue/src/flow-canvas.ts:6053-6081`. Their local origin is the canvas inner border/padding-box origin, but public conversion subtracts only outer border-box rect at `:2053-2071`.

Personally inspected source excerpt:

```ts
// packages/vue/src/flow-canvas.ts:2053-2071
const bounds = canvas.value?.getBoundingClientRect()
// screenToFlowPosition:
x: (position.x - (bounds?.left ?? 0) - viewport.x) / viewport.zoom,
y: (position.y - (bounds?.top ?? 0) - viewport.y) / viewport.zoom,
// flowToScreenPosition:
x: (bounds?.left ?? 0) + position.x * viewport.zoom + viewport.x,
y: (bounds?.top ?? 0) + position.y * viewport.zoom + viewport.y,
```

Foldkit stock canvas border1 is in **app** `apps/foldkit/src/playground.css:16-26`; reusable `packages/foldkit/src/style.css:104-109` positions the viewport absolute/inset0. Graph view places translated/scaled viewport at `packages/foldkit/src/graph.ts:3842-3847`. Native `flowPoint` subtracts only outer rect at `:1240-1253`; beginPointer separately repeats it at `:2469-2472`, direct-hit graph→client repeats it at `:2772-2781`, move/release subscriptions repeat it at `:4333-4343,4380-4390,4406-4417,4434-4458`.

Vanilla stock canvas has no border declaration at `apps/vanilla/src/style.css:26-40`, so this mismatch is latent for caller CSS borders. Its absolute viewport is inset0 at `:200-204`. Pointer helpers at `mount-flow.ts:2702-2715`, graph radius pointer conversion at `:2933-2940`, and public forward/reverse conversion at `:9271-9284` likewise use only outer rect. A zero-border default does not establish correctness for a native canvas styled by its caller.

Native endpoint measurement is not the missing seam. Vanilla `edge-renderer.ts:35-69`, Vue `flow-canvas.ts:1301-1331`, and Foldkit `measurement-observer.ts:108-109` subtract the **node** DOM rect from the handle DOM center, then divide by zoom; canvas border translation cancels. Accepted graph/handle offsets and core screen/graph formulas need no new meaning or fields. Threshold uses raw client displacement, so constant canvas border offsets cancel there too; do not adjust threshold values.

## Minimum coherent native correction seam for review

Use one per-host local operation that reads its owning live canvas and returns a temporary frame:

```ts
const rect = canvas.getBoundingClientRect()
const left = rect.left + canvas.clientLeft
const top = rect.top + canvas.clientTop
const width = canvas.clientWidth
const height = canvas.clientHeight
// client -> container-local: clientX-left, clientY-top
// container-local -> graph: (localX-viewport.x)/viewport.zoom
// graph -> client: left+viewport.x+graphX*viewport.zoom
```

Read the frame at the native event/public call, not mount time; preserve scrolling and border changes without a cache. Width/height are the same inner client extent used by absolute viewport layout, not outer rect.width/height. No new public API fields, persisted fields, Schema changes, core coordinate policy, graph authority or CSS border removal is necessary. This bounded audit does not promise support for an arbitrarily CSS-transformed canvas/ancestor or independent scrollable viewport behavior; those are separate requirements.

Every paired client/container/graph conversion must consume this same live frame. Changing only pointerInFlow or only the public methods would leave preview refresh/direct hit/zoom anchors inconsistent. Concrete callers:

| Host | Candidate native callers requiring coherent frame use |
| --- | --- |
| Vanilla | Pointer helpers `mount-flow.ts:2702-2715`; nearest radius point `:2933-2940`; hover/preview pointer and graph→client refresh `:3228-3256`; auto-pan graph/client refresh `:3819`; raw pane event payload `:8108-8117`, selection context-menu `:8152-8163`; wheel/double-click anchors `:8398-8410` and the onCanvasWheel branch; public methods `:9271-9284`. Pointer-local edge checks/auto-pan already use clientWidth/clientHeight at `:3957-3970`; preserve that extent while correcting their pointer origin. |
| Vue | clientToFlow `flow-canvas.ts:1888-1901`; autoPanConnection `:1989-1998` currently uses outer width/height too; public forward/reverse `:2053-2071`; initial connection pointer `:3134-3156`; target radius inverse `:3432-3441`; replacement-hover forward `:3502-3520`; preview target forward `:3641-3668`; pointerInFlow `:3891-3903`; reconnect initial pointer `:3834-3850`; pane/selection start `:4476-4490`; wheel anchor `:4567-4577`; click-pointer move `:5805-5817`; double-click anchor `:6006-6015`. Public useFlow forwards these closures unchanged at `use-flow.ts:462-463`. Existing ResizeObserver reads canvas contentRect at `flow-canvas.ts:1379-1382`; the native pane extents used for fit/zoom/culling should be the live client extent, while preserving existing observer scheduling and avoiding a new geometry cache. |
| Foldkit | flowPoint/zoom anchor `graph.ts:1240-1273`; beginPointer inverse `:2469-2472`; native target direct-hit forward `:2772-2781`; release/move/connection/autopan mappings `:4306,4333-4458`. App's existing viewport client's DOM metrics callback `apps/foldkit/src/main.ts:295-309` currently emits outer rect.width/height/left/top; feed its unchanged numeric width/height/originX/originY fields the owning canvas inner frame. `application.ts:437-473` accepts caller-supplied metrics and does not read browser DOM: preserve its numeric protocol and synthetic supplied-geometry semantics. |

Do not add clientLeft/clientTop to measured node-local offsets, viewport.x/y, graph endpoints, serialized preview pointer or stored anchors. Pointer is inner container-local screen space; from/to are graph space. Graph→client adds the inner origin exactly once. Reconnection, radius, direct-hit elementFromPoint, refresh after viewport change and renderer path assertions must use that same distinction. Existing canvas0 defaults and synthetic core fixtures remain numerically unchanged.

## Exact proof caller scope findings

Two additional test/harness files are outside081's current native/proof allowlist and merit explicit bounded amendment:

1. **`apps/vue/e2e/viewport-harness.ts:127-139`** returns the canvas outer `getBoundingClientRect` left/top as read().rect. `viewport-operations.e2e.ts:96-120` constructs client points from that origin and expects exact pinned fixture flow/screen results. Minimal migration: keep its existing rect fields/type, return the live **inner origin**, and retain all existing exact assertions in viewport-operations unchanged. This is a test-private coordinate origin, not a new API field or tolerance. If reviewer instead requires read().rect to continue meaning outer border box, `apps/vue/e2e/viewport-operations.e2e.ts:96-120` needs a separately allowed explicit inner-origin adjustment; do not do both and subtract border twice. Its scroll roundtrip at`:123-135`, fit containment at`:172-213` and selected center at`:221-242` remain meaningful assertions. The existing containment tolerance is not permission to relax coordinate equality.
2. **`apps/foldkit/e2e/test-harness.ts:1272-1285`** supplies a real createViewportClient with `container.getBoundingClientRect()` width/height/left/top. Native proof should read that program's owned `.flow-foldkit-canvas` inner frame instead of its mount container's outer rect. Keep the same typed getMetrics protocol and correlation client. Its command decode/send route `:1567-1581` needs no border/type migration. This DOM composition fix is distinct from numerical explicitly supplied viewport-request tests.

Already-listed proof files contain actual border assumptions to correct without weakening assertions:

- Vue/Foldkit origin-connection preview assertions use `(from.x-pane.x-13)/2` at respective `origin-connection-contract.e2e.ts:414` and`:377`; those omit clientLeft/clientTop despite their physicalBounds helpers already subtracting them at Vue`:111-122`, Foldkit`:106-117`. Use live inner origin and keep strict field equality. Default/custom screen path comparisons must add that same inner origin, including Vanilla`:571-575`. Vanilla physicalBounds helper `origin-connection-contract.e2e.ts:44-57` assumes zero border and preview expectation`:257-262` likewise uses outer pane; make the new border cases explicit rather than changing the stock-zero expectation blindly.
- Vue renderer-contract's endpoint reader `renderer-contract.e2e.ts:516-532` subtracts canvas outer rect from handle center; use inner origin to compare actual graph path and retain its existing assertions at`:541-549`. Do not widen its preexisting tolerances.
- Foldkit public-state **real scrolled canvas** requestBase uses outer rect at `public-state.e2e.ts:924-936` and expects that origin at`:965-976`; use inner origin/client extent for this actual DOM branch and retain exact expected forward/reverse math. Its first request matrix at`:871-910` supplies a synthetic explicit hostRect/width/height: preserve those values and exact fixture expectations, because the numeric API intentionally accepts caller metrics.

Inspected non-forced/outside callers:

- Vanilla `apps/vanilla/e2e/flow-followups.e2e.ts:400-426` builds its exact public-coordinate fixture from outer rect, but its canvas is stock border0; numerical outputs are unchanged. No existing assertion forces that file's migration for the proposed live-border seam. If adding a nonzero border there is desired, request separate scope rather than claim an existing failure.
- Vue `viewport-portal.e2e.ts:101-121` and Foldkit `panel.e2e.ts:26-35` inspect physical clipping/container containment in **outer DOM coordinates**, not graph conversion. Keep them unchanged; converting every getBoundingClientRect call to inner origin would damage their intent.
- Node/handle bounding boxes used to click actual DOM centers and pure drag client deltas do not need origin corrections. Existing lifecycle files also contain pane+fixture coordinates (for example Foldkit`:3258-3276`); they are already allowed. Inspect whether each row intends graph/container geometry before changing; preserve actual cancellation, accepted-state and lifecycle assertions.
- Packed-consumer source inspection found no screen/flow coordinate runtime expectations. This seam changes no public types and forces no consumer fixture edits. Pure viewport-client unit tests use explicit numeric origin0 at `packages/foldkit/src/viewport-client.test.ts:15`; preserve them.

These are source-backed scope findings, not predictions of every full-suite runtime result. A later required verifier failure may identify a further exact test dependency; do not pre-authorize all border-box tests or edit immutable pinned evidence. Primary and cold reviewer own final border policy/scope approval.

## Conformity and deviations

**Source-conforming proposed native geometry:** actual absolute viewport/edge layout starts at the inner canvas border origin; paired live conversion and inner extent match that inspected layout. **Intentionally unchanged numeric/core boundary:** graph positions, measured offsets, viewport translation/zoom, explicit caller-provided viewport metrics, thresholds and serialized types. **Unverified:** mounted correction, delivered-event evidence under border0/1/asymmetric borders and zoom.5/2, renderer/custom payload/endpoints/radius/restore gates, full-suite behavior and broader CSS transform/scroll semantics. No parity claim follows from this read-only audit.

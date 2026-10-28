# Gesture and resize lifecycle

## Reference paths

The upstream React `NodeResizeControl` supplies `XYResizer` with node lookup, transform, snapping, and pane geometry (`packages/react/src/additional-components/NodeResizer/NodeResizeControl.tsx:62-115`). `XYResizer` captures measured dimensions, local position, pointer coordinates, parent bounds, and direct child positions before calculating updates (`packages/system/src/xyresizer/XYResizer.ts:139-212,217-318`). The imported browser suite has no resize-specific output assertion, so direct reference resize parity remains unverified (`tests/playwright/e2e/nodes.spec.ts:94-168`).

## Flow paths

### Production path

The public vanilla entry exports `mountFlow` (`apps/vanilla/src/public.ts:1-7`). The browser fixture dynamically imports that API and mounts a controlled or uncontrolled document (`apps/vanilla/e2e/advanced-gestures.e2e.ts:653`). A selected node renders eight labeled buttons with direction data (`apps/vanilla/src/mount-flow.ts:381-396`). Pointerdown reads the direction, captures the pointer, and starts a `node-resize` session with the original parent-local position, measured size, and pointer origin (`apps/vanilla/src/mount-flow.ts:2282-2311`; `packages/core/src/domain/flow-runtime.schema.ts:96-118`). Core maps a completed resize session to the `node-bounds` semantic event (`packages/core/src/domain/flow-runtime.schema.ts:219-245`).

Pointer movement converts the event to flow coordinates and calls `calculateNodeResize` (`apps/vanilla/src/mount-flow.ts:2242-2254`; `packages/core/src/domain/flow-runtime.schema.ts:362-445`). The host discards candidates with non-empty `boundsIssues`; on pointerup it cancels and restores authoritative geometry instead of emitting an impossible rectangle (`apps/vanilla/src/mount-flow.ts:2250-2253,2238-2249`). For valid previews it updates transient local-position overrides for the resized node and direct children, refreshes measured size and edge geometry, then rerenders positions, toolbar anchors, and minimap (`apps/vanilla/src/mount-flow.ts:2255-2266,636-683`).

Completion publishes one `node-bounds` candidate through the session outcome gate (`apps/vanilla/src/mount-flow.ts:2268-2279`). The schema includes resized-node position and declared size plus child positions, and rejects duplicate child ids (`packages/core/src/domain/flow-runtime.schema.ts:311-322`). `applyNodeBoundsChange` applies those fields together while preserving other nodes (`packages/core/src/domain/flow-runtime.schema.ts:547-555`). Uncontrolled mode adopts the complete candidate; controlled mode restores authoritative node and child positions and size until acknowledgement (`apps/vanilla/src/mount-flow.ts:1938-1952`).

Escape, blur, pointercancel, capture loss, relevant removal, and destroy use the resize cancellation path. It restores the declared or starting size, clears position overrides for the resized node and direct children, recomputes graph and edge geometry, and releases capture without publishing a semantic change (`apps/vanilla/src/mount-flow.ts:1485-1511`).

### Test path

Core tests cover exact session ownership outcomes for disjoint drag and connection sessions, duplicate-pointer rejection, pan-to-pinch replacement, cancellation of either pinch pointer, global and repeated cancellation, and finish-after-cancel no-op (`packages/core/src/domain/flow-runtime.schema.test.ts:37-116`). Atomic decode/apply and geometry tests cover unaffected nodes, missing nodes, duplicate child ids, persistence, all eight directions, extents, direct-child compensation, and impossible bounds (`packages/core/src/domain/flow-runtime.schema.test.ts:118-316`). Vanilla browser tests assert resize geometry, controlled acknowledgement, impossible-bounds cancellation, restored position/size and child world position, capture release, no semantic change, and a fresh resize after each deterministic cancellation (`apps/vanilla/e2e/advanced-gestures.e2e.ts:653,343-550`). The combined advanced gesture and movement-slices command passed 78 tests with two native-pointer cases skipped; those native cases remain explicitly unverified below.

## Conformity and deviations

- **Conforming within Flow:** left and top resizing keep the opposite edge fixed, and direct-child world positions remain stable through inverse local-position compensation. Evidence boundary: core calculation tests and vanilla browser tests (`packages/core/src/domain/flow-runtime.schema.test.ts:164-316`; `apps/vanilla/e2e/advanced-gestures.e2e.ts:653`).
- **Intentionally different:** Flow emits one atomic `node-bounds` change rather than separate position and size events, preserving one semantic document update for a resize. Evidence boundary: core apply tests and the vanilla host subscription (`packages/core/src/domain/flow-runtime.schema.ts:311-322,547-555`; `apps/vanilla/src/mount-flow.ts:1938-1952`).
- **Intentionally different:** Flow cancels when an extent cannot satisfy resize constraints instead of committing an out-of-bounds candidate. Evidence boundary: the bounded browser case and core `boundsIssues` tests (`apps/vanilla/e2e/advanced-gestures.e2e.ts:653`; `packages/core/src/domain/flow-runtime.schema.test.ts:286-316`).
- **Unverified:** parity with xyflow's rendered resize output, native pointer-capture behavior in Playwright, and broader device/browser behavior. The imported upstream suite has no equivalent resize output assertion; Flow's browser suite verifies Flow's own contract, not cross-system parity (`tests/playwright/e2e/nodes.spec.ts:94-168`).

Plan 151 refresh: the new pin changes resize end callbacks and rejected-session state. The release-specific production paths, test paths, and conformity boundary are recorded in [Resize lifecycle at the 12.12.0 pin](upstream-12-12-resize.md). Earlier capture results above retain their original revision; the new release regressions do not establish broader resize parity.

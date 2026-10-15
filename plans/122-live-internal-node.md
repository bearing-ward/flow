# Plan 122: Live internal-node reads

## Problem and reference

Schema Studio relationship edges read internal nodes to select sides and field offsets in `apps/vanilla/schema-studio/renderers.ts:133`. Vanilla formerly rebuilt those reads from the accepted document while drawing drag positions from a separate map. The supplied regression reproduced an unchanged SVG path while the pointer remained down.

The pinned React source reads `nodeLookup` in `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/hooks/useReactFlow.ts:68`. `getNode` reads its `userNode` and `getNodes` reads store nodes at lines 132-133. Drag steps emit position changes at `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/store/index.ts:211`.

## Production fix

- Vanilla pointer entry `apps/vanilla/src/mount-flow.ts:9153` calls `updateNodeDragPreview` at line 6542. It captures the graph after updating preview positions, draws nodes at line 4036, and updates edges at lines 6573 and 6599. The custom geometry callback runs at `apps/vanilla/src/edge-renderer.ts:828`.
- `captureProjection` at `apps/vanilla/src/mount-flow.ts:3357` retains the current paint graph. Instance reads at line 3901 reuse it during previews, including inherited absolute positions. Outside a preview, an accepted graph cache preserves accepted-only behavior. No graph rebuild occurs per custom-geometry endpoint read during drag.
- Core `projectFlowInternalNode` at `packages/core/src/domain/flow-measurement.schema.ts:345` detaches and freezes one graph node. Local position and resized size can be supplied without changing the accepted document. Existing accepted-document core helpers retain their behavior.
- Vue's `readInternalNode` at `packages/vue/src/flow-canvas.ts:5090` uses the drag render-node calculation or the resize graph captured when preview styles are written. Bulk reads share that path. Preview dimensions are measured after the DOM write without publishing accepted measurements.
- Both hosts' `getNode` and `getNodes` return live geometry. Accepted snapshots, saved sessions, and `toObject()` intentionally retain accepted serialization behavior.
- Vanilla normalizes node-local handle centers to 1/1024 flow unit. Zoomed client-rectangle subtraction otherwise changed the final path by about 0.000062 flow unit after drop despite identical local layout. The exact user regression remains unchanged.

## Foldkit findings

`packages/foldkit/src/application.ts:941` already runs instance snapshot reads through `Graph.selectLiveModel`. `packages/foldkit/src/graph.ts:1884` projects node drags, including parent movement and expand-parent patches. There is no equivalent drag gap.

Resize is separate. The view calculates `resizeChange` at `packages/foldkit/src/graph.ts:6935`, applies it to `renderDocument` at line 6960, and adjusts render measurements at line 6965. `selectLiveModel` at line 1927 does not apply those resize bounds or measurement overrides. Built-in pointer and keyboard resize, and non-expand-parent custom resizer previews, can therefore remain accepted-only in instance reads. Fixing that requires sharing the view projection with the serialized snapshot path, including measurement generations and handle offsets. Left unchanged here; no Foldkit resize parity claim.

## Tests and evidence

Production browser tests use actual pointer and keyboard events. Shared assertions live in `apps/shared-e2e/live-internal-node.ts`; separate Vanilla and Vue mount fixtures exercise their public controllers. Tests compare public absolute positions to DOM movement for a dragged node and a carried child, restore after Escape, check detached/frozen results, and read dimensions during pointer and held-key resize. Fixtures use explicit border-box sizing.

The Schema Studio tests use the actual relationship renderer and compare SVG paths before movement, while the pointer remains down, and after release. A second test moves tables through the Catalog area.

Initial failure output, after `bun install --frozen-lockfile`:

```text
bunx playwright test apps/vanilla/e2e/schema-studio.e2e.ts -g 'relationship edges follow a table'
Error: expect(received).not.toBe(expected)
Timeout 5000ms exceeded while waiting on the predicate
1 failed
```

Intermediate output is retained in `/tmp/flow-122-vanilla.log` and `/tmp/flow-122-vue-2.log`:

```text
Vanilla: 1 failed, 30 passed (53.5s)
Expected final path coordinate: 688.5627623029084
Received final path coordinate: 688.5626999086696
Vue: 2 failed, 1 passed (4.3s)
Pointer resize expected width 250, received 170
Keyboard resize expected width 205, received 175
```

The Vanilla failure led to stable local handle centers. Vue failures exposed its separate resize preview path; the fixture also now declares border-box sizing. An earlier Vue fixture assertion expected unconstrained growth and hit the host minimum width; it now compares the public dimensions to the drawn dimensions. Build and lint diagnostics during development were corrected before final verification.

Final commands passed. Every browser command, including `bun run verify`, acquired `/tmp/flow-browser.lock` with the supplied owner-token trap and `OTEL_SDK_DISABLED=true`.

- `bunx playwright test apps/vanilla/e2e/schema-studio.e2e.ts apps/vanilla/e2e/live-internal-node.e2e.ts`: **34 passed**, 55.2s. Log: `/tmp/flow-122-vanilla-final.log`.
- `bunx playwright test -c apps/vue/playwright.config.ts apps/vue/e2e/live-internal-node.e2e.ts`: **3 passed**, 4.0s before splitting the drag cases into separate tests and adding public measured-size assertions. Final versions passed in the verifier below. Log: `/tmp/flow-122-vue-3.log`.
- `bunx vitest run packages/core/src/domain/flow-measurement.schema.test.ts`: **17 passed**. The final detached-source mutation assertion also passed in the verifier.
- `bun run verify`: **focused passed**, 110.820s. **95 unit files, 2,507 tests passed**. Browser suites: **43 Vanilla, 9 Vue, 15 Foldkit passed**, 67 total. Quality, architecture, package builds, typecheck, API-member inventory, catalog, packed consumers, documentation, example registry, and Vanilla app build also passed. Log: `/tmp/flow-122-verify.log`.

`verification.config.json` names Plan 122 and selects five Vanilla files, three Vue files, and three Foldkit files. This replaces the previous task's inherited scope. The selected files include custom edge geometry, renderer props, nested resize containment, Foldkit live drag, instance APIs, and custom resizers. Full verification was not run. Performance evidence is structural: drag endpoint reads use the existing graph; no speedup or frame-time measurement is claimed.

## Conformity and deviations

- Conforming to the requested live-read contract within the named local browser boundary: Vanilla and Vue instance positions follow dragged nodes and descendants; resize reads follow previews; Escape restores accepted geometry. The Schema Studio relationship follows the preview before drop.
- Intentionally different: Flow keeps preview changes out of accepted snapshots and serialization. Instance reads expose the preview without publishing document changes every frame. Flow's native internal-node shape and frozen snapshots remain distinct from React's object shape.
- Unverified: full-suite acceptance, full React parity, native-device timing, and Foldkit resize instance geometry. Foldkit drag behavior already has a separate live projection and existing live-drag browser coverage.

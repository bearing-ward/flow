# Plan 143: Edge stacking and interactive labels

## Problem and scope

The maintainer's 2026-10-22 decision reverses the built-in label and Vanilla shared-SVG differences. Match pinned xyflow `0a1f9575b25679f2880175de8d3eae21aedde921`: built-in labels select their edge and share its hit-test level; stable per-edge SVG wrappers apply semantic z-index without selection reordering. Portal labels retain the noninteractive default documented in `packages/react/src/components/EdgeLabelRenderer/index.tsx:48`.

## Execution and acceptance

1. Reuse core `computeFlowStacking`, already implementing upstream edge elevation and manual mode. Give Vanilla stable per-edge SVGs in document order. Keep label hit-testing at each edge's level in every host, below later nodes at equal levels. Route HTML and public SVG EdgeText input through edge selection/callback handling, excluding pane pan and marquee.
2. Prove label click selection, callback ownership, node-over-label click/drag, elevated edge-over-node hit ordering, and retained focus/identity. Preserve custom renderer and portal-label behavior.
3. Update only existing expectations contradicted by the reversed policy, with pinned citations. Keep all upstream assertions unchanged. Reclassify ledger entries only after unchanged tests pass. Update the two traces and correspondence document; remap citations and check traces. Add only to verification scope.
4. Measure the unchanged Vanilla performance suite before and after. Run all host upstream Playwright runners and Cypress/component runners with three repeats; run affected edge-recipes, edge-interaction, renderer-contract, renderer-props, graph-renderers, edge-geometry-recipes, subflows, schema-studio, and minimap files where present. Serialize every browser run under `scripts/with-flow-browser-lock.sh` with one worker. Finish with the locked focused `bun run verify`; report scope separately from full acceptance.
5. Commit on `plan/143-edge-stacking-labels` with the requested message and co-author trailer. Do not push or merge.

## Results

Vanilla now renders retained per-edge SVGs in edges-array order and applies core semantic z-index, including the configured node-elevation policy. Nodes use core levels without the old +1 shared-SVG offset, and the portal layer starts at 0 before the node collection. Reconnect controls retain their documented attachment-centered host overlay, raised above the highest edge paint level so elevated paths cannot cover them. HTML labels use the edge's level through a parent without a stacking context. Native label clicks resolve the owning focusable edge group.

Vue retains its per-edge SVG/label model and paints its reconnect controls in a retained per-edge SVG after the HTML label at the same level. This preserves upstream's EdgeText-before-EdgeUpdateAnchors order without moving control geometry. HTML labels and public SVG EdgeText helpers activate their edge through existing selection/callback handling and exclude pane pan and marquee. Foldkit likewise recognizes HTML/SVG label hits; its HTML label parent no longer traps labels above nodes at a fixed level. Every host retains portal labels' default `pointer-events: none`. All hosts reuse existing core `computeFlowStacking`; no second elevation algorithm was added.

### Changed Flow tests

Pinned paths in this table are relative to the upstream revision named above. No upstream test title, assertion, gesture, wait, coordinate, or fixture was weakened.

| Flow test | Old expectation to new expectation | Pinned source citation |
| --- | --- | --- |
| `apps/vanilla/e2e/renderer-contract.e2e.ts:165` | Built-in label pointer-events none to all. | `packages/system/src/styles/init.css:160` |
| `apps/vanilla/e2e/renderer-contract.e2e.ts:225`, `apps/vanilla/e2e/renderer-contract.e2e.ts:227` | Fixed label overlay z-index 1 and node offset 1 to overlay auto and core node level 0, allowing semantic edge/label levels to participate beside nodes. | `packages/react/src/container/GraphView/index.tsx:158`, `packages/react/src/components/EdgeWrapper/index.tsx:184`, `packages/react/src/components/NodeWrapper/index.tsx:204` |
| `apps/vanilla/e2e/next-slices.e2e.ts:161` | Selected edge changes array order to retained document order, CSS level 1000, and retained focus. | `packages/react/src/container/EdgeRenderer/index.tsx:66`, `packages/react/src/components/EdgeWrapper/index.tsx:184` |
| `apps/vue/e2e/final-wiring.e2e.ts:250` | Test manually sets pointer-events auto to native pointer-events all. | `packages/system/src/styles/init.css:160` |
| `apps/foldkit/e2e/renderer-contract.e2e.ts:327` | The fixed quarter-path point must hit the transparent path to it must hit the owning interactive built-in label and select renderer-custom-edge. | `packages/system/src/styles/init.css:160`, `packages/react/src/components/EdgeWrapper/index.tsx:198` |
| `apps/shared-e2e/edge-stacking.ts:19`, `apps/shared-e2e/edge-stacking.ts:243`, `apps/vanilla/e2e/edge-stacking.e2e.ts:6`, `apps/vanilla/e2e/edge-stacking.e2e.ts:8`, `apps/vue/e2e/edge-stacking.e2e.ts:3`, `apps/foldkit/e2e/edge-stacking.e2e.ts:3` | New public-API regressions for node-over-label click/drag, elevated label/path hit order, pane-gesture exclusion, portal defaults, custom SVG labels, retained identity, focus and order. Vanilla also checks elevated anchors and three actual generic-fixture overlaps. | `packages/react/src/container/GraphView/index.tsx:158`, `packages/react/src/components/EdgeWrapper/index.tsx:184`, `packages/react/src/components/EdgeWrapper/index.tsx:251`, `packages/react/src/components/EdgeLabelRenderer/index.tsx:48` |
| `apps/shared-e2e/connection-threshold-contract.ts:662` | Foldkit fixed label parent z-index 1 and manually opted-in pointer events to parent auto, label edge level 3, and native pointer-events all. Preserve native reconnect capture/threshold and covering-node click assertions. | `packages/react/src/components/EdgeWrapper/index.tsx:184`, `packages/system/src/styles/init.css:160` |
| `apps/vue/e2e/edge-label-anchors.e2e.ts:7` | New native hit/capture/threshold regression for both reconnect endpoints at zoom 0.5 and 2 when a short edge's label covers its controls. | `packages/react/src/components/EdgeWrapper/index.tsx:218`, `packages/react/src/components/EdgeWrapper/index.tsx:251` |

### Overlap evidence

Both pan and marquee configurations use native input. Before elevation, elementsFromPoint orders the covering node, label, edge, then the other edge. After selection, it orders the label, edge, covering node, then the other edge. The covering node remains clickable and draggable before elevation. The path samples lie outside the label, inside the node. Focus and original edge identity survive an unselected-to-selected update. Public SVG labels select their edge; default portal labels remain inert.

| Host    | Label overlap, screen x/y | Elevated path overlap, screen x/y |
| ------- | ------------------------- | --------------------------------- |
| vanilla | 350.00, 185.00            | 290.00, 185.00                    |
| vue     | 366.00, 199.00            | 306.00, 199.00                    |
| foldkit | 351.00, 186.00            | 291.00, 186.00                    |

Vanilla generic-fixture probes sample natural subflow overlaps and a high-z overlap created by native dragging of unrelated node 3. They sample the actual painted stroke and require the edge before the overlapped node in elementsFromPoint. They wait for initial fit and include subpixel border paint of zero-height horizontal paths.

| Edge / node         | Screen x/y       | Hit order                     |
| ------------------- | ---------------- | ----------------------------- |
| z-index / 3         | 537.143, 360.250 | edge:z-index > node:3         |
| subflow-edge / 12   | 671.472, 565.964 | edge:subflow-edge > node:12   |
| subflow-edge-2 / 12 | 668.801, 627.567 | edge:subflow-edge-2 > node:12 |

The first natural subflow probes found 191 and 999 stroke-adjacent samples with the parent ahead, exposing the remaining +1 node offset after SVG CSS assertions already passed. Removing that offset repairs actual paint/hit order. The high-z probe uses a controlled third-node overlap because its endpoint path stops short of node 8's body. Schema Studio also needed its old -1 node-level compensation removed and its opted-in cardinality portal raised above its own edge levels 0 and 1. Its four original input/level scenarios pass 3/3 unchanged. The first anchor regression failed in both modes because Vanilla's elevated SVG covered the separate anchor layer. A per-edge anchor move repaired that local hit check but the complete verifier exposed 29 native reconnection regressions. Flow now retains its existing control overlay and attachment coordinates, raising the overlay above edge paint; the old reconnection assertions remain unchanged. The next complete gate exposed 17 Vue reconnect regressions: on short edges, interactive HTML labels covered the shifted controls. New native probes failed at all four endpoint/zoom combinations with the label first. Rendering Vue's controls after the label at the same edge level preserves geometry and passes all 12 repeated probes, the 63-case reconnect/overlap check, and the repeated upstream runners. Foldkit's old path-only renderer check failed 3/3 at (216.853, 93), where the top hits were label text, label wrapper, transparent path, and custom visible path. The updated test requires that label and its exact owner. One Vue UP-127-034 marquee failure occurred in the first repeated run; the complete unchanged three-repeat rerun passed all 201 cases. No ledger downgrade or timing change was made. The next final gate passed Vanilla 853/4 skipped and Vue 986/2 skipped, then found one obsolete Foldkit fixed-parent z-index=1 assertion among 621 cases. Its new expectation is parent auto plus the edge label level 3 and native pointer-events all; the existing reconnect capture/threshold and node-over-label click assertions remain. The updated case passes 3/3 without production changes. The known graph-renderers incident-renderer flake was rerun before any diagnosis or code change.

### Ledger before and after

Counts are pass / fail / intentional difference / not applicable. Only nine proven host outcomes change. Phase 128 includes 76 browser cases and 31 shared unit cases; its ledger classifications are unchanged.

| Phase | Host    | Before          | After           |
| ----- | ------- | --------------- | --------------- |
| 126   | vanilla | 44 / 3 / 3 / 0  | 49 / 0 / 1 / 0  |
| 126   | vue     | 48 / 0 / 2 / 0  | 49 / 0 / 1 / 0  |
| 126   | foldkit | 47 / 0 / 3 / 0  | 48 / 0 / 2 / 0  |
| 127   | vanilla | 65 / 0 / 2 / 0  | 67 / 0 / 0 / 0  |
| 127   | vue     | 67 / 0 / 0 / 0  | 67 / 0 / 0 / 0  |
| 127   | foldkit | 67 / 0 / 0 / 0  | 67 / 0 / 0 / 0  |
| 128   | vanilla | 98 / 1 / 6 / 2  | 98 / 1 / 6 / 2  |
| 128   | vue     | 100 / 2 / 3 / 2 | 100 / 2 / 3 / 2 |
| 128   | foldkit | 102 / 2 / 3 / 0 | 102 / 2 / 3 / 0 |

Promoted outcomes: Vanilla UP-126-012/-014/-016/-017/-018 and UP-127-006/-011; Vue and Foldkit UP-126-014. Grepping ledger reasons found no other entries citing the two reversed-policy traces.

### Browser acceptance

Counts below are ordinary passes / retained expected failures / skipped. Every command uses the shared browser lock and one worker. Cypress and component runners use three repeats. Zero unexpected results are required.

| Host | Upstream Playwright | Cypress, 3 repeats | Component, 3 repeats | Affected suites |
| --- | --- | --- | --- | --- |
| vanilla | 49 / 1 / 0 | 201 / 0 / 0 | 201 / 21 / 6 | 105 / 0 / 0 |
| vue | 49 / 1 / 0 | 201 / 0 / 0 | 207 / 15 / 6 | 55 / 0 / 0 |
| foldkit | 48 / 2 / 0 | 201 / 0 / 0 | 213 / 15 / 0 | 74 / 0 / 0 |

Affected files are edge-stacking, base-edge, edge-recipes, renderer-contract, renderer-props, edge-geometry-recipes and subflows-recipes in every host; Vanilla also runs graph-renderers, schema-studio, next-slices and final-wiring; Vue also runs minimap, final-wiring, node-connections and edge-label-anchors; Foldkit also runs edge-interaction, schema-studio, minimap and minimap-options. The other named host/file combinations do not exist. Existing verifier scope is preserved, with only edge-stacking in each host, the Vue edge-label-anchors regression, and the missing Vanilla/Foldkit base-edge files added.

The final command is `scripts/with-flow-browser-lock.sh bun run verify`. The focused-profile gate passed 17 of 18 checks, including 2,570 unit tests across 104 files. It exited 1 in Foldkit on the unchanged auto-layout case at apps/foldkit/e2e/layout-recipes.e2e.ts:209. Repeating that whole suite gives 18 passes and 3 failures on this branch, and 19 passes and 2 failures on untouched baseline 0c82a41; the same case receives thirdChild.y 256.6427001953125 versus expected >= 289.3262939453125 in both checkouts. The complete preceding gate passed this case. This baseline instability is recorded without changing its source or assertions, under the user conflict rule. Task-scoped upstream and affected-suite acceptance has zero unexpected results; complete focused acceptance is not claimed. All 31 shared component unit cases also pass across six files. This is not a full-profile acceptance claim.

The verifier reports these complete saved browser scopes. Its passed outcomes include retained expected failures classified by the upstream ledger.

| Host    | Total | Passed outcomes | Skipped | Unexpected failures |
| ------- | ----- | --------------- | ------- | ------------------- |
| vanilla | 857   | 853             | 4       | 0                   |
| vue     | 988   | 986             | 2       | 0                   |
| foldkit | 621   | 620             | 0       | 1                   |

### Performance

One local run per side of the unchanged Vanilla performance suite, baseline `0c82a41` versus the final rendering implementation. Values are median / p95 milliseconds. No speedup claim follows from this sample. Reconciliation excludes initial mount and full paint. The 4000-node input enables viewport culling. The drag metric measures capture-to-microtask pointer observations, and repeated gestures reuse initial node bounds, so these numbers do not establish a rendering-frame budget. Reconciliation uses four samples after one warmup, except the single 4000-node sample without warmup; drag uses seven samples.

| Operation | Nodes / input edges | Minimap | Before ms | After ms |
| --- | --- | --- | --- | --- |
| Reconcile | 250 / 6 | off | 250.3 / 251.0 | 243.9 / 246.7 |
| Reconcile | 250 / 6 | on | 251.7 / 256.5 | 243.6 / 246.6 |
| Reconcile | 1000 / 25 | off | 3945.1 / 3961.6 | 3791.0 / 3799.7 |
| Reconcile | 1000 / 25 | on | 3801.1 / 3885.9 | 3796.3 / 3804.4 |
| Pointer observation | 1000 / 25 | off | 0.0 / 0.1 | 0.1 / 0.1 |
| Pointer observation | 1000 / 25 | on | 0.0 / 0.1 | 0.0 / 0.1 |
| Reconcile | 4000 / 100 | off | 525.4 / 525.4 | 511.8 / 511.8 |
| Reconcile | 4000 / 100 | on | 529.3 / 529.3 | 506.6 / 506.6 |
| Reconcile | 1000 / 125 | off | 3937.2 / 4064.3 | 3902.4 / 3913.7 |
| Reconcile | 1000 / 500 | off | 4434.3 / 4448.1 | 4377.3 / 4382.5 |

Vanilla adds one SVG per rendered edge and retains the marker and reconnect-control overlays. Vue also adds a retained controls SVG per edge to preserve control/label paint order. The Vanilla benchmark does not measure either the added initial-mount cost or Vue rendering. Browser/version, sample counts, mutation counts, commands, exact outcomes and hit receipts are retained in [the evidence catalog](../research/catalogs/edge-stacking-and-labels-evidence.json).

## Conformity and deviations

Conforming at the tested local Chromium boundary: stable per-edge CSS stacking, selected and subflow elevation, built-in HTML/SVG label selection, node priority at equal levels, elevated edge/label priority, retained identity/focus, pane-gesture exclusion and inert portal defaults. Unchanged upstream assertions define the port boundary; synthetic and actual generic-fixture hit tests add explicit paint/input evidence. The two traces and correspondence document now describe the new policy, and shifted trace citations are remapped.

Flow intentionally retains HTML string labels for its standard document labels and attachment-centered Vanilla reconnect controls in their host overlay. Pinned EdgeAnchor shifts controls by one radius inside each edge SVG; this separate geometry boundary is retained to preserve existing reconnection and lifecycle contracts. Rich React content, exact text/background pixels, other engines, live React execution beyond pinned evidence, full-profile verification, CI and collector-side delivery remain unverified. Unrelated ledger failures and intentional differences remain unchanged. The complete focused gate retains a baseline auto-layout failure; the current branch fails that unchanged assertion 3/3 and untouched 0c82a41 fails 2/3 with identical coordinates. The user conflict rule requires recording this outside-policy boundary and continuing; no layout source or assertion changes.

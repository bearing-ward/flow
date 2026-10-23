# Presentation follow-ups

Historical policy note: the maintainer's 2026-10-22 decision and Plan 143 supersede this trace's noninteractive built-in label and Vanilla shared-SVG policy references. Current behavior and acceptance boundaries are recorded in [edge labels](edge-label-render.md) and [edge stacking](edge-visibility-stacking.md).

Status: Plan 133 Round 2, measured in Chromium against pinned xyflow commit `0a1f9575b25679f2880175de8d3eae21aedde921`. Upstream paths below are relative to `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/`.

## Browser and public entry points

The `/upstream/edges/general`, `/upstream/backgrounds`, and `/upstream/node-toolbar/general` routes load the host modules through `apps/vanilla/upstream.html:10`, `apps/vue/upstream.html:10`, and `apps/foldkit/upstream.html:10`. Each module selects a decoded shared document and options with `upstreamGenericConfig` at `apps/vanilla/src/upstream-fixture.ts:30`, `apps/vue/src/upstream-fixture.ts:30`, and `apps/foldkit/src/upstream-fixture.ts:52`.

The fixture keeps controlled graph changes in host state. Vanilla acknowledges changes through `controller.update` at `apps/vanilla/src/upstream-fixture.ts:84`; Vue replaces its reactive document at `apps/vue/src/upstream-fixture.ts:76`; Foldkit sends replacement documents and consumes accepted state at `apps/foldkit/src/upstream-fixture.ts:205` and `apps/foldkit/src/upstream-fixture.ts:218`. These presentation changes do not mutate graph meaning or introduce a new Effect workflow.

## Edge production paths

Upstream's edge wrapper obtains effective z-index at `packages/react/src/components/EdgeWrapper/index.tsx:91` and places each edge in its own SVG at `packages/react/src/components/EdgeWrapper/index.tsx:183`. The system includes parented endpoint elevation at `packages/system/src/utils/edges/general.ts:40`.

Flow computes semantic levels in `packages/core/src/domain/flow-z-index.ts:50`. Vanilla uses those levels and selected elevation to sort groups within one SVG at `apps/vanilla/src/edge-renderer.ts:576`. Its `.flow-edges` shell has no z-index at `apps/vanilla/src/style.css:285`. The existing design decision is `research/traces/edge-visibility-stacking.md:34`; it does not prove overlap parity.

Vue derives core stacking at `packages/vue/src/flow-canvas.ts:1562`. Plan 138 replaces base/elevated grouping with keyed per-edge SVGs in document order at `packages/vue/src/flow-canvas.ts:11006`. Each SVG and label receives its semantic z-index; selection changes CSS without remounting the edge. The marker-definitions SVG remains at base level. The stylesheet's base SVG value is 0 at `packages/vue/src/style.css:459`. This retains the earlier CSS repair and removes selection-driven document reordering. Vanilla retains its documented shared-SVG choice.

Foldkit computes levels at `packages/foldkit/src/graph.ts:7271`, then renders edge SVGs with each edge's level at `packages/foldkit/src/graph.ts:7545`. Its four relevant upstream stacking assertions already pass.

## Background production paths

Upstream scales gap and size at `packages/react/src/additional-components/Background/Background.tsx:40`, computes offset plus half the pattern dimensions at `packages/react/src/additional-components/Background/Background.tsx:44`, uses pan remainders and a negative translation at `packages/react/src/additional-components/Background/Background.tsx:68`, and passes half the scaled size as dot radius at `packages/react/src/additional-components/Background/Background.tsx:76`. Paths cross at the half-dimensions at `packages/react/src/additional-components/Background/Patterns.tsx:16`; circles use their radius as center at `packages/react/src/additional-components/Background/Patterns.tsx:29`.

Vanilla's public helper already applies this geometry at `apps/vanilla/src/background.ts:164`, and updates it through the controller's viewport subscription at `apps/vanilla/src/background.ts:198`. Vue reads its reactive viewport at `packages/vue/src/ui.ts:315`, computes scaled geometry at `packages/vue/src/ui.ts:318`, and emits the pattern at `packages/vue/src/ui.ts:358`. Foldkit's public `createFlowBackground` at `packages/foldkit/src/ui.ts:85` registers a renderer for its SVG and initializes it at zoom 1 at `packages/foldkit/src/ui.ts:171`. Public `alignFlowBackgroundToViewport` calls that renderer at `packages/foldkit/src/ui.ts:194`; `mountFlowCanvasUI` supplies viewport updates at `packages/foldkit/src/ui.ts:663`. The demo feeds accepted viewport changes at `apps/foldkit/src/main.ts:380`. Caller-created SVGs retain the previous transform-only alignment; Flow-created SVGs use their registered renderer. The weak map keeps the original per-background options without serializing private state into DOM or retaining disposed SVGs.

Inputs remain the existing gap, size, offset, variant, and viewport contracts. Output is SVG width, height, x, y, patternTransform, circle geometry, and line geometry. The change scales the geometry itself, so line width follows the upstream contract instead of scaling the whole pattern's stroke.

## Toolbar production paths

Upstream computes the default single-selection visibility rule at `packages/react/src/additional-components/NodeToolbar/NodeToolbar.tsx:109` and returns null when inactive at `packages/react/src/additional-components/NodeToolbar/NodeToolbar.tsx:114`.

Vanilla's reusable helper starts at `apps/vanilla/src/ui/toolbar.ts:226`. Its controller subscriptions schedule refreshes at `apps/vanilla/src/ui/toolbar.ts:156`, selection controls visibility at `apps/vanilla/src/ui/toolbar.ts:255`, core computes the anchor at `packages/core/src/domain/flow-toolbar-anchor.ts:32`, and fixed-size self-translation comes from `packages/core/src/domain/flow-toolbar-anchor.ts:140`. Visible node toolbars attach at `apps/vanilla/src/ui/toolbar.ts:175`; hidden node toolbars detach at `apps/vanilla/src/ui/toolbar.ts:185`. The same host and caller content are retained for the next visible state. Destroy still stops subscriptions, cancels the scheduled frame, removes the host, and restores caller content at `apps/vanilla/src/ui/toolbar.ts:190`. No documented keep-mounted decision was found for this helper; Plan 106 describes its public ownership and subscriptions but does not require hidden DOM attachment. Edge toolbar lifetime is unchanged.

Vue already omits inactive toolbar output at `packages/vue/src/node-toolbar.ts:121`. Foldkit's public mount at `packages/foldkit/src/toolbar.ts:167` consumes app-fed graph and viewport updates, derives an anchor, and sets hidden when inactive at `packages/foldkit/src/toolbar.ts:200`. Plan 102 at `plans/102-add-foldkit-node-and-edge-toolbars.md:23` deliberately preserves mounted caller content. That decision is retained.

## Test paths and measurements

The upstream adapter opens the public fixture at `apps/shared-e2e/upstream/adapter.ts:138` and resolves the nearest SVG ancestor at `apps/shared-e2e/upstream/adapter.ts:191`. Unchanged assertions are `apps/shared-e2e/upstream/background.ts:12`, `apps/shared-e2e/upstream/background.ts:27`, `apps/shared-e2e/upstream/edges.ts:148`, `apps/shared-e2e/upstream/edges.ts:203`, `apps/shared-e2e/upstream/edges.ts:211`, `apps/shared-e2e/upstream/edges.ts:222`, and `apps/shared-e2e/upstream/node-toolbar.ts:132`.

The background fixtures call the same public helpers at `apps/vanilla/src/upstream-fixture.ts:118`, `apps/vue/src/upstream-fixture.ts:112`, and `apps/foldkit/src/upstream-fixture.ts:252`. Foldkit's upstream fixture checks initial zoom 1 only. Animated production viewport alignment is separately exercised by `apps/foldkit/e2e/canvas-ui-contract.e2e.ts:181`, including intermediate frame samples at `apps/foldkit/e2e/canvas-ui-contract.e2e.ts:239`. The hidden-toolbar regression at `apps/foldkit/e2e/presentation-followups.e2e.ts:5` uses the actual upstream fixture, checks hidden/display, accessible roles, the accessibility snapshot, every descendant button's inability to take focus, and visibility after native selection.

Before edits, Vue emits translate(0 0) scale(1) for dots and translate(2 2) scale(1) for lines. Foldkit omits patternTransform and uses x/y 0/0 and 2/2 respectively. Both place dot centers at 10 with radius 1. The pinned React harness emits translate(-10,-10), circle center/radius 0.5, and translate(-52,-52) with line intersections at 50. The dot phase is therefore 10.5 modulo 20 upstream versus 10 in both old hosts. The line phase is -2 modulo 100 upstream versus +2 in both old hosts. These are positional and size gaps, not only comma/space serialization. The fixes emit the exact upstream translation form and matching geometry.

The disposable `/tmp/flow-133-reference` harness contains copies of the pinned React and system source, the unchanged generic Flow component and edge config, React 18.3.1, and the pinned styles. Only local build configuration is adapted. A second view mounts the pinned Background component with the tested options. The successful reference probe checks both literal background translations and records the edge stacks below. This is a local pinned-source comparison, not a deployed reference app.

For edge overlaps, the probe samples 99 path-length fractions, transforms each through getScreenCTM, and calls document.elementsFromPoint. Stacks list distinct node/edge owners from front to back. Points differ across hosts because their node measurements and fitted viewports differ.

| Fixture | Vanilla point and stack | Pinned React point and stack | Classification |
| --- | --- | --- | --- |
| Ordinary edge vs another edge | 619.367188, 109.991313: edge-with-style, edge-with-class | 616.515386, 69.688244: edge-with-style, edge-with-class | Matching visual edge order; CSS auto versus 0 is intentional. |
| Explicit high-z edge | 537.142866, 396.205714: node 8, z-index | 522.857134, 403.502152: z-index, node 8 | Product gap retained. |
| Normal to child | 671.443231, 565.335702: parent 12, subflow-edge | 675.991332, 593.642339: subflow-edge, parent 12 | Product gap retained. |
| Child to child | 668.847595, 628.813375: parent 12, subflow-edge-2 | 672.856059, 664.246821: subflow-edge-2, parent 12 | Product gap retained. |

The ordinary fixture has no interior node overlap. A controlled extra measurement temporarily moves existing node 3's DOM transform to the ordinary path midpoint without changing semantic state or edge geometry, then restores the exact style synchronously. Both Vanilla at 578.285723,129.600000 and pinned React at 569.714270,95.725714 put node 3 ahead of edge-with-class. This is a controlled overlap probe, separate from the unchanged fixture assertions.

All four Vanilla SVG ancestry checks still receive auto. The explicit high-z probe reveals the same kind of visual defect as the required subflow probes, so UP-126-012 remains fail rather than being relabeled intentional solely from its documented representation. The shared-SVG decision and source are unchanged. Foldkit UP-126-020 receives one attached toolbar with hidden present, visible false, empty accessibility snapshot, zero accessible buttons, and failed focus transfer into its descendants.

Raw receipts are `/tmp/flow-133/red-{vanilla,vue,foldkit}.json`, `/tmp/flow-133/measure-{vanilla,vue,foldkit}.log`, `/tmp/flow-133/reference.log`, and `/tmp/flow-133/new-pass-{vanilla,vue,foldkit}.log`. The initial Vue diagnostic probe records edge and background output but then attempts to read the correctly absent toolbar and times out; Vue's unchanged UP-126-020 baseline independently passes. The reference harness's first setup attempt lacks the upstream workspace tsconfig; the corrected disposable config then passes. Neither setup error is product evidence. Before ledger flips, all six repaired assertions succeed and are reported as Expected to fail, but passed by the old ledger.

## Conformity and deviations

- Conforming: the fixed Vue/Foldkit background geometry and exact initial translations; Vue's base edge SVG level; Vanilla's inactive node-toolbar omission and native selection attachment. Other hosts' existing passes are unchanged. No port assertion or adapter mapping changes.
- Intentionally different: Vanilla UP-126-016 represents matching tested visual order with shared-SVG auto rather than per-edge CSS 0. Foldkit UP-126-020 preserves hidden mounted caller content according to Plan 102, with separate user-visible, accessibility, and focus checks.
- Unverified or failing: Vanilla UP-126-012, UP-126-017, and UP-126-018 retain measured visual stacking product gaps. Preserving the approved shared-SVG design does not excuse them. No broad parity, other-engine, deployed-reference, full-profile, integration, or release acceptance follows from these probes. The final focused verifier and exact host counts are recorded in Plan 133.

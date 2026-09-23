# Flow project handoff

Last updated: 2026-09-23

## Continue from here

Work in the Flow checkout selected for this task.

Read these files before changing code:

1. [`AGENTS.md`](AGENTS.md)
2. [`CONTEXT.md`](CONTEXT.md)
3. [`docs/standards.md`](docs/standards.md)
4. [`research/generated/SUMMARY.md`](research/generated/SUMMARY.md)
5. [`research/traces/initial-node-render.md`](research/traces/initial-node-render.md)

Run the current project with:

```sh
bun install
bun run dev
```

Open `http://127.0.0.1:4173/`. Do not open `apps/vanilla/index.html` as a `file://` URL. Vite must serve the TypeScript entry point. The file URL now displays launch instructions instead of a blank page.

Run the complete local check with:

```sh
bun run verify
```

`bun run verify` regenerates the research inventory, checks TypeScript, runs unit tests, builds the vanilla host, and runs Playwright.

## Goal

Build a framework-independent graph canvas inspired by xyflow. The library will have adapters for plain JavaScript, Foldkit, and Vue.

The project has these requirements:

- Use Effect v4 for domain logic, workflows, capabilities, lifecycle, concurrency, and diagnostics.
- Derive TypeScript types and interfaces from Effect Schema.
- Keep ordinary JavaScript and TypeScript APIs at the outer library boundary. Support native Effect calls at the same boundary.
- Put reusable library and domain knowledge in `packages/`.
- Put the plain JavaScript, Foldkit, and Vue hosts in `apps/`.
- Follow the HVS Template structure from `/Volumes/Sync/Development/Bearing-Ward/projects/repos/hvs-template` at baseline commit `275c2013b54920055db091be00ca29ef096af3b8`.
- Prefer browser and platform APIs. Add a dependency only when `docs/dependencies.md` records its owner, purpose, alternatives, and removal boundary.
- Preserve researched behavior with meaningful tests. Do not claim parity without a test against the pinned source behavior or output.
- Do not preserve xyflow API compatibility for its own sake. Redesign the core around the project requirements.
- Produce visible browser output early, then add one tested behavior at a time.

## Architecture direction

Treat Flow as a new headless flow engine, not as React Flow with additional renderers.

The imported `@xyflow/system` package contains geometry, pan and zoom, dragging, connections, resizing, graph operations, DOM measurement, and shared types. It is not a complete framework-independent engine. Both upstream framework packages still own substantial state, lifecycle, rendering, events, and public API behavior.

Use this ownership model while the research confirms it:

```text
Schema-derived flow document
  -> document commands and semantic changes
    -> session state for viewport, selection, focus, and connections
      -> measured geometry and transient gesture state
        -> browser capability ports
          -> plain JavaScript, Foldkit, and Vue hosts
```

Keep the caller-owned flow document separate from measured geometry and gesture state. Emit semantic node, edge, viewport, and connection changes instead of exposing raw DOM events as the engine contract.

Use the plain JavaScript host as the first adapter. It exposes framework assumptions before Vue or Foldkit can hide them. Do not build all three adapters against an unsettled core.

The measurement, viewport, dragging, controlled-state, browser-lifecycle, document-integrity, connection, edge-path, label, marker, selection, reconnection, deletion, interaction-option, accessibility, keyboard movement, group drag, partial selection, auto-pan, and touch/pinch traces support the ownership decisions in `docs/architecture.md`. Independent document and viewport modes, keyed reconciliation, native pan and wheel input, scoped browser capabilities, interruption cleanup, document integrity, strict pointer connections, five built-in edge paths, labels, markers, edge selection and focus, reconnection, edge deletion and options, and optional browser OTLP export are implemented and tested. Animation-frame and host focus capabilities remain open; active selection frames are canceled by the host.

## Current implementation

The current code proves one interactive vertical path:

```text
unknown graph and mount input
  -> Effect Schema decode
    -> deterministic document-integrity validation
      -> FlowDocument
        -> independently controlled document and viewport state
          -> keyed multi-node reconciliation and shared measurement
            -> node or group drag, keyboard movement, pane pan, pinch, wheel zoom, selection, handle connection, or command
              -> schema-derived node-position, node-positions, viewport, edge-add, selection, edge-reconnect, or edge-remove change
                -> update acknowledgement or owned-state application
                  -> Effect spans and structured logs
                    -> optional OTLP/HTTP JSON export
                      -> explicit observer, listener, runtime, and exporter cleanup
```

### Core package

`packages/core/src/domain/flow.schema.ts` defines:

- branded `NodeId`, `EdgeId`, and `HandleId` schemas;
- `XYPositionSchema`;
- `FlowNodeSchema`;
- `FlowEdgeSchema`;
- `FlowDocumentSchema`;
- schema-backed duplicate node, edge, and handle failures, plus missing edge endpoint and handle failures;
- `validateFlowDocument`, which checks cross-record invariants and preserves valid identity;
- `decodeFlowDocument`, which composes structural decoding and integrity validation in one Effect workflow.

`packages/core/src/domain/flow-runtime.schema.ts` defines schema-derived control mode, viewport, zoom limits, measurement, active node and group drags, viewport pan and pinch, commands, and semantic changes. `flow-node-extent.schema.ts` constrains measured single and group positions; `flow-fit-view.ts` derives a centered viewport from measured bounds or fallback dimensions; `flow-connection-radius.schema.ts` chooses a nearby target handle from screen-space centers. `packages/core/src/domain/flow-connection.schema.ts` defines active connection state, strict endpoint validation, typed rejection reasons, and edge identifier allocation. Core functions receive numbers and schema-derived values, never DOM elements or browser events.

`packages/core/src/domain/flow-edge.schema.ts` resolves source and target handles and derives straight or Bezier SVG paths and label anchors. `flow-step-edge.schema.ts` derives step and smooth-step routes and label anchors. `flow-reconnection.schema.ts` validates endpoint replacement while preserving edge identity and metadata. `FlowEdge.path` is an optional schema-decoded choice; omission retains straight output.

All exported TypeScript types come from the schemas. `packages/core/src/public.ts` is the package boundary.

The current schemas are intentionally small. Runtime measurement is separate from the flow document. Handle declarations, strict connection state, five path choices, labels, markers, stroke styling, edge selection, deletion, interaction width, focusability, and reconnection are modeled; custom node data, parent relationships, spatial indexing, and advanced edge options remain unmodeled.

### Vanilla host

`apps/vanilla/src/mount-flow.ts` exports the Effect-native `createFlowHost` and unknown-input `mountFlow` facade, which:

- creates a DOM canvas and applies schema-derived, independently owned viewport state;
- renders and reconciles nodes as keyed, absolutely positioned `article` elements;
- measures nodes with one `ResizeObserver`;
- uses native pointer capture to drag a node or selected group;
- exposes document and viewport acknowledgement through `update`, `updateViewport`, `dispatch`, and `subscribe`, plus `fitView` with fallback dimensions for unmeasured nodes;
- pans the pane with primary-pointer or touch input, pinches with two touches, and zooms around the cursor with wheel input;
- emits schema-derived node-position, atomic node-positions, and viewport changes;
- renders declared source and target handles, draws a temporary connection preview, validates source-to-target endpoints, and emits an edge-add change;
- measures handle bounds and renders persistent straight, Bezier, simple-Bezier, step, or smooth-step edges as keyed SVG paths that follow node resizing, dragging, and viewport transforms;
- renders keyed SVG labels and instance-scoped arrow definitions with validated stroke styling;
- selects and focuses nodes and edges with pointer and keyboard input, supports modifier and full or partial rectangle multi-selection with edge auto-pan, moves selected nodes with arrow keys, reconnects selected endpoints, and deletes selected edges in controlled and uncontrolled modes;
- hides nodes and their connected edges, and restores both after a document update;
- culls nodes and edges at an optional viewport boundary, retaining measurements for later re-entry;
- honors per-edge selectability, focusability, deletability, endpoint-specific reconnectability, interaction width, and accessible names;
- cancels node, viewport, pinch, selection, and connection gestures on `pointercancel`, active-source removal, and destroy;
- disconnects the observer and removes every listener on `destroy`.

`apps/vanilla/src/main.ts` decodes a six-node demo through `@flow/core`, mounts the host with opt-in culling, partial selection, a 4px node drag threshold, 10px snap grid, bounded pan and node gestures, 20-flow-unit connection radius, connection auto-pan, two-click connection, and a toggleable connection validator. It explains the gestures and provides controls for the main graph, distant graph, fitting the full document with estimated sizes where needed, connection rule, hidden step edge, and hidden node. The description and helper text change with each selected button; `aria-current` identifies that button while `aria-pressed` retains view and toggle state. It records the last semantic change and destroys the host on `beforeunload`. `apps/vanilla/src/flow-browser.ts` owns scoped DOM listeners, resize observation, measurement, and pointer capture. `acquireFlowHost` ties the controller to Effect completion, failure, and interruption. `apps/vanilla/src/telemetry.ts` composes browser capabilities, structured local diagnostics, and optional release-matched Effect OTLP/HTTP JSON export. `apps/vanilla/vite.config.ts` maps only the base endpoint and service resource fields into browser configuration; it never exposes OTLP headers. Playwright disables external export except for its intercepted transport test.

The current canvas is a DOM and CSS surface. It is not an HTML `<canvas>` element.

`apps/vanilla/index.html` contains a static explanation for direct `file://` loading. `apps/vanilla/e2e/canvas.e2e.ts` tests both the explanation and the served canvas.

### Tests and screenshots

The core unit tests include the following behaviors. In addition to document and node-drag coverage, they verify:

- decode one valid document;
- reject an empty node identifier;
- reject duplicate node and edge identifiers;
- reject missing source and target nodes;
- reject duplicate handle identifiers and edges with missing or wrong-kind handles;
- accept valid source-to-target connections, reject wrong-kind and duplicate connections, and allocate unique edge identifiers;
- preserve valid document identity during integrity validation;
- round-trip flow and screen coordinates;
- reject a zero-zoom viewport;
- preserve pointer offset and emit the expected final drag position;
- apply a position command while preserving unaffected node identity;
- reject a position change for a missing node;
- reject inverted viewport limits;
- pan in screen pixels;
- zoom around a cursor and clamp to limits;
- turn a viewport command into a semantic viewport change.
- select default handles and attach a straight path to measured handle sides.
- decode an explicit Bezier choice and calculate forward, backward, vertical, and mixed-side cubic controls.

The vanilla host browser tests include:

- show correct launch instructions when `index.html` opens directly;
- render and remeasure the decoded node at the expected position and match screenshots;
- drag the node to an exact final position and assert the semantic change;
- pan and wheel-zoom an uncontrolled viewport to exact transforms;
- prove independent document and viewport ownership;
- prove controlled viewport acknowledgement;
- convert node dragging through the current viewport;
- export correlated OTLP/HTTP JSON logs and traces;
- close retained listeners and resize observation exactly once;
- release the same resources when an Effect fiber is interrupted;
- destroy the host when its browser lifetime ends;
- reconcile controlled nodes by identifier and wait for caller acknowledgement;
- apply uncontrolled commands and cancel a drag when its node is removed.
- complete a strict pointer connection and publish an edge-add change;
- reject a source-to-source connection and duplicate endpoint pair;
- keep controlled connections pending until document acknowledgement;
- cancel an active connection when its source disappears.
- measure a handle center and complete a connection through a translated, zoomed viewport.
- render a keyed straight path through resize, drag, and viewport changes;
- remove paths when an edge leaves the document or has no measured handles.
- keep a Bezier path keyed through resize, drag, viewport movement, and a switch to straight;
- render step and smooth-step routes with labels across dragging and viewport changes;
- update keyed labels, arrow markers, and stroke styling, including two-flow marker isolation;
- select and focus edges by pointer and keyboard, with controlled acknowledgement;
- reconnect source and target endpoints while preserving the keyed path and metadata, including invalid drops, cancellation, and nondefault zoom;
- remove selected edges with Delete or Backspace, including controlled acknowledgement, nondeletable edges, and keyed SVG cleanup;
- verify per-edge selectability, focusability, accessible names, actual hit width, and endpoint-specific reconnection.
- move a selected group by keyboard and pointer, including controlled keyboard acknowledgement;
- select a partially overlapping node and pan the viewport while a selection rectangle rests near an edge;
- pan with one touch and pinch with two real browser touch points, asserting zoom and midpoint translation.
- preserve clicks through a configurable node drag threshold, snap group and keyboard moves to a grid, and constrain pan and wheel zoom to a finite extent;
- auto-pan during a pointer connection to a distant target, and start, cancel, or complete a two-click connection.
- constrain node and selected-group pointer and keyboard movement with measured sizes;
- fit measured all or selected nodes, snap pointer connection release to a nearby target, reject or accept connections with a caller validator, and activate two-click connections from focused handles.

The latest complete `bun run verify` passed research inventory and citation checks (1,786 citations across 40 traces), TypeScript, 81 unit tests, the vanilla build, and 61 browser tests. `bun run lint` and `bun run format:check` are separate checks.

Screenshot baselines are in `apps/vanilla/e2e/canvas.e2e.ts-snapshots/`.

These screenshots describe Flow's current output. They do not prove visual parity with xyflow.

## Research state

The project pins xyflow commit `0a1f9575b25679f2880175de8d3eae21aedde921` in `research/UPSTREAM.json`.

`research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/` contains immutable copies of:

- `packages/system`;
- `packages/react`;
- `packages/svelte`;
- `examples/react`;
- `examples/svelte`;
- `tests/playwright`;
- the upstream license and root build metadata.

Run `bun run research:import` to recreate the pinned artifact directory. Do not hand-edit files under `research/artifacts/`.

Run `bun run research:inventory` to regenerate:

- `inventory.json`;
- `DECLARATIONS.tsv`;
- `IMPORTS.tsv`;
- `CALLS.tsv`;
- `TESTS.tsv`;
- `SUMMARY.md`.

The current inventory contains 649 files, 665 exported declarations, 6,418 syntactic call expressions, and 50 test or E2E files. `CALLS.tsv` is a search index. It is not a verified call graph.

The reviewed traces are:

- `research/traces/initial-node-render.md`;
- `research/traces/node-measurement.md`;
- `research/traces/viewport.md`;
- `research/traces/node-dragging.md`;
- `research/traces/controlled-state-and-reconciliation.md`;
- `research/traces/browser-lifecycle.md`;
- `research/traces/document-integrity.md`.
- `research/traces/handles-and-connections.md`.
- `research/traces/straight-edge-render.md`.
- `research/traces/bezier-edge-render.md`;
- `research/traces/edge-label-render.md`;
- `research/traces/edge-markers-styling.md`;
- `research/traces/edge-selection-focus.md`;
- `research/traces/edge-reconnection.md`;
- `research/traces/step-edge-render.md`;
- `research/traces/edge-deletion.md`;
- `research/traces/edge-interaction-options.md`;
- `research/traces/edge-accessibility.md`.
- `research/traces/keyboard-node-movement.md`;
- `research/traces/multi-node-drag.md`;
- `research/traces/partial-selection.md`;
- `research/traces/selection-auto-pan.md`;
- `research/traces/touch-pinch.md`.
- `research/traces/drag-threshold.md`;
- `research/traces/snap-grid.md`;
- `research/traces/pan-extents.md`;
- `research/traces/connection-auto-pan.md`;
- `research/traces/click-to-connect.md`.
- `research/traces/node-extents.md`;
- `research/traces/fit-view.md`;
- `research/traces/connection-radius.md`;
- `research/traces/connection-validators.md`;
- `research/traces/keyboard-click-connect.md`.

`bun run research:check-traces` verifies that cited upstream and Flow files and lines exist. `bun run verify` runs this check after regenerating the inventory.

Every reviewed trace now ends with `Conformity and deviations`. The trace checker enforces that section. `docs/architecture.md` records the current behavior-by-behavior comparison, including the native-pointer and final-change deviations.

`docs/observability.md` defines Flow's Effect spans, structured-log attributes, OTLP configuration, data limits, shutdown behavior, and proof boundaries. The current code emits local Effect spans and logs for decode, document integrity, mount, measurement, controller updates, command dispatch, reconciliation, gestures, browser capability failures, scoped cleanup, and destroy. DOM callbacks use the application's long-lived `ManagedRuntime`. Application composition optionally installs Effect's OTLP/HTTP JSON layer and flushes it on disposal. A Playwright receiver proves browser serialization, transport, expected span names, and log correlation. A configured live receiver has accepted all three signals with HTTP 200, but storage and queries remain unverified.

## Progress tracking

`research/PROGRESS.md` is the editable whole-project checklist. It describes the project in plain English and does not measure progress by comparing feature names with the source project.

`scripts/inventory-xyflow.ts` embeds that checklist at the top of `research/generated/SUMMARY.md` every time the inventory runs. Update `research/PROGRESS.md`, not the generated copy.

The generated report records the verified controller, viewport, and browser telemetry slice. Re-run `bun run research:inventory` after checklist edits so the generated copy and counts stay current.

Update the checklist with each completed and verified behavior. Do not check an item because code exists. Check it only after the relevant verification passes.

## Dependency state

The workspace pins one Effect release:

- `effect@4.0.0-rc.117`
- `@effect/platform-bun@4.0.0-rc.117`

Other direct development dependencies are TypeScript 5.9.3, Vite 8.0.13, Vitest 5.0.1, Playwright 1.62.1, and Bun types 1.3.14.

The code-quality toolchain pins Ultracite 7.12.0, Oxlint 1.85.0, `@oxlint/plugins` 1.85.0, and Oxfmt 0.70.0. `oxlint.config.ts` loads Ultracite plus the vendored anti-slop generic and Effect rules. `oxfmt.config.ts` uses the Ultracite preset. `docs/tooling.md` records commands, ignores, provenance, and the initial cleanup baseline.

`bunx ultracite doctor` passes all eight setup checks. `bun run check` currently reports 465 lint errors across 18 owned files and formatting changes in 22 files. These are pre-existing source findings exposed by the new policy. The check is not part of `bun run verify` until a separate cleanup makes it green.

`docs/dependencies.md` records the reason for each dependency. Keep the Effect packages on the same exact release candidate.

## Git state

This checkout has committed history through Plan 001 (`e393e3e`); the current task checkout may be detached or on a worktree branch. Check `git status` and `git log` before editing. Preserve unrelated user work.

Preserve unrelated user work. Do not commit, push, delete, or rewrite history without explicit authorization.

## Completed document-integrity slice

`decodeFlowDocument` now rejects duplicate node identifiers, duplicate edge identifiers, and missing source or target nodes with schema-backed tagged errors. Structural decoding and cross-record validation run in one Effect workflow. `validateFlowDocument` returns the original object for valid typed documents.

`research/traces/document-integrity.md` shows that reference lookup maps replace duplicate identifiers and reference renderers omit missing endpoints. Flow intentionally rejects those inputs before adapter state exists so each document has one meaning.

The `flow.document.integrity` span and its warning log record only the issue kind, affected identifiers, and endpoint role. They do not record labels, positions, or document payloads. The intercepted OTLP receiver test verifies the exported integrity span, warning, and `flow.document.issue` value.

## Next implementation slice

Next address spatial lookups, broader reference-test mapping, performance budgets, and remaining canvas and interaction gaps in research/PROGRESS.md.

Do not begin Foldkit or Vue until the graph document and browser lifecycle contracts are stable.

## Known gaps and decisions still open

- Animation-frame and focus browser capabilities remain undefined. The Promise facade is also not final.
- The current runtime supports keyed nodes and five built-in edge paths, single and selected-group dragging, keyboard movement, pane pan, touch pinch, wheel zoom, strict pointer and optional two-click connections, connection auto-pan, edge selection/focus, labels, markers, endpoint reconnection, and full or partial rectangle selection with auto-pan. Browser coverage includes visual adoption of initial and controlled node extents, unmeasured and culled fit, zoom-aware connection radius and hover, validator rejection/failure in connection and reconnection, and pending click announcements and source focus restoration.
- Document and viewport modes are independently explicit and tested. The semantic command vocabulary contains node positioning and viewport updates.
- Browser OTLP transport is verified against a Playwright HTTP receiver. A configured live receiver has also accepted browser logs, metrics, and traces with HTTP 200, but storage and query behavior remain unverified.
- Edge paths support selection, reconnection, and deletion with per-edge controls. Hidden edges, explicit stacking, and opt-in viewport culling work; custom curvature and exact upstream visual parity remain open.
- No Foldkit or Vue app exists.
- No cross-adapter conformance suite exists.
- No reference screenshot capture system exists.
- No performance or accessibility budget exists.
- The project has no CI, release process, or package consumer test.
- Attribution and notice requirements for any future copied source still need a documented decision. The imported xyflow source is MIT licensed and includes its license in the artifact directory.

## Continuation prompt

Use this prompt in a new task if you want to resume without rewriting the context:

```text
Continue the Flow project in the current checkout. Read HANDOFF.md, AGENTS.md, CONTEXT.md, docs/standards.md, docs/architecture.md, docs/observability.md, research/PROGRESS.md, and relevant research traces before changing code. Preserve Effect 4.0.0-rc.117 alignment and Schema-derived types. Treat research artifacts as immutable. The project now supports nested graph documents with local child positions, validated parent references, absolute geometry and bounds, visibility, ordering and directed queries; version-1 saved documents preserve declared graph fields; and the vanilla host supports keyed custom renderers and flow-to-screen toolbar anchors. Browser tests cover visual extent adoption for initial and controlled nodes, fit of unmeasured and culled nodes, zoom-aware connection radius and validity hover, rejected and throwing connection validators, and pending click announcements and source focus. Next address spatial lookups, broader reference-test mapping, performance budgets, and remaining canvas and interaction gaps in research/PROGRESS.md. Keep document data separate from measured geometry and gestures. Use bounded spans and logs at workflow boundaries. Distinguish Flow tests from direct xyflow parity. Run bun run verify and update progress only for verified behavior. Check Git state before editing and preserve unrelated work.
```

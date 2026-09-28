## Project progress

Checked items work in the repository today. Unchecked items are still part of the planned project.

Current milestone: the core validates nested graph documents, provides graph queries and geometry, and saves declared fields in a version-1 envelope. Plan 052 adds JSON edge data, node deletion policy, validated atomic edit transactions, JavaScript and Vue named edits with functional updaters, Foldkit typed edit ports, and bounded graph-editing controls. The fixed public-edit fixture covers data merge/replacement, cascading deletion, protected-edge and protected-descendant conflicts, invalid endpoint rollback, and queued disposal in all three production hosts; protected-descendant tests verify the complete accepted graph remains unchanged, and disposal assertions verify settled queued work and no late notifications. Data-edit proof checks observer order and rendered node identity or IDs in each production host; vanilla also checks rejected-edit rollback leaves DOM and observers unchanged. Edge JSON save/restore is covered in all three playgrounds. JavaScript and Vue updater tests verify once-only evaluation against a frozen accepted snapshot; vanilla verifies FIFO reentrant evaluation and queued disposal, Vue verifies same-tick split-model acknowledgement, canvas edit isolation, and unmount, and Foldkit verifies edit isolation between Runtime instances, reentrant request IDs, and typed disposal settlement. The graph-editing examples cover the Updating Nodes add/edit/remove and node/edge data inspection workflow, protected-delete feedback, keyboard activation, and repeated reset at normal and narrow widths; the Delete Middle Node example reconnects neighbors from a pre-edit snapshot at both widths. The catalog records these bounded test boundaries; broader catalog/example mapping remains open. The pinned runtime capture includes valid `setNodes`/`setEdges` operations, with the selected valid full-collection data-update subcase compared to Flow. Controlled acknowledgement, protected deletion, updater scheduling, and broader endpoint-removal behavior remain unverified against xyflow. The vanilla host includes custom renderers, node and edge interactions, eight-direction pointer and keyboard resizing, custom drag handles, six-position caller panels, overlay portals, viewport controls, and reusable canvas UI. A JavaScript facade and packed consumer check are in place. Vue and Foldkit pass eight shared Flow adapter scenarios, including three-level parent-relative positions after a controlled parent update and inherited hidden state for descendants and incident edges. Feature-specific vanilla checks do not establish matching capabilities in those adapters. Local CI configuration and a release dry run exist; packages remain private and unpublished. The eight shared scenarios and three pinned interaction captures do not establish full xyflow parity; one left-edge resize case with a direct child now has matching normalized parent bounds and child positions. Open items include broader resize directions and cancellation, native multi-pointer coverage, broader visual and accessibility checks, property tests, performance budgets, and release work.

### Definitive project goal

Flow aims to match React Flow's public interfaces, examples, and reusable UI components and templates as closely as each supported framework permits. The target includes the complete [API reference](https://reactflow.dev/api-reference), [examples](https://reactflow.dev/examples), and [UI catalog](https://reactflow.dev/ui), including their sidebars and publicly listed Pro capabilities. Every demonstrated outcome should be achievable through supported Flow APIs and idiomatic integrations in plain JavaScript, Vue, Foldkit, and future supported adapters. Framework-specific hooks, providers, composition, reactivity, and lifecycle should have idiomatic equivalents; a reference-compatible adapter API may preserve a different internal contract. Optional integrations can live in core, adapters, reusable UI, or examples as appropriate. Track implementation and reference conformity separately per framework, classifying evidence as conforming, intentionally different, or unverified with a reason and test boundary. Current website catalogs define future coverage; the pinned source in `research/UPSTREAM.json` remains separate evidence and must not be presented as proof of current website behavior.

The catalogs were inventoried on 2026-09-26. The [catalog coverage map](catalogs/react-flow-coverage.md) records 200 capability entries: 114 API entries, 67 examples, and 19 UI components/templates. It retains eight navigation entries separately and includes the 16 publicly listed Pro examples. Every entry has an upstream URL, separate vanilla/Vue/Foldkit discovery status, a local evidence or gap mapping, and an explicit reference-proof boundary. The [dated snapshot](catalogs/react-flow-2026-09-26.json) and `bun run scripts/check-react-flow-catalog.ts --upstream` make sidebar changes detectable. These are coverage counts, not a parity percentage. Plan 045 adds a bounded member matrix and three-host accepted-state decision; neither closes the full API correspondence checklist. Plan 046 adds Flow helpers for incident-edge and directed-neighbor queries while retaining the existing edge-returning graph queries. Their pinned implementation was inspected, but executable reference comparison remains unverified. Plan 047 implements detached immutable JavaScript state getters and accepted-state notifications, with focused browser and packed-consumer tests. Plan 048 adds Vue readonly computed state projections, point lookups, canvas-local accepted-state subscriptions, and real descendant lifecycle/isolation coverage. Vue scheduler timing remains adapter-specific. Plan 049 adds pure Foldkit model selectors and typed snapshot/accepted-state ports, with Runtime embed tests for ownership, ordering, equality, and disposal; the host remains app-scoped and package promotion is open. No live React Flow runtime comparison was run. See [matrix](../docs/react-flow-api-correspondence.md), [state trace](traces/public-state-contract.md), and [graph-query trace](traces/public-graph-queries.md).

Review upstream additions at milestone boundaries. Detailed mapping should account for intentional internal differences, optional integrations, licensing constraints, and unavailable Pro evidence without silently excluding capabilities. Sequence the work as API mapping, shared capability work, framework and UI delivery, then catalog-wide proof. Deliver examples with each capability slice to expose missing contracts early; this sequence does not supersede unfinished correctness work.

- [x] Catalog baseline: map every API, example, and UI entry to a dated upstream URL.
- [ ] API correspondence: map each public contract to its closest practical equivalent and document necessary framework adaptations.
- [ ] Example coverage: demonstrate every catalog example through supported APIs, including required optional integrations.
- [ ] UI coverage: provide equivalents for every catalog component and template.
- [ ] Framework coverage: prove mapped capabilities separately in plain JavaScript, Vue, Foldkit, and future supported adapters.
- [ ] Parity evidence: connect each claim to reference comparisons, runnable examples, and applicable interaction, visual, accessibility, and lifecycle checks.
- [ ] Upstream review: review catalog changes at milestone boundaries and keep omissions visible in the checklist.

### Project foundation

- [x] Initialize the workspace
  - [x] Keep reusable domain logic in `packages`
  - [x] Keep runnable framework hosts in `apps`
  - [x] Enable strict TypeScript checks
  - [x] Pin one Effect v4 release across the workspace
- [x] Document every direct dependency and why it exists
- [x] Provide one verification command
  - [x] Refresh the research inventory
  - [x] Check TypeScript
  - [x] Run unit tests
  - [x] Build the browser host
  - [x] Run real-browser tests
- [x] Configure repository-local formatting and lint commands
- [x] Clear the initial Ultracite findings and add the read-only check to `bun run verify`
- [x] Add architecture-boundary checks
- [x] Add continuous integration
- [ ] Add package-release and changelog automation

### Research and design

- [x] Pin the researched source to an exact commit
- [x] Preserve the system, React, and Svelte packages
- [x] Preserve relevant examples and browser tests
- [x] Generate searchable file, declaration, import, call, and test indexes
- [x] Trace the first node from input data to visible DOM
- [x] Trace node measurement and dimension updates
- [x] Trace viewport initialization, panning, and zooming
- [x] Trace node dragging, selection, and keyboard movement
- [x] Trace handles, connections, and connection validation
- [x] Trace straight edge path calculation
- [x] Trace Bezier edge path calculation
- [x] Trace edge labels and reconnection
- [x] Trace markers, styling, selection, focus, and step paths
- [x] Trace edge deletion, interaction options, and accessibility
- [x] Trace node visibility and multi-selection
- [x] Trace nested nodes, groups, extents, and stacking
- [x] Trace viewport visibility culling
- [x] Trace spatial lookups
- [ ] Trace background, controls, minimap, panels, and toolbars
- [ ] Trace mouse, touch, keyboard, and accessibility behavior
- [x] Trace controlled state, uncontrolled state, and persistence
- [x] Trace browser resource ownership and cleanup
- [x] Trace duplicate identifiers and missing edge endpoints
- [ ] Map every useful researched test to a project behavior
- [ ] Measure performance-sensitive paths and establish budgets
- [x] Compare candidate internal designs and record the selected architecture

### Graph document and schemas

- [x] Define schema-derived node and edge identifiers
- [x] Define schema-derived positions, nodes, edges, and documents
- [x] Decode unknown input at the library boundary with Effect
- [x] Prove valid and invalid document decoding with unit tests
- [x] Validate duplicate identifiers and missing edge endpoints
- [x] Define node data and node-type registration
- [x] Define dimensions, handles, parents, extents, visibility, and stacking
- [x] Define built-in edge paths, markers, labels, and stroke styling
- [x] Define configurable interaction width and reconnectability
- [x] Define document commands and semantic change events
- [x] Define viewport session state
- [x] Define edge selection and connection session state
- [x] Define single and multi-element selection changes and focus behavior
- [ ] Define measured geometry and spatial-index state
- [ ] Define pointer and keyboard gesture state machines
- [x] Define graph queries such as bounds, intersections, incomers, and outgoers
- [x] Define serialization and document migration rules

### Canvas and viewport

- [x] Initialize the canvas
  - [x] Fill the host viewport
  - [x] Draw a dotted background
  - [x] Capture a browser screenshot baseline
  - [x] Support custom canvas options
- [x] Store and apply viewport translation and zoom
- [x] Pan with primary mouse or pointer input
- [x] Pan with touch input
- [x] Zoom with wheel input around the cursor
- [x] Zoom with pinch input
- [x] Zoom with controls and double click
- [x] Enforce pan extents and minimum and maximum zoom
- [x] Fit measured visible or selected content into view
- [x] Fit initially unmeasured content into view, including nodes omitted by viewport culling
- [x] Convert between screen and flow coordinates
- [x] Cull content outside the visible viewport when enabled

### Nodes

- [x] Render one decoded node
  - [x] Position it with flow coordinates
  - [x] Capture a focused node screenshot baseline
- [x] Render and reconcile multiple nodes by identifier
- [x] Support custom node renderers
- [x] Measure node dimensions and handle layout changes
- [x] Drag one node
- [x] Drag multiple selected nodes together
- [x] Lock node position
- [x] Select one node by pointer and keyboard
- [x] Select nodes by additive input and a full-containment rectangle
- [x] Support partial-overlap rectangle selection and selection auto-pan
- [x] Move selected focused nodes with the keyboard
- [x] Auto-pan while dragging or keyboard-moving
- [x] Hide and remove nodes
- [x] Support parent nodes, child nodes, and groups
- [x] Constrain pointer and keyboard node movement to a measured extent
- [x] Constrain initial and externally controlled node positions to extents
- [x] Snap pointer and keyboard node movement to an optional grid
- [ ] Resize nodes
- [x] Position node toolbars
- [x] Provide node focus, labels, and ARIA semantics
- [x] Provide custom node descriptions

### Handles and connections

- [x] Render source and target handles
- [x] Measure handle positions
- [x] Start and complete connections by pointer or click
- [x] Render the in-progress connection preview
- [x] Validate connection targets and connection rules
- [x] Support connection radius for pointer gestures
- [x] Support a custom connection validator for pointer and click connections
- [x] Activate click connections from focused handles with Enter or Space
- [x] Support node drag thresholds and connection auto-pan
- [x] Reconnect existing edges
- [ ] Cancel gestures cleanly on escape, blur, removal, and unmount
- [x] Emit semantic connection events

### Edges

- [x] Render edges between measured handles
- [x] Render straight paths
- [x] Render Bezier paths
- [x] Render step and smooth-step paths
- [x] Render simple-Bezier paths
- [x] Support custom edges
- [x] Render markers and labels
- [x] Select and focus edges by pointer and keyboard
- [x] Remove selected edges with keyboard input
- [x] Hide edges
- [x] Reconnect edge endpoints
- [x] Order edges by explicit stacking and selected state
- [x] Cull edges outside the viewport when enabled
- [x] Position edge toolbars

### Built-in UI

- [x] Support configurable background patterns
- [x] Provide zoom, fit-view, and interaction controls
- [x] Provide a minimap with viewport navigation
- [x] Provide panels and overlay portals
- [x] Provide node and edge toolbars
- [x] Decide and document attribution and licensing presentation

### Effect runtime and public API

- [x] Instrument document decode, host lifecycle, measurement, and drag changes with Effect spans and structured logs
- [x] Configure optional OTLP log, metric, and trace export in application composition
- [x] Verify browser OTLP/HTTP JSON serialization, transport, and log correlation
- [ ] Verify collector processing, storage, and queries for exported telemetry
- [x] Define services for element measurement and resize observation
- [x] Define services for animation frames and focus
- [x] Define services for pointer capture and browser event boundaries
- [x] Scope listeners and observers to runtime lifetime
- [x] Cancel selection animation frames on gesture end and host destroy
- [x] Publish semantic input and change streams
- [x] Prove interruption and unmount cleanup
- [ ] Add structured diagnostics for gestures and invalid input
- [x] Expose native Effect programs and services
- [x] Expose a small Promise and callback facade for ordinary JavaScript

### Plain JavaScript adapter

- [x] Provide a runnable browser host
- [x] Render the first canvas and node through the core package
- [x] Publish a reusable mount function
- [x] Accept custom node and edge renderers
- [x] Expose subscribe, dispatch, update, and destroy operations
- [x] Reconcile DOM elements without rebuilding the whole canvas
- [x] Remove all listeners and observers on destroy
- [x] Verify a packed-package consumer

### Foldkit adapter

- [x] Scaffold the Foldkit host
- [x] Derive Model, Message, and OutMessage types from schemas
- [x] Implement initialization, update, and view boundaries
- [x] Implement commands and subscriptions for browser effects
- [x] Keep child updates capability-scoped and typed
- [x] Run the shared adapter-conformance suite

### Vue adapter

- [x] Scaffold the Vue host
- [x] Provide components and dependency injection
- [x] Support model bindings for nodes, edges, and viewport
- [x] Provide typed composables for state and actions
- [x] Support custom node and edge components
- [x] Keep reactive updates shallow and keyed
- [x] Dispose watchers, listeners, and observers on unmount
- [x] Run the shared adapter-conformance suite

### Testing and proof

- [x] Test schema decoding and rejection
- [x] Run the first host in a real browser
- [x] Store canvas and node screenshot baselines
- [x] Explain how to start the host when its HTML file is opened directly
- [x] Capture deterministic behavior fixtures from the research host
- [x] Run one shared conformance suite against every adapter
- [ ] Add visual checks for each completed feature
- [ ] Add pointer, touch, wheel, and keyboard interaction tests
- [x] Check edge roles, names, focus, keyboard actions, and hit targets in a browser
- [ ] Run a broader accessibility audit
- [x] Add property tests for graph operations and coordinate conversion
- [ ] Add invalid-state and lifecycle-cleanup tests
- [ ] Add large-graph performance tests and budgets
- [x] Verify installation from packed packages in a clean consumer

The focused browser performance benchmark runs in Chromium and reports 250-, 1,000-, and 4,000-node controller updates plus single-node drag frames. Two runs show 1,000-node / 125-edge p95 values of 430.3–499 ms and 500-edge p95 values of 431.9–602.1 ms; the 4,000-node case uses viewport culling and one un-warmed sample because 4,000-node browser reconciliation without viewport culling exceeded three minutes locally. The benchmark asserts deterministic minimap subtree mutation behavior, but does not set a latency threshold. Keep this item open until repeated target-hardware samples establish a stable large-graph budget.

The current feature evidence includes focused Chromium screenshots for resize and custom drag handles, measured panel-placement tests, and keyboard/focus checks for resize, renderer controls, and panels. The broader visual, input, and accessibility checklist items remain open because they cover the whole project, additional browser/device environments, or manual screen-reader review. Native concurrent-pointer and two-contact pinch cases are still skipped in the available Playwright environment.

### Documentation and delivery

- [x] Document engineering standards and dependency decisions
- [x] Document the initial render call stack, types, seams, files, and tests
- [x] Keep this plain-English progress report in every generated summary
- [x] Generate API reference material from the schemas
- [x] Write a first-canvas tutorial
- [x] Write guides for custom nodes, edges, gestures, and adapters
- [x] Record architecture decisions and rejected alternatives
- [x] Document browser support and accessibility expectations
- [ ] Publish versioned packages and migration notes

### Verification baseline recovery (2026-09-26)

- `bun install --frozen-lockfile` completed in the isolated checkout.
- `bun run check`, `bun run typecheck`, `bun run test`, API docs generation/check, and the offline catalog checker all pass. The catalog has 208 entries (200 capabilities); upstream checking was disabled.
- The targeted vanilla gesture and renderer browser suites pass 98 tests with two existing skips; focused canvas suites pass 46 tests. Full `bun run verify` passes with 185 browser tests and two existing skips. Vue and Foldkit conformance gates also pass.
- Native multi-pointer behavior remains unverified; this local verification does not establish hosted CI or collector-side telemetry delivery.

### Shared public-state contract proof (2026-09-26)

- Four versioned Flow-authored read-contract fixtures now run against the real JavaScript controller, Vue descendant composables, and Foldkit Runtime ports. They compare accepted snapshots/lookups, semantic proposals, accepted-state notifications, graph queries, settled rendered output, and disposal observations.
- The vanilla shared browser run passed 2/2; the Vue and Foldkit conformance runs passed 6/6 each. The Vue and Foldkit counts include their existing focused adapter tests. Existing eight shared rendering fixtures remain intact.
- Per-host edge DOM is captured explicitly: the initial graph's `child-visible` edge appears in Vue and Foldkit while vanilla omits it before endpoint measurement. These tests assert Flow's host boundary; they are not React Flow parity evidence.
- Full `bun run verify` passed (exit 0): 192 browser tests (190 passed, 2 skipped), 11 Vue conformance tests, and 9 Foldkit conformance tests. `bun run check`, `typecheck`, 136 unit tests, docs generation/check, catalog check (208 entries/200 capabilities), and trace citation check (2,039 citations across 48 traces) also passed. Native multi-pointer behavior and upstream parity remain unverified.

### Plan 051: cross-host state and persistence example (complete locally, 2026-09-26)

A bounded guide and catalog mapping describe label edits, hidden-state toggles, node/edge/neighbor inspection, and an app-owned in-memory snapshot of the existing saved document plus viewport. Each envelope composes the exported `SavedFlowDocumentSchema` with viewport validation; core persistence is unchanged. The guide distinguishes vanilla controller, Vue descendant composable, and Foldkit selector/typed-port entry points. Reload discards the example snapshot, and selection/preview remain transient. The upstream examples' styling controls and full save/restore behavior remain unmapped.

The three visible-control E2Es pass (Vanilla 1/1, Vue 1/1, Foldkit 1/1) at desktop and narrow viewports. They cover label edits, hidden node and incident edge output, node/edge/neighbor inspection, document and viewport restore, transient selection, missing snapshot, reset, and keyboard activation. Reset restores the input value as well as the original graph and viewport. Visual captures were inspected from `/tmp/flow-051-{vanilla,vue,foldkit}-{desktop,narrow}.png`; the Vanilla `playground-scene-chooser-darwin.png` baseline was regenerated with Playwright to include state controls in the bounded panel. The Vanilla state panel scrolls within 280px to clear the Transform node; the Vue panel was moved to expose the output handle after the existing connection test revealed the previous overlay intercepted it. Foldkit's sample edges have no labels because the current host renderer does not place edge labels; edge records and hiding outcomes remain covered by controls and tests.

`bun run check`, `bun run typecheck`, and `bun run test` pass (136 tests). API docs generation/check and the offline catalog checker pass (208 entries, 200 capabilities). Final `bun run verify` passes: Vanilla 191 passed / 2 existing native-pointer skips, Vue conformance 12 passed, Foldkit conformance 10 passed. `git diff --check` passes. Native multi-pointer behavior, upstream example parity, hosted CI, and publication remain unverified.

### Plan 053: measured geometry and readiness (in progress)

Core measurement state uses the existing `MeasuredNodeSchema`, keeps runtime measurements outside saved documents, tracks renderer generations, prunes removed nodes, and exposes immutable internal-node projections and readiness calculations. Vanilla and Vue observe DOM sizes and expose internal-node, readiness, and refresh methods. Vue batches generation registration and observer updates through indexed host-local state to avoid per-node schema-array scans. Foldkit's app-owned observers send schema-validated numeric measurements into separate graph-model measurement state; typed snapshot replies expose internal-node/readiness projections and correlated measurement-result responses settle explicit refreshes. A shared production conformance driver executes all five fixture cases in Vanilla, Vue, and Foldkit. Vanilla production E2E verifies DOM-to-graph conversion at zoom 0.5 and 2, two-canvas isolation, refresh disposal, and stable saved-document snapshots. Vue verifies queued refresh settlement on unmount; Foldkit verifies typed disposal results and observer disconnect/no callbacks after Runtime unmount. The pinned upstream capture at `0a1f9575b25679f2880175de8d3eae21aedde921` records initial and refreshed sizes, handle bounds, and readiness; two separate command runs each compare repeated observations, and normalized cases match. The 4,000-node isolated Vanilla performance case passes after measurement generation/application batching and allowing initial culling from declared geometry. The final `bun run verify` passed: 154 unit tests, packed consumer mount, Vanilla 206 passed / 2 existing native-pointer skips, Vue 28/28, and Foldkit 25/25. The upstream catalog checker passed with 208 entries / 200 capabilities. Foldkit desktop and narrow screenshots were inspected at `/tmp/flow-foldkit-measured-desktop.png` and `/tmp/flow-foldkit-measured-mobile.png`. Plan 053 implementation criteria are complete; `plans/README.md` remains for reviewer maintenance.

### Plan 054: node, edge, and handle renderer contracts (complete locally)

Vanilla, Vue, and Foldkit now accept per-type node and edge renderers as host configuration; these callbacks and framework views stay outside the saved graph. Same-type updates retain keyed identity, type changes replace the prior renderer, and unregistered types use each host's default fallback. All three hosts render five core path kinds from measured handle endpoints, default omitted paths to straight, use host-scoped marker definitions, SVG edge hit targets, and labels in host-owned graph-coordinate HTML overlays. Foldkit marker fill/stroke tracks each edge's stroke, including the default color. Vue label positions use core path geometry or a schema-validated custom anchor and disappear for hidden edges or endpoints. Foldkit edge hit targets activate by click, Enter, and Space. Tests cover dynamic handle relocation, custom data updates, type replacement and remove/re-add lifetime, unknown fallback, two-host marker isolation, native controls, hit-target interactions, and teardown. The Vanilla, Vue, and Foldkit playground scenes expose custom-node and custom-edge examples. Each host browser suite consumes the same schema-decoded fixed fixture and compares normalized node/edge identity, type, path, label, and marker semantics; it includes an omitted-path edge and asserts actual straight output. Foldkit also verifies open and closed arrow marker paint against a custom edge stroke. Rendered path endpoints must attach to measured handle boundaries within one CSS pixel. The tests wait for each framework's renderer to become ready before comparing, while keeping the normalized assertions identical.

`research/traces/shared-renderer-contract.md` traces the public production paths separately from host E2E and the bounded upstream comparison. The executable capture at pinned xyflow SHA `0a1f9575b25679f2880175de8d3eae21aedde921` ran twice in one invocation and compared normalized measured dimensions, handle bounds, built-in paths before/after refresh, a custom label, marker structure, and unknown fallback. The result is stored in `research/fixtures/renderer-contract-reference.json`; it does not establish whole-page or current-website parity. Full renderer props, reusable label/marker components, broad examples/UI coverage, cross-framework visual parity, and native multi-pointer behavior remain open.

The final local `bun run verify` passed: quality and architecture checks, docs, catalog, 2,142 trace citations across 51 traces, typecheck, 156 unit tests, packed-consumer mount, Vanilla 208 passed / 2 existing native-pointer skips, Vue 32/32, and Foldkit 28/28. `bun run scripts/check-react-flow-catalog.ts --upstream` verified all 208 dated entries (200 capabilities) against upstream. `bun install --frozen-lockfile` reported no changes, and `git diff --check` passed. These are local checkout results; hosted CI, device-specific native multi-pointer behavior, and complete React Flow parity remain unverified.

### Plan 055: viewport operations and coordinate contracts (complete locally, 2026-09-28)

The three hosts now expose asynchronous viewport operations with explicit result, cancellation, controlled-acknowledgement, and disposal behavior. Core owns pane-local fit and viewport math; host adapters own screen/client conversion, DOM measurement, animation scheduling, and observation callbacks. The examples expose centering, fit-selection, zoom, conversion markers, and animation replacement against custom-sized nodes. Shared fixtures and host browser tests exercise fit results, rendered transforms, conversions, reduced motion, controlled ownership, superseding requests, and teardown. The pinned upstream capture at xyflow SHA `0a1f9575b25679f2880175de8d3eae21aedde921` ran twice and produced matching normalized output, including fit examples, conversions, events, and interrupted animation.

The chosen pan-extent policy preserves Vanilla's existing programmatic constraint and does not add new Vue or Foldkit extent options. These latter host mappings are intentionally unsupported. The Vanilla public-operation enforcement cell, Vue/Foldkit extent behavior, and the upstream extent fixture remain unverified; the shared fixture explicitly excludes that cell. This is not a cross-host extent parity claim. CSS-transformed host coordinates remain unsupported. `research/traces/public-viewport-contract.md` and `docs/guides/viewport-operations.md` record the implementation boundaries and remaining cells.

Focused browser suites passed: Vanilla follow-up 10/10; Vue viewport operations 5/5 and demo 2/2; Foldkit viewport controls 1/1 and public-state 7/7. The final `bun run verify` passed (exit 0), including quality, architecture, docs, catalog, research trace checks, typecheck, 163 unit tests, packed consumer, Vanilla 213 passed / 2 existing native-pointer skips, Vue conformance, and Foldkit conformance. The upstream reference capture matched twice; `bun run scripts/check-react-flow-catalog.ts --upstream` passed with 208 entries / 200 capabilities. Hosted CI, CSS-transformed coordinates, native multi-pointer input, and the extent cells named above remain unverified. Plan status is maintained by the reviewer.

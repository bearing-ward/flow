# Flow project summary

## Project progress

Checked items work in the repository today. Unchecked items are still part of the planned project. Long-form plan and review narratives that used to live here are archived verbatim in [docs/archive/PROGRESS-narratives-2026-10-13.md](../docs/archive/PROGRESS-narratives-2026-10-13.md).

### Desired features completed (2026-10-26)

- [x] Wire ties, Plan 163: document bundles and v5 persistence; four-unit lane splines; toolbar slash guide/count; second ties; focusable perpendicular markers; live drag, capture/cancellation and auto-pan; removal, reconnection, deletion pruning, clipboard and history in Vanilla, Vue and Foldkit. All 57 browser cases pass, 19 per host, including shared routing around obstacles between ties. See [wire ties](../docs/wire-ties.md) and the [research trace](traces/163-wire-ties.md). This desired feature is outside the parity catalog.

### Current status (2026-10-14)

- Latest integrated features: `connectionDragThreshold` (Plan 098) and `nodeDragThreshold` (Plan 099) in Vanilla, Vue, and Foldkit.
- Main was red after Plan 099 because broad tests were deferred. The 2026-10-13 recovery fixed:
  - one stale Foldkit unit assertion, and a Foldkit app build that imported the Vanilla package `dist` after the Vanilla app build had emptied it;
  - about 60 outdated browser tests that assumed an eager connection start, or faked `lostpointercapture` while capture was still held. The tests now cross the one-pixel threshold and release real capture through `apps/shared-e2e/release-pointer-capture.ts`;
  - three real regressions: Vanilla left removed edges rendered after `update`, because a render pass aborted on its own measurement prune; Vanilla swallowed the first keyboard Enter after an Escape cancellation; and Foldkit ignored Escape during a Shift+Space keyboard selection.
- Open gap: Foldkit rectangle selection and node resize never take pointer capture, so a real capture loss (for example, an interrupted touch) does not cancel them. Vue and xyflow do take capture for these gestures. The former Foldkit capture-loss rows for these gestures only passed against synthetic events and were removed.
- Delivery loop from 2026-10-13: one plan of a page or less per feature, then implementation, targeted tests plus `bun run verify`, and one review pass before commit. No multi-judge reviews, hash ledgers, or recovery packets.
- Parity scope (decided 2026-10-13): parity means functional parity. An outcome counts once a developer or end user can achieve it with public Flow APIs in Vanilla, Vue and Foldkit. Stretch goals (Pro outcomes, the Workflow Editor templates and other long-tail entries) and intentional gaps (`useStoreApi()`, `ProOptions`) do not count toward parity. Scope widened 2026-10-25: the ten publicly listed Pro examples rated below close are now in scope, so 185 of 195 in-scope entries are close. The Workflow Editor templates and Rotatable Node remain stretch.
- Functional parity reached (2026-10-14): Plans 105-120 closed all six waves. The [parity audit](catalogs/react-flow-parity-audit-2026-10-13.json) now rates all 185 in-scope entries as close equivalents in Vanilla, Vue and Foldkit. Plans 105-117 carry the 2026-10-14 independent re-audit ratings. Plans 118-120 were rated by their implementers and checked by one independent review each. `bun run verify:full` passed on main after the Plan 120 merge:
  - 2494 unit tests;
  - Vanilla 628 browser tests passed, with 2 skipped;
  - Vue 799 browser tests passed;
  - Foldkit 373 browser tests passed.
- This is functional parity, not reference conformity: no live React comparison has been run. Each plan's "Conformity and deviations" section lists its intentional differences.
- Next work: a fresh independent re-audit of the Plan 118-120 entries; then reference evidence (the unchecked item below), or the stretch entries.

### Definitive project goal

Flow aims to match React Flow's public interfaces, examples, and reusable UI components and templates as closely as each supported framework permits. The target includes the complete [API reference](https://reactflow.dev/api-reference), [examples](https://reactflow.dev/examples), and [UI catalog](https://reactflow.dev/ui), including their sidebars and publicly listed Pro capabilities. Every demonstrated outcome should be achievable through supported Flow APIs and idiomatic integrations in plain JavaScript, Vue, Foldkit, and future supported adapters. Framework-specific hooks, providers, composition, reactivity, and lifecycle should have idiomatic equivalents; a reference-compatible adapter API may preserve a different internal contract. Optional integrations can live in core, adapters, reusable UI, or examples as appropriate. Track implementation and reference conformity separately per framework, classifying evidence as conforming, intentionally different, or unverified with a reason and test boundary. Current website catalogs define future coverage; the pinned source in `research/UPSTREAM.json` remains separate evidence and must not be presented as proof of current website behavior.

The catalogs were inventoried on 2026-09-26. The [catalog coverage map](catalogs/react-flow-coverage.md) records 200 capability entries: 114 API entries, 67 examples, and 19 UI components/templates. It retains eight navigation entries separately and includes the 16 publicly listed Pro examples. Every entry has an upstream URL, separate vanilla/Vue/Foldkit discovery status, a local evidence or gap mapping, and an explicit reference-proof boundary. The [dated snapshot](catalogs/react-flow-2026-09-26.json) and `bun run scripts/check-react-flow-catalog.ts --upstream` make sidebar changes detectable. These are coverage counts, not a parity percentage. See the [API correspondence matrix](../docs/react-flow-api-correspondence.md) for member-level mapping.

Review upstream additions at milestone boundaries. Detailed mapping should account for intentional internal differences, optional integrations, licensing constraints, and unavailable Pro evidence without silently excluding capabilities. Sequence the work as API mapping, shared capability work, framework and UI delivery, then catalog-wide proof. Deliver examples with each capability slice to expose missing contracts early; this sequence does not supersede unfinished correctness work.

- [x] Catalog baseline: map every API, example, and UI entry to a dated upstream URL.
- [ ] API correspondence: map each public contract to its closest practical equivalent and document necessary framework adaptations.
- [ ] Example coverage: demonstrate every catalog example through supported APIs, including required optional integrations.
- [ ] UI coverage: provide equivalents for every catalog component and template.
- [ ] Framework coverage: prove mapped capabilities separately in plain JavaScript, Vue, Foldkit, and future supported adapters.
- [x] Functional parity (2026-10-14 scope): all 185 original in-scope entries in the [parity audit](catalogs/react-flow-parity-audit-2026-10-13.json) are achievable in all three hosts.
- [ ] Pro parity: the ten Pro example entries added on 2026-10-25 are achievable in all three hosts.
- [ ] Desired features beyond React Flow: see [desired features](desired-features.md).
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

---

## Research source inventory

Commit: `3d35b57317576b0916c0bfeaaedd573aaacc2839`

| Root | Files | Lines |
| --- | ---: | ---: |
| `examples/react` | 193 | 14748 |
| `examples/svelte` | 101 | 5017 |
| `LICENSE` | 1 | 22 |
| `package.json` | 1 | 40 |
| `packages/react` | 136 | 13440 |
| `packages/svelte` | 144 | 9396 |
| `packages/system` | 54 | 8089 |
| `pnpm-lock.yaml` | 1 | 11794 |
| `pnpm-workspace.yaml` | 1 | 6 |
| `README.md` | 1 | 169 |
| `tests/playwright` | 15 | 3428 |
| `turbo.json` | 1 | 26 |

Indexed declarations: 665

Indexed call expressions: 6420

Test and E2E files: 50

The call-expression table is a syntactic index, not a verified call graph. Human-reviewed traces resolve runtime ownership and indirect framework calls.

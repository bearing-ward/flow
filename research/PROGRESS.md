## Project progress

Checked items work in the repository today. Unchecked items are still part of the planned project.

Current milestone: nested graph documents use local child positions and validated parent references; core graph views provide absolute geometry, bounds, visibility, ordering, and directed queries; version-1 saved documents preserve declared graph fields; and the vanilla host supports keyed custom renderers and flow-to-screen toolbar anchors. The vanilla development page demonstrates typed node and edge rendering with anchored controls.

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
- [ ] Clear the initial Ultracite findings and add the read-only check to `bun run verify`
- [ ] Add architecture-boundary checks
- [ ] Add continuous integration
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
- [ ] Trace spatial lookups
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
  - [ ] Support custom canvas options
- [x] Store and apply viewport translation and zoom
- [x] Pan with primary mouse or pointer input
- [x] Pan with touch input
- [x] Zoom with wheel input around the cursor
- [x] Zoom with pinch input
- [ ] Zoom with controls and double click
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
- [ ] Lock node position
- [x] Select one node by pointer and keyboard
- [x] Select nodes by additive input and a full-containment rectangle
- [x] Support partial-overlap rectangle selection and selection auto-pan
- [x] Move selected focused nodes with the keyboard
- [ ] Auto-pan while dragging or keyboard-moving
- [x] Hide and remove nodes
- [x] Support parent nodes, child nodes, and groups
- [x] Constrain pointer and keyboard node movement to a measured extent
- [x] Constrain initial and externally controlled node positions to extents
- [x] Snap pointer and keyboard node movement to an optional grid
- [ ] Resize nodes
- [x] Position node toolbars
- [x] Provide node focus, labels, and ARIA semantics
- [ ] Provide custom node descriptions

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

- [ ] Support configurable background patterns
- [ ] Provide zoom, fit-view, and interaction controls
- [ ] Provide a minimap with viewport navigation
- [ ] Provide panels and overlay portals
- [ ] Provide node and edge toolbars
- [ ] Decide and document attribution and licensing presentation

### Effect runtime and public API

- [x] Instrument document decode, host lifecycle, measurement, and drag changes with Effect spans and structured logs
- [x] Configure optional OTLP log, metric, and trace export in application composition
- [x] Verify browser OTLP/HTTP JSON serialization, transport, and log correlation
- [ ] Verify collector processing, storage, and queries for exported telemetry
- [x] Define services for element measurement and resize observation
- [ ] Define services for animation frames and focus
- [x] Define services for pointer capture and browser event boundaries
- [x] Scope listeners and observers to runtime lifetime
- [x] Cancel selection animation frames on gesture end and host destroy
- [x] Publish semantic input and change streams
- [x] Prove interruption and unmount cleanup
- [ ] Add structured diagnostics for gestures and invalid input
- [x] Expose native Effect programs and services
- [ ] Expose a small Promise and callback facade for ordinary JavaScript

### Plain JavaScript adapter

- [x] Provide a runnable browser host
- [x] Render the first canvas and node through the core package
- [x] Publish a reusable mount function
- [x] Accept custom node and edge renderers
- [x] Expose subscribe, dispatch, update, and destroy operations
- [x] Reconcile DOM elements without rebuilding the whole canvas
- [x] Remove all listeners and observers on destroy
- [ ] Verify a packed-package consumer

### Foldkit adapter

- [ ] Scaffold the Foldkit host
- [ ] Derive Model, Message, and OutMessage types from schemas
- [ ] Implement initialization, update, and view boundaries
- [ ] Implement commands and subscriptions for browser effects
- [ ] Keep child updates capability-scoped and typed
- [ ] Run the shared adapter-conformance suite

### Vue adapter

- [ ] Scaffold the Vue host
- [ ] Provide components and dependency injection
- [ ] Support model bindings for nodes, edges, and viewport
- [ ] Provide typed composables for state and actions
- [ ] Support custom node and edge components
- [ ] Keep reactive updates shallow and keyed
- [ ] Dispose watchers, listeners, and observers on unmount
- [ ] Run the shared adapter-conformance suite

### Testing and proof

- [x] Test schema decoding and rejection
- [x] Run the first host in a real browser
- [x] Store canvas and node screenshot baselines
- [x] Explain how to start the host when its HTML file is opened directly
- [ ] Capture deterministic behavior fixtures from the research host
- [ ] Run one shared conformance suite against every adapter
- [ ] Add visual checks for each completed feature
- [ ] Add pointer, touch, wheel, and keyboard interaction tests
- [x] Check edge roles, names, focus, keyboard actions, and hit targets in a browser
- [ ] Run a broader accessibility audit
- [ ] Add property tests for graph operations and coordinate conversion
- [ ] Add invalid-state and lifecycle-cleanup tests
- [ ] Add large-graph performance tests and budgets
- [ ] Verify installation from packed packages in a clean consumer

### Documentation and delivery

- [x] Document engineering standards and dependency decisions
- [x] Document the initial render call stack, types, seams, files, and tests
- [x] Keep this plain-English progress report in every generated summary
- [ ] Generate API reference material from the schemas
- [ ] Write a first-canvas tutorial
- [ ] Write guides for custom nodes, edges, gestures, and adapters
- [x] Record architecture decisions and rejected alternatives
- [ ] Document browser support and accessibility expectations
- [ ] Publish versioned packages and migration notes

# Pro delivery plans after Plan 149

Research baseline: [outcome audit](../research/traces/pro-parity-audit-2026-10-25.md) and the 2026-10-25 `reaudit` records in the [catalog](../research/catalogs/react-flow-parity-audit-2026-10-13.json). Each numbered unit below is a proposed implementation plan, kept below one page. These are proposals, not implementations or approved dependencies. Each plan must close its named outcomes in Vanilla, Vue and Foldkit before its catalog entry becomes C.

## Delivery rules

The sequence below is a dependency-safe order. Units 3, 4, 7 and 8 can proceed independently once their contracts are agreed. Unit 6 needs 4 and 5. Units 9, 10 and 11 are sequential. Unit 12 needs 1 and 2 and must account for the document extensions introduced by 3, 6, 7, 9 and 11. Unit 13 uses the final route and rendering contracts. Wire ties are a desired feature outside the parity denominator.

Keep pure graph operations, versioned schemas, typed Effect workflows and capability ports in `packages/core`. Put reusable framework integration in `packages/vue` and `packages/foldkit`, and browser/demo lifecycle in `apps/`. Engine, CRDT, transport and server dependencies belong to optional integrations, never core imports. Record owner, alternatives and removal boundary in `docs/dependencies.md` when an integration is actually approved and added.

Every unit includes pure unit tests plus public gesture tests in all three hosts. Compare the promised behavior against an accessible reference before claiming conformance. Keep hidden source details unverified. Use the named spans and attributes in `packages/core/src/telemetry/flow-telemetry.ts:1` and `packages/core/src/telemetry/flow-telemetry.ts:36`, especially `editPrepare`, `documentDecode`, `controllerUpdate`, `gestureCancel`, `hostMount`, `hostDestroy` and `editFailure`. Log decode, semantic commit, lifecycle and failure boundaries with the existing change/count/error attributes; no pointer-move logs. Application composition owns OTLP and shutdown. Collector delivery remains a separate test.

Run docs/catalog checks as appropriate, then the focused `scripts/with-flow-browser-lock.sh bun run verify` with the active work and browser scope updated, one worker. Use `verify:full` at integration/release milestones and before broad parity claims. None of these plans authorizes a push or merge.

## 1. Transaction history

Covers Undo and Redo. Depends on the existing atomic edit contract. Reuse the bounded Studio history behavior at `apps/shared/schema-studio/model.ts:230`; promote graph semantics into core instead of importing app-domain types.

- Shared core: a history state with past/present/future document snapshots, an explicit transaction origin and a gesture transaction boundary. Record accepted semantic changes, coalesce a complete drag, exclude measurement/selection/viewport noise, clear future after a new edit and reject failed edits without recording them. Keep the API capable of plugging in local-origin collaborative undo later.
- Per host: Vanilla controller controls/keyboard listeners; Vue composable plus toolbar; Foldkit model messages/subscriptions plus toolbar. All use the shared history owner and report empty-stack disabled states. Browser text inputs retain native undo.
- Acceptance: move/add/delete nodes and edges, undo/redo through buttons and Ctrl or Meta shortcuts, empty stacks, branch clearing, one drag equals one step, cancelled/rejected edits, controlled proposal rejection, isolation and disposal. Assert restored documents and rendered positions.
- Maintainer D1: recommend bounded session-only history, 100 transactions initially, with no viewport/selection history or reload persistence. Let applications configure capacity. Confirm this policy before API design.

## 2. Graph clipboard

Covers Copy and Paste. Depends on 1 so paste is one reversible transaction. Reuse the table/relationship remapping lessons in `apps/vanilla/schema-studio/main.ts:541` and `apps/foldkit/schema-studio/model.ts:266`; add a Vue integration and generalize beyond tables.

- Shared core: schema-decoded graph fragments, selected-node extraction, induced internal edges, fresh ID allocation, parent/handle remapping and graph-space paste placement. Preserve opaque JSON data. Remap extension-owned edge/parent references through explicit extension contracts rather than searching arbitrary strings.
- Per host: native selection and copy/paste shortcuts, focus guards and a paste preview or repeat offset. Vanilla owns DOM listeners, Vue owns composable cleanup, Foldkit owns message routing. Share the fragment reducer and tests.
- Acceptance: Shift selection-box gesture, mixed selection, nested groups, remapped endpoints/handles, repeated paste, collision-free IDs, malformed clipboard, missing parents, dangling edges, pan/zoom placement, text-input exclusion and one-step undo in every host.
- Maintainer D2: recommend an internal session clipboard first, copying selected nodes plus edges whose endpoints are both copied. Preserve nested children; detach copied roots whose parent is absent. Repeated paste offsets by 20 graph units. Optional system clipboard JSON requires an explicit version and its own permission/error UX.

## 3. Complete grouping actions and sizing

Covers Selection Grouping and Parent Child Relation. Depends on 1 for atomic grouping/ungrouping history.

- Shared core: ungroup all direct children while preserving absolute coordinates; explicit detach; refit parent bounds after child membership, position or measured-size changes without moving descendants. Reuse `groupNodes`, `getDropParentId` and `reparentNode`; keep cycle and missing-bounds rejection. Do not delete incident edges when deleting an empty group wrapper.
- Per host: contextual Group/Ungroup/Detach toolbars in Vanilla, Vue and Foldkit. Translate each host's accepted-state/measurement lifecycle into shared operations. Configure and verify the intended selection modifier rather than relying on different defaults.
- Acceptance: existing grouping/drop tests plus toolbar appearance, ungroup/detach without jumps, group drag, nested groups, automatic grow/shrink, changing labels/sizes, zoom, selection and save-load. One command must produce one undo step and stable edge attachments.
- Maintainer D3: recommend explicit Ungroup and Detach actions, 20-unit padding and direct-child auto-fit. Preserve existing drop-outside detach as an additional gesture. Retain full-containment/smallest-target attachment until a public reference proves another rule; do not claim exact overlap parity meanwhile.

## 4. Layout engine selection and force controls

Covers the remaining Auto Layout and Force Layout outcomes. Uses existing measured layout input; independent of grouping completion for top-level graphs.

- Shared core: stable layout request/result contracts keyed by document revision and settings. Validate parameters at the integration boundary; discard stale async results. Keep engine-specific algorithms in optional integrations. Add d3-hierarchy alongside existing Dagre/ELK adapters.
- Per host: switch engines on the same graph and expose direction/spacing controls. Add live force-strength and link-distance controls to each host's current simulation. Framework lifecycle owns timers/workers and cancellation; position application remains shared.
- Acceptance: same-document Dagre/hierarchy/ELK switching, measured-size changes, edge-only edits, rapid switches with stale ELK results, invalid/multi-root/cyclic input, user drag during force simulation, changed strength/distance, settling and disposal. Compare visible structural results, not identical engine coordinates by assumption.
- Maintainer D4: recommend Dagre default, hierarchy only for supported single-root trees with visible validation, and ELK opt-in. Keep measured variable sizes. Use the same force parameter ranges/defaults in all hosts; approve values from a reference-driven recipe before locking assertions.

## 5. Node position animation

Covers Node Position Animation and the transition dependency of Dynamic Layouting. Depends on 4's request/result identity.

- Shared core: pure interpolation and transition state keyed by node ID, with target revision and explicit finish/cancel/supersede results. One semantic destination edit belongs to history; animation frames are presentation state. Share geometry input so nodes and edges follow the same interpolated positions.
- Per host: browser frame scheduling in Vanilla, Vue scope cleanup, Foldkit animation messages and paint acknowledgments. Toggle horizontal/vertical destinations and support reduced motion. Rebase an interrupted transition on the displayed position and cancel when a user takes over a node drag.
- Acceptance: intermediate positions, exact final layout, attached edge paths and labels, rapid toggle, removal during animation, pan/zoom, manual drag, disposal, reduced motion and a single history action. Observe DOM output, not just interpolation values.
- Maintainer D5: recommend linear interpolation for the initial Pro behavior, a configurable 300 ms default, immediate completion under reduced motion, and no saved animation progress. Duration and interruption are proposed policy, not inspected Pro constants.

## 6. Dynamic tree editing and expand/collapse

Covers Dynamic Layouting and Expand and Collapse. Depends on 1, 4 and 5.

- Shared core: a complete tree plus an expanded-state map, visible node/edge projection, placeholder promotion, add-child and edge insertion as atomic edits. Preserve hidden descendants and their expansion state. Relayout only the visible projection; keep collapse hiding separate from the document's unrelated hidden flags.
- Per host: click-to-toggle and add-child controls, node/placeholder actions and edge plus buttons. All three hosts use the same reducers and layout/animation integration. Keep focus stable as subtrees disappear and return.
- Acceptance: promote placeholders, grow branches, insert between endpoints without losing edge data, collapse/expand multiple levels, add under a collapsed parent, animated relayout, save-load, undo, empty trees and deleted parents. Test pointer and keyboard controls in every host.
- Maintainer D6: recommend a single-root tree contract initially, with explicit rejection for cycles and multiple parents. Store expansion in versioned node data. Keep hidden data intact. Use d3-hierarchy for the reference recipe; do not silently reinterpret arbitrary graphs as trees.

## 7. Shape nodes and palette

Covers Shapes. Depends on 1 and 2 for reversible creation and copyable data.

- Shared core: a decoded shape discriminator/color contract and pure normalized SVG geometry for the advertised circle, diamond and hexagon set. Preserve graph meaning independently of SVG DOM. Define bounds and handle anchor policy explicitly.
- Per host: a sidebar creates nodes through a shared edit, one custom node renderer selects SVG shape by data, a contextual color toolbar updates it, and custom minimap rendering follows the same shape. Vanilla owns DOM/SVG, Vue components and Foldkit renderer registries own their framework views.
- Acceptance: choose/create every shape, change color, minimap shape/color updates, connect and move nodes, pan/zoom, roundtrip data, clipboard, undo and malformed persisted shape data. Verify handles remain attached after size/color changes.
- Maintainer D7: recommend normalized geometry scaled to explicit node bounds with a fixed initial palette. Keep custom arbitrary SVG outside the decoded shape recipe contract. Confirm whether resize is required for the first delivery; the public description does not specify it.

## 8. Alignment helper lines

Covers Helper Lines. Depends on the current drag/coordinate lifecycle, with 1 owning the final history action.

- Shared core: a pure measured-bounds alignment solver that returns candidate horizontal/vertical guides and a snapped graph-space group delta. Exclude dragged nodes from candidates, account for parent coordinates and define precedence against fixed-grid snapping.
- Per host: feed the shared solver during drag, render guides in a graph-space overlay and clear them on commit/cancel/unmount. Vanilla, Vue and Foldkit must use the same accepted drag position and preview geometry. Reuse capture/autopan rules.
- Acceptance: horizontal/vertical alignment, edge/center candidates, tolerance boundary, multiple selection, nested parents, pan/zoom, grid conflict, pointer cancellation, auto-pan and cleanup. Assert final positions and guide coordinates in all hosts.
- Maintainer D8: recommend a 6 CSS-pixel activation tolerance converted to graph units, deterministic nearest-candidate choice, center/edge ties resolved consistently, and alignment snapping taking precedence while a guide is active. Validate these proposed values against the public demo before finalizing them.

## 9. Editable and freeform edges

Covers Editable Edge. Depends on 1 and the existing renderer/connection contracts. Must precede 10 and 11.

- Shared core: schema-decoded ordered graph-space control points, pure path generation, route-change operations, endpoint reattachment rules and point hit testing. Keep geometry shared so rendered paths, labels, selection and intersections agree. Preserve opaque edge data separately from typed route fields.
- Per host: draggable/focusable point handles and a Space-held custom connection preview that samples freeform points. Resolve Space's pane-pan/keyboard activation conflict at gesture entry. Hosts own capture, screen conversion, auto-pan and cancellation.
- Acceptance: create a Space freeform connection, drag/add/remove points as approved, move endpoints, reconnect, select/label ordinary edges, save-load, clipboard, undo, transformed viewport, cancel and dispose in all hosts. Assert the final rendered path and stored points.
- Maintainer D9: recommend explicit manual versus automatic route modes, ordered graph-space points and one history entry per point drag. Reconnecting an endpoint retains interior points initially; reject degenerate geometry. Confirm point add/remove gestures and route schema ownership before implementation.

## 10. Obstacle-aware routing

Covers Edge Routing. Depends on 9's route contract; must precede wire ties.

- Shared core: obstacle rectangles/ports and route constraints as pure inputs, a router capability with typed failure/cancellation, revision-keyed output and one common rendered-path result. Route around changed nodes without rewriting user-owned manual points. Keep generated paths derived from document intent.
- Per host: measure obstacle/handle changes and render accepted routes without stale frames; show an explicit failure/fallback state. Each host needs move/resize/reconnect examples and the same routing fixtures.
- Acceptance: detour around nodes, moved/resized obstacles, port directions, unreachable targets, async races, manual-route preservation, cancellation, label/hit-test geometry, save-load reconstruction and all-host path output.
- Maintainer D10: compare [libavoid-js](https://github.com/Aksem/libavoid-js), existing [ELK routing](https://reactflow.dev/learn/layouting/layouting#routing-edges), and a new pure router. Recommend an optional libavoid adapter for the incremental Pro case, pending package/license/distribution review. ELK is already familiar but does not imply incremental edge routing parity; a new router adds algorithm maintenance. Confirm manual/automatic precedence and the no-route fallback before adding a dependency.

## 11. Wire ties

Desired feature, outside Pro parity. Depends on 1, 2, 9 and 10. Source: [desired feature breakdown](../research/desired-features.md), including its seven unresolved decisions.

- Shared core: versioned document bundles with ordered edge IDs and graph-space tie points; add/update/remove events; slash intersections sorted by crossing order; lane-offset splines with tangent-continuous fan-in/out; obstacle constraints from 10. Reuse path flattening/intersections, but add slash-distance ordering explicitly. Bundled paths must be the same paths used by labels, selection and events.
- Per host: explicit tie-tool activation, slash guide/count tooltip, “Add a second tie”, perpendicular marker, live draggable tie point, keyboard focus and capture/cancel/autopan behavior. Vanilla, Vue and Foldkit each get a recipe.
- Acceptance: slash several mixed-color/source/target edges, crossing order, ribbon spacing, second tie, drag, node movement, pan/zoom invariance, removal/reconnection/deletion, save-load, clipboard and undo. Assert continuity and obstacle clearance as well as visible output.
- Maintainer D11: recommend an explicit toolbar tie mode, focusable/selectable markers removed with Delete, one bundle membership per edge with many ties in that bundle, an explicit remove-edge-from-bundle action, versioned document serialization, deletion pruning empty bundles, and reconnection retaining membership/points while rerouting endpoints. These are proposals because the recording does not show them. Confirm lane spacing and minimum bundle size, recommending 4 graph units and two edges initially.

## 12. Collaborative rooms

Covers Collaborative. Depends on 1 and 2, and on explicit handling of the earlier document extensions.

- Shared core: decoded semantic updates, transaction origins, durable shared fields versus local selection/measurement/viewport and ephemeral presence. Use a sync capability in optional integration code; Effect owns room acquire/reconnect/release and typed failures. Local undo targets only local origins. Graph integrity must survive concurrent deletion and movement.
- Per host: room/share URL, isolated default rooms, right-click node creation, remote live movement and presence, connection status and disposal. Vanilla listeners, Vue scopes and Foldkit ports all bind to the same room contract.
- Acceptance: two isolated rooms and two clients in one room, mixed-host edits, live drag, simultaneous changes, delete-versus-move, disconnect/rejoin convergence, duplicate delivery, local undo without undoing peers, clipboard IDs and presence cleanup. Test real transport; in-memory merge tests alone do not close this example.
- Maintainer D12: options are [Yjs + y-websocket](https://docs.yjs.dev/ecosystem/connection-provider/y-websocket), [Automerge](https://automerge.org/docs/) or a server-authoritative service. Recommend optional Yjs/y-websocket for the first recipe, matching the public example and providing a documented room transport. Keep it out of core. Approve transport hosting, authenticated room access, server durability and offline retention separately; an anonymous local demo is not a production authorization policy.

## 13. Server-side image service

Covers Server Side Image Creation. Depends on shared geometry and all supported render contracts, especially 7, 9, 10 and 11.

- Shared core: a decoded export request, explicit node/handle bounds, viewport and export-scene contract independent of DOM. An optional server integration owns rendering resources, request cancellation and typed failures. Snapshot the requested revision so an older response cannot replace a newer preview.
- Per host: a deterministic capture route for Vanilla, Vue and Foldkit plus side-by-side live graph/server-image previews. The server returns image bytes; no client `html-to-image` shortcut. Bundle approved fonts/assets and provide a runnable backend/container.
- Acceptance: invoke the real server for each host, edit and refresh preview, verify graph/edges/custom supported content in the image, explicit size/fit, hidden nodes, stale requests, missing assets, invalid input, timeout and resource cleanup. Test container startup and repeatable capture readiness.
- Maintainer D13: compare [Playwright Chromium](https://playwright.dev/docs/screenshots), [Puppeteer](https://pptr.dev/guides/screenshots) and a pure SVG renderer with [resvg](https://github.com/linebender/resvg). Recommend Playwright Chromium for image output because existing host HTML/CSS/custom renderers can be captured. Puppeteer matches the Pro example but adds another browser automation dependency. Pure SVG requires a restricted renderer contract. Approve supported renderer/font/asset scope and whether DOM-free static HTML is separately required. Recommend image-service parity first; a headless browser service must not be labeled universal SSR or static-HTML parity.

## Maintainer decisions

D1-D13 above each give a recommendation at the point of implementation. The blocking integration choices are D10 routing, D12 synchronization and D13 rendering. D11 must be settled before committing a bundle schema. D1/D2 transaction-origin and reference-remapping contracts must support those later extensions without introducing framework dependencies. No maintainer answer is required to commit this research report.

External option pages linked above were accessed on 2026-10-25. Recommendations are design judgments, not verified compatibility or dependency approval. No new dependencies were installed.

## Maintainer decisions recorded 2026-10-25

- **D1–D9 and D11:** adopt the recommendations above as written.
- **D12, sync layer:** optional Yjs + y-websocket integration, kept out of core. Hosting, authenticated room access, durability and offline retention still need separate approval.
- **D13, image renderer:** Playwright Chromium image service.
- **D10, routing:** decided 2026-10-26; the maintainer deferred to the recommendation. Use libavoid-js through an optional adapter package that ships separately from core and the host adapters, using libavoid unmodified, so no LGPL obligation reaches Flow's own packages. Core defines a router capability, and the adapter implements it, so ELK or a Flow-written router can replace it without changing the API. Findings from 2026-10-25, via the GitHub and npm APIs:
  - **License:** LGPL-2.1-or-later. It is a weak copyleft, not a permissive license like MIT or Apache.
  - **Maturity:** the latest npm release is `0.5.0-beta.5`, published 2026-02-23. The repository has 46 stars and was last pushed on 2026-09-06.
  - **Size:** the WASM build of the C++ libavoid is about 0.8 MB unpacked.
  - **Licensing for Flow:** Flow declares no license. Using the unmodified library as a separately installed optional dependency of an adapter generally lets an MIT or proprietary Flow remain unaffected. However, applications that bundle it must let users replace the library, and changes to libavoid itself must be released under the LGPL.
  - **Alternatives:** ELK, which is EPL-2.0 and already a dependency, and a pure router written in Flow, which needs no new license.
  - This is not legal advice.

# Plan 001: Stabilize the graph document and extensible rendering contracts

> **Executor instructions:** Read this entire plan before editing. Implement the
> steps in order and run each verification gate. Stop under the conditions below
> instead of inventing a new contract. Update `plans/README.md` only after the
> final gate passes. This is one milestone with two dependent parts: graph
> semantics first, renderer integration second.
>
> **Drift check, run first:** This repository had no commit on `main` when the
> plan was written. Run `git rev-parse --verify HEAD` and compare the SHA-256
> values in the baseline table below with `shasum -a 256` for those files. If a
> commit now exists or a hash differs, inspect the current code against the
> excerpts and stop if a named contract has changed. Do not overwrite any
> existing work. Before editing, record `git status --short --untracked-files=all`
> and a source-file hash inventory so the final scope review can distinguish
> pre-existing untracked files from executor changes.

Create that inventory with:

```sh
rg --files packages apps docs research -g '!research/artifacts/**' -g '!research/generated/**' | sort | while IFS= read -r file; do shasum -a 256 "$file"; done > /tmp/flow-plan-001-before.sha256
```

Run the same pipeline with `/tmp/flow-plan-001-after.sha256` at the final scope
review and compare with `diff -u`. An added or changed path outside Scope is a
STOP condition. The inventory excludes imported and generated research files;
check those separately with the artifact regeneration rules.

## Status

- **Priority:** P1
- **Effort:** L, several implementation slices
- **Risk:** HIGH, coordinate and lifecycle changes touch most interactions
- **Depends on:** none
- **Category:** direction
- **Planned at:** unborn `main`, 2026-09-23; no Git commit exists

## Why this matters

The current canvas renders flat nodes with fixed DOM content. A child position
would currently be interpreted as a canvas position by dragging, edges, culling,
selection, and fit view. A custom node could also change size after render, but
the current 150 by 44 fallback and fixed content path give callers no stable
size or renderer lifetime contract. Set these rules once in the core and the
vanilla host before Foldkit and Vue consume them.

## Current state and decisions to preserve

- `CONTEXT.md:7-14` names the caller-owned serializable flow document, host
  session, derived geometry, transient gesture, and host. Use those terms.
- `docs/standards.md:7-16` requires Effect workflows, Schema-derived types,
  unknown-input decoding, graph knowledge in `packages/`, browser ownership in
  `apps/`, and `bun run verify`. `docs/architecture.md:18-23` rejects storing
  **measured** size in `FlowNode` and passing DOM elements into core.
- `packages/core/src/domain/flow.schema.ts:44-56` currently defines nodes as
  `id`, required `label`, absolute `position`, handles, and interaction flags.
  `flow.schema.ts:83-113` defines built-in edge paths and a document of node and
  edge arrays. There is no parent, node type, data, or author-declared size.
- `flow.schema.ts:128-205` validates unique IDs and edge endpoints and handles.
  `flow.schema.ts:239-277` composes integrity and structural decode under
  `FlowSpan.documentIntegrity` and `FlowSpan.documentDecode`. Follow this error
  and telemetry pattern for parent failures.
- `packages/core/src/domain/flow-runtime.schema.ts:92-107` emits final node
  position changes. Its group and keyboard moves at `:527-571` operate on the
  stored position directly; `:595-638` applies the final positions to the
  document. Keep changes in document coordinates, including for children.
- `packages/core/src/domain/flow-fit-view.ts:57-75` unions node positions with
  measured or fallback dimensions. `flow-visibility.schema.ts:45-66` and
  `:68-119` assume absolute positions and compute node and edge visibility;
  `:122-190` owns selection and edge ordering.
- `apps/vanilla/src/mount-flow.ts:250-266` replaces node content with a label
  and handle buttons. `:327-329` holds keyed DOM entries, measurements, and
  transient positions. `:439-470` measures through one observer. `:1145-1338`
  reconciles keyed nodes and culling. `:3200-3225` calls fit view with a 150 by
  44 fallback. `:3368-3409` is the unknown-input JavaScript boundary.
- `apps/vanilla/src/edge-renderer.ts:38-60` owns SVG layers and keyed edges;
  `:139-235` selects built-in geometry and `:237-428` updates SVG, hit paths,
  labels, markers, stacking, and cleanup. Preserve host-owned hit targets and
  accessible names with custom visuals.
- `apps/vanilla/src/style.css:108-125` sets default minimum node size and
  hides nodes until measurement. `apps/vanilla/e2e/controller-conformance.ts:21-68`
  is the browser mount pattern; `:90-132` checks keyed identity and ordering.
- The pinned reference at `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/`
  uses parent lookups in `packages/system/src/utils/store.ts:61-76`, warns for
  missing parents in `:216-229`, and accepts renderer registries in
  `packages/react/src/container/GraphView/index.tsx:43-44`. These are research
  leads, not a compatibility requirement. Flow should reject invalid parent
  graphs at decode, just as it rejects missing edge endpoints.

Verified excerpts to match before changing the contract:

```ts
// packages/core/src/domain/flow.schema.ts:44-50
export const FlowNodeSchema = S.Struct({
  id: NodeIdSchema,
  label: S.String,
  position: XYPositionSchema,
  handles: S.optional(S.Array(FlowHandleSchema)),
  selected: S.optional(S.Boolean),
  selectable: S.optional(S.Boolean),
});

// apps/vanilla/src/mount-flow.ts:250-253
const renderNodeContents = (element: HTMLElement, node: FlowNode): void => {
  const label = globalThis.document.createElement("span");
  label.textContent = node.label;
  element.replaceChildren(label);

// packages/core/src/domain/flow-fit-view.ts:57-69
for (const node of nodes) {
  const measurement = measurements.get(node.id);
  const dimensions =
    measurement !== undefined &&
    measurement.width > 0 &&
    measurement.height > 0
      ? measurement
      : fallbackDimensions;
  if (node.hidden === true || dimensions === undefined) {
    continue;
  }
}
```

Follow the existing `S.Struct` plus `typeof Schema.Type` pattern in
`flow.schema.ts:36-56`, tagged integrity errors and `Match.tagsExhaustive` in
`:115-125` and `:207-237`, and Effect spans and structured logs in `:239-277`.
For browser tests, follow the real `mountFlow` pattern in
`apps/vanilla/e2e/next-slices.e2e.ts:12-59`.

Baseline hashes for the most fragile paths:

| File | SHA-256 |
| --- | --- |
| `packages/core/src/domain/flow.schema.ts` | `3a56d94d7eb60555665085f6531b2eec91205e96b2cc412f18d84aa99a250fb3` |
| `packages/core/src/domain/flow-runtime.schema.ts` | `ea32ad70bd5841a422d40b6e74ff58179ca61ea2d50b8868da788119fcb8c4ed` |
| `packages/core/src/domain/flow-visibility.schema.ts` | `dc680df2a97afec927b13886c8674b2de4a7dc75e1d175ef4505df28fcab24c2` |
| `packages/core/src/domain/flow-fit-view.ts` | `6f6705348dce67a7e4d069b7b5017fab87959c271c3ab66a56fe8bc1994941bd` |
| `apps/vanilla/src/mount-flow.ts` | `00aa95d970c307d6dda92ecc82634093317cfe044c4b1e540f23bca8b9b87b17` |
| `apps/vanilla/src/edge-renderer.ts` | `97e329778d7b570f3539b7e8c435aeb61a2e11bb8e3f462d33784f8119b4b5d3` |
| `apps/vanilla/src/style.css` | `85be99272167b804df3bc54163a2f70592061fba6c861c6eb826e2ad430c5211` |

## Target contract

Use this contract unless the first research step finds a conflict with a
documented Flow decision. Record any justified change in `docs/architecture.md`
before implementation.

1. `FlowNode.position` is in its parent's local coordinate system when
   `parentId` exists and in flow coordinates otherwise. Parent chains have no
   missing ID, self-reference, or cycle. Document array order does not affect
   ancestry. A flat node keeps its current meaning. Compute absolute position
   once in a pure core graph view; never persist that derived value.
2. A node with children is a group through `parentId`; no separate `isGroup`
   boolean. Add optional `type`, JSON-serializable `data`, finite `zIndex`,
   and an author-declared positive `size`. `size` sets the wrapper's intended
   width and height and supplies geometry before measurement. Live measurements
   remain in host runtime state and supersede declared size for geometry.
   Keep `label` required for the fallback renderer and accessible name.
3. Add optional child `extent: "parent"`. It constrains the child wrapper to
   the parent's current measured size, or declared size until measurement.
   Reject `extent: "parent"` without `parentId`. Preserve the existing global
   `nodeExtent` option for roots. Do not add automatic parent expansion here.
4. Parent movement moves descendants visually by deriving their absolute
   positions; only the parent's local position changes. If a selected parent
   and descendant move together, emit one entry for the parent, not a second
   movement for its selected descendant. Direct child moves emit local values.
   Define order as stable sibling `zIndex` then document index, with each parent
   behind its descendants. Hidden parents hide descendants and incident edges.
5. Provide pure core queries for node lookup, ancestors/descendants, absolute
   positions, bounds, rectangle intersections, incomers, and outgoers. Queries
   consume a validated document plus optional measurements and return values,
   never DOM nodes. Use them in fit, culling, selection, and edge geometry so
   those paths agree about ancestry and size.
6. Keep `FlowDocument` a bare `{nodes, edges}` value so existing callers still
   decode. Add a separate saved-document envelope with an integer version of
   `1`. Encoding writes only declared document fields; decoding rejects unknown
   versions and runs `decodeFlowDocument` after structural parsing. Round trips
   preserve parent IDs, local positions, types, JSON data, declared sizes, and
   stacking, but never `selected` flags, measurements, viewport, gesture state,
   DOM, callbacks, or renderer registries. Loading a saved document therefore
   produces unselected nodes and edges. Document what happens to existing bare
   JSON; do not silently reinterpret it as a saved envelope.
7. Core owns renderer-independent node and edge model and geometry. The vanilla
   host accepts mount-time registries keyed by `type`. A node renderer receives
   its decoded node and a content container and returns an `update` and
   `destroy` lifecycle; an edge renderer receives decoded edge and resolved
   flow-space endpoints/path context and owns only a visual SVG subtree. The
   host owns keyed wrappers, sizing, handles, hit targets, focus, selection,
   markers, labels, observers, and teardown. A custom edge spec supplies a
   pure path string and label anchor from core flow-space endpoints; the host
   uses that same path for its hit target. Missing registrations use visible
   built-in fallback visuals. Store renderer callbacks outside Schema as host
   options; never serialize functions or push DOM types into `packages/core`.
8. Expose pure flow-to-screen anchor geometry for node and edge toolbars and an
   optional vanilla toolbar mounting hook that uses it. Anchor updates follow
   node drag, measurement, viewport changes, culling, and removal. Toolbar DOM
   and cleanup remain in the host. Do not build the reusable toolbar UI here.

## Commands

| Purpose | Command | Expected result |
| --- | --- | --- |
| Dependencies, if absent | `bun install --frozen-lockfile` | exit 0, lockfile unchanged |
| Typecheck | `bun run typecheck` | exit 0 |
| Core tests | `bun run test` | exit 0, including new graph and persistence cases |
| Focused browser tests | `bunx playwright test apps/vanilla/e2e/graph-renderers.e2e.ts` | exit 0, all new cases pass |
| Complete local gate | `bun run verify` | inventory, citation check, typecheck, tests, build, browser all exit 0 |

The advisor did not run these commands. `bun run verify` writes generated
research and build artifacts, which this read-only planning pass cannot run.

## Scope

**Files the executor may change:** `packages/core/src/domain/flow.schema.ts`,
`flow-runtime.schema.ts`, `flow-visibility.schema.ts`, `flow-fit-view.ts`,
`flow-edge.schema.ts`, `flow-node-extent.schema.ts`, their corresponding
`*.test.ts` files, new `flow-graph.ts`, `flow-graph.test.ts`,
`flow-persistence.ts`, `flow-persistence.test.ts`,
`flow-toolbar-anchor.ts`, `flow-toolbar-anchor.test.ts`,
`packages/core/src/public.ts`, `apps/vanilla/src/mount-flow.ts`,
`edge-renderer.ts`, `public.ts`, `style.css`, `main.ts`, a new
`apps/vanilla/e2e/graph-renderers.e2e.ts`, `docs/architecture.md`,
`research/PROGRESS.md`, a new
`research/traces/nested-graph-and-renderers.md`,
existing files under `research/traces/` (only to refresh citations made stale
by the in-scope source refactors; do not otherwise rewrite their research),
and `plans/README.md`.
Additional schema-backed error files in `packages/core/src/domain/` are allowed
only for parent-integrity failures. Keep existing tests green; update a test
fixture only where the added document fields require it.

**Out of scope:** `research/artifacts/**`, `research/generated/**` by hand,
Foldkit and Vue adapters, resize gestures, touch connections, minimap,
backgrounds, generic overlay/panel UI, OTLP exporter configuration, package
publishing, a new dependency, and a new persistence backend. Do not hand-edit
the imported reference or generated summary. Do not turn similarity with
xyflow into a parity claim.

## Git workflow

The checkout is on unborn `main`, and all project files are currently
untracked. Do not commit, push, create a PR, reset, or clean the tree without
explicit operator instruction. Work only in this checkout and preserve
unrelated files. A later reviewer can choose how to establish the first commit.

## Steps

### 1. Trace the reference and record Flow's chosen rules

Read the pinned React public entry and `GraphView`, the Svelte graph entry,
the system parent lookup and drag utilities, node and edge wrappers, toolbar
positions, and relevant reference tests. Start at each public browser entry
and trace store state, absolute geometry, DOM output, and the test path
separately. Write `research/traces/nested-graph-and-renderers.md` with exact
`path:line` citations and end with `Conformity and deviations`; classify every
compared behavior and name the proof boundary. Add the selected Flow coordinate,
visibility, order, size, and renderer lifetime rules to `docs/architecture.md`.

**Verify:** `bun run research:check-traces` exits 0. The new trace has the
required final heading and citations; no imported artifact changed.

### 2. Add document fields and parent integrity

Extend `FlowNodeSchema` with optional `parentId`, `type`, JSON object `data`,
finite `zIndex`, positive finite `size`, and `extent: "parent"`. Extend
`FlowEdgeSchema` with an optional custom renderer `type` while preserving the
existing `path` choices. Do not use `S.Unknown` as the persisted data contract:
reject functions, symbols, cycles, non-finite numbers, and other non-JSON
values at the boundary. Derive exported types from schemas. Add tagged,
schema-backed missing-parent, self-parent/cycle, and parent-extent errors to
the integrity union and exhaustive telemetry attributes. Validate parent
relationships after duplicate IDs and before edge relationships. A valid
document must retain identity through `validateFlowDocument`.

**Verify:** `bun run typecheck` and `bunx vitest run packages/core/src/domain/flow.schema.test.ts`
both exit 0. New cases accept reordered parent/child input and reject missing
parent, self-parent, longer cycle, parent extent on a root, and non-JSON data.

### 3. Centralize graph geometry and queries

Implement `flow-graph.ts` as a pure view over a validated document. Compute
parent lookup, absolute node positions, inherited hidden state, ordered
subtrees, dimensions from measured then declared then current 150 by 44
fallback, bounds/intersections, and directed incomer/outgoer queries. Return
stable IDs and schema-derived records; do not store DOM state or mutate the
document. Export the public query functions from `packages/core/src/public.ts`.
Refactor fit, visibility, selection, and edge endpoints to consume this shared
view, removing direct use of local child coordinates as flow coordinates.

**Verify:** `bun run typecheck` and `bunx vitest run packages/core/src/domain/flow-graph.test.ts packages/core/src/domain/flow-fit-view.test.ts packages/core/src/domain/flow-visibility.schema.test.ts`
both exit 0. Tests include a three-level chain, reordered records, hidden
ancestor, explicit size before measurement, measured-size precedence, edge
across groups, cycle rejection at the decode boundary, and empty queries.

### 4. Make movement preserve local coordinates

Update core drag, group, keyboard, snapping, and extent helpers to use the
graph view for absolute pointer calculations and to emit local child positions.
When selected ancestors and descendants overlap, move only the highest
selected ancestor; this avoids double movement. Apply parent bounds to direct
child movement and the global extent to roots. Keep controlled acknowledgement
and single final semantic changes. Update the vanilla host's transient visual
position map and edge reconciliation to use derived absolute positions.

**Verify:** `bun run typecheck` and `bun run test` exit 0. New unit cases assert
parent-only motion, direct child motion, mixed selection without double move,
parent extents, and controlled change payloads in local coordinates.

### 5. Add versioned persistence

Implement `flow-persistence.ts` with `SavedFlowDocumentSchema`,
`encodeSavedFlowDocument`, and `decodeSavedFlowDocument`. Use an explicit
version `1` envelope, JSON-safe fields, and the existing decode plus integrity
workflow. Reject unknown versions and invalid parent graphs after load. Keep
renderer registries and measured/session state outside the envelope. Document
the bare document versus saved envelope boundary in `docs/architecture.md`.

**Verify:** `bunx vitest run packages/core/src/domain/flow-persistence.test.ts`
and `bun run typecheck` exit 0. Tests round-trip a nested typed graph, reject an
unsupported version, and prove omitted runtime fields stay omitted.

### 6. Add renderer registries and declared sizing to the vanilla host

Add host-only node and edge registry types to `mount-flow.ts` and re-export
them from `apps/vanilla/src/public.ts`. Keep callback functions outside
`FlowMountOptionsSchema`; decode the serializable options first as
`mountFlow` does at `:3368-3384`. Renderer lifetimes attach to keyed entries:
`mount`, `update`, and `destroy` on type change, removal, culling, and host
destroy. Preserve wrapper identity and observer ownership when only data
changes. Render declared node size on the wrapper. Keep handles in a host-owned
layer so custom content cannot silently remove connection targets. For edges,
custom SVG content replaces only the visible path subtree. Require the custom
edge spec to return its flow-space `pathData` and label anchor from resolved
endpoints; use `pathData` for the host-owned transparent hit path. The host
keeps edge identity, focus, selection, reconnect anchors, labels, markers, and
cleanup. Missing type registrations render a visible fallback with the
existing label or path and an accessible name.

**Verify:** `bun run typecheck` and the focused browser command in the table
exit 0. Cases check two custom node types and one custom edge type, data-only
update with keyed identity, type swap cleanup, unknown-type fallback, handle
connection, keyboard selection, culling/remount, and destroy cleanup.

### 7. Expose anchored toolbar geometry and demonstrate the contract

Add pure node and edge anchor functions in
`packages/core/src/domain/flow-toolbar-anchor.ts`. Use flow geometry plus
viewport to return screen positions and test them in
`flow-toolbar-anchor.test.ts`.
Provide an optional host toolbar mounting hook whose DOM lifetime follows the
keyed graph element. Make the demo in `apps/vanilla/src/main.ts` show one custom
node, one custom edge, and anchored node and edge toolbars. Toolbar positions
must update after drag, size observation, pan, zoom, culling, and removal.
Keep toolbar controls host-owned and outside the persisted document.

**Verify:** `bunx vitest run packages/core/src/domain/flow-toolbar-anchor.test.ts`
and `bunx playwright test apps/vanilla/e2e/graph-renderers.e2e.ts` exit 0.
Browser cases assert anchor coordinates before and after pan/zoom and drag,
plus toolbar removal when its element is hidden or deleted.

### 8. Finish the milestone proof

Run `bun run verify`. Update only verified checkboxes in `research/PROGRESS.md`:
nested graph, document fields, graph queries, persistence, custom renderers,
and toolbar anchors. Keep broader adapter conformance, resize, UI controls,
and direct reference parity unchecked. Review the final diff for scope and
confirm the docs describe measured versus declared size and local versus
absolute position accurately.

**Verify:** `bun run verify` exits 0. Compare the pre-edit source hash inventory
and `git status --short --untracked-files=all` with the final inventory and
status; every new or changed source path must be in Scope. `git diff --stat`
alone cannot prove this while the repository has no first commit.

## Test plan

- Extend `flow.schema.test.ts` for new field decoding and typed parent errors,
  following its existing duplicate-ID and edge-endpoint tests.
- Add `flow-graph.test.ts` for coordinate, ancestry, order, size, visibility,
  bounds, intersection, and directed-neighbor semantics. Extend fit and
  visibility tests to prove that the same absolute boxes drive both.
- Extend `flow-runtime.schema.test.ts` for nested drag and selected-group
  changes. Add persistence round trips in `flow-persistence.test.ts`.
- Add `graph-renderers.e2e.ts` using the `mountFlow` import pattern in
  `apps/vanilla/e2e/next-slices.e2e.ts:12-59` and the keyed identity assertion
  in `controller-conformance.ts:90-132`. Exercise real DOM measurements,
  interactions, culling, focus, and teardown. These Flow tests establish Flow
  behavior. Reference parity requires a separate direct comparison test.

## Done criteria

- [ ] Parent validation rejects missing references, cycles, and invalid parent
      extents with typed failures, before host state exists.
- [ ] Flat documents retain existing position, rendering, and change behavior.
- [ ] Nested node bounds, edges, fit, culling, selection, drag, and keyboard
      movement agree on derived absolute geometry; emitted positions stay local.
- [ ] Graph queries and saved-document version 1 have passing unit tests.
- [ ] Custom node and edge visuals preserve host-owned interaction and cleanup.
- [ ] Declared and measured sizing precedence is browser-tested.
- [ ] Toolbar anchors update and dispose in browser tests.
- [ ] Research trace ends with `Conformity and deviations`; no unsupported
      parity claim or imported-artifact edit appears.
- [ ] `bun run verify` exits 0; `plans/README.md` marks this plan DONE.

## STOP conditions

Stop and report if a baseline contract changed since this plan, if Effect
`4.0.0-rc.117` cannot express the JSON data schema without adding a dependency,
if preserving controlled mode requires a new public change vocabulary, if a
custom edge visual cannot retain the existing host-owned hit and focus behavior,
if implementing a step needs an out-of-scope file or dependency, or if a gate
fails twice after a focused correction. Propose the narrow contract decision
needed; do not improvise a compatibility layer.

## Maintenance notes

Future resize interactions must update declared size through a semantic change
without copying live measurement into the document. Foldkit and Vue should use
the same document and geometry rules but own their framework render lifetimes.
Reviewers should check child motion under a selected parent, culling remounts,
callback cleanup, and the saved-document field list closely.

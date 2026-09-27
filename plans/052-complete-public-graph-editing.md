# Plan 052: Complete public graph editing across JavaScript, Vue, and Foldkit

> Executor instructions: This is one milestone with eight ordered work packages. Complete and verify each package before advancing its status. Work in an isolated checkout and preserve unrelated work. Do not mark the milestone complete after only the core or JavaScript implementation. Stop under the conditions below instead of widening the milestone.
>
> Drift check: `git diff --stat e653e0a..HEAD -- packages/core/src packages/conformance/src packages/vue/src apps/vanilla apps/vue apps/foldkit tests/consumer scripts docs research/fixtures research/traces research/catalogs research/PROGRESS.md plans`. Compare changes against the current-state excerpts and the scoped file list before executing. Changes from an earlier work package in this plan are expected; unexplained contract drift requires a plan update.

## Status

- Priority: P1
- Effort: L, multiple implementation sessions
- Risk: HIGH at controlled-state and graph-integrity boundaries
- Category: direction, public API, shared adapter behavior
- Depends on: completed Plans 044-051; preserve the Foldkit Vite fix at `e653e0a`
- Planned at: `e653e0a`, 2026-09-26
- Execution status: TODO

## Intended outcome

An application can add, replace, update, and delete graph elements through supported APIs in every current host. All hosts use the same validated edit semantics. Controlled edits remain proposals until the owner acknowledges them; uncontrolled edits update the graph atomically. Node and edge data survive the supported save/restore format. Visible examples demonstrate editing and removing the middle node of a chain while reconnecting its neighbors.

This milestone advances the complete React Flow API/examples/UI goal recorded in `research/PROGRESS.md:7-21`. It closes a bounded write-API gap. It does not complete the full React Flow instance, every callback, framework packaging, or the UI catalog.

## Why this chunk comes next

Plans 044-051 delivered accepted-state getters, notifications, three directed graph-query helpers, and shared read fixtures. Callers can inspect a graph, but most application edits still require reconstructing and replacing the entire document. The core public command union has only node-position and viewport commands. Node data updates and graph deletion are prerequisites for several catalog examples and data-driven UI components.

The primary recommendation is to complete graph writes before adding a larger catalog of UI components. Measurement/viewport parity is a reasonable alternative, especially for fit, minimap, and toolbar work, but it does not supply these missing edit operations. A full callback/lifecycle pass is another useful next chunk; adding every callback here would couple this milestone to unfinished gestures in multiple adapters. Foldkit package promotion remains separate because extraction would not itself add graph-editing capability.

## Verified current state

The advisor inspected a clean `main` at `e653e0a`. `bun run check`, `bun run docs:check`, and the offline catalog checker passed in this planning turn. The checker reports 208 entries, including 200 capabilities. The immediately preceding implementation turn ran the complete gate successfully on the changes committed at this SHA: 136 unit tests, 191 vanilla browser tests plus two existing skips, 12 Vue tests, and 10 Foldkit tests. That full gate was not rerun during planning.

### Core data and commands

`packages/core/src/domain/flow.schema.ts:63` defines FlowNode with optional JSON-object data, parent-relative position, handles, and visibility. It lacks a node-level deletable flag. FlowEdge at line 110 has a deletable flag and renderer fields, but no data field.

```ts
// packages/core/src/domain/flow.schema.ts:69
 data: S.optional(S.JsonObject),

// packages/core/src/domain/flow-runtime.schema.ts:1070
export const FlowCommandSchema = S.Union([
  SetNodePositionCommandSchema,
  SetViewportCommandSchema,
])
```

The existing `commandToChange` at `flow-runtime.schema.ts:1310` maps these commands without reading a document. New edits need current graph state and cannot be implemented by pretending this conversion already validates arbitrary graph mutations.

`packages/core/src/domain/flow-persistence.ts:10-20` derives saved nodes/edges from their document schemas with selection omitted. The envelope at line 23 is version 1. Additive fields must have explicit round-trip and older-document tests; do not fork a second list of saved fields.

### Host ownership

`apps/vanilla/src/mount-flow.ts:430` exposes getters, update, dispatch, semantic subscription, and accepted-state subscription. Its `publishChange` at line 2980 validates/applies supported changes, reconciles the uncontrolled document, and publishes semantic events before accepted-state notifications. Reentrant changes are queued. The JavaScript wrapper is the external decode boundary.

`packages/vue/src/flow-canvas.ts:597` currently handles node-position and edge-add in its semantic publication path. The controlled branch emits candidate model updates; the uncontrolled branch owns its document. `packages/vue/src/use-flow.ts:36` exposes read projections and dispatch/update methods, with no named graph-edit methods.

`apps/foldkit/src/graph.ts:179` handles the two core commands and ends with an exhaustive `never` check. `apps/foldkit/src/application.ts:59` defines typed action/snapshot inbound ports and change/snapshot/accepted-state outbound ports. This is an app-scoped host, not a reusable package.

```ts
// packages/core/src/domain/flow-snapshot.ts:24
export const FlowStateChangeSchema = S.Struct({
  previous: FlowSnapshotSchema,
  current: FlowSnapshotSchema,
  cause: FlowStateChangeCauseSchema,
})
```

`research/traces/public-state-contract.md` is the existing ownership decision: complete accepted reads, separate proposals, schema-value deduplication, listener isolation, FIFO reentrancy, and no notification after disposal. Preserve those guarantees and verify the actual production call paths.

### Reference and proof

The current [ReactFlowInstance API](https://reactflow.dev/api-reference/types/react-flow-instance) documents collection setters/adders, element/data updates, and deletion. Its functional update inputs belong in JavaScript/framework adapters; functions must not enter serializable core commands or Foldkit messages.

Pinned evidence is `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/`. `packages/react/src/hooks/useReactFlow.ts:110-275` contains element updates, collection additions, deletion callbacks/results, and data merge/replacement. `packages/system/src/utils/graph.ts:472-530` calculates deletion membership, descendants, connected edges, and deletable filtering. Inspect earlier lines in useReactFlow for queued setters. These are evidence, not implementation templates.

`research/fixtures/README.md:3` explains that the imported tree lacks the tooling workspace and built outputs. Executable reference work needs a disposable full checkout at the pinned SHA. Never install into or patch the imported tree. The existing eight rendering and four state fixtures prove Flow behavior; they are not general React Flow parity evidence.

## Public scope and explicit limits

Provide these named JavaScript and Vue operations with the closest practical reference argument shapes:

- `setNodes`, `addNodes`, `setEdges`, `addEdges`.
- `updateNode`, `updateNodeData`, `updateEdge`, `updateEdgeData`, including merge and replacement options.
- `deleteElements`, with a typed asynchronous result and documented controlled-mode meaning.
- A typed core edit transaction available through dispatch for related node/edge changes that must validate and commit together.

Foldkit supplies equivalent typed operations through its Model/Message/update/ports conventions. Local application functions may compute edits from a model; functions are never port payloads. Do not force React hook or callback shapes into Foldkit.

Include `FlowEdge.data` and `FlowNode.deletable`. Keep data JSON-compatible. React's more general application data values are an explicit adaptation, not a reason to weaken Flow serialization.

Defer full React NodeChange/EdgeChange compatibility and `applyNodeChanges`/`applyEdgeChanges`; all pointer lifecycle callback families; asynchronous `onBeforeDelete` veto/filter hooks; undo/redo; collaboration; graph execution engines; internal geometry/store APIs; custom Foldkit renderers; reusable UI components; package publication; and Foldkit package extraction. Preserve current keyboard deletion behavior unless routing an existing supported action through the new shared edit semantics is necessary. Broad node-keyboard deletion parity is not an acceptance requirement here.

## Files in scope

Only change files needed for these work packages. New files are identified explicitly.

### Shared core and contracts

- `packages/core/src/domain/flow.schema.ts` and `flow.schema.test.ts`.
- `packages/core/src/domain/flow-runtime.schema.ts` and `flow-runtime.schema.test.ts`.
- `packages/core/src/domain/flow-persistence.ts` and `flow-persistence.test.ts`.
- `packages/core/src/domain/flow-snapshot.ts` and `flow-snapshot.test.ts`, only for edit notification compatibility.
- New `packages/core/src/domain/flow-edit.schema.ts`, `flow-edit.ts`, `flow-edit.test.ts`, and `flow-edit-error.ts`.
- `packages/core/src/public.ts` and `packages/core/src/telemetry/flow-telemetry.ts`.

### Production hosts and visible examples

- `apps/vanilla/src/mount-flow.ts`, `public.ts`, `main.ts`, and `style.css`.
- `packages/vue/src/flow-canvas.ts`, `use-flow.ts`, and `public.ts`.
- `apps/vue/src/main.ts`, `style.css`, and `test-harness.ts`.
- `apps/foldkit/src/graph.ts`, `application.ts`, `main.ts`, and `style.css`.

### Proof and delivery

- `packages/conformance/src/index.ts` and `index.test.ts`.
- Existing `apps/vanilla/e2e/controller-conformance.ts`, Vue/Foldkit `e2e/conformance.ts`, Foldkit `e2e/test-harness.ts`, and each host's `e2e/shared-conformance.e2e.ts`.
- New `public-edits.e2e.ts` and `graph-editing-examples.e2e.ts` in each host's `e2e/` directory.
- Existing public-state and catalog-state E2E files, only where the new union or shared test interface requires migration; keep assertions intact.
- `tests/consumer/main.ts`, `consumer.typecheck.ts`, and `scripts/check-packed-consumer.ts`.
- `scripts/generate-api-reference.ts` and `docs/api-reference.md` through its generator.
- New `scripts/capture-graph-edit-reference.ts` and `research/harnesses/graph-edits/`, containing only the small reproducible reference host/probe used by that script.
- New `research/fixtures/public-edit-contract.json` and `graph-edit-reference.json`; `research/fixtures/README.md`.
- New `research/traces/public-edit-contract.md` and `docs/examples/graph-editing.md`.
- Existing `docs/react-flow-api-correspondence.md`, `docs/public-api.md`, `docs/architecture.md`, `docs/examples/state-and-persistence.md`, `research/catalogs/react-flow-coverage.md`, `research/PROGRESS.md`, and root `README.md`.
- This plan and `plans/README.md` for execution status.

Do not edit imported artifacts, the dated catalog snapshot, `research/generated/SUMMARY.md` by hand, other adapters, dependency versions, Vite configuration, package manifests, licensing, or CI workflows. Reference-runner dependencies belong to its disposable checkout and must use the pinned upstream lockfile. Do not refactor the entire vanilla host. If adding a command variant reveals callers outside this list, document them and revise scope before editing them.

## Conventions and execution workflow

Follow `docs/standards.md`: Effect v4 owns workflows and typed failures; Schema owns runtime data contracts; graph semantics stay in core; host lifecycle stays in the adapter. Example of the required type pattern is `export type FlowNode = typeof FlowNodeSchema.Type` in `flow.schema.ts:82`. Decode unknown input at public boundaries. Derive patch/value types from authoritative schemas rather than manually duplicating their fields. No casts or weakened validation to make replacement tests pass.

Keep the current exact Effect/platform `4.0.0-rc.116`, Foldkit `0.163.0`, Vue `3.5.43`, and Vite `8.0.13` versions. No production dependency additions are expected. Use existing telemetry span/attribute vocabulary; add names centrally only if a new semantic/failure boundary needs them. Do not log entire user data objects or high-frequency pointer movement. Collector delivery is outside this milestone.

Start an isolated branch named `codex/052-public-graph-editing` from the recorded base or an explicitly reconciled newer base. Do not commit, merge, push, or create a PR without authorization. The advisor's plan is not permission to publish. Within this milestone, one owner integrates shared contracts and documentation. Vue and Foldkit implementation can proceed independently after the JavaScript contract is proven, using separate isolated checkouts if parallel execution is later authorized. Full browser gates run serially on strict ports 4176, 4177, and 4178; do not use the user's port 4173 server as test evidence.

## Work packages and dependencies

1. Decide and capture the write contract.
2. Add node deletion policy and edge data to document/persistence schemas.
3. Implement shared atomic edit preparation and validation.
4. Add JavaScript edit APIs and the first visible editing slice.
5. Add Vue edit methods and model-binding behavior.
6. Add Foldkit typed edits and result/error observation.
7. Run shared edit fixtures and finish examples in every host.
8. Complete reference comparisons, packed-consumer proof, and documentation.

Dependency order: 1 → 2 → 3 → 4 → {5, 6} → 7 → 8. Each work package is TODO until its own evidence exists. Full milestone status stays open until all eight pass.

## 1. Decide and capture the write contract

Create `research/traces/public-edit-contract.md` and extend the member matrix with the named write operations. Trace each current entry point through authoritative state, proposal publication, reconciliation, geometry invalidation, DOM, and cleanup. Describe test bridges separately. End the trace with `## Conformity and deviations`.

Before implementation, settle these decisions with example input/output tables. The defaults below are the recommended Flow contract; changes require evidence and a written reason in the trace, not an undocumented host-specific choice.

- External document replacement remains an owner acknowledgement. Named setters/updaters are edit requests and must not bypass controlled ownership by calling the authoritative replacement path directly.
- Represent edits as Schema-derived serializable operations. Prepare one validated candidate document and one semantic proposal per transaction. Uncontrolled acceptance produces at most one accepted-state notification; controlled proposals produce none until acknowledgement. Invalid candidates produce typed failures and no document, semantic, or accepted-state change.
- Preserve the document integrity rules: unique IDs, valid endpoints/handles, valid parents/extents, and acyclic ancestry. A transaction may have temporarily incomplete intermediate collections; validate its final candidate once before publication.
- Evaluate JavaScript/Vue updater functions once when their queued operation runs, using a protected view of the then-accepted state. Do not serialize functions. In controlled mode, unacknowledged proposals do not form a hidden authoritative state. Document any difference from React Flow's batched updater queues. A caller needing several dependent edits uses one transaction.
- Merge patches shallowly by default. A data merge operates on data keys; a replacement discards absent keys. Full node/edge replacement must still satisfy its complete schema and preserve the targeted ID. Invalid replacement does not partly mutate the graph. Missing update IDs produce a documented no-op.
- `addEdges` appends valid supplied edges; do not confuse it with React Flow's separate `addEdge` utility and its endpoint-duplicate policy. Duplicate IDs are invalid. Parallel edges with distinct IDs remain valid where the existing document schema permits them.
- Collection setters do not silently remove unrelated graph elements. If replacing nodes leaves invalid edge endpoints, reject the final candidate unless the same transaction removes/replaces those edges. The deletion operation is the explicit cascading route.
- Deletion includes requested removable nodes, their descendants regardless of input order, and incident edges. It respects node/edge `deletable: false`. If preserving a protected descendant or incident edge would leave invalid references, reject the transaction with a typed conflict; do not invent reparenting or silently remove protected objects. Record this policy against the pinned behavior, which may differ.
- Missing deletion IDs and repeated IDs are harmless; result lists have deterministic documented order. In controlled mode the asynchronous deletion result describes the validated proposal, not an acknowledgement that may never arrive. No asynchronous pre-delete hook is introduced in this slice.
- Preserve existing observer ordering, no-op deduplication, mutation isolation, FIFO reentrancy, and disposal rules. Define how callbacks that throw, edits queued from a listener, and edits invoked after disposal report failure in each host. Disposing during a pending result must settle that result without late events.

Implement a reproducible reference probe in `research/harnesses/graph-edits/` and the capture script. Accept an explicit disposable full upstream checkout path, verify its SHA against `research/UPSTREAM.json`, and refuse to mutate imported artifacts or an unrelated dirty checkout. Run actual ReactFlowInstance APIs in a mounted pinned React host. Capture collection updates, merge/replacement, missing IDs, controlled proposals/acknowledgement, simple deletion, and descendant/incident-edge selection. Record inputs, actions, outputs, framework version, upstream SHA, and comparison normalization. Keep timestamps outside deterministic expected output. Do not fabricate expected data from Flow output.

**Verify:** `bun run docs:check` and `bun run research:check-traces` exit 0. Run `bun run scripts/capture-graph-edit-reference.ts --checkout /absolute/path/to/disposable-xyflow-checkout` twice; stable normalized outputs must match. If reference execution is unavailable, record that exact blocker and keep reference acceptance open. Implementation can advance on the explicitly chosen Flow contract, but Step 8 cannot claim a reference comparison or full milestone completion without the required proof.

## 2. Extend document data and persistence

Add optional JSON-object data to FlowEdgeSchema and optional boolean deletable to FlowNodeSchema. Derive encoded/decoded and saved types from the existing schemas. Preserve older version-1 documents that omit these fields. Document the additive compatibility decision, including that an older reader may discard unknown fields; do not claim older readers preserve new data.

Add schema and persistence tests for nested JSON, absent/empty data, false deletable, invalid non-JSON input, and round trips. Keep transient selection, viewport, and measurements excluded from the saved document. Extend snapshot tests to show edge data survives accepted-state reads without exposing mutable aliases. Update the API generator's explicit schema list only as needed, then regenerate its output.

**Verify:** `bun run test -- packages/core/src/domain/flow.schema.test.ts packages/core/src/domain/flow-persistence.test.ts packages/core/src/domain/flow-snapshot.test.ts`, `bun run typecheck`, and `bun run docs:check` all exit 0. Existing version-1 fixtures still decode.

## 3. Implement atomic core edit preparation

Create the new flow-edit modules. Define the operation union, result/deletion metadata, and typed failures from Schema. Implement pure candidate construction with an Effect workflow for input/final-document validation. Reuse decodeFlowDocument and the existing hierarchy/query semantics; do not add a second mutable graph store. Keep callback resolution in adapters and deterministic operation data in core.

Extend dispatch with an edit-transaction command and the semantic change form selected in Step 1. Maintain existing node-position/viewport behavior. Add a state-aware preparation entry point rather than hiding document reads in the existing stateless commandToChange helper. Route new edits through this entry point in all exhaustive command/change consumers needed to keep the tree compiling, but do not mark a host delivered until its dedicated work package passes. Core graph-edit modules must not import hosts, DOM, Vue, or Foldkit.

Tests must cover all named operations; merge/replacement; preservation of unaffected element identity where compatible with current ownership; input immutability; identical no-ops; invalid final endpoints/handles/parents/duplicate IDs; a valid multi-operation transaction whose intermediate collections are incomplete; three-level deletion in non-parent-first order; protected child/edge conflicts; duplicate/missing deletion IDs; and failure rollback. Reuse the decoded-document fixture style from `flow-graph.test.ts` and existing invalid-document tests.

**Verify:** `bun run test -- packages/core/src/domain/flow-edit.test.ts packages/core/src/domain/flow-runtime.schema.test.ts`, `bun run typecheck`, and `bun run check:architecture` exit 0. `rg -n 'commandToChange|FlowCommand|FlowChange' apps packages tests/consumer` must be reviewed for every new union consumer; do not silence exhaustive checks.

## 4. Wire JavaScript edits and show the first slice

Extend FlowController, JavaScriptFlowController, and the public facade with the approved named methods. Decode external values once; resolve functional updates at operation execution. Use the new prepared edit to propose or atomically install the candidate. Reconcile once per accepted transaction and invalidate affected geometry, handles, edges, and toolbar anchors through existing host paths.

Removing/replacing an element participating in an active gesture must cancel that gesture and its pending work. Deleting a focused node must leave focus in a usable canvas location. Hidden and culled elements remain editable. Neither rejected edits nor controlled proposals should rebuild accepted DOM or move accepted getters forward. Keep subscriptions isolated when listeners throw or enqueue more edits.

Add `apps/vanilla/e2e/public-edits.e2e.ts` through `createFlow`/public exports, following `public-state.e2e.ts`. Assert exact getter values, semantic/accepted notification counts and order, retained DOM identity for unaffected elements, node/edge cleanup, invalid-edit rollback, mutation safety, and disposal. Exercise the functional-update queue; counting callbacks is necessary to prove they are evaluated once.

Add an early playground control slice in vanilla: add a node, edit node data/label, edit edge data, remove a node, and inspect the accepted result. Use the new public APIs. Keep controls keyboard accessible and within the viewport; preserve the prior unobstructed-tool layout. This is the first visible output, before the remaining adapters are complete.

**Verify:** `bun run test:browser -- public-edits.e2e.ts public-state.e2e.ts` passes, with production DOM assertions. `bun run typecheck` passes. Run `bun run verify` before treating this as the integration base for Vue/Foldkit; existing suites must remain green even while their named methods are still pending.

## 5. Add Vue-native editing

Extend the injected editor and useFlow with the mapped methods, sharing core edit preparation. Keep readonly computed projections and the existing controlled/uncontrolled source of truth. Resolve functional updates within the same documented ownership policy as JavaScript, allowing Vue's actual scheduler boundary.

Handle document v-model and split nodes/edges model bindings. A transaction affecting both collections must not expose an invalid intermediate graph while parent props acknowledge changes. Prove the common same-tick parent acknowledgement case. For independently delayed split acknowledgements, choose and document an explicit supported policy in the trace; do not silently install an invalid document or keep an unbounded pending store. If the current split binding architecture cannot support the approved atomic contract, stop this work package for a bounded contract revision.

Extend the real descendant-component test harness and add `apps/vue/e2e/public-edits.e2e.ts`. Test controlled document mode, split bindings, uncontrolled edits, protected/invalid deletions, data updates, two-canvas isolation, and unmount with queued work. Tests must call `@flow/vue` exports, not implementation-relative imports or shadow graph setters. Update the Vue playground controls as soon as these APIs pass.

**Verify:** `bun run test:conformance:vue -- public-edits.e2e.ts public-state.e2e.ts`, `bun run typecheck`, and `bun run check:architecture` exit 0. Inspect the rendered Vue editing slice and confirm the controlled owner sees one coherent candidate.

## 6. Add Foldkit typed edits and results

Add Schema-derived edit request/result messages or ports at the existing application boundary. Use request IDs for operations with asynchronous results, including deletion, so success/failure/disposal can settle callers deterministically. Core edit failures must become typed responses rather than unhandled defects. Keep semantic proposals and accepted-state events separate from operation results.

Graph.update uses current Model and the shared preparation result. Preserve immutable Model semantics and existing command/subscription ownership. No JavaScript functions cross ports. If an Effect validation command returns later, prevent applying a candidate calculated from an obsolete Model; use an explicit captured version/check or re-evaluation policy selected in the trace. A late response after disposal must not resurrect the host or notify subscribers.

Add `apps/foldkit/e2e/public-edits.e2e.ts` using actual Runtime.embed and typed ports. Cover successful writes, failure responses, controlled acknowledgements, missing targets, deletion lists, two runtimes, reentrant requests, and disposal. Migrate the Foldkit playground controls to typed edits; keep this host explicitly app-scoped. Preserve the Vite plugin and its cold-start prebundle configuration.

**Verify:** `bun run test:conformance:foldkit -- public-edits.e2e.ts public-state.e2e.ts`, `bun run typecheck`, and `bun run check:architecture` exit 0. Confirm all sent request IDs receive the documented completion or disposal result without leaked pending requests.

## 7. Establish shared edit proof and finish visible examples

Add a Schema-checked `public-edit-contract.json` fixture set and shared driver methods. Keep the original eight rendering and four read fixtures. At minimum include collection additions; node and edge data merge/replacement; missing target/no-op; invalid transaction rollback; multi-operation atomic replacement; controlled proposal plus acknowledgement; simple/cascading deletion; protected deletion conflict; and disposal with queued work.

Each host must transport observations from its production API. Expected results come from fixed fixtures, not a test-side reimplementation of the reducer. Compare complete accepted documents, semantic and accepted-state event order, deletion results/errors, and settled DOM. Keep intentionally different render timing separate from equal graph data. Do not hide a newly introduced rendering regression by adding a per-host expected exception.

Finish two bounded examples in every playground:

1. Updating Nodes extension: add/edit/remove graph elements, update node and edge JSON data, inspect the accepted graph, and round-trip edge data through the existing session save/restore controls. Node styling and the complete upstream example remain separately mapped gaps.
2. Delete Middle Node: begin with `a → b → c`, remove `b`, and create `a → c`. Compute the reconnect policy in the application from a pre-edit snapshot and existing getIncomers/getOutgoers/getConnectedEdges. Submit removal and reconnection as one transaction. Ordinary core deletion must not automatically reconnect arbitrary graphs. Document that the app-level recipe uses Flow's atomic API rather than an unimplemented onNodesDelete callback.

Add each host's `graph-editing-examples.e2e.ts` with actual controls, keyboard activation, normal and narrow viewports, graph/data/edge assertions, protected-delete feedback, and repeated reset. Inspect screenshots and verify canvas controls remain reachable. Do not add custom renderer infrastructure merely to mimic the upstream visual shell.

**Verify:** `bun run test -- packages/conformance/src/index.test.ts` passes. Run `bun run test:browser -- shared-conformance.e2e.ts public-edits.e2e.ts graph-editing-examples.e2e.ts`, then the equivalent `test:conformance:vue` and `test:conformance:foldkit` commands serially; all pass. Fixtures README names each new scenario and its exact proof boundary.

## 8. Close reference, consumer, and documentation evidence

Compare the shared edit outputs with Step 1's captured pinned reference cases. Classify each selected case as conforming, intentionally different, or unverified. Strict JSON data, graph-integrity rejection, protected-descendant conflicts, operation batching, controlled return semantics, and framework-native scheduling require explicit treatment. Different input constraints must not be normalized away to manufacture a match.

Extend the existing packed JavaScript consumer to import and execute the new methods, including functional updates and typed deletion results. This is core/vanilla consumer proof; Vue package packing and Foldkit package promotion remain open. Include input and result type checks with real valid/invalid cases. Regenerate schema API docs; document public method signatures, failures, ownership, atomic transaction usage, and the examples.

Update the catalog rows for the instance write methods, Node/Edge fields, and selected examples with separate implementation and reference evidence for each host. The catalog's current status vocabulary does not support blanket proof claims; keep full-entry reference status unverified where only subcases were compared. Update `research/PROGRESS.md`, including its stale unchecked quality-gate item after confirming the live gate. Replace obsolete current-state statements in the API/state docs, preserving dated verification history. Do not revive HANDOFF.md or manually edit generated research output.

**Verify:** `bun run test:consumer`, `bun run docs:check`, `bun run research:check-traces`, `bun run scripts/check-react-flow-catalog.ts`, `bun run check`, and `bun run verify` all exit 0. Use `bun run scripts/check-react-flow-catalog.ts --upstream` to report catalog drift at this milestone; if upstream adds/removes entries, record the drift for a separate snapshot update rather than deleting gaps or changing the dated baseline in this scope. Report local gates, reference capture, skipped native tests, and package availability as separate claims.

## Command reference

Run from the Flow root, except commands explicitly documented for a disposable upstream checkout.

- `bun install --frozen-lockfile`: fresh executor dependencies; lockfile must remain unchanged.
- `bun run check`: read-only lint/format gate, exit 0.
- `bun run typecheck`: builds workspace package outputs before TypeScript, exit 0.
- `bun run test -- <listed test paths>`: Vitest focused unit tests, all pass.
- `bun run test:browser -- <listed E2E basenames>`: vanilla Chromium tests, all selected cases pass.
- `bun run test:conformance:vue -- <listed E2E basenames>`: Vue Chromium tests, all selected cases pass.
- `bun run test:conformance:foldkit -- <listed E2E basenames>`: Foldkit Chromium tests, all selected cases pass.
- `bun run docs:generate-api`, then `bun run docs:check`: regenerate schemas and validate docs, exit 0.
- `bun run test:consumer`: real packed core/vanilla consumer types and Chromium behavior, exit 0.
- `bun run verify`: complete local gate, exit 0. Never replace this gate with typecheck/build alone.

## Done criteria

- [ ] All eight work packages have recorded commands/results, file changes, and remaining limits.
- [ ] Nine named instance edit methods and the atomic transaction route work in JavaScript and Vue; equivalent typed Foldkit operations are proven through Runtime ports.
- [ ] Node deletable and edge JSON data decode, appear in accepted reads, and round-trip through version-1 persistence without changing older valid documents.
- [ ] Invalid transactions roll back fully; protected nested deletion and controlled ownership tests pass in all three hosts.
- [ ] Shared fixtures assert actual production state, event order, results, and rendered output; no shadow test store computes observed answers.
- [ ] Both bounded examples run through supported APIs in every host and have inspected normal/narrow output.
- [ ] Equivalent pinned reference cases have reproducible captures and explicit classifications. Remaining broader catalog claims stay open.
- [ ] Packed core/vanilla consumer, docs, architecture, catalog, quality, and full verify gates pass.
- [ ] `git diff --check` exits 0 and `git status --short` contains only scoped source/docs and expected generated API output.
- [ ] Plan/index status is updated by the executor or reviewer only after evidence is complete.

## STOP conditions

- A prerequisite accepted-state guarantee must be weakened, or a second authoritative store is proposed.
- Controlled split acknowledgements, deletion protection, result timing, or updater reentrancy remain ambiguous after the contract step. Revise the contract and tests before host implementation.
- The implementation needs arbitrary non-JSON core data, new runtime dependencies, a framework upgrade, a broad host refactor, reusable Foldkit packaging, or async pre-delete hooks.
- Any failure path changes part of the accepted graph or emits accepted notifications before final validation.
- An edit affects another runtime, resurrects disposed state, leaks a pending result, or leaves a removed node's active gesture alive.
- A required check fails after two focused repair attempts. Preserve the work and report the exact failure; do not weaken assertions or broaden skips.
- Reference capture cannot run reproducibly at the pinned SHA: stop the reference-comparison work and keep milestone acceptance incomplete. Independent Flow implementation may proceed under the explicit Step 1 contract; source inspection is never a replacement for the missing comparison.

## Maintenance and the following milestone

Future edit kinds must extend the shared operation schema, candidate validation, notification contract, packed consumer types, and three-host fixtures together. Keep app reconnection policies outside ordinary deletion. Treat document fields, transient measurements, and framework presentation as separate ownership decisions.

After this milestone, prioritize measured geometry and custom-renderer parity across hosts, then viewport/connection/lifecycle APIs and reusable UI components. Those capabilities enable richer Computing Flows, resize/toolbars, minimap, and UI templates. Foldkit package promotion and Vue packed-consumer proof are explicit prerequisites for claiming reusable adapter delivery. Full catalog proof, native multi-pointer evidence, broader accessibility, performance budgets, and publication remain visible in PROGRESS.

## Advisor coverage limit

This was targeted planning for public graph writes. The advisor checked current core/host ownership paths, schemas, existing proof, catalog goals, relevant pinned source, and current official instance/example documentation. It was not a fresh security audit, dependency advisory scan, all-member API review, benchmark, or browser feature-parity sweep. Only files under `plans/` were edited during this planning turn.

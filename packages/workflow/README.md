# Workflow contracts

`@flow/workflow` is an optional, browser-independent package. It owns Effect Schema contracts, port projection, structural validation, and execution request/event types. Core and the reusable Vanilla, Vue and Foldkit adapters cannot import it or declare it as a dependency. Application composition opts in. No new external library is required; Effect 4.0.0 and `@flow/core` are external peers.

```ts
import {
  baseWorkflowFixture,
  decodeWorkflowDocument,
  projectWorkflowDocument,
} from '@flow/workflow'
import { Effect } from 'effect'

const accepted = await Effect.runPromise(
  decodeWorkflowDocument(baseWorkflowFixture)
)
const canvasDocument = projectWorkflowDocument(accepted)
```

## Package layout and public API

- `workflow.schema.ts` owns schema-derived node, connection, document, port, and issue types.
- `workflow-ports.ts` projects semantic roles to physical handles, direction, value type and multiplicity.
- `workflow-validation.ts` owns pure structural and dependency validation.
- `workflow-edit.ts` owns node factories and validated add, append, delete/reconnect and configuration transactions, with caller-owned ID allocation.
- `workflow-document.ts` owns Effect decode/validation, the typed document contract, canvas projection and clipboard extension.
- `workflow-execution.schema.ts` owns transient run identity, accepted revision/snapshot, values and node event contracts.
- `workflow-decode-error.ts` and `workflow-validation-error.ts` own typed boundary failures.
- `fixtures.ts` supplies encoded base and offline AI example documents.
- `public.ts` is the supported package entry. Built JavaScript and declarations ship under `dist/`.

The public schemas are `WorkflowNodeDataSchema`, `WorkflowNodeSchema`, `WorkflowConnectionDataSchema`, `WorkflowEdgeSchema`, `WorkflowDocumentSchema`, `WorkflowPortSchema`, `WorkflowIssueSchema`, `WorkflowRunIdSchema`, `WorkflowRunRequestSchema`, `WorkflowValueSchema`, and `WorkflowNodeEventSchema`. Each exports its schema-derived type with the `Schema` suffix removed. `WorkflowNodeData` is the discriminated union of all nine versioned kinds.

`decodeWorkflowDocument(unknown)` decodes once at the import boundary, checks workflow relationships, and reuses core graph integrity. It returns an Effect with `WorkflowDecodeError`, `WorkflowValidationError`, or a core `FlowDocumentIntegrityError`. Schema failures report code `invalid-document` without echoing content. Workflow validation failures carry exact schema-derived `issues`. Core errors retain their existing tags and IDs for invalid parents, physical handles and bundles.

`validateWorkflowDocument(document)` accepts decoded data and performs relationship checks. `workflowIssues(document)` returns workflow issues without effects. `workflowPorts(data)` returns the named roles for one decoded variant. `projectWorkflowDocument(accepted)` returns a detached `FlowDocument`; geometry, extension data, handles and workflow meaning survive together. It does not execute nodes or rewrite renderer types.

`workflowDataContract` implements the existing `FlowDataContract` seam for `makeTypedFlow`. Its contract ID is `@flow/workflow/1`; isolation detaches JSON snapshots. It applies the same schema and workflow relationship policy to actor replacements. Core owns actor revision checks, graph integrity, observation and disposal. `workflowClipboardExtension` remaps workflow-owned role-to-handle bindings through the existing clipboard reference maps.

`baseWorkflowFixture` contains all five base kinds. `aiWorkflowFixture` contains the four AI kinds and an image output. These are offline documents. They do not instantiate a provider or call a service.

## Saved node and connection contracts

A node may carry `data.workflow = { version: 1, kind, config, ports }`. Renderer `type` remains independent so spatial groups, trees and shapes can coexist with executable nodes. Nodes without `data.workflow` are presentation nodes. Other JSON keys in node and edge data are opaque and round-trip without string-based reference rewriting. The `workflow` key is reserved; unknown versions, kind/config combinations, settings or reserved-envelope fields are rejected. Opaque metadata remains caller-owned and must not contain secrets.

| Kind | Version 1 configuration | Port roles |
| --- | --- | --- |
| `initial` | `value: string` | `output`: source text |
| `transform` | `operation: uppercase / lowercase / trim` | `input`: target text; `output`: source text |
| `branch` | `operator: equals / contains`, `value: string` | `input`: target text; `true` and `false`: source text |
| `join` | `separator: string` | `input`: multiple target text; `output`: source text |
| `output` | `format: text / image` | `input`: target matching format |
| `text-input` | `text: string`, `locked: boolean` | `output`: source text |
| `generate-text` | `modelId: nonempty string`, `temperature: 0..2`, `system: string`, `prompt: string` | `trigger`: target trigger; `system` and `prompt`: target text; `output`: source text |
| `generate-image` | `modelId: nonempty string`, positive integer `width` and `height`, `prompt: string` | `trigger`: target trigger; `prompt`: target text; `image`: source image |
| `workflow-trigger` | `label: string` | `output`: source trigger |

Each `ports` value is a physical Flow handle ID. Every role must bind a distinct handle with the matching source/target direction. Handle IDs can change during paste; roles do not. Ports are declarations, so incomplete editable graphs are allowed. Required-input and reachability reports are separate readiness checks in Unit 3.

A semantic edge carries `data.workflow = { version: 1, kind: 'data' | 'trigger' }`. Both endpoints must be workflow nodes, the source handle must be a declared source port, and the target must be a declared target port. Value types must match and trigger ports require trigger edges. At most one connection targets a port except a join's multiple-input port. Edges between two executable nodes require this contract. Ordinary presentation edges remain ordinary Flow edges.

Executable dependencies are finite DAGs, including trigger edges. Cycle reports contain sorted strongly connected node and internal edge IDs, excluding downstream nodes. Spatial parentage and optional presentation edges do not create executable groups. Adopted later semantics remain explicit: true/false branches, joins over active predecessor outputs, skipped inactive branches, and sequential stable node-ID scheduling. Preparation defines no scheduler or evaluator. The Unit 4 runner executes the policy below.

## Integrity issues

| Code | Identity fields |
| --- | --- |
| `duplicate-node-id` | `nodeId` |
| `duplicate-edge-id` | `edgeId` |
| `missing-endpoint` | `edgeId`, missing `nodeId` |
| `missing-workflow-node` | `edgeId`, presentation `nodeId` |
| `invalid-port` | `nodeId`, `portId`; empty string means omitted edge handle |
| `incompatible-ports` | `edgeId`, target `nodeId`/`portId`, `sourceNodeId`/`sourcePortId` |
| `multiple-inputs` | `edgeId`, target `nodeId`/`portId` |
| `missing-connection-contract` | `edgeId` |
| `cycle` | sorted `nodeIds`, sorted internal `edgeIds` |

## Document interoperability and transient execution

Existing grouping, tree, shape, route and bundle schemas remain authoritative. Workflow documents preserve these fields through core history, clipboard, versioned graph persistence and collaborative rooms. Register `workflowClipboardExtension` with the existing paste operation so workflow port bindings follow renamed handles. Workflow configuration contains no node-ID references beyond core endpoints and physical handles. Opaque metadata is not remapped. Presentation parentage does not mean executable subworkflows.

Plan 170 tests rotation together with groups, trees, shapes, manual routes and bundles through workflow edits and clipboard remapping. The node variant factory inherits core geometry fields, rather than copying a closed list.

`WorkflowRunRequest` has a branded `runId`, accepted `revision`, and document snapshot. Runtime composition must detach and retain that immutable snapshot. `WorkflowNodeEvent` repeats run ID, revision and node ID, and distinguishes queued, running, succeeded, failed, cancelled and skipped states. Succeeded events contain typed outputs; failed events carry a diagnostic code. Values distinguish text, trigger, and image asset metadata. Image values use local asset IDs, not credentials or provider objects. Plan 172 implements scoped sessions, cancellation and stale-event rejection as described below. Providers remain Unit 6.

Run output, credentials, provider objects and run state have no field inside saved workflow configuration. Unknown workflow/configuration fields are rejected. Applications own transient execution outside graph history, clipboard, persistence and collaboration. No backend, remote AI dependency or credential entry UI is included.

## Host ownership and acceptance

Each app has `/workflow-contracts/`, a Unit 1 contract preview with fixture and JSON import controls. Vanilla uses its public controller; Vue uses `FlowProvider`/`useFlow` and accepted-document subscriptions; Foldkit embeds its model/runtime with public replacement and snapshot ports. Shared browser composition decodes every fixture/import through `decodeWorkflowDocument` before projecting to an owner. Rejected imports retain the accepted document. Disposal releases the controller, Vue app or Foldkit runtime and subscriptions.

The package's Vitest acceptance covers schema/configuration rejection, exact issues, DAGs, metadata, generic Flow compatibility, typed actors, presentation extensions, persistence, history and clipboard. The Yjs package adds a real local WebSocket transport test for workflow configuration and room undo. The AI fixture also covers equal node/edge ID strings, with distinct private VNode key namespaces in Foldkit. Each host's `workflow-contracts.e2e.ts` imports both fixtures, checks rendered membership and edges, rejects an invalid import without replacement, and disposes the owner. A separate packed core-only consumer proves generic decode with the workflow package absent. Packed consumer tests install and typecheck the workflow archive beside each adapter.

Decode and integrity workflows reuse centrally registered document spans and structured count/issue logs. Diagnostics omit prompts, output, keys and raw schema errors. No OTLP collector delivery is claimed. These tests establish Flow's Unit 1 contracts, not upstream workflow template parity or later-unit execution acceptance.

## Palette and configuration transactions

Plan 170 implements Unit 2. `workflowKinds` and `WorkflowKindSchema` enumerate all nine kinds. `createWorkflowNode({ kind, position }, ids)` supplies a kind's default configuration, physical handles and the app renderer type `workflow`. Its position is in graph coordinates. `WorkflowIds.allocate(namespace)` is an explicit application capability. It must return fresh IDs for `node`, `edge` and `handle`; callers choose their own deterministic or distributed namespace. The factory performs no browser access or implicit random allocation.

`WorkflowEditSchema` derives the `WorkflowEdit` command union. `prepareWorkflowEdit(document, unknownCommand, ids)` returns an Effect containing one `FlowEditTransaction`. It decodes the command, validates the current workflow, reuses `prepareFlowEdit`, and validates the complete proposed document before returning. It does not mutate the source or accept an edit into a host. Submit the transaction through the host's public edit API.

| Command | Fields and accepted behavior |
| --- | --- |
| `add` | `nodeKind`, `position`. Adds a fresh disconnected node with declared ports. Incomplete editor graphs remain valid. |
| `append` | `nodeKind`, `edgeId`, `position`. Requires compatible input and output ports on the inserted kind. Updates the original edge's target, preserving its ID, source handle, branch role and presentation fields. Adds one downstream edge with a fresh ID. The complete replacement is one transaction and one history entry. |
| `configure` | `nodeId`, `workflow`. Requires the same kind and valid typed configuration. Retains the accepted port bindings and other node metadata. Invalid connected format changes fail relationship validation. |
| `delete` | `nodeId`, `reconnect`. Reuses core deletion, including group/edge/bundle cleanup. With reconnect enabled, joins compatible predecessor/successor pairs using the incoming source handle. Duplicate pairs collapse. A reconnection that violates input multiplicity or DAG integrity rejects the entire command. |

`WorkflowEditFailure` names the aggregate typed failure channel. `WorkflowEditError` reports `missing-node`, `missing-edge`, `incompatible-insertion`, `kind-change` or `locked-text`. Schema and existing graph/workflow integrity errors retain their types. Text Input locking is a Flow requirement: while `locked` is true, a configuration edit cannot change `text`. Unlock without changing text first, then edit. Locking does not freeze node geometry. This behavior does not claim upstream lock parity.

All hosts expose `/workflow/` with sidebar drag sources, keyboard-accessible add buttons, kind renderers, small typed configuration panels, edge insertion buttons, delete/reconnect, history, and clipboard controls. Drop coordinates pass through each host's viewport API. Model IDs remain editable strings until Unit 6 supplies provider capabilities. Run output is read-only and empty of execution results in this unit. Browser controls, focus and resource cleanup stay in apps.

| Host | Public composition |
| --- | --- |
| Vanilla | `createFlow`, `FlowNodeRenderer`, `controller.applyEdit`, `getSnapshot`, `subscribeState`, `screenToFlowPosition`, `flowToScreenPosition`, `setViewport`, `undo`, `redo`, `destroy`. |
| Vue | `FlowProvider`, `FlowCanvas`, a Vue node component, and `useFlow().applyEdit`, accepted `document`, `subscribeState`, viewport conversion, `setViewport`, `undo`, `redo`, scope disposal. |
| Foldkit | `createProgram`/`Runtime.embed`, a `FoldkitNodeRenderer`, `createFoldkitFlowInstance` snapshot/edit ports, `createViewportClient`, `createFoldkitHistoryClient`, accepted-state subscription and measurement observer. All clients and runtime are disposed by the app. |

No workflow-specific API or dependency enters a generic host adapter. Both toolbar clipboard and canvas copy/paste shortcuts use core `copyFlowSelection` and `pasteFlowGraphFragment` with `workflowClipboardExtension`, then validate and accept the resulting transaction through the same owner. Editing controls retain native text shortcuts.

Acceptance is in `workflow-palette.e2e.ts` for each host and the shared production-route test body. It covers every kind by palette and keyboard, every configuration, Text Input lock/unlock and native editing shortcuts, physical DOM handle IDs, drop coordinates after viewport transformation, branch append, one-step undo, delete/reconnect, button/keyboard clipboard remapping and disposal. Public transaction tests cover exact failure codes and optional document extensions. Real local Yjs transport proves append and one room undo; packed consumers execute the public append API beside each host archive. See the [Plan 170 trace](../../research/traces/workflow-palette-2026-10-27.md) for production and test paths. These establish Unit 2's Flow behavior. Execution, provider behavior, complete template acceptance and upstream edge-plus parity remain later or unverified work.

## Readiness reports and execution preparation

Plan 171 implements Unit 3. Editable integrity remains separate from readiness: adding a disconnected node is accepted, but preparing an invalid workflow fails.

`workflowValidationReport(document)` is pure and returns `WorkflowValidationReport`. The schema-derived report contains sorted `issues` and `reachableNodeIds`. Presentation nodes, spatial parentage, trees, shapes, rotation, routes and bundles do not create execution dependencies. Executable nodes must be reachable along semantic edges from an `initial`, `text-input` or `workflow-trigger` entry. A document with no executable nodes reports `empty-workflow`.

Transform, branch, join and output nodes require a connected `input`. Generate Text and Generate Image require a connected `trigger`. Their `prompt` requires either a connected input or nonblank inline configuration. System text is optional. Empty initial and Text Input values are valid text. Blank model IDs and an empty `contains` comparison report `invalid-setting`; provider-supported models and dimensions remain Unit 6 work. Invalid encoded settings, such as a temperature outside 0..2, remain `WorkflowDecodeError` failures.

The new issue variants are `missing-input` with `nodeId` and physical `portId`, `unreachable-node` with `nodeId`, `invalid-setting` with `nodeId` and configuration `field`, and `empty-workflow`. Structural type, multiplicity and cycle issues retain their existing identities. `WorkflowValidationReportSchema` describes the complete report. No report contains raw prompts or run output.

`createWorkflowExecutionPlan(document, revision)` is pure and returns `WorkflowPreparation`. An invalid result has `kind: 'invalid'` and a report. A ready result has `kind: 'ready'` and a detached `WorkflowExecutionPlan`. `WorkflowPreparationSchema` and `WorkflowExecutionPlanSchema` define those contracts. The plan carries the accepted revision, complete document snapshot and ordered steps. Each step names its node, required physical port IDs, input edges with source and target port roles, and output declarations. At every scheduling decision, the smallest ready node ID wins. Input edges are ordered by source node ID and then edge ID.

The plan explicitly requires sequential execution, skipping inactive branches, and joins that wait for every predecessor to settle before combining active outputs. A join with no active input is skipped. Other nodes skip when a required input is inactive. Optional inactive inputs use their configured fallback. Every node waits for its connected predecessors to settle. The branch's physical true and false port bindings stay explicit in the plan. These policies prepare Unit 4; no node evaluator runs in Unit 3.

`prepareWorkflowExecution({ document, revision }, expectedRevision)` returns an Effect containing a ready plan. Applications supply a fresh atomic accepted snapshot immediately before starting a run. A revision mismatch fails with `WorkflowRevisionError`, including expected and accepted revisions. The function decodes and validates the current document, checks readiness again and detaches the plan snapshot. It does not trust a cached report. `WorkflowPreparationFailure` names the aggregate typed failure channel. Encoding failures, invalid executable graphs and stale revisions use separate typed errors. Runtime failures remain the separate `WorkflowNodeEvent` failed variant for Unit 4.

`prepareWorkflowConnection(document, unknownEdge)` decodes a semantic edge, prepares one core transaction and validates the complete proposed graph. The caller accepts the returned transaction through its public host API. A rejected connection never reaches the host or history. The function reuses the central connection-validation span. Preparation reuses document decode and integrity spans. Structured diagnostics include counts, failure tags and input kinds, without content or credentials. No collector delivery is claimed.

The three `/workflow/` routes expose **Prepare run**, typed source and target port selectors, **Connect ports**, issue activation and JSON import. Invalid readiness disables preparation and displays the reasons. Issue activation opens the node configuration and focuses the affected field or target port selector. Applying a valid field edit clears its issue only after acceptance. JSON import preserves the complete generic document, including node origin and bundles. It permits incomplete editable workflows and produces the same readiness report as interactive editing. Malformed or structurally invalid imports preserve the accepted graph. Canvas gestures create validated data edges; the typed port controls also create trigger edges.

Vanilla replaces imports with `controller.update`, Vue uses `useFlow().updateDocument`, and Foldkit uses `HostAction.ReplaceDocument` followed by a public snapshot read. Each replacement is one accepted history step. Vanilla derives the report from `createFlow().getSnapshot()` and `subscribeState`. Vue derives it through `computed` over `useFlow().document` and scope-owned revision state. Foldkit stores document, revision and report in its application model and updates it from `acceptedStates`. Focus stays in the browser composition. No workflow dependency enters core or a generic adapter. The architecture check rejects workflow preparation subpath imports and direct implementation imports from adapter owners.

The rerunnable acceptance files are `workflow-preparation.test.ts`, each host's `workflow-validation.e2e.ts`, and `apps/shared/workflow/validation-acceptance.ts`. Existing extension, clipboard, history, real Yjs transport and packed-consumer tests now also inspect readiness or execution preparation. The [Plan 171 trace](../../research/traces/workflow-validation-2026-10-27.md) records production and test paths. These tests establish Flow's adopted validation contract; they do not establish upstream execution or complete template parity.

## Scoped offline runner

Plan 172 implements Unit 4. `startWorkflowRun(accepted, options)` revalidates a fresh `{ document, revision }` against `options.expectedRevision`, decodes `options.runId`, and starts one scope-owned fiber. It returns `WorkflowRunSession` with a detached, recursively frozen `request`, a `cancel` Effect, and an `await` Effect. Scope closure interrupts evaluation and waits for its finalizers. Preparation failures remain typed Effect failures and emit no run events. Runtime failures become failed node and run events; `await` completes after those events. Cancellation interrupts `await`.

```ts
import { startWorkflowRun } from '@flow/workflow'
import { Effect } from 'effect'

const program = Effect.scoped(
  Effect.gen(function* () {
    const run = yield* startWorkflowRun(acceptedSnapshot, {
      runId: 'local-run-1',
      expectedRevision: acceptedSnapshot.revision,
      onEvent: (event) => transientEvents.push(event),
    })
    yield* run.await
  })
)
```

The caller allocates a fresh run ID and keeps the scope open for the session's lifetime. `WorkflowRunEventSchema` defines run lifecycle events and wrapped `WorkflowNodeEvent` values. The event sequence is run queued, every executable node queued in plan order, run running, then each node's running and terminal events. Successful completion emits run succeeded. A node failure emits node failed, skips every pending node, and emits run failed. Cancellation marks unfinished nodes cancelled before run cancelled. Completed nodes retain their results. Events and output values are frozen before publication.

`evaluateOfflineWorkflowNode` implements initial text, uppercase/lowercase/trim transforms, equals/contains branches, ordered joins and output results. Text Input and Workflow Trigger are also local evaluators. Generate Text and Generate Image fail with `unsupported-kind` until Unit 6 supplies a provider. No evaluator calls a network service. The optional `WorkflowEvaluator` returns an Effect with `WorkflowRuntimeError`; it receives decoded configuration and active inputs with their semantic and physical port identities. Its results pass `WorkflowOutputsSchema` and output-role/type validation. Invalid outputs fail with `invalid-output`; unexpected defects become `evaluator-defect` without exposing their content.

One ready node executes at a time in the preparation plan's stable node-ID order. Outputs are keyed by semantic role. A branch emits exactly one of `true` or `false`; an absent output deactivates that edge. Nodes wait for predecessor settlement. A node with an inactive required input is skipped. A join uses active predecessor outputs in source-node-ID then edge-ID order and skips when all inputs are inactive. The output evaluator publishes its consumed value under `result`.

`WorkflowRunStateSchema` defines transient projection state. `reduceWorkflowRunEvent(current, event, acceptedRevision)` rejects events from another run, another revision, an obsolete accepted revision, a terminal session, or an invalid node transition. The owner selects a new run identity before subscribing. An event cannot select a new identity. Run state, events, results, evaluator services and scopes stay outside saved documents, history, clipboard fragments and collaborative rooms, as required by D4. Accepted semantic edits, undo, redo, paste and remote document replacements invalidate the active session. Selection, measurements and viewport movement do not invalidate it.

All three `/workflow/` apps expose **Run**, **Cancel**, accessible node status, a transient run report, and read-only output for the configured node. The demo paces evaluation by 200 milliseconds through Effect's interruptible clock so progress and cancellation remain observable. This pacing belongs to application composition, not the package evaluator.

| Host | Public Flow API used by the app | Transient ownership and disposal |
| --- | --- | --- |
| Vanilla | `createFlow`, `getSnapshot`, `subscribeState`, `applyEdit`, `createFlowStatusIndicator`, `updateFlowStatusIndicator`, `destroy` | App run owner and renderer subscriptions. Destroy/pagehide disposes controls, closes the scope and removes listeners. |
| Vue | `FlowProvider`, `FlowCanvas`, `useFlow`, `subscribeState`, `applyEdit`, `StatusIndicator` | `shallowRef` run state in component scope. `onScopeDispose` closes the run scope and releases subscriptions. |
| Foldkit | `createProgram`, `createFoldkitFlowInstance`, `acceptedStates`, `HostAction.RefreshRenderers`, `createFoldkitStatusIndicator` | Run events reduce into the app model. Renderer refresh changes presentation without editing the document. Runtime disposal closes the scope and releases clients. |

Queued/running/cancelled/skipped map to the existing waiting indicator with explicit state text. Succeeded maps to ready and failed to error. Foldkit also honors a registered `default` node renderer for nodes whose type is omitted, matching the other hosts. Generic adapters and core have no workflow dependency.

Runner acceptance is in `workflow-runner.test.ts` and the three `workflow-runner.e2e.ts` files. Tests cover literal event order and outputs, both branches, inactive chains, active joins, stable ordering, typed failure stops, cancellation, scope disposal, immutable snapshots, reruns, stale events and D4 isolation. Browser tests block unexpected network traffic and inspect actual controls, rendered status, output and timer release. The real Yjs test verifies unchanged peer documents during a local run. Packed consumers execute the runner beside every adapter archive. These tests establish Flow's offline contract, not upstream workflow template parity, provider delivery or durable job behavior.

Runner and node spans use `FlowSpan.workflowRun` and `FlowSpan.workflowNode`, with `FlowAttribute.workflowRunId`, `workflowRevision` and `nodeId`. Lifecycle logs contain identities and diagnostic codes, never configuration text or output. OTLP export and shutdown remain application-owned; collector delivery is unverified.

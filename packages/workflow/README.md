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

Each `ports` value is a physical Flow handle ID. Every role must bind a distinct handle with the matching source/target direction. Handle IDs can change during paste; roles do not. Ports are declarations, so incomplete editable graphs are allowed. Required-input and reachability reports arrive in Unit 3.

A semantic edge carries `data.workflow = { version: 1, kind: 'data' | 'trigger' }`. Both endpoints must be workflow nodes, the source handle must be a declared source port, and the target must be a declared target port. Value types must match and trigger ports require trigger edges. At most one connection targets a port except a join's multiple-input port. Edges between two executable nodes require this contract. Ordinary presentation edges remain ordinary Flow edges.

Executable dependencies are finite DAGs, including trigger edges. Cycle reports contain sorted strongly connected node and internal edge IDs, excluding downstream nodes. Spatial parentage and optional presentation edges do not create executable groups. Adopted later semantics remain explicit: true/false branches, joins over active predecessor outputs, skipped inactive branches, and sequential stable node-ID scheduling. This unit defines no scheduler or evaluator.

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

`WorkflowRunRequest` has a branded `runId`, accepted `revision`, and document snapshot. Runtime composition must detach and retain that immutable snapshot. `WorkflowNodeEvent` repeats run ID, revision and node ID, and distinguishes queued, running, succeeded, failed, cancelled and skipped states. Succeeded events contain typed outputs; failed events carry a diagnostic code. Values distinguish text, trigger, and image asset metadata. Image values use local asset IDs, not credentials or provider objects. These contracts do not implement a run session, stale-event gate, cancellation or provider. Those belong to Units 3, 4 and 6.

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

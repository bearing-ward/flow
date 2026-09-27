# Public graph query helpers

Captured 2026-09-26. The public helpers are pure functions over decoded Flow `FlowNode` and `FlowEdge` values. The pinned source is a dated implementation reference; it is not evidence about the current website's runtime.

## Production path

Callers import `getIncomers`, `getOutgoers`, or `getConnectedEdges` from the core package entry at [packages/core/src/public.ts:168-184](../../packages/core/src/public.ts#L168). The implementations live in [packages/core/src/domain/flow-graph.ts:268-304](../../packages/core/src/domain/flow-graph.ts#L268). Incomers and outgoers collect the opposite endpoint IDs from matching edges, then filter the supplied node list; connected edges builds a selected-ID set and filters the supplied edge list. This preserves supplied object identity and order, deduplicates node outputs when multiple edges share an endpoint, and reads hidden nodes without render filtering.

The pre-existing `graphIncomers` and `graphOutgoers` remain in [flow-graph.ts:253-265](../../packages/core/src/domain/flow-graph.ts#L253). They accept a `FlowGraphView` and return incoming or outgoing `FlowEdge` values from the full document. They are Flow-specific edge queries, not aliases for the new node-returning utilities.

## Pinned source inspection

The immutable pinned implementation at `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/system/src/utils/graph.ts` defines `getOutgoers` at lines 76-93 and `getIncomers` at lines 118-134. Both form endpoint-ID sets from the edge list and filter the supplied nodes in node-list order. Its `getConnectedEdges` at lines 332-342 filters supplied edges in edge-list order when either endpoint appears in the supplied nodes. The examples' checked-in Cypress cases at `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/examples/react/cypress/components/utils/graph-utils.cy.ts:32-47` cover basic direction and empty neighbor results.

The reference source file depends on its surrounding React Flow system modules. This task did not execute that package's functions or Cypress suite in a reference runtime. The following reference outputs are therefore source-derived expectations, not executable comparison results.

## Flow executable cases

The independent Flow fixture and assertions are in [flow-graph.test.ts:445-494](../../packages/core/src/domain/flow-graph.test.ts#L445). The fixture's node order is `target`, `source-b`, `source-a`, `isolated`, while its edges place `source-b` before `source-a`; a hidden `target` has a self-loop and a parallel incoming edge.

| Input | Action | Pinned source-derived output (not executed) | Flow test output |
| --- | --- | --- | --- |
| Select `target`; nodes are in document order; edges start with `source-b -> target`, then `source-a -> target`, a parallel edge, a self-loop, and `target -> source-b` | Get incomers | `target`, `source-b`, `source-a` in supplied node order; self-loop includes `target`, parallel edge does not duplicate `source-b` | Asserted `[target, source-b, source-a]` |
| Same input | Get outgoers | `target`, `source-b` in supplied node order; self-loop includes `target` | Asserted `[target, source-b]` |
| Select `isolated`; `outside -> isolated` exists, but `outside` is omitted from supplied nodes | Get incomers | Empty because source ID has no matching supplied node | Asserted `[]` |
| Select an absent ID, or supply empty node/edge lists | Get incomers or outgoers | Empty | Asserted `[]` |
| Select only `target` | Get connected edges | All and only incident edges in edge input order, including the self-loop and parallel edge | Asserted the five incident IDs in input order |
| Select only `isolated`; edge `outside -> isolated` exists, with `outside` absent from supplied nodes | Get connected edges | Edge is included because either endpoint is selected | Asserted `unselected-source` |
| Any selected node has `hidden: true` | Query neighbors | No visibility filtering in the utility | Hidden target participates in both assertions above |
| Reuse the input arrays after each query | Query all helpers | Input arrays and their elements remain unchanged | Before/after array equality and element identity are asserted |

The test also retains existing assertions for `graphIncomers` and `graphOutgoers` at [flow-graph.test.ts:296-299](../../packages/core/src/domain/flow-graph.test.ts#L296), protecting their edge-returning behavior.

## Conformity and deviations

- **Conforming by inspected algorithm shape, runtime comparison unverified:** the new helpers use endpoint membership sets, filter caller-supplied arrays, preserve input order, deduplicate node results, and include any incident edge. Flow's independently specified tests observe the listed values; the pinned source is inspected but was not executed. Test boundary: [Flow graph utility tests](../../packages/core/src/domain/flow-graph.test.ts#L445); reference runtime and Cypress evidence remain unverified.
- **Intentionally different:** Flow accepts readonly schema-derived `FlowNode` and `FlowEdge` inputs and returns readonly arrays; pinned React Flow uses generic mutable arrays and allows a plain string-ID object. This keeps the Flow boundary tied to decoded `NodeId` and schema types. Test boundary: [packed consumer typecheck](../../tests/consumer/consumer.typecheck.ts#L1) and graph utility cases above.
- **Intentionally different:** existing `graphIncomers` and `graphOutgoers` remain edge-returning Flow graph-view queries. New names provide the node-returning utility contract without changing existing caller behavior. Test boundary: [legacy graph query assertions](../../packages/core/src/domain/flow-graph.test.ts#L296) and new utility cases.
- **Unverified:** current live React Flow site behavior, runtime parity under duplicate/malformed arbitrary input, and execution of the pinned Cypress suite were not tested. The catalog retains `U` for full-entry reference parity; this local source inspection and Flow contract test do not close that status.

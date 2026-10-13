# 067 bounded origin core execution

Baseline: 841be13. This slice does not activate host origin props, v2 persistence, connections, or original member closure.

Primary advisor approved the additive resize origin and fourth extent argument after inspecting the actual existing calculation, bounds change, and extent contracts. Approval delivered2026-09-30; source acceptance remains pending independent diff and test review.

Usage: decode an ordinary document with optional `nodeOrigin` and per-node `origin`, then call `createFlowGraph`. Stored positions and graph position overrides are parent-relative anchors; graph absolute positions and bounds are physical top-left positions. `resolveNodeOrigin(node, document)` returns per-node, then document, then [0,0]. Finite tuples are unclamped. Core owns all conversion and dimensions policy.

| Reader / boundary | Coordinate contract and change | Meaningful proof |
| --- | --- | --- |
| FlowNodeSchema / FlowDocumentSchema | optional finite length-two origin tuples; schema-derived type | malformed length/null/nonfinite rejection; decode retains overrides |
| createFlowGraph | choose existing both-positive measurement, declared size, fallback; convert anchor once before adding parent physical top-left | root, nested reversed order, unclamped origins, zero/partialzero/hidden/fallback, anchor overrides |
| graphBounds / graphNodesIntersecting | consume graph physical rectangles unchanged | shifted bounds and hit rectangles |
| fitViewportToNodes | consume graph physical bounds unchanged | centered viewport for centered origins |
| selectionInRect / nodeIntersectsViewport | consume graph physical rectangles unchanged | inclusive/exclusive selection and visibility |
| edgeAttachmentPosition / inferHandleMeasurement | input remains physical top-left and handle center remains local top-left | measured/fallback endpoint translated once |
| getFlowInternalNode | preserve current-generation dimensions/handle projection, graph physical position | measured-zero display remains zero while graph uses declared size |
| moveNodeDrag / moveNodeGroupDrag / moveSelectedNodes | positions remain anchors; delta addition unchanged | center-origin move and nested selected ancestor policy |
| constrainNodePosition | optional fourth origin; anchor to physical, constrain full rectangle/oversize center, return anchor | all origins and oversize node |
| constrainNodeGroupDelta | items remain physical top-left, no origin field | group relative physical bounds |
| calculateNodeResize | optional origin; positionStart and output position are anchors, bounds physical parent-local; positionDelta is anchor delta | all corners/sides and bounds under nonzero/unclamped origins |
| calculateNodeResize child delta | childrenPositionDelta is negative physical top-left delta, independent of parent's anchor delta | applyNodeBoundsChange keeps child world positions fixed |
| applyNodeBoundsChange / position changes | accepted stored anchors remain one document authority | actual postchange graph geometry |
| legacy v1 persistence | existing own-origin guard must reject, no frozen schema change | existing persistence guard tests; final v2 belongs070 |
| public.ts | export tuple schema/type/conversions | build/types and packed consumer baseline |

Alternatives rejected: renderer-only transforms split geometry authority; storing top-left alongside anchors duplicates state; deriving child compensation from anchor movement shifts children incorrectly when centered parent size changes; changing the both-positive dimension policy would change accepted065 semantics.

Host adapter origin activation remains pending070. Existing host callers use origin-free documents/default[0,0]; this slice verifies those paths remain green. Host resize callers must later pass effective origin, host extent callers use the approved core fourth argument, and all position override maps must stay anchors. No parity claim follows from core tests alone.

## Conformity and deviations

Finite unclamped origin translation and per-node precedence follow the approved067 specification; executable reference capture and three-host origin behavior remain unverified here. Flow retains one Schema-derived document and graph authority, native host adapters, controlled owner acknowledgement, and guarded v1 envelopes. Test boundaries are core semantics and unchanged origin-free host browser paths, not final067 member acceptance.

## Verification record

Frozen install passed with unchanged lockfile. Targeted6files118tests passed after one new v1 assertion was corrected to inspect tagged error code rather than its empty message. Initial quality check found spacing, curly syntax, globalNaN, and excess assertions in new tests. Scoped formatting/lint repair left one max-expects diagnostic; second quality check still failed that new resize test. Executor stopped under the autonomous repair limit. Primary reviewed the exact test and requested independent review revision1: combine related geometry values into one structured assertion, preserving the child/grandchild world position and origin checks. No lint policy was changed. Final checks below belong to this independent review boundary.

Revision1 quality passed. Typecheck then failed at the real Vanilla public `dispatch` path, `apps/vanilla/src/mount-flow.ts:8873`, where `Effect.runSync(prepareFlowCommand(...))` could not infer a single accepted result from a union of Effects after the document schema grew an optional origin. Core package build itself passed. Executor froze again. Primary inspected the exact core/public call and approved final independent review revision2: explicitly return `Effect.Effect<FlowChange, Effect.Error<ReturnType<typeof prepareFlowEdit>>>` from `prepareFlowCommand`, keeping Schema-derived result and workflow-derived failures, with no cast or environment change. Generated `docs/api-reference.md` is explicitly authorized through its generator. Public docs and source trace are also approved.

Final revision2 quality passed and all four package builds passed. Workspace typecheck still failed exclusively in preexisting speculative origin guard fixtures: `packages/core/src/domain/flow-persistence.test.ts:427` and `packages/core/src/domain/flow-persistence.test.ts:430` pass inferred `number[]` origins; `packages/foldkit/src/application.test.ts:77` passes a fixture with inferred `number[]` node origin. These now conflict with the actual finite two-element tuple type. No tests or schema were weakened. Executor STOP/BLOCK after the final review revision; browser suites and final focused verify did not run. The separate follow-up must give these fixtures schema-derived tuple values and explicitly authorize the Foldkit test path before verification. Candidate remains uncommitted.

# Plan 074: Complete native Node and Edge field and renderer-prop contracts

> Executor: read the whole plan and assigned manifest groups. Execute in order, record actual results and stop on the conditions below. Coordinator maintains plans/README.md unless dispatched otherwise. Drift check: `git diff --stat de36b4f64fe80d99886c0b7a9fb505258b872ac9..HEAD -- packages/core/src packages/vue/src packages/foldkit/src apps/vanilla/src apps/vanilla/e2e apps/vue/e2e apps/foldkit/e2e plans/057-member-closure.json`; `git status --short`. Compare excerpts and acceptance contracts, including uncommitted work, not merely the commit ID.

## Status

- Priority P1; effort L; risk HIGH; category direction.
- Parent 066, required acceptance child of057. Parent057/066 remain IN PROGRESS.
- Planned at de36b4f64fe80d99886c0b7a9fb505258b872ac9, 2026-09-29.
- Depends on accepted 053/054; 066 checked decomposition; 063 SSR dimensions; 065 measurements; 067 origin/connection; 068 accessible defaults; 069 data integration before final acceptance.
- TODO. Decomposition assignment is reviewable; source execution requires independent approval of this family's field/default/lifecycle matrix. This is an architecture-review prerequisite, not a request for user permission.

## Why this matters

The original public inventory retains 294 assigned member records in 121 exact groups for this child, across all three hosts. Existing page-level similarities and passing cases leave named argument/result/default variants open. This child closes those original requirements through actual public paths or independently reviewed native differences. A working implementation still needs member-specific assertions and executable pinned-reference evidence.

## Current state

`packages/core/src/domain/flow.schema.ts:70`

```ts
  zIndex: S.optional(S.Finite),
  size: S.optional(NodeSizeSchema),
  extent: S.optional(S.Literals(['parent'])),
  handles: S.optional(S.Array(FlowHandleSchema)),
  selected: S.optional(S.Boolean),
  selectable: S.optional(S.Boolean),
  focusable: S.optional(S.Boolean),
  draggable: S.optional(S.Boolean),
  deletable: S.optional(S.Boolean),
  ariaLabel: S.optional(S.NonEmptyString),
  ariaDescription: S.optional(S.NonEmptyString),
  hidden: S.optional(S.Boolean),
})

export type FlowNode = typeof FlowNodeSchema.Type

```

`packages/vue/src/use-flow.ts:131`

```ts
export interface FlowEditor {
  readonly document: ComputedRef<DeepReadonly<FlowDocument>>
  readonly viewport: ComputedRef<DeepReadonly<Viewport>>
  readonly snapshot: ComputedRef<DeepReadonly<FlowSnapshot>>
  readonly getDocumentRevision: () => number
  readonly beginDeleteApproval: () => boolean
  readonly endDeleteApproval: () => void
  readonly withEditMutation: (mutation: () => void) => void
  readonly connectionPreview: ComputedRef<
    DeepReadonly<ConnectionPreviewSnapshot>
  >
  readonly subscribeState: (
    listener: (change: FlowStateChange) => void
```

Standards docs/standards.md:7-14 state graph meaning is framework independent, Schema owns runtime contracts, and parity needs a reference test. Match the Schema.Struct/typeof Schema.Type pattern above and the host's existing lifecycle implementation. Existing production acceptance exemplar `apps/vue/e2e/renderer-contract.e2e.ts` invokes the real mounted public host; its path must remain separate from the pinned reference test path.

## Scope

Only these existing files and their public barrel exports, adjacent unit tests and styles needed by this exact family may change:

- `packages/core/src/domain/flow.schema.ts`
- `packages/core/src/domain/flow.schema.test.ts`
- `packages/core/src/domain/flow-edit.schema.ts`
- `packages/core/src/domain/flow-runtime.schema.ts`
- `apps/vanilla/src/mount-flow.ts`
- `packages/vue/src/flow-canvas.ts`
- `packages/vue/src/use-flow.ts`
- `packages/foldkit/src/graph.ts`
- `packages/foldkit/src/application.ts`
- `apps/vanilla/src/public.ts`, `packages/vue/src/public.ts`, `packages/foldkit/src/public.ts`, `packages/core/src/public.ts`.
- `apps/vanilla/e2e/node-edge-fields.e2e.ts` and its NEW `apps/vanilla/src/node-edge-fields-test.ts` / HTML entry route.
- `apps/vue/e2e/node-edge-fields.e2e.ts` and its NEW `apps/vue/src/node-edge-fields-test.ts` / HTML entry route.
- `apps/foldkit/e2e/node-edge-fields.e2e.ts` and its NEW `apps/foldkit/src/node-edge-fields-test.ts` / HTML entry route.
- NEW `scripts/capture-node-edge-field-reference.ts`, `research/harnesses/node-edge-field/`, `research/fixtures/node-edge-field-reference.json`, `packages/conformance/src/node-edge-field-reference.test.ts`.
- `scripts/check-packed-consumer.ts` and its existing fixtures for public compile/mount assertions; existing per-host e2e exemplar files.
- `plans/057-member-closure.json`, this plan; `docs/public-api.md`, `docs/react-flow-api-correspondence.md`, `research/traces/public-api-completion.md`, NEW `research/traces/node-edge-fields.md`, fixture README and research/PROGRESS.md. Generated docs only through generator.

Out of scope: unrelated recipes/features, backend/collaboration, imported artifacts, dependency changes, renderer replacement, private stores, second graph authority, publication and other dirty work. Existing component UI remains058; origins/persistence067/070; typed data069. Coordinate shared host edits sequentially in the cumulative worktree.

## Architecture and evidence rules

Follow docs/standards.md. Graph meaning/geometry/validated transitions and Effect workflows live in packages/core; native lifecycle and DOM remain adapters. Vanilla source stays apps/vanilla; Vue/Foldkit use packages/vue and packages/foldkit. Caller functions stay host-local. Foldkit ports carry Schema-derived serializable values. Controlled actions propose until owner acknowledgment; uncontrolled actions validate, commit, notify. Decode unknown once at boundaries. No casts bypassing runtime validation, mutable store access, second authority or cross-owner DOM queries. Pin Effect/platform4.0.0-rc.116, Foldkit0.163.0, Vue3.5.43 and the unchanged frozen lockfile. Saved v1 remains compatible unless an independently approved versioned migration explicitly applies. Canonical FlowSpan/FlowAttribute names come from packages/core/src/telemetry/flow-telemetry.ts. Log lifecycle/decode/semantic/failure boundaries; keep pointer moves out of logs. OTLP delivery requires collector evidence. Imported research/artifacts remains immutable.

## Assigned acceptance matrix

Use `bun -e 'const m=await Bun.file("plans/057-member-closure.json").json(); for (const g of m.groups.filter(g=>g.ownerPlan==="074")) console.log(g.id, JSON.stringify(g.members), JSON.stringify(g.targets));'`. This prints every exact member, including nested union/callback/generic cases; the manifest's original catalog descriptions/rawSourceRow remain the authoritative dated requirement text. Do not drop members or rename gaps into reviewed differences. Public target export names are the real entry roots, not proof that those entries already implement the assigned operations. Every complete cell needs its own identity-bearing proof even when one test covers a group.

For every assigned Node/Edge/InternalNode/NodeProps/EdgeProps/NodeTypes/EdgeTypes cell, reconcile serializable document fields versus derived runtime presentation. Explicitly cover className, style, domAttributes, animated, dragHandle, draggable/selectable/focusable/deletable/connectable, expandParent, local extent/parent identity, path/label props, source/target side, interaction width and zIndex. Renderer registries need missing/unknown-type/default behavior, update/disposal and independent owner instances. Validate unsafe DOM attribute handling at the native boundary without serializing functions or DOM. Derived dragging/resizing/absolute/measurement/internals must stay runtime-owned. Data-specific generic branches remain069, origin branches067, labels068 and SSR handle initialization063; include those child proofs when a composite Node/Edge contract closes.

## Commands and expected results

Run serially. Each command must exit0; browser tests have no new skips. Run `bun install --frozen-lockfile`, `bun run check`, `bun run typecheck`, `bun run check:architecture`, `bun run test`, `bun run test:consumer`, `bun run docs:generate-api`, `bun run docs:check`, `bun run research:check-traces`, `bun run scripts/check-api-members.ts`, `bun run scripts/check-api-member-contracts.ts`, `bun run scripts/check-react-flow-catalog.ts`, `bun run verify` and `git diff --check`. Strict browser ports may not reuse foreign servers. Existing two native-device skips remain explicit. Local/hosted/device/reference/collector claims are separate.

## Steps

### 1. Freeze the complete matrix and native ownership

Read all assigned original member descriptions/raw source and pinned declarations. Trace the real public entry, state/geometry, DOM effect and rendered output in each host with exact path:line citations. Compare actual current implementation and existing053–056/057/058/059/061 evidence before changing code. Write the full field/option/callback/default matrix and obtain independent architectural review, including public usage, runtime versus persisted ownership, host-local function handling and existing v1 policy. This child does not have approval to invent a new field shape while coding.

Verify `bun run scripts/check-api-member-contracts.ts` exits0 and retains every assigned cell. The reviewed matrix enumerates every group above; no source execution before review.

### 2. Implement or reconcile exact assigned semantics

For each assigned original field, classify persisted serializable value, host-local presentation callback/attribute or runtime-derived value in a reviewed field matrix. Add only documented missing semantics at its existing owner. Keep one graph authority and update existing renderer contexts rather than introducing a mirrored store. Any persisted schema extension needs reviewed versioned decode/encode compatibility before coding; origin persistence is exclusively070.

Extend the named production fixtures/tests from public package exports. Test default/explicit/update/cancellation/disposal and independent owners, plus every variant named in the matrix. Runtime test helpers must not reproduce the reducer or publish replacement private graph state.

Verify `bun run test`, `bun run typecheck`, `bun run check:architecture`, then serial `bun run test:browser -- node-edge-fields.e2e.ts`, `bun run test:conformance:vue -- node-edge-fields.e2e.ts`, `bun run test:conformance:foldkit -- node-edge-fields.e2e.ts`; all exit0. Do not run browser commands until the NEW production entry/routes exist.

### 3. Reproduce pinned behavior and reconcile every cell

Create the capture script/harness by following scripts/capture-provider-session-reference.ts and scripts/capture-graph-edit-reference.ts's full-checkout `--checkout` interface. Pinned SHA0a1f9575b25679f2880175de8d3eae21aedde921 / React12.11.6 is required. Capture two independently stable normalized samples; retain exact behavior differences and normalizations. Current official pages are a separate dated drift source, not executable proof.

Verify `bun run scripts/capture-node-edge-field-reference.ts --checkout /tmp/flow-052-xyflow` exits0 after script exists and the checkout is verified. Then `bun run test -- packages/conformance/src/node-edge-field-reference.test.ts` and `bun run test:consumer` pass. Add positive/negative generic consumer probes when these payloads consume069. Fill identity-specific implementation/test/reference assertions or reviewed native reasons/test boundaries into assigned cells. Do not mark unrelated family cells complete. Run both member checkers exit0. Parent `--require-closed` must continue nonzero while other owners remain open.

### 4. Complete the local gate and independent review

Run all common commands, including full `bun run verify`, once serially after targeted gates pass. Finish each trace with `Conformity and deviations`, classify conforming/intentionally different/unverified and separate production/test entry paths. Report exact scope diff and actual commands/counts. Independent reviewer inspects source and assertions before acceptance.

## Test plan

Use `apps/vue/e2e/renderer-contract.e2e.ts` for real-host fixture/assertion structure and existing capture-provider-session-reference.ts for capture lifecycle. Add the three NEW `node-edge-fields.e2e.ts` suites and their real entries. Assert every matrix case described above. Add malformed-boundary and atomic-rejection unit tests beside edited core contracts; static generic rows require positive/negative consumer type probes. Computed DOM/SVG/accepted values are required, not class presence alone.

## Done criteria

- [ ] Common commands and all three named production suites exit0; final verify completes.
- [ ] Every original assigned member/host has specific implementation/test/reference proof or independently reviewed native reason plus a real test boundary; no assigned required gap remains.
- [ ] NEW reference capture reproduces stable pinned samples; conformance/consumer probes pass.
- [ ] `git diff --check` exits0; all edited files within Scope; no lockfile drift.
- [ ] Independent review approves changes and evidence. Parent057/066 remain open until every child/gate closes.

## Git workflow and STOP conditions

Use an isolated codex/074-complete-native-node-edge-fields branch/worktree or coordinator's cumulative isolated worktree. No commit/merge/push/publish/PR without separate authorization. Preserve dirty unrelated work. Stop if quoted contracts drift, a required check fails twice after focused repair, capture cannot reproduce, unreviewed persistence/callback/serialization architecture is needed, scope must expand, or implementation requires unsafe casts/private state/cross-owner DOM/second authority. Report exact blocker and preserve independent completed work. A timeout is not evidence of a dead process.

## Maintenance

Refresh individual assertions when upstream defaults, schemas, lifecycle or exports change. Source line validity is structural; a reviewer must still read its meaning. Component058 and generic069 acceptance can invalidate composite contracts here, so rerun their consuming tests before marking cells complete.

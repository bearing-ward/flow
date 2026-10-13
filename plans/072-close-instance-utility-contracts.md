# Plan 072: Close public instance methods, change arrays and utility option contracts

> Executor: read the whole plan and assigned manifest groups. Execute in order, record actual results and stop on the conditions below. Coordinator maintains plans/README.md unless dispatched otherwise. Drift check: `git diff --stat de36b4f64fe80d99886c0b7a9fb505258b872ac9..HEAD -- packages/core/src packages/vue/src packages/foldkit/src apps/vanilla/src apps/vanilla/e2e apps/vue/e2e apps/foldkit/e2e plans/057-member-closure.json`; `git status --short`. Compare excerpts and acceptance contracts, including uncommitted work, not merely the commit ID.

## Status

- Priority P1; effort L; risk HIGH; category direction.
- Parent 066, required acceptance child of057. Parent057/066 remain IN PROGRESS.
- Planned at de36b4f64fe80d99886c0b7a9fb505258b872ac9, 2026-09-29.
- Depends on accepted 053/055/057 edit and viewport slices; 066 checked decomposition; 064 queries; 067 origin bounds; 069 typed data before final acceptance; 070 before origin-aware saved-session closure.
- TODO. Decomposition assignment is reviewable; source execution requires independent approval of this family's field/default/lifecycle matrix. This is an architecture-review prerequisite, not a request for user permission.

## Why this matters

The original public inventory retains 1003 assigned member records in 196 exact groups for this child, across all three hosts. Existing page-level similarities and passing cases leave named argument/result/default variants open. This child closes those original requirements through actual public paths or independently reviewed native differences. A working implementation still needs member-specific assertions and executable pinned-reference evidence.

## Bounded pure-helper child088, 2026-10-02

Primary and independent design review approve only the exact32 singleton groups on the four dated utility pages get-bezier-path, get-simple-bezier-path, get-smooth-step-path and get-straight-path, all existing owner072. The complete unchanged member allowlist and96 host-cell identities are in `plans/archive/path-helper-parity-design.md`; no getStepPath or additional getEdgeCenter identity is invented. Whole072 remains TODO and its existing dependencies remain for all other groups.

For these32 only, the actual public entry is `packages/core/src/public.ts` with the matching existing getBezierPath/getSimpleBezierPath/getSmoothStepPath/getStraightPath export. Three installed host contexts exercise the same pure core API. Owning production test is `packages/core/src/domain/flow-edge-path.test.ts`; reference capture is NEW `scripts/capture-path-helper-reference.ts`, using NEW `research/harnesses/path-helper/cases.ts` and `research/harnesses/path-helper/main.ts`; fixture is NEW `research/fixtures/path-helper-reference.json`, with NEW `packages/conformance/src/path-helper-reference.test.ts`. This appendix explicitly owns those bounded child paths for target validation. No host renderer or generic data lifecycle is in that pure call path.

Only the32 groups' targets/obligations and their sole069 prerequisite are amended under the exact fixed URL/member/groupID/owner072/helper/core-path checker exception. Numeric coordinates/options and synchronous string/number tuples have no generic data/callback/Model requirement; remove069 ONLY from these32. Preserve all other dependencies, original identities/counts/catalog/raw evidence, all other group/cell fields and accepted06518implemented/171differences. Checker validity is not semantic proof. Each96cell still requires particular real source/unit/two-process upstream/installed assertion and primary approval before transition.

Raw pure math retains the existing number domain, defaults, synchronous returns, readonly arguments and mutable tuples. Schema-derived types preserve both actual compiler modes without per-call guards or a new failure API. The known same-side NaN predicate discrepancy is conditionally repairable only after actual unmodified Flow/genuine pinned full-tuple reproduction and primary review, exactly as revised088 requires. Whole072/057/066 remains open; source execution is isolated and uncommitted, with final focused gate and independent source review. Original072's unrelated source authorization is unchanged.

## Current state

`packages/core/src/domain/flow-change-compatibility.ts:10`

```ts
export const NodeDimensionsChangeSchema = S.Struct({
  id: NodeIdSchema,
  type: S.Literal('dimensions'),
  dimensions: S.optional(DimensionsSchema),
  resizing: S.optional(S.Boolean),
  setAttributes: S.optional(
    S.Union([S.Boolean, S.Literals(['width', 'height'])])
  ),
})

export type NodeDimensionsChange = typeof NodeDimensionsChangeSchema.Type

export const NodePositionArrayChangeSchema = S.Struct({
  id: NodeIdSchema,
  type: S.Literal('position'),
  position: S.optional(S.Struct({ x: S.Number, y: S.Number })),
  positionAbsolute: S.optional(S.Struct({ x: S.Number, y: S.Number })),
  dragging: S.optional(S.Boolean),
})

export type NodePositionArrayChange = typeof NodePositionArrayChangeSchema.Type
```

`packages/core/src/domain/flow-viewport-operation.schema.ts:26`

```ts
export type ViewportPadding = typeof ViewportPaddingSchema.Type

export const ViewportAnimationOptionsSchema = S.Struct({
  duration: S.optional(S.Finite.check(S.isGreaterThanOrEqualTo(0))),
  easing: S.optional(S.Literals(['linear', 'ease-in-out'])),
})

export type ViewportAnimationOptions =
  typeof ViewportAnimationOptionsSchema.Type

const easeInOut = (value: number): number =>
  value < 0.5 ? 4 * value ** 3 : 1 - (-2 * value + 2) ** 3 / 2
```

Standards docs/standards.md:7-14 state graph meaning is framework independent, Schema owns runtime contracts, and parity needs a reference test. Match the Schema.Struct/typeof Schema.Type pattern above and the host's existing lifecycle implementation. Existing production acceptance exemplar `apps/vanilla/e2e/public-state.e2e.ts` invokes the real mounted public host; its path must remain separate from the pinned reference test path.

## Scope

Only these existing files and their public barrel exports, adjacent unit tests and styles needed by this exact family may change:

- `packages/core/src/domain/flow-change-compatibility.ts`
- `packages/core/src/domain/flow-change-compatibility.test.ts`
- `packages/core/src/domain/flow-viewport-operation.schema.ts`
- `packages/core/src/domain/flow-viewport-contract.test.ts`
- `apps/vanilla/src/mount-flow.ts`
- `packages/vue/src/use-flow.ts`
- `packages/vue/src/flow-canvas.ts`
- `packages/foldkit/src/application.ts`
- `packages/foldkit/src/host-options.ts`
- `apps/vanilla/src/public.ts`, `packages/vue/src/public.ts`, `packages/foldkit/src/public.ts`, `packages/core/src/public.ts`.
- `apps/vanilla/e2e/instance-members.e2e.ts` and its NEW `apps/vanilla/src/instance-members-test.ts` / HTML entry route.
- `apps/vue/e2e/instance-members.e2e.ts` and its NEW `apps/vue/src/instance-members-test.ts` / HTML entry route.
- `apps/foldkit/e2e/instance-members.e2e.ts` and its NEW `apps/foldkit/src/instance-members-test.ts` / HTML entry route.
- NEW `scripts/capture-instance-member-reference.ts`, `research/harnesses/instance-member/`, `research/fixtures/instance-member-reference.json`, `packages/conformance/src/instance-member-reference.test.ts`.
- `scripts/check-packed-consumer.ts` and its existing fixtures for public compile/mount assertions; existing per-host e2e exemplar files.
- `plans/057-member-closure.json`, this plan; `docs/public-api.md`, `docs/react-flow-api-correspondence.md`, `research/traces/public-api-completion.md`, NEW `research/traces/instance-members.md`, fixture README and research/PROGRESS.md. Generated docs only through generator.

Out of scope: unrelated recipes/features, backend/collaboration, imported artifacts, dependency changes, renderer replacement, private stores, second graph authority, publication and other dirty work. Existing component UI remains058; origins/persistence067/070; typed data069. Coordinate shared host edits sequentially in the cumulative worktree.

## Architecture and evidence rules

Follow docs/standards.md. Graph meaning/geometry/validated transitions and Effect workflows live in packages/core; native lifecycle and DOM remain adapters. Vanilla source stays apps/vanilla; Vue/Foldkit use packages/vue and packages/foldkit. Caller functions stay host-local. Foldkit ports carry Schema-derived serializable values. Controlled actions propose until owner acknowledgment; uncontrolled actions validate, commit, notify. Decode unknown once at boundaries. No casts bypassing runtime validation, mutable store access, second authority or cross-owner DOM queries. Pin Effect/platform4.0.0-rc.116, Foldkit0.163.0, Vue3.5.43 and the unchanged frozen lockfile. Saved v1 remains compatible unless an independently approved versioned migration explicitly applies. Canonical FlowSpan/FlowAttribute names come from packages/core/src/telemetry/flow-telemetry.ts. Log lifecycle/decode/semantic/failure boundaries; keep pointer moves out of logs. OTLP delivery requires collector evidence. Imported research/artifacts remains immutable.

## Assigned acceptance matrix

Use `bun -e 'const m=await Bun.file("plans/057-member-closure.json").json(); for (const g of m.groups.filter(g=>g.ownerPlan==="072")) console.log(g.id, JSON.stringify(g.members), JSON.stringify(g.targets));'`. This prints every exact member, including nested union/callback/generic cases; the manifest's original catalog descriptions/rawSourceRow remain the authoritative dated requirement text. Do not drop members or rename gaps into reviewed differences. Public target export names are the real entry roots, not proof that those entries already implement the assigned operations. Every complete cell needs its own identity-bearing proof even when one test covers a group.

Enumerate every assigned instance method and its nested argument/result branch, including add/set/update Node/Edge single/array/updater and replace forms, missing IDs, getNodesBounds/lookup variants, screen/flow conversion and snap options, intersection partial/full variants, fitView node filters/hidden nodes/extent/min/max/padding/duration/ease/interpolate, terminal viewport outcomes, delete approval and callback ordering, toObject and restore. Pure addEdge/reconnectEdge cover custom ID/error callback/replace-ID options; all NodeChange variants cover positionAbsolute, resizing, setAttributes false/width/height, add index and replace semantics. Graph neighbor and path utilities retain named option and tuple return cells. Do not add private store setters or equate proposed operations with accepted graph state.

## Commands and expected results

Run serially. Each command must exit0; browser tests have no new skips. Run `bun install --frozen-lockfile`, `bun run check`, `bun run typecheck`, `bun run check:architecture`, `bun run test`, `bun run test:consumer`, `bun run docs:generate-api`, `bun run docs:check`, `bun run research:check-traces`, `bun run scripts/check-api-members.ts`, `bun run scripts/check-api-member-contracts.ts`, `bun run scripts/check-react-flow-catalog.ts`, `bun run verify` and `git diff --check`. Strict browser ports may not reuse foreign servers. Existing two native-device skips remain explicit. Local/hosted/device/reference/collector claims are separate.

## Steps

### 1. Freeze the complete matrix and native ownership

Read all assigned original member descriptions/raw source and pinned declarations. Trace the real public entry, state/geometry, DOM effect and rendered output in each host with exact path:line citations. Compare actual current implementation and existing053–056/057/058/059/061 evidence before changing code. Write the full field/option/callback/default matrix and obtain independent architectural review, including public usage, runtime versus persisted ownership, host-local function handling and existing v1 policy. This child does not have approval to invent a new field shape while coding.

Verify `bun run scripts/check-api-member-contracts.ts` exits0 and retains every assigned cell. The reviewed matrix enumerates every group above; no source execution before review.

### 2. Implement or reconcile exact assigned semantics

Reconcile already implemented methods first and add exact assertions instead of reimplementing them. Add missing pure options in core and expose host methods through public controller/useFlow/Foldkit request/result interfaces. Caller callbacks and easing functions stay native; ask for reviewed serialization design if an option cannot fit Foldkit ports. All replacements decode atomically before publication. Persist only serializable document/viewport data through the versioned codec.

Extend the named production fixtures/tests from public package exports. Test default/explicit/update/cancellation/disposal and independent owners, plus every variant named in the matrix. Runtime test helpers must not reproduce the reducer or publish replacement private graph state.

Verify `bun run test`, `bun run typecheck`, `bun run check:architecture`, then serial `bun run test:browser -- instance-members.e2e.ts`, `bun run test:conformance:vue -- instance-members.e2e.ts`, `bun run test:conformance:foldkit -- instance-members.e2e.ts`; all exit0. Do not run browser commands until the NEW production entry/routes exist.

### 3. Reproduce pinned behavior and reconcile every cell

Create the capture script/harness by following scripts/capture-provider-session-reference.ts and scripts/capture-graph-edit-reference.ts's full-checkout `--checkout` interface. Pinned SHA0a1f9575b25679f2880175de8d3eae21aedde921 / React12.11.6 is required. Capture two independently stable normalized samples; retain exact behavior differences and normalizations. Current official pages are a separate dated drift source, not executable proof.

Verify `bun run scripts/capture-instance-member-reference.ts --checkout /tmp/flow-052-xyflow` exits0 after script exists and the checkout is verified. Then `bun run test -- packages/conformance/src/instance-member-reference.test.ts` and `bun run test:consumer` pass. Add positive/negative generic consumer probes when these payloads consume069. Fill identity-specific implementation/test/reference assertions or reviewed native reasons/test boundaries into assigned cells. Do not mark unrelated family cells complete. Run both member checkers exit0. Parent `--require-closed` must continue nonzero while other owners remain open.

### 4. Complete the local gate and independent review

Run all common commands, including full `bun run verify`, once serially after targeted gates pass. Finish each trace with `Conformity and deviations`, classify conforming/intentionally different/unverified and separate production/test entry paths. Report exact scope diff and actual commands/counts. Independent reviewer inspects source and assertions before acceptance.

## Test plan

Use `apps/vanilla/e2e/public-state.e2e.ts` for real-host fixture/assertion structure and existing capture-provider-session-reference.ts for capture lifecycle. Add the three NEW `instance-members.e2e.ts` suites and their real entries. Assert every matrix case described above. Add malformed-boundary and atomic-rejection unit tests beside edited core contracts; static generic rows require positive/negative consumer type probes. Computed DOM/SVG/accepted values are required, not class presence alone.

## Done criteria

- [ ] Common commands and all three named production suites exit0; final verify completes.
- [ ] Every original assigned member/host has specific implementation/test/reference proof or independently reviewed native reason plus a real test boundary; no assigned required gap remains.
- [ ] NEW reference capture reproduces stable pinned samples; conformance/consumer probes pass.
- [ ] `git diff --check` exits0; all edited files within Scope; no lockfile drift.
- [ ] Independent review approves changes and evidence. Parent057/066 remain open until every child/gate closes.

## Git workflow and STOP conditions

Use an isolated codex/072-close-instance-utility-contracts branch/worktree or coordinator's cumulative isolated worktree. No commit/merge/push/publish/PR without separate authorization. Preserve dirty unrelated work. Stop if quoted contracts drift, a required check fails twice after focused repair, capture cannot reproduce, unreviewed persistence/callback/serialization architecture is needed, scope must expand, or implementation requires unsafe casts/private state/cross-owner DOM/second authority. Report exact blocker and preserve independent completed work. A timeout is not evidence of a dead process.

## Maintenance

Refresh individual assertions when upstream defaults, schemas, lifecycle or exports change. Source line validity is structural; a reviewer must still read its meaning. Component058 and generic069 acceptance can invalidate composite contracts here, so rerun their consuming tests before marking cells complete.

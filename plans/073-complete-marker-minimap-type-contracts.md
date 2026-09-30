# Plan 073: Complete marker and custom edge/minimap rendering type contracts

> Executor: read the whole plan and assigned manifest groups. Execute in order, record actual results and stop on the conditions below. Coordinator maintains plans/README.md unless dispatched otherwise. Drift check: `git diff --stat de36b4f64fe80d99886c0b7a9fb505258b872ac9..HEAD -- packages/core/src packages/vue/src packages/foldkit/src apps/vanilla/src apps/vanilla/e2e apps/vue/e2e apps/foldkit/e2e plans/057-member-closure.json`; `git status --short`. Compare excerpts and acceptance contracts, including uncommitted work, not merely the commit ID.

## Status

- Priority P1; effort L; risk HIGH; category direction.
- Parent 066, required acceptance child of057. Parent057/066 remain IN PROGRESS.
- Planned at de36b4f64fe80d99886c0b7a9fb505258b872ac9, 2026-09-29.
- Depends on accepted 054 renderer/058 UI; 066 checked decomposition; 068 marker color/global labels; 069 typed data before final acceptance.
- TODO. Decomposition assignment is reviewable; source execution requires independent approval of this family's field/default/lifecycle matrix. This is an architecture-review prerequisite, not a request for user permission.

## Why this matters

The original public inventory retains 101 assigned member records in 30 exact groups for this child, across all three hosts. Existing page-level similarities and passing cases leave named argument/result/default variants open. This child closes those original requirements through actual public paths or independently reviewed native differences. A working implementation still needs member-specific assertions and executable pinned-reference evidence.

## Current state

`packages/core/src/domain/flow.schema.ts:103`

```ts
])

export type FlowEdgeReconnectable = typeof FlowEdgeReconnectableSchema.Type

export const FlowEdgeStrokeSchema = S.String.check(
  S.isPattern(/^#[0-9a-fA-F]{6}$/u)
)

export const FlowEdgeSchema = S.Struct({
  id: EdgeIdSchema,
  source: NodeIdSchema,
  target: NodeIdSchema,
  type: S.optional(S.NonEmptyString),
  sourceHandle: S.optional(HandleIdSchema),
  targetHandle: S.optional(HandleIdSchema),
  path: S.optional(FlowEdgePathSchema),
  label: S.optional(S.String),
  data: S.optional(S.JsonObject),
  markerStart: S.optional(FlowEdgeMarkerSchema),
  markerEnd: S.optional(FlowEdgeMarkerSchema),
```

`apps/vanilla/src/mount-flow.ts:593`

```ts
export interface FlowEdgeRenderContext {
  readonly source: XYPosition
  readonly target: XYPosition
  readonly sourceSide: FlowHandle['side']
  readonly targetSide: FlowHandle['side']
  readonly pathData: string
  readonly labelAnchor: XYPosition
}
```

Standards docs/standards.md:7-14 state graph meaning is framework independent, Schema owns runtime contracts, and parity needs a reference test. Match the Schema.Struct/typeof Schema.Type pattern above and the host's existing lifecycle implementation. Existing production acceptance exemplar `apps/vanilla/e2e/renderer-contract.e2e.ts` invokes the real mounted public host; its path must remain separate from the pinned reference test path.

## Scope

Only these existing files and their public barrel exports, adjacent unit tests and styles needed by this exact family may change:

- `packages/core/src/domain/flow.schema.ts`
- `packages/core/src/domain/flow-edge.schema.ts`
- `packages/core/src/domain/flow-edge.schema.test.ts`
- `apps/vanilla/src/mount-flow.ts`
- `apps/vanilla/src/canvas-ui.ts`
- `packages/vue/src/flow-canvas.ts`
- `packages/vue/src/minimap.ts`
- `packages/foldkit/src/graph.ts`
- `packages/foldkit/src/ui.ts`
- `apps/vanilla/src/public.ts`, `packages/vue/src/public.ts`, `packages/foldkit/src/public.ts`, `packages/core/src/public.ts`.
- `apps/vanilla/e2e/marker-minimap-members.e2e.ts` and its NEW `apps/vanilla/src/marker-minimap-members-test.ts` / HTML entry route.
- `apps/vue/e2e/marker-minimap-members.e2e.ts` and its NEW `apps/vue/src/marker-minimap-members-test.ts` / HTML entry route.
- `apps/foldkit/e2e/marker-minimap-members.e2e.ts` and its NEW `apps/foldkit/src/marker-minimap-members-test.ts` / HTML entry route.
- NEW `scripts/capture-marker-minimap-reference.ts`, `research/harnesses/marker-minimap/`, `research/fixtures/marker-minimap-reference.json`, `packages/conformance/src/marker-minimap-reference.test.ts`.
- `scripts/check-packed-consumer.ts` and its existing fixtures for public compile/mount assertions; existing per-host e2e exemplar files.
- `plans/057-member-closure.json`, this plan; `docs/public-api.md`, `docs/react-flow-api-correspondence.md`, `research/traces/public-api-completion.md`, NEW `research/traces/marker-minimap-members.md`, fixture README and research/PROGRESS.md. Generated docs only through generator.

Out of scope: unrelated recipes/features, backend/collaboration, imported artifacts, dependency changes, renderer replacement, private stores, second graph authority, publication and other dirty work. Existing component UI remains058; origins/persistence067/070; typed data069. Coordinate shared host edits sequentially in the cumulative worktree.

## Architecture and evidence rules

Follow docs/standards.md. Graph meaning/geometry/validated transitions and Effect workflows live in packages/core; native lifecycle and DOM remain adapters. Vanilla source stays apps/vanilla; Vue/Foldkit use packages/vue and packages/foldkit. Caller functions stay host-local. Foldkit ports carry Schema-derived serializable values. Controlled actions propose until owner acknowledgment; uncontrolled actions validate, commit, notify. Decode unknown once at boundaries. No casts bypassing runtime validation, mutable store access, second authority or cross-owner DOM queries. Pin Effect/platform4.0.0-rc.116, Foldkit0.163.0, Vue3.5.43 and the unchanged frozen lockfile. Saved v1 remains compatible unless an independently approved versioned migration explicitly applies. Canonical FlowSpan/FlowAttribute names come from packages/core/src/telemetry/flow-telemetry.ts. Log lifecycle/decode/semantic/failure boundaries; keep pointer moves out of logs. OTLP delivery requires collector evidence. Imported research/artifacts remains immutable.

## Assigned acceptance matrix

Use `bun -e 'const m=await Bun.file("plans/057-member-closure.json").json(); for (const g of m.groups.filter(g=>g.ownerPlan==="073")) console.log(g.id, JSON.stringify(g.members), JSON.stringify(g.targets));'`. This prints every exact member, including nested union/callback/generic cases; the manifest's original catalog descriptions/rawSourceRow remain the authoritative dated requirement text. Do not drop members or rename gaps into reviewed differences. Public target export names are the real entry roots, not proof that those entries already implement the assigned operations. Every complete cell needs its own identity-bearing proof even when one test covers a group.

Preserve all assigned EdgeMarker fields and union cases: type/color null handling, width/height, markerUnits, orient, strokeWidth and start/end variants. MiniMapNodeProps include id, x/y, width/height, color, strokeColor/strokeWidth, borderRadius, className, style and selected mapping with caller custom renderer/native event handling. Assert generated SVG attributes and computed style, directed marker placement and owner-scoped IDs across two mounted canvases. Exercise runtime updates, removed edges/nodes, z-order and teardown. All component-level MiniMap option cells remain owner058; consume its public helper/component and extend only the required renderer/type fields, without implementing its whole UI queue.

## Commands and expected results

Run serially. Each command must exit0; browser tests have no new skips. Run `bun install --frozen-lockfile`, `bun run check`, `bun run typecheck`, `bun run check:architecture`, `bun run test`, `bun run test:consumer`, `bun run docs:generate-api`, `bun run docs:check`, `bun run research:check-traces`, `bun run scripts/check-api-members.ts`, `bun run scripts/check-api-member-contracts.ts`, `bun run scripts/check-react-flow-catalog.ts`, `bun run verify` and `git diff --check`. Strict browser ports may not reuse foreign servers. Existing two native-device skips remain explicit. Local/hosted/device/reference/collector claims are separate.

## Steps

### 1. Freeze the complete matrix and native ownership

Read all assigned original member descriptions/raw source and pinned declarations. Trace the real public entry, state/geometry, DOM effect and rendered output in each host with exact path:line citations. Compare actual current implementation and existing053–056/057/058/059/061 evidence before changing code. Write the full field/option/callback/default matrix and obtain independent architectural review, including public usage, runtime versus persisted ownership, host-local function handling and existing v1 policy. This child does not have approval to invent a new field shape while coding.

Verify `bun run scripts/check-api-member-contracts.ts` exits0 and retains every assigned cell. The reviewed matrix enumerates every group above; no source execution before review.

### 2. Implement or reconcile exact assigned semantics

Freeze a reviewed serializable marker field contract and native renderer props before implementation. Replace the existing arrow-only schema only with explicit v1 codec compatibility evidence. Compose markers through existing edge renderers, and custom minimap nodes through each native minimap implementation. Share pure geometry in core; keep SVG/DOM ownership in adapters. Preserve global default color precedence from068 and original UI work owned058.

Extend the named production fixtures/tests from public package exports. Test default/explicit/update/cancellation/disposal and independent owners, plus every variant named in the matrix. Runtime test helpers must not reproduce the reducer or publish replacement private graph state.

Verify `bun run test`, `bun run typecheck`, `bun run check:architecture`, then serial `bun run test:browser -- marker-minimap-members.e2e.ts`, `bun run test:conformance:vue -- marker-minimap-members.e2e.ts`, `bun run test:conformance:foldkit -- marker-minimap-members.e2e.ts`; all exit0. Do not run browser commands until the NEW production entry/routes exist.

### 3. Reproduce pinned behavior and reconcile every cell

Create the capture script/harness by following scripts/capture-provider-session-reference.ts and scripts/capture-graph-edit-reference.ts's full-checkout `--checkout` interface. Pinned SHA0a1f9575b25679f2880175de8d3eae21aedde921 / React12.11.6 is required. Capture two independently stable normalized samples; retain exact behavior differences and normalizations. Current official pages are a separate dated drift source, not executable proof.

Verify `bun run scripts/capture-marker-minimap-reference.ts --checkout /tmp/flow-052-xyflow` exits0 after script exists and the checkout is verified. Then `bun run test -- packages/conformance/src/marker-minimap-reference.test.ts` and `bun run test:consumer` pass. Add positive/negative generic consumer probes when these payloads consume069. Fill identity-specific implementation/test/reference assertions or reviewed native reasons/test boundaries into assigned cells. Do not mark unrelated family cells complete. Run both member checkers exit0. Parent `--require-closed` must continue nonzero while other owners remain open.

### 4. Complete the local gate and independent review

Run all common commands, including full `bun run verify`, once serially after targeted gates pass. Finish each trace with `Conformity and deviations`, classify conforming/intentionally different/unverified and separate production/test entry paths. Report exact scope diff and actual commands/counts. Independent reviewer inspects source and assertions before acceptance.

## Test plan

Use `apps/vanilla/e2e/renderer-contract.e2e.ts` for real-host fixture/assertion structure and existing capture-provider-session-reference.ts for capture lifecycle. Add the three NEW `marker-minimap-members.e2e.ts` suites and their real entries. Assert every matrix case described above. Add malformed-boundary and atomic-rejection unit tests beside edited core contracts; static generic rows require positive/negative consumer type probes. Computed DOM/SVG/accepted values are required, not class presence alone.

## Done criteria

- [ ] Common commands and all three named production suites exit0; final verify completes.
- [ ] Every original assigned member/host has specific implementation/test/reference proof or independently reviewed native reason plus a real test boundary; no assigned required gap remains.
- [ ] NEW reference capture reproduces stable pinned samples; conformance/consumer probes pass.
- [ ] `git diff --check` exits0; all edited files within Scope; no lockfile drift.
- [ ] Independent review approves changes and evidence. Parent057/066 remain open until every child/gate closes.

## Git workflow and STOP conditions

Use an isolated codex/073-complete-marker-minimap-type-contracts branch/worktree or coordinator's cumulative isolated worktree. No commit/merge/push/publish/PR without separate authorization. Preserve dirty unrelated work. Stop if quoted contracts drift, a required check fails twice after focused repair, capture cannot reproduce, unreviewed persistence/callback/serialization architecture is needed, scope must expand, or implementation requires unsafe casts/private state/cross-owner DOM/second authority. Report exact blocker and preserve independent completed work. A timeout is not evidence of a dead process.

## Maintenance

Refresh individual assertions when upstream defaults, schemas, lifecycle or exports change. Source line validity is structural; a reviewer must still read its meaning. Component058 and generic069 acceptance can invalidate composite contracts here, so rerun their consuming tests before marking cells complete.

## Bounded architecture prerequisite checkpoint, 2026-09-30

The complete proposed matrix is recorded in [marker-minimap-design.md](marker-minimap-design.md). It preserves all30groups,101original members and303host cells. Root read the complete artifact, checked pinned marker and MiniMap sources, and requested two planning corrections: consume075's accepted reusable client independently of stopped064 observer integration, and require separate approval for the proposed native marker-definition registry. The corrected artifact now records both. A cold independent review is pending. No source implementation or semantic closure is approved.

Marker color presence needs its own versioned-codec amendment: an own undefined color uses symbol-default none while an absent color can inherit the global value. That proposal is separate from075's reviewed role/origin predicate and does not change its approved failure-code enum or codec. Source remains blocked on checked075 and explicit review of that amendment; final style/generic/measurement assertions retain074/069/065 dependencies.

Final focused planning revision corrects endpoint presence: pinned and current Flow spread defaults before the edge, so absent endpoints inherit while own undefined/empty suppress their effective URL. The separate pinned definition collector can generate unused defaults; definition existence does not prove an active URL. The design now requires separately reviewed endpoint-and-color presence encodings and additive format-selection rules, leaving legacy v1 optional acceptance/JSON limitations unchanged. Counts remain30/101/303. Two planning revisions are exhausted; the final independent recheck is pending and no source/cell approval follows. Supplemental artifact names now avoid the numeric primary-plan namespace; root reran the structural contract checker successfully with all8076cells open.

## Independent final design verdict

Cold reviewer execute_065 rechecked the final endpoint-presence amendment and original identities: **APPROVE the bounded design prerequisite**,30groups/101members/303cells, no mismatch or extra. Root verified the cited pinned spread/URL/collector paths and current default application. This accepts the proposed matrix and ownership analysis only. Marker endpoint/color codecs, additive format selection, native registry API scope, implementation/captures and semantic cells remain unapproved or unverified. Product source is blocked on those explicit decisions and the checked075/068/074/069 seams. No third planning revision followed.

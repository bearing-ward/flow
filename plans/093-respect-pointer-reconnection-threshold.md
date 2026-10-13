# Plan093: Respect the pointer reconnection drag threshold

> Executor instructions: This bounded follow-on is for the SAME086 executor in `/Users/richardmcandrews/.codex/worktrees/native-parity-acceptance/flow`, called N below. Do not implement until primary and independent DESIGN approval explicitly authorize this document. Do not create another executor, worktree or lease. Read every approved input in full and preserve its exact raw bytes. The reviewer maintains the main index. No commit, merge, push, publication or cleanup.
>
> Drift check: N HEAD must remain `841be137e253cf19c665269eaaa79edc19abf3c3`. Compare the scoped hashes in `plans/archive/reconnect-drag-threshold-source-audit.md` and the excerpts below with actual N. The separately approved two Vanilla fixture repairs and the already approved auto-pan cancellation test correction are expected differences, recorded in their own receipts. Preserve a complete pre093 source/evidence freeze before implementing093. Never modify prior failure/freeze inventories.

## Status

- Priority P1; effort M/L; risk HIGH; category bug/parity.
- Planned at main/N commit `841be137e253cf19c665269eaaa79edc19abf3c3`, 2026-10-02.
- Dependencies: accepted085, the current assembled086 native/render/admission candidate, approved reconnect source audit and primary/cold DESIGN for this follow-on. Final086 acceptance is deliberately not a dependency, because its correct reconnect assertion exposes this gap. Both093 and086 require combined final verification and independent SOURCE acceptance.
- Initial status DESIGN REVIEW, no production authorization yet. All semantic member cells remain OPEN.

## Why this matters

All three Flow hosts activate pointer reconnection on down despite the public positive drag threshold. Pinned React and Svelte send reconnect down through XYHandle, which activates only when squared client distance is strictly greater than the squared threshold. A small accidental motion currently creates preview and reconnect lifecycle callbacks in Flow. Fix the pending-to-active transition and retain the real native owner through promotion.

The correct Vanilla cancellation assertion must remain. Do not replace the no-preview-on-down expectation with current broken behavior just to pass verification. The original focused225-pass/3-fail run stays immutable. Two of those failures have separately approved test-input repairs; this plan resolves the genuine third source gap.

## Current state and inspected evidence

All locations are N-relative. Imported pin U is `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921`.

- `U/packages/react/src/components/EdgeWrapper/EdgeUpdateAnchors.tsx:80` calls `XYHandle.onPointerDown`, passing `dragThreshold: store.getState().connectionDragThreshold` at:102. Svelte's `U/packages/svelte/src/lib/components/EdgeReconnectAnchor/EdgeReconnectAnchor.svelte:103` passes the same setting. XYHandle:124 starts immediately for zero; :133 compares `dx * dx + dy * dy > dragThreshold * dragThreshold`; :207-228 only emits connection/reconnect completion callbacks if activation occurred. The promoting movement immediately computes current transform/physical target and updates the preview. These are source facts; a mounted reference receipt is still required.
- `apps/vanilla/src/mount-flow.ts:3691` creates `interactionSlots.activeReconnection`, captures the canvas at:3697, shows preview at:3703 and calls `notifyReconnectStart` at:3714. Fresh-only pending state lives at:2595 and its move gate at:6637 uses raw client distance. Reconnect clear/cancel are:3602/:3627, stale document reconciliation:4526, release:7290, and actual owner loss routing:6983. Fresh capture belongs to the physical handle, while reconnect capture currently belongs to the canvas. Preserve those owner choices.
- `packages/vue/src/flow-canvas.ts:3870` creates active `kind: 'connection'` with reconnect identity and current capture target; :3899 initializes reconnect lifecycle and :3906 emits reconnect start. It captures the SVG control at:3919. Existing fresh pending promotion at:5619 assumes a connect lifecycle and would mislabel reconnect if reused unchanged. Session cleanup:2562 releases its own capture, the declaration watch:2682 handles pending fresh, origin acknowledgement:3526 handles pending fresh, and configuration replacement:4430 only handles active connection. Pending reconnect must join the appropriate cancellation paths.
- `packages/foldkit/src/graph.ts:142` owns the Schema union for native pointer sessions. PointerDown:1777 creates active `reconnection`. ConnectionPointerMoved:1881 gates only `connection-pending`, while completion:1439 routes active reconnect through current admission and core semantics. Capture descriptor:4192 intentionally omits pending/active fresh phase, and `captureDescriptor`:4213 must map pending/active reconnect to one stable descriptor. The separate capture subscription:4500 keeps ownership stable across other subscriptions. Its document movement:4745 must admit pending reconnect while retaining zero reconnect auto-pan delta. Actual owner loss filtering:4677 must include pending reconnect.
- `packages/foldkit/src/application.ts:1541` classifies active pointer gestures. It currently excludes only fresh pending. Lifecycle:1747 emits a start on inactive-to-active change, :1790 produces a terminal only for an activated session. A new pending reconnect must remain absent from lifecycle, preview, telemetry and completion until promotion.
- `packages/core/src/domain/flow-connection-options.schema.ts:20` already validates finite nonnegative thresholds; the default is1 at:50. Core `flow-runtime.schema.ts:150` has an active reconnect contract. Core `flow-reconnection.schema.ts` already owns reconnect meaning and admission. No core production API or interaction registry change is needed.

Relevant excerpts, from primary reads:

```ts
// Foldkit pointer schema, graph.ts:180
Schema.Struct({
  kind: Schema.Literal('reconnection'),
  pointerId: Schema.Number,
  startX: Schema.Number,
  startY: Schema.Number,
  edgeId: EdgeIdSchema,
  endpoint: ReconnectEndpointSchema,
  currentX: Schema.Number,
  currentY: Schema.Number,
})
// Existing strict pending fresh gate, graph.ts:1881
if (session.kind === 'connection-pending') {
  const dx = clientX - session.startX
  const dy = clientY - session.startY
  if (dx * dx + dy * dy <= model.connectionDragThreshold ** 2) {
    return noChange(model)
  }
  // Promotion retains physical identity and current flow coordinates.
}
```

Architecture follows `docs/standards.md`. Core owns graph meaning, existing option Schema and reconnect semantics. Vanilla owns its browser lifetime in apps; reusable Vue/Foldkit adapters own their native/framework lifetime in packages. Use Effect workflows, existing named spans/attributes and Schema-derived scalar metadata. Keep capture elements outside serializable schemas. No parallel manual scalar contract, casts, any, fake acknowledgement, private browser Model access or timeout acceptance. Do not migrate unrelated existing Session interfaces to a new global contract.

## Exact scope

Only these existing N files may change for093:

- `apps/vanilla/src/mount-flow.ts`
- `packages/vue/src/flow-canvas.ts`
- `packages/foldkit/src/graph.ts`
- `packages/foldkit/src/application.ts`
- `packages/foldkit/src/application.test.ts`
- `apps/vanilla/e2e/canvas.e2e.ts`
- `apps/vanilla/e2e/interaction-lifecycle.e2e.ts`
- `apps/vue/e2e/interaction-lifecycle.e2e.ts`
- `apps/foldkit/e2e/interaction-lifecycle.e2e.ts`
- `apps/vue/src/test-harness.ts` and `apps/foldkit/e2e/test-harness.ts`, only additive supported constructor-option selection and public lifecycle/preview receipt plumbing needed by the new tests. Preserve all old supported methods and tests.
- `research/traces/edge-reconnection.md`, additive truthful trace/evidence sections.
- `verification.config.json`, preserve the existing086 checks/browser lists and add explicit093 task wording/new tests if needed.

Only these new proof files may be created:

- `scripts/capture-reconnection-threshold-reference.ts`
- `research/harnesses/reconnection-threshold/index.html`
- `research/harnesses/reconnection-threshold/main.tsx`
- `research/harnesses/reconnection-threshold/vite.config.ts`
- `research/fixtures/reconnection-threshold-reference.json`, generated only by the actual pinned mounted capture script.

Owned external evidence/freezes, approved plan copies and execution/provenance records may be added under the existing086 evidence directory. No existing shared contract, conformance fixture, verifier implementation, consumer loop or reference-capture tool change is authorized. Do not hand-edit `research/artifacts/`, generated summary, fixture observations or prior proof records. No core production/export, persistence, public API, dependencies, pins, lockfile, keyboard policy, reconnect auto-pan behavior or measurement generation protocol change.

## Commands, run inside N

| Purpose | Command | Expected |
| --- | --- | --- |
| HEAD | `git rev-parse HEAD` | exact planned SHA |
| Packages/types | `bun run typecheck` | exit0, no diagnostics |
| Owned units | `bunx vitest run packages/foldkit/src/application.test.ts` | all old/new meaningful cases pass |
| Quality | `bun run check` | exit0 |
| Architecture | `bun run check:architecture` | exit0 |
| Trace | `bun run research:check-traces` | exit0 |
| Reference | `bun run scripts/capture-reconnection-threshold-reference.ts --checkout ABS_OWNED_PIN --evidence ABS_FRESH_OUTPUT` | two independently mounted captures match; exact pin/source integrity and actual raw receipts |
| Vanilla native | `bunx playwright test apps/vanilla/e2e/canvas.e2e.ts apps/vanilla/e2e/interaction-lifecycle.e2e.ts --workers=1` | all pass, no new skips |
| Vue native | `bunx playwright test -c apps/vue/playwright.config.ts interaction-lifecycle.e2e.ts --workers=1` | all pass, no new skips |
| Foldkit native | `bunx playwright test -c apps/foldkit/playwright.config.ts interaction-lifecycle.e2e.ts --workers=1` | all pass, no new skips |
| Focused | `bun run verify` | actual complete configured086+093 scope exit0 |
| Full | `bun run verify:full` | complete suite exit0; existing skip boundaries explicitly reported |
| Release checkpoint | `bun run release:dry-run` | exit0, actual archives/consumer and same-build HMR; no publication |

The ordinary reference invocation is an additional mandatory gate, not a fabricated verifier check name. The separately approved legacy restoration tool remains mandatory for086 and must be rerun against final source. Keep shared ports/native/build/archive gates serialized under086's current sole lease. No other candidate may start them concurrently.

## Steps

### 1. Preserve the pre093 boundary

Record actual scoped hashes, full candidate source/evidence inventory and separately repaired test deltas. Copy all referenced approval documents with raw SHA256 receipts. Preserve all earlier STOPs/failures, including the225/3 focused log and the original correct reconnect assertion. Check the excerpts against N before changing source. Record093's addition to the combined086 allowlist without rewriting any earlier original freeze.

Verify HEAD, scoped hashes and copied source/evidence hashes, zero unexplained mismatches. STOP on unknown drift, a shared owner or missing approved input.

### 2. Capture the pinned browser behavior before repairing Flow

Create the new bounded harness using the inspected existing `research/harnesses/interaction-lifecycle` ReactFlow probe and its explicit pinned aliases as the model. Build and mount actual `@xyflow/system` and `@xyflow/react` from a NEW owned disposable checkout at exactly `0a1f9575b25679f2880175de8d3eae21aedde921`. Clone a clean verified local donor into an owned sibling of N if available. Never mutate the donor or imported evidence. Record all tracked hashes before/after install/build/two captures; exact pnpm10.33.4 frozen installation and both actual package builds must pass. Stop instead of rewriting upstream sources or dependencies.

Mount selected reconnectable edges and real handles through ordinary public ReactFlow. Use actual native endpoint down/move/up. Threshold0, omitted default1 and8; both endpoint controls; zoom0.5 and2. Capture down, below, equality, strict crossing, second move, release, unchanged accepted nodes/edges/viewport and actual public callbacks/connection preview DOM. For positive8 include straight7,8,9 and diagonal3/4 below versus6/8 above, measured in real client pixels. Fresh scenarios for no-activation release and active admitted reconnect. Zero down must activate. Positive down/below/equality must have zero reconnect start/end/proposal. The promoting move must publish its current preview and one start. Actual React onConnectStart/End forwarding is recorded separately from Flow's canonical reconnect events.

Use public `useConnection`/ReactFlow callbacks, never internal store mutation, injected XYHandle calls, fake response values or test-only alternate implementations. Do not require Svelte runtime capture in this slice; retain its independently inspected shared-gate source boundary as source-only. Generate the fixture from two real independently mounted equal captures, include exact pin, schema, environment and source/artifact hash receipts. No hardcoded observation replacement or output normalization that removes threshold/callback/preview evidence. Proper teardown closes browser/pages/server, verifies owned ports absent and reports errors. CLI inputs and browser data are unknown decoded at boundaries; keep new types Schema-derived.

Verify the exact reference command above, both complete observations matching and source integrity unchanged. STOP if real reference contradicts the expected source contract, APIs are unavailable or byte identity cannot be demonstrated.

### 3. Add explicit pending pointer reconnect ownership

Vanilla keeps Schema-derived scalar pending reconnect metadata outside the existing active core registry. Record original client position and edge/endpoint/pointer identity, capture the EXISTING canvas owner, and admit every conflicting gesture/cancel/release/reconciliation path while pending. Do not install activeReconnection, preview or lifecycle until promotion. Split active initialization from initial acquisition so promotion retains the same owner. Zero threshold takes the existing active path. Pending clear releases ownership without an unstarted reconnectEnd. Route current loss only from the actual current owner; old/foreign owner loss or reused pointer ID must not cancel the healthy new session.

Vue keeps an explicit pending reconnect adapter variant with Schema-derived scalar identity and a separate actual SVG capture owner. Do not reuse the optional reconnect flag as proof that a pending fresh connection is reconnect. Positive threshold stores raw client origin and captures once. Promotion initializes reconnect lifecycle once and continues through the SAME movement's existing preview/update path. Add pending reconnect to the existing declaration, origin, option replacement, escape/blur/cancel/loss/disposal cleanup paths. Do not expose a new setter or turn constructor remount evidence into same-owner live-option evidence.

Foldkit adds `reconnection-pending` to the authoritative pointer Schema and exhaustively updates reducer/capture/subscription/participant/terminal handling. Positive PointerDown enters pending; zero enters active. Pending pointermove uses strict client distance; below/equality and wrong pointer are true no-ops. Promotion changes only phase/current coordinates and uses current eligibility/measurement/admission, retaining physical identity. Both phases map to the SAME reconnection capture descriptor. Pending is excluded from `previewSession`, active lifecycle/telemetry, semantic finish, proposal and auto-pan frame admission. Application classification skips both pending variants; active promotion produces canonical reconnect start once. Pending release/cancel clears and suppresses accidental semantic click without start/end/proposal. Do not let a pending reconnect fall through to node-drag classification.

For all hosts, current edge/participants must still be eligible at promotion. Existing accepted document changes/removal/hide/kind/origin acknowledgement cancel obsolete identity before a late move can activate it. Recheck current current physical handles and graph eligibility without replacing established current completion admission. Keep exact colon-containing physical IDs. No guessed epoch/token, parallel runtime registry or bypass of existing setter cancellation. If current owner topology cannot support continuity, STOP for design review.

Verify typecheck, units, quality and architecture. Production must not add pointermove logs. Reuse existing Effect start/cancel/failure/semantic spans, start only at activation, and keep pending cancellation diagnostics distinct from reconnectEnd callbacks.

### 4. Prove mounted all-host boundaries and retain prior behavior

Use real public constructors/FlowCanvas/Runtime and supported public ports in the existing native suites. Each host covers both endpoint controls and threshold0/default/8 at zoom0.5/2, straight below/equal/greater and diagonal client movement. Before activation require no public preview, no preview DOM, no canonical reconnect start/progress/end/proposal, unchanged accepted graph/viewport and no panning across six real animation frames. At strict crossing assert SAME-move preview current pointer, exactly one start and retained actual capture owner. Subsequent movement never restarts. Observe the complete canonical reconnect event sequence, do not filter away unexpected events.

Cover active admitted/denied target, no-op same endpoint, invalid drop, controlled/uncontrolled completion, opposite endpoint/metadata retention. Pending release, escape, blur, pointercancel, real capture-owner loss, removed edge/endpoint node/handle, kind replacement, unselect/hide/reconnectability change, origin acknowledgement, option replacement where supported and disposal must release/cancel without reconnect callbacks. After each cancellation relevant late move/up cannot revive state; a healthy fresh gesture succeeds. Include owner/pointer-ID reuse and obsolete loss delivery; do not claim broad same-element ABA proof from only different-owner events. Preserve the existing supported owner-generation boundary and stop on a stronger unmodeled identity problem.

Native keyboard reconnect remains immediate under positive pointer threshold and retains existing admitted/denied semantics. Foldkit's separately reviewed keyboard policy stays exactly its current canonical cancelled terminal/zero onReconnect callback despite one semantic proposal. Pointer work must not normalize it. Retain constructor-only options for Vanilla/Foldkit, supported Vue reactive cancellation and all live option work's separate acceptance boundary.

Keep Vanilla/Foldkit reconnect auto-pan zero-delta policy, and Vue's existing active reconnect auto-pan policy. Test pending quiescence, supported active behavior, postcancel owner release and six-frame public/DOM stability. No new reconnect auto-pan parity claim. Preserve all prior auto-pan tests, including the unchanged original one-move assertion, current24 admission/resize tests, render9 tests, consumer/same-build HMR and retained8 suites.

Separately constructed reducer models prove only reducer/lifecycle boundaries. Add meaningful Foldkit units for threshold no-op/promotion/zero/wrong pointer, pending cancel/release/removal, current denied admission and lifecycle callback absence/order. Do not replace mounted owner proof with reducer injection.

Verify named new tests first, then the exact three full relevant native file commands and all existing086 acceptance gates. No skips, timeout relaxations, speculative test input revisions or assertion removal. Failed real tests are preserved and reported before repair.

### 5. Verify and freeze combined086+093 for review

Append exact production/test call paths and raw paired evidence to the reconnection trace, ending in Conformity and deviations. Keep reference React runtime acceptance, Svelte source-only gate, supported native-owner differences, keyboard policy and active reconnect auto-pan differences explicit. Add093 task wording while preserving086 focused checks/browser lists.

Run actual configured focused, full, final release dry-run, new reference command, ordinary same-build HMR and the separately approved legacy restoration command. Ensure each uses final source and actual archives. Record profile, scope, pass/fail/skip counts, raw logs/hashes and source/evidence integrity. Final source/evidence freeze covers all combined candidate additions and original protected inputs; do not edit it after freezing. Independent root reproduction and cold SOURCE review follow. Maximum two formal final SOURCE revision rounds; mechanical prefreeze gate corrections are separately reviewed and preserve every failed attempt.

## Done criteria

- Exact pin mounted captures agree in two fresh runs, source unchanged, real reference callbacks/DOM show strict threshold.
- All three supported public native hosts pass meaningful below/equal/greater/zero, endpoint/zoom, cancellation/owner/retry and completion controls, with no hidden extra lifecycle callbacks.
- Previous086 native/render/retained/archives/same-build HMR, final genuine legacy restoration and all configured focused/full/release gates pass against final source. Existing full-suite gaps remain explicitly bounded if they STOP acceptance.
- Scoped diff/source integrity clean; old failed runs/freezes immutable; no unexpected dependencies/API/measurement/keyboard/auto-pan policy changes.
- Primary and independent SOURCE review approve frozen combined source/evidence after root actual reproduction.
- Main reviewer alone updates093/086 status. No generic/member closure, parent-plan or CI/device/collector claim.

## STOP conditions

STOP on unknown baseline drift, source beyond the allowlist, missing actual reference proof, failed gate needing unrelated source edits, changing callback/auto-pan/keyboard/public setter/measurement-generation policy, needing core registry ownership, or failing owner continuity/identity checks. Preserve source/evidence and ask the reviewer for the smallest concrete amendment. Do not waive protected assertions or invent a successful receipt. No fake ACK, browser Model injection, semantic-cell counting, output replacement or approval-hash rewrites.

## Maintenance and conformity

The drag threshold measures client pixels and uses strict greater-than comparison, independent of viewport zoom. Native capture ownership must persist through pending-to-active promotion. Future live threshold configuration needs separate API/cancellation review. React runtime conformity is bounded to the captured threshold/preview/reconnect observations, Svelte remains source-only, and Pointer Events/native capture, constructor option ownership, keyboard lifecycle and reconnect auto-pan policies retain their documented intentional differences. Broader semantic/API, parent-plan, full parity, device, CI and collector delivery remain unverified.

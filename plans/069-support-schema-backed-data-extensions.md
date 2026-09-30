# Plan 069: Support schema-backed typed node and edge data extensions

> Executor: read this entire file, execute steps in order and record every result. This is a required child of 057; completion of this bounded child does not close the parent. The coordinator maintains the index when dispatch says so.
>
> Drift check: `git diff --stat ce9210e61a7dcb370a45b91632c19d7e017e4898..HEAD -- packages/core/src packages/vue/src packages/foldkit/src apps/vanilla/src apps/vanilla/e2e apps/vue/src apps/vue/e2e apps/foldkit/src apps/foldkit/e2e scripts research/catalogs/api-members.json research/traces/public-api-completion.md docs plans` and `git status --short`. This plan was written over an uncommitted implementation snapshot, so inspect working-tree differences too. Compare quoted contracts, not just SHA. Existing accepted prerequisites are expected; source-contract disagreement is STOP.

## Status

- Priority: P1
- Effort: L, execute sequential bounded steps
- Risk: HIGH
- Category: direction
- Execution mode: Implementation after architectural contract review
- Parent:057; parent remains IN PROGRESS
- Depends on: 057 concrete public schemas; 066 decomposition phase; integrate resulting types into 063/064/067 before their final closure
- Planned at: `ce9210e61a7dcb370a45b91632c19d7e017e4898`,2026-09-29; current uncommitted snapshot is required
- Status: BLOCKED — Round2 final review: synchronous codec capability versus Effectful typed getter APIs unresolved

## Why this matters

Flow currently accepts JsonObject data but public callbacks return concrete FlowNode/FlowEdge. Caller-selected typed data and variant records cannot be declared equivalent merely by casting. Complete a schema-derived extension contract through decode, public operations, selectors, renderer and deletion payloads, preserving validated graph ownership.

## Current state and source excerpts

- `packages/core/src/domain/flow.schema.ts:63-84` contains `data: S.optional(S.JsonObject)` and `export type FlowNode = typeof FlowNodeSchema.Type`; the base schema owns identity and graph fields.
- `packages/core/src/domain/flow-default-edge-options.ts:19` permits JsonObject edge data.
- `research/catalogs/api-members.json` includes caller-generic NodeType/EdgeType callback bounds classified gap; parent 057 `:136-148` explicitly retains concrete callback payload and generic-array substitution gaps.
- Pinned `packages/react/src/types/nodes.ts` and `packages/system/src/types/nodes.ts` define user-selected data/variant types. Inspect analogous edge/instance/delete declarations and nested generic records through 066. Foldkit callback functions remain local and typed ports carry serializable values.

## Scope

Only these paths may change; existing files must be inspected before extending them, and listed new modules are proposals rather than current APIs.

- New core flow-data-contract.schema.ts / flow-data-contract.ts and tests; existing flow schema/snapshot/selectors/edit/delete/persistence/default schemas and public exports where generic data contract propagates; exact additional transformation paths `packages/core/src/domain/flow-change-compatibility.ts`, `flow-change-compatibility.test.ts`, `flow-connection.schema.ts`, `flow-connection.schema.test.ts`, `flow-reconnection.schema.ts`, `flow-reconnection.schema.test.ts`, `flow-connection-preview.schema.ts`, `flow-connection-preview.schema.test.ts`.
- Vanilla public/mount renderer and edit callback signatures; Vue public/use-flow/canvas renderer signatures; Foldkit public/application/graph/observers/delete client types and tests.
- New public compile fixtures under `scripts/consumer-fixtures/` (new compile fixtures; current packed fixture strings live in `scripts/check-packed-consumer.ts`), packed-consumer checker and type-test files; host public-state/public-edits/renderer-contract fixtures and suites.
- NEW mandatory `scripts/capture-typed-data-reference.ts`, `research/harnesses/typed-data/`, `research/fixtures/typed-data-reference.json`, `packages/conformance/src/typed-data-reference.test.ts`; docs/catalog/trace/PROGRESS; plan/index/057/066 manifest and generated docs.

Out of scope: other feature families, renderer replacement, second graph/store authority, dependency upgrades, backend collaboration, publication, imported evidence, and unrelated dirty work. New required architecture discovered here gets a numbered child under 066; neither this child nor 057 closes before its required follow-up does.

## Architecture, evidence, and execution rules

The destination is every dated API capability across Vanilla, Vue and Foldkit, not the currently passing subset. Follow `docs/standards.md:7-16`: “Graph meaning does not depend on a UI framework”; “Effect Schema owns runtime data contracts”; “A parity claim requires a test against reference behavior or output.” Derive types from Effect Schema. Decode external unknown once. Core owns graph/geometry/serializable transitions; adapter packages own framework integration; apps own DOM/application composition and demonstrations. `packages/foldkit` is the current reusable adapter; do not move it back into apps. Vanilla's public adapter remains in `apps/vanilla`; Plan 061 packages it without relocating that source.

Pin the existing manifest baseline: Effect and platform `4.0.0-rc.116`, Foldkit `0.163.0`, Vue `3.5.43`; do not change dependencies or lockfile for this plan. Keep saved-document v1 compatible. Controlled actions are proposals until owner acknowledgement; uncontrolled actions validate, commit, notify. No second document authority, mutable store exports, private store setters, or mounting the Vanilla renderer inside Vue/Foldkit. Caller functions remain host-local; Foldkit ports carry schema-derived serializable requests/results.

Use spans/attributes from `packages/core/src/telemetry/flow-telemetry.ts`; trace decode/lifecycle/semantic-change/failure boundaries, not pointer moves. A research trace starts at the actual public/browser entry, follows state/geometry/DOM/rendered output, separates production/test paths, cites exact lines, and ends with `Conformity and deviations`. Leave imported `research/artifacts/` immutable. Pinned upstream SHA is `0a1f9575b25679f2880175de8d3eae21aedde921`, React 12.11.6; source inspection is distinct from current-site contract and executable comparison. Use disposable full checkouts and existing `scripts/capture-provider-session-reference.ts` / `scripts/capture-graph-edit-reference.ts` patterns. Do not publish generic parity claims or mark partial gaps intentional merely to close this plan.

## Commands and required expected results

Run from repository root. Browser suites run serially and alone with strict configured ports; do not reuse foreign servers.

| Purpose | Command | Expected result |
| --- | --- | --- |
| Fresh dependencies | `bun install --frozen-lockfile` | Exit 0; unchanged lockfile |
| Quality | `bun run check` | Exit 0 |
| Public builds/types | `bun run typecheck` | Exit 0 |
| Architecture | `bun run check:architecture` | Exit 0 |
| Unit suite | `bun run test` | All pass |
| Vanilla production browser | `bun run test:browser -- public-state.e2e.ts` | All selected pass, no new skips |
| Vue production browser | `bun run test:conformance:vue -- public-state.e2e.ts` | All selected pass |
| Foldkit production browser | `bun run test:conformance:foldkit -- public-state.e2e.ts` | All selected pass |
| Packed artifacts | `bun run test:consumer` | Every host install/typecheck/mount passes |
| Generated API | `bun run docs:generate-api` | Exit 0 |
| Docs | `bun run docs:check` | Exit 0 |
| Trace | `bun run research:check-traces` | Exit 0 |
| Member inventory | `bun run scripts/check-api-members.ts` | Exit 0; every dated API page retained |
| Catalog | `bun run scripts/check-react-flow-catalog.ts` | Exit 0 |
| Final local gate | `bun run verify` | Exit 0; no newly skipped tests |
| Diff whitespace | `git diff --check` | Exit 0 |

Record actual commands/counts, failures and environment limits. A hung or stopped verify is incomplete. Let generators update generated outputs; never hand-edit `research/generated/`. Existing two native-pointer skips stay explicit. Hosted CI, trusted devices, upstream runtime and collector-side telemetry are separate evidence.

## Git workflow and common done criteria

Use an isolated `codex/069-support-schema-backed-data-extensions` worktree. This planning snapshot contains uncommitted accepted prerequisite slices: compare them and obtain the required patch snapshot from the coordinator; HEAD alone does not contain all prerequisites. Preserve unrelated dirty work. Do not commit, merge, push, publish, or open a PR without separate authorization. Independent review owns plan acceptance.

- [ ] Each numbered step's targeted verification passes through real public APIs.
- [ ] Every newly implemented contract has a member-specific source/test/reference mapping in all three hosts; remaining differences retain exact reason and test boundary.
- [ ] Every command in the table passes, including final `bun run verify` and packed artifacts; captures required by the steps are reproduced.
- [ ] Changed paths are inside Scope, including generators' authorized outputs; `git diff --check` passes.
- [ ] Update this plan and its index row with reviewed evidence; update parent 057 as IN PROGRESS until every required child and decomposition gate closes.

Common STOP: a required check fails twice after focused repair; out-of-scope changes or dependency upgrades are required; ownership would acquire a second authoritative graph; pinned reference cannot reproduce; drift changes a quoted contract rather than only its line number. Report exact evidence and preserve completed independent work. An observation timeout is not proof a process died.

## Hard prerequisites before source implementation

1. Plan 066 decomposition has a checked page/member/host assignment for this family's original scope, including source/reference/test expectations. Completion of 066 is not required; its decomposition phase is.
2. Independent architecture review approves section 069 of `plans/057-public-contract-design.md` and any upstream/default matrix it requires. That artifact contains proposed usage/types/ownership/alternatives/risks and exact central rules. **Until the coordinator records approval, this child is not ready for implementation.** The executor implements that frozen contract; it does not decide origin/defaults/equality/schema serialization while coding.
3. Accepted source prerequisites are present in the isolated snapshot; HEAD alone is insufficient. 063/064/067 additionally require 069 derived contract integration before final acceptance. 065 retains 066 decomposition as an explicit prerequisite.

## Ordered steps and behavior acceptance

### 1. Confirm the independently approved schema factory contract

Enumerate generic data/variant records by public signature, not just Node/Edge pages. Implement only the independently reviewed factory parameterized by caller Effect Schemas that derives decoded node/edge/document and corresponding operations/selectors/render/deletion payload types while keeping branded identity/integrity rules. Preserve existing concrete default API. Use the reviewed 069 JSON persistence policy at the boundary: arbitrary functions/DOM/classes cannot silently serialize. No unsafe type assertions, phantom generic that never validates, or separate authoritative wrapper document. A compiled consumer must prove resulting data fields and subtype preservation before implementation propagates.

**Verify:** architectural contract/test fixtures include valid custom data schema and rejected incompatible generic/data calls; `bun run typecheck` passes. If EffectRC Schema cannot express the design soundly, stop with concrete compiler evidence and a bounded alternative child; do not erase the requirement.

### 2. Implement extension decode and all core transitions

Decode unknown once through caller schema plus core graph integrity. Preserve typed custom node/edge data through add/update/replace/change arrays, reconnect, selectors, session encoding/decoding and deletion candidates/results. Project base geometry fields without losing subtype data; excluded/non-JSON fields fail explicitly according to contract. Controlled proposals cannot bypass validation.

**Verify:** new core tests cover positive/negative runtime decode, immutable inputs, subtype data retention across every named transformation and persistence compatibility; unit suite/typecheck/architecture pass.

### 3. Expose typed native hosts and packed contracts

Propagate derived types through Vanilla controller/render callbacks, Vue canvas/composables/renderers and Foldkit program/ports/observers/delete client. Native adapters keep one accepted graph and base/default users compile unchanged. Consumer probes call actual packaged exports; positive tests access exact custom data, negative probes reject wrong data and prove no any widening. Public browser tests create/update/read/render/delete custom variants and assert accepted controlled acknowledgement payloads.

**Verify:** packed consumers pass compile-time positive/negative probes and real mounts; all three public-state/public-edits/renderer suites pass serially. Existing no-extension fixtures remain green.

### 4. Reconcile generic members and remaining behavioral differences

Map each inventoried generic argument/result/array element to the exact schema-backed public contract. Compare runtime preservation against the mandatory typed-data pinned capture; type identity of React-specific callbacks remains native but cannot hide loss of user data or subtype inference. Update 063/064/067 acceptance links and generated declarations/docs.

**Verify:** type fixtures, conformance cases, member/closure checkers and common final gates pass; every generic cell is supported or retains a reviewed concrete reason and test boundary with required follow-up owner.

## Exact reference commands after the proposed capture files exist

Use `bun run scripts/capture-typed-data-reference.ts --checkout /tmp/flow-052-xyflow` against a clean full pinned checkout; expect exit 0, exact pinned SHA verification, two independently stable normalized samples, and fixture write. For proposed scripts, implement the existing capture script's `--checkout` interface; do not substitute imported artifacts for the full checkout. Run `bun run test -- packages/conformance/src/typed-data-reference.test.ts`; expect every comparison assertion to pass. For 069, the named capture/test is a proposed new file and must be created before these commands run.

## Plan-specific done criteria and STOP boundaries

- [ ] 066 decomposition approval and this section's independent architecture approval are recorded; any requested contract revision is independently reviewed before source changes.
- [ ] 063/064/067 final acceptance includes 069 integration where typed contracts affect their public outputs; implementation may start against accepted concrete schemas without claiming final generic closure.

- [ ] Every behavior/case named in Steps has exact implementation and public production test evidence; existing passing cases alone do not satisfy new variants.
- [ ] Every API/member family named in Current state and Steps is reconciled in 066's closure manifest with no dropped records.
- [ ] Selected upstream comparisons named in Steps are executable/reproduced, with explicit normalizations and native lifecycle limits.
- [ ] Every common done criterion holds and independent review approves the source, assertions and scope.

STOP if achieving these contracts requires unchecked casts, private mutable store access, unsafe graph publication, cross-owner DOM queries, persisting measurements/functions/DOM, or redefining the original API target as the currently easy subset. Report exact blocker and next required child.

## Maintenance

Revisit this child when public defaults/options/schemas, owner lifecycle or pinned/current upstream contract changes. Record capture dates and revisions independently. Evidence links require semantic review after line changes; count/checker success does not establish member behavior.

## Round1 schema boundary and subtype preservation gates

Before propagation, independently review the design's discriminator-correlated variant registry; encoded decode versus decoded-side validation versus persistence encode; typed graph service requirements; no concrete JsonObject redecoder erasure; and contract-aware detached snapshot cloning. Exact acceptance probes: wrong type/data pairing is compile/runtime rejected; Date/custom-class transform preserves decoded type through snapshots; serviceful schemas retain/provide their Effect environment; encoder failure rejects publication/save; base geometry reads same decoded graph; all transitions preserve type/data correlation. Existing structuredClone at flow-snapshot.ts:53 cannot be blindly reused for transformed class data. Scope snapshot module/tests plus all parameterized edit/connection/reconnect/utility/selector/deletion operations and native composition Layer entrypoints. Mandatory pinned typed-data runtime capture remains separate from compile inference proofs.

## Independent review Round2 FINAL checkpoint

Review source: coordinator-reported `review_057_child_plans`, Round2 FINAL, 2026-09-29. Verdict: BLOCKED — Round2 final review: synchronous codec capability versus Effectful typed getter APIs unresolved

Required next action: ground a concrete synchronous codec capability or separate Effectful typed getter/read APIs with compile/runtime/service/error evidence. Arbitrary serviceful encode/decode cannot detach behind existing synchronous getters. No silent signature change, hidden Effect, JsonObject erasure or third speculative design revision.

This record changes planning status only. Original requirements, implementation scope and acceptance checks remain intact. No source work, third revision, browser gate or completion claim is made. Central per-contract verdict and source boundary are recorded in `plans/057-public-contract-design.md`.

## Source-grounded refinement pointers, 2026-09-29

The coordinator inspected the installed exact RC and Foldkit runtime without editing product source. Effect's decodeUnknownSync accepts ConstraintDecoder with default DecodingServices never (node_modules/effect/src/Schema.ts:843,1811); service-free typing alone does not prove a codec cannot suspend. A bounded probe must separately test asynchronous service-free transformations and typed service requirements. Schema.Union preserves a const member tuple's Type/Encoded/services (node_modules/effect/src/Schema.ts:4756); TaggedUnion's registry constructor fixes the discriminator to _tag (node_modules/effect/src/Schema.ts:6276), so it cannot be silently substituted for Flow's actual type field. An alternative typed variant builder/tuple registry still needs positive/negative compiler evidence before a contract rewrite.

Foldkit0.163's installed node_modules/foldkit/dist/runtime/makeElement.d.ts:14 declaration accepts a model Codec with unknown services, but node_modules/foldkit/dist/runtime/runtime.js:100-104 constructs JSON preservation parsers using decodeUnknownExit and encodeUnknownSync without the application's service Layer at that seam. Its deepFreeze explicitly leaves mutable Date/Map/class values unfrozen. A typed-data design must investigate the real preservation/render/update path as well as public getter detachment; broad schema types alone do not prove these operations work. These are local source observations, not a reproduced serviceful failure or approval of a third design. The original069 remains BLOCKED pending bounded compile/runtime probes and independent review.

## Bounded installed-runtime probes, 2026-09-29

The coordinator ran two inline, read-only Bun probes against installed Effect4.0.0-rc.116. A String-to-Date codec using SchemaGetter.transformEffect and Effect.sleep(1) for decode is service-free but suspends: decodeUnknownSync throws `Error: Sync adapter can only throw schema errors`, while decodeUnknownEffect/runPromise returns the correct Date. A Struct containing that codec with asynchronous encode/decode, passed through Schema.toCodecJson, also fails encodeUnknownSync and returns a Failure from decodeUnknownExit; encodeUnknownEffect/runPromise produces the expected ISO string. These are the same parser constructors used at the inspected Foldkit preservation seam, not a complete Foldkit runtime test. No compiler-inference or service-Layer claim is made. Thus a service-free schema constraint alone is demonstrably insufficient to promise synchronous cloning/getters or preservation. Further bounded compile/service/real-runtime evidence and independent architecture review are still required; no third design or source implementation is approved.

Reproduce the parser-constructor probe from the exact installed workspace; it writes no files:

```sh
bun --eval '
import { Effect, Schema as S, SchemaGetter as G, Exit } from "effect";
const codec = S.String.pipe(S.decodeTo(S.Date, {
  decode: G.transformEffect(value => Effect.sleep(1).pipe(Effect.as(new Date(value)))),
  encode: G.transformEffect(value => Effect.sleep(1).pipe(Effect.as(value.toISOString())))
}));
const jsonCodec = S.toCodecJson(S.Struct({ data: codec }));
let encodeFailure;
try {
  S.encodeUnknownSync(jsonCodec)({ data: new Date("2026-09-29T00:00:00Z") });
} catch (error) {
  encodeFailure = { name: error.name, message: error.message };
}
const decoded = S.decodeUnknownExit(jsonCodec)({ data: "2026-09-29T00:00:00.000Z" });
const asyncEncoded = await Effect.runPromise(
  S.encodeUnknownEffect(jsonCodec)({ data: new Date("2026-09-29T00:00:00Z") })
);
console.log(JSON.stringify({ encodeFailure, synchronousDecodeExit: decoded._tag, asyncEncoded }));
if (encodeFailure === undefined || !Exit.isFailure(decoded)) process.exit(1);
'
```

Observed exit0; synchronous decode result Failure; synchronous encode throws the error recorded above; Effectful encode returns `{ "data": "2026-09-29T00:00:00.000Z" }`. This diagnostic deliberately verifies the limitation, so exit0 is not implementation acceptance.

The coordinator also ran an in-memory TypeScript5.9.3 probe: a service-free but suspending codec assigns to ConstraintDecoder<Date> and is accepted by decodeUnknownSync, while synchronous use of a serviceful codec and Effect.runSync without its Context.Service each require an expected compiler error. Result: zero diagnostics, two checked negative probes, no file writes. This confirms the static service boundary, not synchronous execution capability or a complete generic Flow factory. Reproduce:

```sh
bun --eval '
import ts from "typescript";
const fileName = process.cwd() + "/.069-virtual-probe.ts";
const source = `
import { Context, Effect, Schema, SchemaGetter } from "effect";
const asyncCodec = Schema.String.pipe(Schema.decodeTo(Schema.Date, {
  decode: SchemaGetter.transformEffect(value => Effect.sleep(1).pipe(Effect.as(new Date(value)))),
  encode: SchemaGetter.transform(value => value.toISOString())
}));
const acceptedBySyncType: Schema.ConstraintDecoder<Date> = asyncCodec;
Schema.decodeUnknownSync(acceptedBySyncType)("2026-09-29");
class Prefix extends Context.Service<Prefix, {readonly value: string}>()("flow/069/probe/Prefix") {}
const serviceful = Schema.String.pipe(Schema.decodeTo(Schema.String, {
  decode: SchemaGetter.transformEffect(value => Effect.map(Prefix, service => service.value + value)),
  encode: SchemaGetter.transform(value => value)
}));
// @ts-expect-error A serviceful decoder cannot be used at the synchronous boundary.
Schema.decodeUnknownSync(serviceful)("x");
const effectful = Schema.decodeUnknownEffect(serviceful)("x");
const supplied = effectful.pipe(Effect.provideService(Prefix, {value: "prefix:"}));
Effect.runSync(supplied);
// @ts-expect-error The unsupplied Effect still requires Prefix.
Effect.runSync(effectful);
`;
const options = {strict: true, noEmit: true, skipLibCheck: true, target: ts.ScriptTarget.ESNext, module: ts.ModuleKind.ESNext, moduleResolution: ts.ModuleResolutionKind.Bundler, types: ["bun"]};
const host = ts.createCompilerHost(options);
const getSourceFile = host.getSourceFile.bind(host);
host.getSourceFile = (name, languageVersion, onError, shouldCreateNewSourceFile) => name === fileName ? ts.createSourceFile(name, source, languageVersion, true) : getSourceFile(name, languageVersion, onError, shouldCreateNewSourceFile);
host.fileExists = ((original) => name => name === fileName || original(name))(host.fileExists.bind(host));
const program = ts.createProgram([fileName], options, host);
const diagnostics = ts.getPreEmitDiagnostics(program);
console.log(ts.formatDiagnosticsWithColorAndContext(diagnostics, {getCurrentDirectory: () => process.cwd(), getCanonicalFileName: name => name, getNewLine: () => "\n"}));
console.log(JSON.stringify({diagnostics: diagnostics.length, negativeProbes: 2, writes: 0}));
if (diagnostics.length > 0) process.exit(1);
'
```

## Additional installed-codec investigation, 2026-09-30

The complete rerunnable [installed codec investigation](installed-codec-investigation.md) records correlated const-tuple inference, `toTaggedUnion("type")`, retained services, installed synchronous preservation scheduler controls and plain-container freeze limits. Root independently read the installed source, reproduced the serviceful scheduler failure (`Failure []`) and reran the complete virtual compiler probe: zero diagnostics, five checked negative probes, no emitted files. The constructor `TaggedUnion` using `_tag` does not prevent `toTaggedUnion` from supporting the actual `type` discriminator. Service-free typing still does not prove non-suspending encoding. The installed helper execution is not mounted Runtime/HMR evidence, and no third design or source implementation is approved. Plan069 remains BLOCKED.

## Conformity and deviations

The installed parser behavior conforms to the documented service restriction and non-schema synchronous failure boundary. Flow's proposed typed-data API and Foldkit real preservation behavior remain unverified; isolated parser and compiler probes are not production or upstream parity proof. The test boundary is the exact installed schema/parser constructors and in-memory TypeScript program; no browser, actual Flow entry or native Runtime mount ran in these probes.

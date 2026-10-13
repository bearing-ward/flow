# Marker configuration JSON boundary amendment

2026-10-02. DESIGN proposal for STOP090. Primary and independent cold design approval of this exact amendment are required before the coordinator dispatches the sole Plan 090 continuation. This document authorizes no production edit, executor, shared gate, source acceptance or original member closure. The stopped candidate, its STOP records and all first-failure evidence remain immutable.

## Status and outcome

- Priority P1; effort S for this clarification, M for the retained source completion and evidence; risk MED; category correctness and tests.
- Planned at main HEAD `841be137e253cf19c665269eaaa79edc19abf3c3`, against the complete frozen stopped 090 candidate described below, not main HEAD alone.
- Depends on exact accepted 087 input, original approved Plan 090/design, and new primary plus cold design approval. Original source and installed-artifact acceptance remain pending.
- Proposed decision: explicitly use canonical JSON `null` as the own-undefined sentinel for every optional nonnullable configuration field. Retain the explicit color flag because color also accepts actual null. Separate ordinary decode/encode, JSON decode, JSON encode and roundtrip assertions. Require the stable conflict message only for structurally valid JSON flag/color conflicts.
- Exactly four additive public exports remain the outcome: `FlowEdgeMarkerConfigurationSchema`, `FlowEdgeMarkerConfiguration`, `FlowEdgeMarkerValueSchema`, `FlowEdgeMarkerValue`. Existing graph, defaults, factory, persistence and hosts keep their old acceptance and types.

## Exact inputs and drift checks

Main planning root is `/Volumes/Sync/codex/9-19-26/flow`. Source citations prefixed **C** resolve under `/Users/richardmcandrews/.codex/worktrees/marker-configuration-foundation/flow`; evidence citations prefixed **E** resolve under its sibling `/Users/richardmcandrews/.codex/worktrees/marker-configuration-foundation/marker-configuration-foundation-evidence`. The installed Effect used here belongs to C and is `4.0.0-rc.116`.

| Immutable input | SHA256 |
| --- | --- |
| Main and C `plans/090-create-marker-configuration-foundation.md` | `ef93dd5504c1ebee7b4a3dd614943a120c74c9b3114ece4b8f13a8922392bbda` |
| Main and C `plans/archive/marker-configuration-foundation-design.md` | `fe7fe728f122237c5e2763ed083500ff9994df360f20e6ea5f64c6731a0dc087` |
| Main and C original primary design review | `618a80cbe69192fde6031a0f35ba5fbaa02b549c0021449e084a35fc711553e1` |
| Main and C original independent design review | `961a5ca939a7b3a44202bc7b3a52f7e0863bc5e79e512d92a3b6e113a5ae640b` |
| E `final-stop-freeze.json` | `6c4c844803b7985eaf0f88ea25c7ba1164516bb0cc7de3cdd7bc400b45b82092` |
| Accepted 087 freeze, retained as E `input-final-freeze.json` | `2dee299d28a1b96442e3134cd4b46c380dd3dd2caeef9f28bcb46c7e96d90917` |
| E `schema-boundary-diagnostic.log` | `a2c657f2415feaa4a0991c6c78c7ce7765247171accc3e37b55035eb8c9c98d2` |
| E `units-2.log` | `aeb9b9b64882fe036d330ea21e08f4a4c09708e626de5b9a5453ee70cde66fc4` |
| E `typecheck-2.log` | `97aede8233c8474d3d34c5a9fb5f0e8fe76ff12b273ee7f0ddbc9204dd77a157` |
| C `packages/core/src/domain/flow.schema.ts` | `616f600a40424e6dba5de9cd279cbe8914199585162f94c514b2bf3c49053368` |
| C `packages/core/src/domain/flow-edge.schema.test.ts` | `840ad9f24337f599ea8ff08d795ae921b85f3bf3a92ef3cca0a4d3597d633451` |
| C `packages/core/src/public.ts` | `4b9b9e82464e89cd9630d36dc43eee602a0933c787bce877d1d6c521fda011f9` |
| C `tests/consumer/marker-configuration.runtime.ts` | `bfa1817c8ef3af48d2dd98b6c2808b1b87014f434dfb21568aa20645f2bcb758` |
| C installed `node_modules/effect/src/SchemaAST.ts` | `aebe95edaebb7966b97ba83a76eaad75780ecb275ebcaf930c4abac5335ff765` |
| C installed `node_modules/effect/package.json` | `ce3760f3d2a3ea08a80db4f5b7992d79ad09f86a9e0cd573a9bcb07d7a490ada` |

The stop freeze inventories 1,499 candidate files and 134 evidence files. The advisor independently rehashed every entry before the diagnostic, with zero mismatch. It contains 1,489 unchanged accepted 087 files, three changed accepted paths and seven new owned paths. Its complete inventories include execution/provenance and every copied original receipt. Rehash all entries again before continuation assembly and after any read-only reproduction. Missing or changed entries are a STOP.

Read-only reproducible rehash command in main: `python3 plans/marker-configuration-json-boundary-rehash.py`. Expected exit0, matching freeze hash, sourceEntries=1499, evidenceEntries=134, mismatches=[], pass=true. The script writes only stdout. The before/after JSON receipts remain plans-owned evidence and are separate from immutable E.

Preserve C/E unchanged. If this amendment is approved, the coordinator supplies one successor isolated checkout assembled byte-for-byte from the stopped source manifest and a separate evidence directory retaining all original 134 evidence entries plus the stop freeze. Independently verify assembly. Record accepted-087 inheritance, pre-STOP090 delta and resumed delta separately. Do not assemble from moving main, 086/089 or 088 utilities; do not copy ignored dependencies/dist/credentials. Do not reset or erase the STOP by rewriting old execution/provenance. Write separate resume records. The coordinator alone decides dispatch, shared leases and status updates.

## Finding and actual failure path

### [CORRECTNESS-090] Separate live values from canonical JSON sentinels

- Evidence: C `packages/core/src/domain/flow.schema.ts:110-119` defines optional finite nonnegative numeric and optional string fields. Its wire Struct at `:121-131` reuses the fields; the configuration Declaration JSON hook at `:143-172` reaches their installed canonical derivation. C `node_modules/effect/src/SchemaAST.ts:915-929` maps Undefined to JSON null and inversely maps null to undefined. C `packages/core/src/domain/flow-edge.schema.test.ts:406-412` applies the same null rejection assertion to ordinary and JSON decoders. E `units-2.log:5-10` and `:14-30` record three numeric JSON decode assertions failing; the 191-case run passed 187 and failed four.
- Impact: the source already retains own undefined through canonical JSON, but the test contract treats its sentinel as an invalid live number. Changing the source to reject JSON null would break that required inverse unless another explicit representation were reviewed. The same ambiguity applies to markerUnits and orient even though those tests currently check only JSON encode rejection.
- Effort S for boundary clarification and directed assertions, plus retained original completion work.
- Risk MED because weakening a rejection without positive presence/roundtrip and error-boundary controls would hide data loss.
- Confidence HIGH from frozen source, installed dependency, failed receipts and the actual-schema diagnostic.
- Fix sketch: retain ordinary null rejection and own-undefined support, approve JSON null as the sentinel for all five nonnullable optional fields, and assert the inverse explicitly. Keep color's null value distinct through its existing explicit flag.

The public production path for this child is the actual core import, `FlowEdgeMarkerConfigurationSchema` or `FlowEdgeMarkerValueSchema`, then ordinary Schema parsing or `S.toCodecJson`, its Declaration hook, nested wire fields, checked transformation and returned own keys. C `flow.schema.ts:133-174` delegates parsing to the canonical parameter and parses both transformation results through their authority. There is no new state owner, geometry, DOM effect, browser lifecycle or renderer output in this child. Those consuming paths remain unimplemented under the unchanged old graph acceptance at C `flow.schema.ts:197-221`, particularly `:207-208`.

The test path uses direct core source in C `flow-edge.schema.test.ts:352-355`. The drafted portable runtime uses actual `@flow/core` imports at C `tests/consumer/marker-configuration.runtime.ts:1-9`; it has not been installed/run in archive contexts. Original packed runner integration still needs completing, as described below. A source diagnostic is not installed-package evidence.

The fourth failure is a separate assertion boundary. C `flow-edge.schema.test.ts:448-459` requires the conflict message for `{colorPresence: 'explicit-undefined', color: undefined}`. Raw own undefined is not a JSON field value and the derived field parser rejects it before the Struct conflict filter. E `schema-boundary-diagnostic.log:19-20` records `SchemaError: Expected string | null | null`; E `units-2.log:28-37` records the failed message assertion. The stable filter message remains required when valid JSON color null or string reaches the filter. Never stringify this invalid own-undefined input before testing rejection: stringify drops the color and produces a different, valid flag-only input.

## Proposed complete contract

### Ordinary configuration and value types

Keep the canonical private Struct byte-identical to C `flow.schema.ts:110-119`:

```ts
const markerConfigurationShape = S.Struct({
  type: FlowEdgeMarkerSchema,
  color: S.optional(S.NullOr(S.String)),
  width: S.optional(S.Finite.check(S.isGreaterThanOrEqualTo(0))),
  height: S.optional(S.Finite.check(S.isGreaterThanOrEqualTo(0))),
  markerUnits: S.optional(S.String),
  orient: S.optional(S.String),
  strokeWidth: S.optional(S.Finite.check(S.isGreaterThanOrEqualTo(0))),
  colorPresence: S.optionalKey(S.Never),
})
```

Ordinary configuration Type and Encoded remain identical and schema-derived. Required type is arrow or arrowclosed. Color is optional string/null/undefined. Width, height and strokeWidth are optional number/undefined, refined at runtime to finite nonnegative numbers. MarkerUnits and orient are optional string/undefined. Every optional field preserves absence and own undefined; no defaults are injected. Ordinary null width/height/strokeWidth/markerUnits/orient fails on decode and encode. Zero, large finite nonnegative numbers, empty units/orient strings and nonstandard strings succeed. Negative/nonfinite numbers and wrong primitives fail. Color keeps absent/own undefined/null/empty/string distinct. Reserved live colorPresence fails even when own undefined. Unknown unrelated fields retain normal Struct stripping. No whole-object strict-excess policy is added.

`typeof FlowEdgeMarkerConfigurationSchema.Type` and `.Encoded` coincide with this live contract. Both `.DecodingServices` and `.EncodingServices` are never. The declaration has no fields/mapFields facade. `FlowEdgeMarkerValueSchema` remains the actual String/configuration union, Type=Encoded=`string | FlowEdgeMarkerConfiguration`, with both environments never. Direct value null and undefined fail; arbitrary and empty strings remain data accepted by this new value schema only. Caller optional endpoints use `S.optional(FlowEdgeMarkerValueSchema)`.

### Canonical JSON fields

Use the installed optional Undefined/null inverse for width, height, strokeWidth, markerUnits and orient. Apply this table separately to every field and both kinds:

| Live field | Ordinary decode/encode | Canonical JSON encode | Canonical JSON decode result |
| --- | --- | --- | --- |
| Absent | absent | field absent | field absent |
| Own undefined | own undefined | own field null | own undefined |
| Valid finite nonnegative number or string, as appropriate | exact value | exact value | exact value |
| Own null | typed failure | typed failure as live encode input | JSON null succeeds as own undefined sentinel |

JSON decode accepts raw JSON null in those fields and assigns own undefined. That does not add null to the ordinary public configuration type. Raw own undefined fed to JSON decode fails with a typed Schema failure because JSON Encoded contains no undefined. Test it directly before stringify. Canonical JSON roundtrip encodes a validated live value, stringifies/parses that wire value, then decodes; it must retain own presence and exact live values. Ordinary encode/decode must never insert wire null or color flags.

The public JSON codec is `S.toCodecJson<typeof FlowEdgeMarkerConfigurationSchema>`: Type is the unchanged live configuration; Encoded is `S.Json`; decoding/encoding services remain never. The value codec likewise retains the live value Type and has Encoded `S.Json`. C installed `Schema.ts:14892-14911` defines that API. Do not publish a narrower hand-written wire type or assert that public Json is already an object. Private wire intermediate Type/Encoded continue to derive from the shared canonical fields, with colorPresence overridden to optional-key explicit-undefined. No additional flags, export or public serializer is approved.

For a caller-owned Struct's optional start/end value fields, endpoint absence remains absent and own endpoint undefined encodes to endpoint null, then decodes to own endpoint undefined. Endpoint live null fails. Nested configurations recursively use this amendment's five field sentinels and the color flag. This is a caller-owned Struct test, not FlowEdge, Application.Model, Runtime, ports or saved-v2 preservation proof.

### Color and reserved metadata

| Live color | JSON output | Decoded color |
| --- | --- | --- |
| Absent | no color, no colorPresence | absent |
| Own undefined | no color, colorPresence explicit-undefined | own undefined |
| Own null | color null, no flag | own null |
| Own empty/concrete string | exact color, no flag | exact color |

Wire flag-only explicit-undefined succeeds and restores own undefined. Wire wrong discriminator, own undefined flag or wrong primitive fails. Flag plus any own color fails. For JSON-valid color null, empty string and concrete string the failure must contain exactly the stable filter text `Marker color flag/value conflict`. For raw own undefined color, or another structurally invalid color, require typed failure before the object-level filter and do not demand that filter text. JSON-null color without a flag remains actual null, distinct from own undefined and absence. Retain canonical equality differences for those three states. Validate both inverse results; no catch/fallback success, unchecked declaration, guard, cast, AST mutation or Struct facade is authorized.

High-level `S.decodeUnknownExit`/`encodeUnknownExit` failures must contain `S.SchemaError`, not merely any Issue. Internal `SchemaParser.decodeUnknownEffect`/encode parser and checked transformation failures must contain `SchemaIssue.Issue`. Assert the boundary separately, with Cause.hasFails=true, hasDies=false and hasInterrupts=false. Invalid synchronous operations must not suspend. Keep all failure branches reachable and never convert them to a successful configuration. Only the specified conflict filter text is stable; do not freeze installed formatter wording for structural errors.

## Source and test delta proposed for approval

This clarifies the original Plan 090 JSON contract and meaningful test matrix. It does not grant scope from the broader marker/MiniMap continuation. Keep the original plan/design/approvals and STOP records byte-identical. Add this amendment and its new approvals as separate continuation inputs.

No semantic production change is needed for the proposed sentinel decision. Preserve the current canonical/wire Struct, public Declaration, checked transformations and union at C `flow.schema.ts:110-184`. Preserve the four barrel exports already added. Any discovery that this decision needs a different representation or production change beyond the already approved new block requires another reviewed amendment. Existing definitions in flow.schema.ts remain byte-identical to accepted 087 after removing permitted new imports/block; every other protected file stays hash-identical.

The complete permitted continuation delta is:

1. `packages/core/src/domain/flow-edge.schema.test.ts`: retain all pre-existing tests and earlier nonconflicting foundation assertions. Split ordinary decode/encode/null rejection from canonical wire-null success for each of the five fields. Add explicit wire encode values, absence, raw own undefined rejection, roundtrip presence and exact error-class checks. Require filter text only for JSON-valid flag/color conflicts. Add root exact-optional compiler probes in uncalled named functions. Do not delete failed cases, skip cases, stringify invalid raw inputs, or weaken them to success without the full replacement matrix below.
2. `tests/consumer/marker-configuration.runtime.ts`: complete the draft with the same portable matrix and exact error-boundary assertions. Preserve actual public imports and identity-bearing output. This file was not run during stopped product execution. No source/dist alias may count as archive proof.
3. NEW `tests/consumer/marker-configuration.types.ts`: complete original public positives and at least 18 meaningful consumed negatives. Prove Configuration/Value Type and Encoded bidirectionally; both environments never; JSON codecs have unchanged Type, Encoded Json and never environments. Include positive own undefined for all five fields and null color. Ordinary negative types reject null for each five-field case, missing/wrong kind, numeric color, numeric units/orient, reserved flag, direct null/undefined value, function value, unchecked unknown, invented fields/mapFields, configuration assigned to old endpoint, and arbitrary string assigned to old FlowEdgeMarker. Retain root exact-optional own-undefined reserved metadata negative separately; unchanged installed compiler modes omit exactOptionalPropertyTypes and cannot claim that static rejection. Runtime rejection remains required in every mode.
4. `scripts/check-packed-consumer.ts`: complete original integration by copying the two marker fixture files alongside the untouched factory fixtures into each installed context and running marker runtime after the old factory runtime, before unchanged type/browser steps. Preserve installation, peers, assertions, cleanup and strict ports. Existing accepted runner path is `:785-817` in the accepted087 source root `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/flow`.
5. `tests/consumer/tsconfig.json`, `tests/consumer/vue/tsconfig.json`, `tests/consumer/foldkit/tsconfig.json`: add only two marker fixture include entries. Keep NodeNext/Bundler modes, options, strictness, skipLibCheck=false and all old entries unchanged.
6. `docs/public-api.md`: complete additive four-export docs and expressly document the five JSON null sentinels, ordinary null rejection, color flag table, error contexts, public Json encoded type and lack of Declaration Struct methods. NEW `research/traces/marker-configuration-foundation.md`: trace actual public and actual test paths separately with exact locations and Conformity and deviations. `research/PROGRESS.md`: append only bounded pending/completed evidence with focused scope. No member closure or generated SUMMARY/API-reference edit.
7. `verification.config.json`: complete the original focused scope stated below, no broadening or policy relaxation.
8. NEW continuation-owned amendment/primary/cold approval copies, `plans/marker-configuration-foundation-resume-execution.md`, `plans/marker-configuration-foundation-resume-provenance.json`: retain immutable original STOP files and describe the resumed delta, every old failure, real new commands and scope. Preserve all original E files; add new receipts in the successor's external evidence directory. Freeze the successor complete source/evidence and whole delta after successful acceptance gates.

No other file change is authorized. Protected paths include the whole `flow-edge.schema.ts`, default schema, factory, graph/document/geometry/renderer/adapter/host/browser/persistence/snapshot/runtime/ports source and old tests; manifests, lockfile, dependencies and compiler/lint/test policy; original plans/index/catalog/101-member/303-cell ledgers; research/artifacts and generated files. No new API, flags other than the existing color flag, field widening, saved schema, selector, registry, telemetry helper, fallback, skip, timeout or tolerance. Effect remains exactly rc.116, Foldkit 0.163.0, Vue 3.5.43 and TypeScript 5.9.3.

### Two diagnosed compiler repairs

C `flow-edge.schema.test.ts:380-381` calls Object.hasOwn on public Json without object narrowing. E `typecheck-2.log:35-38` reports exactly those two TS2345 diagnostics. Add a real local `typeof wire === 'object' && wire !== null && !Array.isArray(wire)` branch before both assertions; fail the test in the alternative branch. Both calls then receive the checked object. An expectation or boolean helper alone does not narrow Json in the compiler. No cast, nonnull assertion, type lie, compiler option change or typed wire alias is allowed. Use the same checked narrowing in the portable fixture before inspecting wire keys. These mechanical repairs remain pending until approved continuation, and cannot erase the semantic STOP.

## Required replacement assertions

Run every row against the actual configuration and value schemas in core units and actual installed public runtime, for both kinds. Each case checks own keys separately from exact values and checks detached ordinary outputs and no defaults. Assertions supplement named cases and do not establish parity by count.

| Cases | Required ordinary result | Required JSON encode/decode/roundtrip result |
| --- | --- | --- |
| Each of five fields absent | decode/encode absent | encode absent; decode absent; roundtrip absent |
| Each of five fields own undefined | decode/encode own undefined | encode own null; decode raw null to own undefined; stringified roundtrip own undefined; raw own undefined decode typed failure |
| Each numeric zero, positive, large finite | exact number on both routes | own exact wire number and restored number |
| Each numeric negative/NaN/+Infinity/-Infinity/null/wrong primitive | decode and encode typed rejection | JSON encode rejects all as live values; JSON decode rejects negative/nonfinite/wrong primitive directly; null decode is the sentinel success with own-key proof |
| Each string empty, standard, nonstandard | exact string on both routes | own exact wire string and restored string |
| Each string null/number/function | decode and encode typed rejection | JSON encode rejects live invalid values; JSON decode rejects number/function directly; null decode is sentinel success with own-key proof |
| Color absent/own undefined/null/empty/string | exact presence/value and inequality absent vs undefined vs null | exact wire table, no leaked metadata, inverse presence/value and equality |
| Live reserved flag own undefined/explicit/wrong | decode and encode typed rejection | JSON encode rejects invalid live metadata |
| Wire wrong/undefined/nonliteral flag | distinct typed failure | raw JSON decoder rejection before stringify, no defect/suspension |
| Wire explicit flag + null/empty/concrete color | ordinary flag rejects | high-level SchemaError and internal Issue, exact conflict text |
| Wire explicit flag + own undefined color | ordinary flag rejects | raw typed structural failure; no filter-text assertion; do not stringify first |
| Caller optional start/end absent/undefined/empty/string/object | exact endpoint presence/value | actual caller Struct recursion including all five sentinels and every color state; no actual Model/Runtime claim |

Retain original direct value invalid branches, derived equality/detachment, unrelated-key stripping, genuine caller fields/mapFields/annotate/check/rebuild, and both endpoint protected edge/default/factory controls. Old built-ins/own undefined remain accepted, and new objects/references/empty/null remain rejected by old schemas. Numeric/string null negatives in ordinary compiler fixtures remain intact. The amendment changes the canonical JSON wire expectation; it does not widen ordinary types.

## Commands and ordered continuation

Run future product commands only in the coordinator-supplied successor checkout after both new design approvals and explicit dispatch. Preserve exact first diagnostics and exits.

| Step | Command | Required result |
| --- | --- | --- |
| Read-only input check, main | `python3 plans/marker-configuration-json-boundary-rehash.py` | exit0; all1499 source and134 evidence hashes match |
| Read-only actual-source diagnostic, main | `bun plans/marker-configuration-json-boundary-probe.ts` | exit0; 378 assertions; no product/archive acceptance claim |
| Successor assembly/install | `git rev-parse HEAD`, complete manifest rehash, then `bun install --frozen-lockfile` | exact baseline/assembly; exit0; protected lockfile unchanged |
| Units after complete matrix/fixture narrowing | `bunx vitest run packages/core/src/domain/flow-edge.schema.test.ts` | exit0; every retained old and expanded named case passes, no skips |
| Types/quality/architecture | `bun run typecheck`, `bun run check`, `bun run check:architecture` | every exit0; all workspace declarations and compiler probes pass |
| Installed packages, after coordinator lease | `bun run test:consumer` | exit0; all three actual archives prove old factory, new marker runtime/types and unchanged browsers |
| Docs and trace | `bun run docs:check`, `bun run research:check-traces` | every exit0; protected generated docs/evidence unchanged |
| Saved scope | `bun run verify --list` | focused scope exactly below |
| Acceptance gate, after coordinator lease | `bun run verify` | exit0; complete focused baseline plus selected checks, no skips |
| Final diff | `git diff --check` and complete protected/inherited/new manifest comparison | exit0; exact allowed delta, no protected changes |

Complete assembly and approved-contract units first. Complete portable runtime/types and runner integration second. Complete documentation/trace/saved scope next, then leased consumer/focused gates. Freeze reviewable source only after complete actual acceptance receipts and final quality/diff checks. Independent SOURCE review and primary reproduction remain required. Record successor freeze, selected stop/amendment/approval hashes, complete candidate/evidence inventories, retained original failure hashes, source patch hashes, every changed path and fullSuite=false. Do not edit after successor freeze. Coordinator owns index/acceptance status.

Save the original required config:

```json
{
  "defaultProfile": "focused",
  "activeWork": "Plan 090 additive marker configuration Schema foundation",
  "checks": ["docs", "contracts", "api-members", "traces", "consumer"],
  "browserTests": { "vanilla": [], "vue": [], "foldkit": [] }
}
```

The focused baseline retains quality, architecture, package builds, workspace types and all units. The consumer check includes unchanged installed browser checks for all three contexts. Ports4176/4177/4178 and shared consumer/browser/focused gates require the coordinator's explicit lease and serialization. Do not reuse/kill a foreign listener. No HMR/full/release gate is approved for this bounded child; full verification remains required at integration or broad parity milestones.

## Actual plans-only diagnostic receipts

The advisor created only new files under main `plans/`, read C and its installed Effect, and ran no candidate install/build/typecheck/unit/product gate or browser. `bun plans/marker-configuration-json-boundary-probe.ts` exited0 and wrote `plans/marker-configuration-json-boundary-runtime.json`, reporting 378 assertions. It exercises both kinds, all five absent/own-undefined/null boundaries, raw undefined wire failures, the five color states, JSON-valid conflict message, exact high-level SchemaError/internal Issue failures, live/invalid wire flags and nested caller sentinels. This is actual frozen source/dependency behavior, not a copied validator, product gate or actual tarball test. No new compiler claim is made from this runtime diagnostic. Exact uncompleted compiler/runtime/consumer obligations remain above.

The rehash command before and after diagnostic/amendment drafting exits0 with all source/evidence entries matching the unchanged stop freeze. `marker-configuration-json-boundary-rehash-before.json` and `marker-configuration-json-boundary-rehash-after.json` preserve those receipts. `marker-configuration-json-boundary-diagnostic-receipts.json` records commands, exits and owned artifact hashes. Old units remain 187 passed/4 failed, second typecheck remains two errors, source acceptance=false, sharedGatesRun=false, focusedVerificationRun=false, fullSuite=false. New diagnostic success cannot replace those facts.

## Done criteria, STOP and review boundaries

Before continuation dispatch, both root primary and fresh cold DESIGN approvals must approve this exact amendment and input hashes. No new production authorization follows from this draft or the diagnostic. If approved and dispatched, completion requires every original Plan090 done criterion plus every replacement assertion above, actual installed proof, complete focused verification, protected hash and old-definition comparisons, preserved failed receipts, successor freeze, primary reproduction and fresh independent SOURCE approval. No acceptance criterion is deleted.

STOP for input/approval/assembly drift; any need for a cast, duplicated canonical authority, fake fields, erased environments, non-schema-derived types or changed public ordinary Type/Encoded; sentinel collapse, leaked flags, suspended/defective parsing, lost equality/presence; wider graph/default/factory/host/legacy/persistence or protected definition changes; dependency/compiler/test/verifier policy expansion; unapproved file edits; unknown semantic/architecture failures; unavailable copied evidence; or a foreign listener blocking a leased gate. Report exact evidence and request another reviewed amendment instead of improvising.

Diagnosed reversible mechanical fixture repairs within approved scope may continue while preserving every failed receipt. There is no arbitrary two-attempt command cap. Improve permits at most two formal SOURCE-review revision rounds per candidate. This DESIGN clarification does not rename or reset a formally rejected source candidate. Keep source uncommitted. No commit, merge, push, PR, publication, cleanup or main/index edit without explicit authorization.

Future integration must consume this canonical authority and JSON hook while widening real graph/renderer/default/save/patch/revision/client paths together. Retain full approved marker field/color/default/numeric, saved-v2 endpoint presence, frozen legacy1/additive2, ports/actual Model/HMR, owner-local registry/native lifecycle and whole graph-space MiniMap policies. Dependencies068/074/069/086/058 remain open.

## Conformity and deviations

Conforming proposed contract preserves the reviewed optional own-key inverse, color's explicit undefined flag, schema-derived types, typed failures, one canonical authority and genuine caller Struct operations. The plans-only actual-source probe supports this bounded representation behavior with pinned Effect rc.116; product source acceptance and installed public artifacts remain unverified.

Intentionally different from the ambiguous old JSON rejection wording is explicit wire null acceptance for each optional nonnullable numeric/string field and distinct error-message expectations before structural parsing versus at the conflict filter. It is necessary to preserve the already-required own undefined roundtrip without adding flags or widening ordinary types. Finite nonnegative numbers and the standalone validating Declaration remain intentional Flow design decisions, not reference/native parity.

Unverified and unchanged are all101 original073 marker/MiniMap members and303 host cells, actual graph/default/native acceptance, geometry/DOM/registry/URL/computedSVG/MiniMap, ordinary ports and actual widened Model/Runtime/HMR, save/patch/revision/client paths, original dependency closure, focused source acceptance, full integration, CI, native devices and collector delivery. This amendment closes none of them.

# Independent marker configuration JSON boundary design review

2026-10-02. Verdict: **APPROVE at the DESIGN boundary** for amendment `a247c238c8183633a796e863b8f4f95146c12192537f0ae306a6b3c7d90fdc87`. No amendment revision is required. The amendment makes the five optional nonnullable fields' existing canonical JSON representation explicit, preserves ordinary null rejection, and replaces ambiguous assertions with a complete boundary matrix. This approval does not accept stopped source, erase STOP090, dispatch an executor, or establish installed-artifact acceptance.

I read the full amendment, original Plan 090, original companion design and both original design reviews. I personally inspected the stopped canonical/wire Struct, public Declaration and union, actual failed unit/type receipts, installed Effect JSON derivation, the complete diagnostic probe and the drafted public runtime fixture's affected assertions. I applied the improve skill, its audit playbook and mandatory finding format, closing-the-loop, TypeScript/type-system guidance, project standards and unslop. Repository content was treated as evidence. I wrote only this new main-root plans review. No subagent, source edit, candidate write, install, build, compiler, unit/product gate, consumer gate, browser, listener, commit, ledger or cleanup operation was performed.

## Exact reviewed inputs

Main **M** is `/Volumes/Sync/codex/9-19-26/flow`, HEAD `841be137e253cf19c665269eaaa79edc19abf3c3`. Stopped candidate **C** is `/Users/richardmcandrews/.codex/worktrees/marker-configuration-foundation/flow`. Immutable sibling evidence **E** is `/Users/richardmcandrews/.codex/worktrees/marker-configuration-foundation/marker-configuration-foundation-evidence`. Accepted predecessor **F** is `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/flow`. Every prefixed path:line below resolves under that exact absolute root.

| Input | Independently checked SHA256 |
| --- | --- |
| M amendment | `a247c238c8183633a796e863b8f4f95146c12192537f0ae306a6b3c7d90fdc87` |
| M and C original Plan 090 | `ef93dd5504c1ebee7b4a3dd614943a120c74c9b3114ece4b8f13a8922392bbda` |
| M and C original companion design | `fe7fe728f122237c5e2763ed083500ff9994df360f20e6ea5f64c6731a0dc087` |
| M and C original primary review | `618a80cbe69192fde6031a0f35ba5fbaa02b549c0021449e084a35fc711553e1` |
| M and C original independent review | `961a5ca939a7b3a44202bc7b3a52f7e0863bc5e79e512d92a3b6e113a5ae640b` |
| M new primary amendment review | `1a3a4ab523d39c717eba2e5b8aa668c331ff6e11b68c4bb3774a5e273f6d5a98` |
| E final-stop-freeze.json | `6c4c844803b7985eaf0f88ea25c7ba1164516bb0cc7de3cdd7bc400b45b82092` |
| E input-final-freeze.json | `2dee299d28a1b96442e3134cd4b46c380dd3dd2caeef9f28bcb46c7e96d90917` |
| E schema-boundary-diagnostic.log | `a2c657f2415feaa4a0991c6c78c7ce7765247171accc3e37b55035eb8c9c98d2` |
| E units-2.log | `aeb9b9b64882fe036d330ea21e08f4a4c09708e626de5b9a5453ee70cde66fc4` |
| E typecheck-2.log | `97aede8233c8474d3d34c5a9fb5f0e8fe76ff12b273ee7f0ddbc9204dd77a157` |
| C packages/core/src/domain/flow.schema.ts | `616f600a40424e6dba5de9cd279cbe8914199585162f94c514b2bf3c49053368` |
| C packages/core/src/domain/flow-edge.schema.test.ts | `840ad9f24337f599ea8ff08d795ae921b85f3bf3a92ef3cca0a4d3597d633451` |
| C packages/core/src/public.ts | `4b9b9e82464e89cd9630d36dc43eee602a0933c787bce877d1d6c521fda011f9` |
| C tests/consumer/marker-configuration.runtime.ts | `bfa1817c8ef3af48d2dd98b6c2808b1b87014f434dfb21568aa20645f2bcb758` |
| C node_modules/effect/src/SchemaAST.ts | `aebe95edaebb7966b97ba83a76eaad75780ecb275ebcaf930c4abac5335ff765` |
| C node_modules/effect/package.json | `ce3760f3d2a3ea08a80db4f5b7992d79ad09f86a9e0cd573a9bcb07d7a490ada` |
| M unchanged diagnostic probe | `b5aa1776e6343fe31e73c63805fde479f02a2e32ed0001736b11eb8e58ce1af0` |
| Author, primary and my reproduced diagnostic stdout | `681e631d4a01cbb2176a97ae5dd6f68c44517e6cff2695f54a3761d56a0039e7` |

I independently rehashed all 1,499 complete candidate entries and all 134 evidence entries before and after the read-only reproduction, with zero missing or changed entries. The immutable freeze still reports `STOPPED_SEMANTIC_CONTRACT_REVIEW_REQUIRED`. Its 1,489 unchanged inherited files, three changed accepted paths and seven new owned paths remain the selected assembly, including original execution/provenance and copied failure records. Installed Effect remains exactly `4.0.0-rc.116`.

## Vetted findings and amendment disposition

The following are diagnosed stopped-candidate obligations that the amendment addresses. They are not new reasons to reject this design or evidence that the source has been repaired.

### [CORRECTNESS-01] Separate ordinary null rejection from five wire sentinels

- **Evidence**: C `packages/core/src/domain/flow.schema.ts:110-123` makes width, height, strokeWidth, markerUnits and orient optional and reuses those fields in the wire Struct. C `node_modules/effect/src/SchemaAST.ts:915-929` encodes Undefined as null and decodes null as undefined. C `packages/core/src/domain/flow-edge.schema.test.ts:406-412` applies numeric null rejection to both ordinary and JSON decoders. E `units-2.log:12-24` records the three resulting failures.
- **Impact**: Rejecting those JSON null values would discard the representation needed to retain own undefined. Simply deleting the failures would leave the inverse and presence requirements unproved, including the two string fields that currently lack this JSON decode negative.
- **Effort**: M, including core, portable installed runtime and compiler proof.
- **Risk**: MED. An incomplete replacement matrix could silently collapse absence and own undefined or widen live types.
- **Confidence**: HIGH. Personally read source/dependency/receipts and reproduced actual-source behavior.
- **Fix sketch**: Retain ordinary decode/encode null rejection for all five fields. Assert own wire null, inverse own undefined, raw own undefined wire rejection, absent-key retention and stringified valid-wire roundtrip for both kinds and both public schemas. M `plans/marker-configuration-json-boundary-amendment.md:79-96,134-153` requires those controls and preserves invalid live JSON encode rejection.

### [CORRECTNESS-02] Assert the conflict text only after structurally valid color parsing

- **Evidence**: C `packages/core/src/domain/flow.schema.ts:121-131` owns the exact `Marker color flag/value conflict` filter. C `packages/core/src/domain/flow-edge.schema.test.ts:448-459` currently requires that text for flag plus raw own undefined color. E `schema-boundary-diagnostic.log:19-20` identifies the earlier color parser error; E `units-2.log:28-37` records the message failure. M amendment `:107-109,147-150` separates the boundaries.
- **Impact**: Requiring object-level filter text for invalid field input confuses structural failure with semantic conflict. Stringifying the raw own undefined case would drop the key and accidentally test a valid flag-only object.
- **Effort**: S, including distinct core and portable runtime cases.
- **Risk**: LOW. Both failure classes remain required, with narrower message expectations and stronger error-class assertions.
- **Confidence**: HIGH. Actual high-level and internal parser reproduction confirmed both boundaries.
- **Fix sketch**: Directly reject raw undefined color and raw undefined/wrong wire flags without stringify or stable structural-text assertions. Retain exact conflict text for flag plus valid null, empty string or concrete string. Assert high-level SchemaError separately from internal SchemaIssue.Issue, each with typed failure and no defect/interruption/suspension.

### [TEST-COVERAGE-03] Narrow public Json before inspecting wire own keys

- **Evidence**: C `packages/core/src/domain/flow-edge.schema.test.ts:380-381` passes public Json to Object.hasOwn without narrowing; E `typecheck-2.log:35-38` records exactly two TS2345 errors. C `node_modules/effect/src/Schema.ts:14904-14907` defines unchanged live Type and public Encoded Json. C portable runtime `tests/consumer/marker-configuration.runtime.ts:62-63` repeats the affected assertions. M amendment `:130-132` specifies checked local narrowing and a failing alternative branch.
- **Impact**: The test does not currently compile against the authoritative public codec type. A handwritten wire alias or cast would conceal that boundary.
- **Effort**: S for the diagnosed repairs, with actual workspace/archive compiler gates still required.
- **Risk**: LOW. Local object/non-null/non-array narrowing preserves the public contract and rejects unexpected output.
- **Confidence**: HIGH from direct source and compiler receipt inspection. No new compiler was run.
- **Fix sketch**: Put each own-key assertion inside the real checked object branch and fail otherwise. Preserve Encoded Json and all compiler modes. Root exact-optional reserved-metadata probes stay separate from the three unchanged installed modes, which omit exactOptionalPropertyTypes.

## Representation and call-path assessment

The production path for this bounded public feature starts at C `packages/core/src/public.ts:41-42,76-77`, reaches the canonical validating Declaration at C `packages/core/src/domain/flow.schema.ts:133-174`, then reaches the wire Struct and checked inverse when the caller derives canonical JSON. Installed C `node_modules/effect/src/internal/schema/toCodec.ts:74-82` consults the Declaration hook; `:96-114` recursively derives Objects and Union. Both computed transformation results are parsed through their respective authority at C `packages/core/src/domain/flow.schema.ts:150-155,166-169`. The actual value schema remains the genuine String/configuration union at `:179-184`.

All five nonnullable optional fields can use the installed null sentinel because ordinary null is excluded. Absent fields remain absent. Color must retain the explicit flag because its live contract also accepts actual null. C `packages/core/src/domain/flow.schema.ts:147-164` strips the wire flag, restores own color undefined, and preserves color absent/null/empty/string. The amendment's full color table, equality, ordinary output detachment and no-default controls are appropriate. No additional flags, public serializers, fake fields/mapFields, alternative authority, casts, environment erasure or live Type/Encoded widening are needed or approved.

The test path differs. Core units directly call the source parsers at C `packages/core/src/domain/flow-edge.schema.test.ts:352-355`; the diagnostic imports those actual frozen declarations and installed Effect through absolute source paths at M `plans/marker-configuration-json-boundary-probe.ts:2-3`. The portable draft uses actual public imports at C `tests/consumer/marker-configuration.runtime.ts:1-9`. The unchanged packed runner currently copies and executes only the old factory proof at C `scripts/check-packed-consumer.ts:785-802`, before compiler/browser checks at `:803-813`. Adding both marker fixtures and their runtime to all three real installed contexts remains necessary. Source imports and dist aliases cannot satisfy that gate.

The public feature adds no graph state ownership, geometry, DOM effect, rendering or framework lifecycle path. Old graph marker endpoints remain the literal schema at C `packages/core/src/domain/flow.schema.ts:197-221`, specifically `:207-208`. I independently compared C against F and confirmed byte-identical whole flow-edge.schema.ts, defaults, factory, packed runner, all three consumer compiler configs, verification config, package manifest and lockfile. Removing only the approved new schema block and import additions leaves every old flow.schema.ts definition/body byte-identical; the Effect import is reformatted by its permitted additions. The amendment further protects the current new production block itself. It grants no broader source authorization.

## Reproduction and continuation requirements

I ran the unchanged `bun plans/marker-configuration-json-boundary-probe.ts` read-only via Python subprocess capture. Actual child exit was 0, stderr was empty, and stdout reported 378 assertions. Its SHA256 is byte-identical to both existing runtime JSON receipts. The subprocess capture wrote no output file. Before/after independent Python inventory reads checked every frozen entry without candidate/evidence writes. A preliminary old-file comparison also detected the allowed Effect import formatting; the corrected body comparison confirmed unchanged pre-existing definitions. This was read-only inspection, not compiler or source acceptance.

The reproduction supports the five-field sentinel distinction for both kinds, five color states, exact high-level/internal failures, valid color conflicts, raw undefined structural rejection and a nested caller-owned Struct example. It does not run the full product matrix, exhaust the value schema's matrix, prove compiler probes or install an archive. Those remain required acceptance work.

The successor rule is sound: coordinator-owned isolated assembly must inherit all 1,499 frozen source entries and all 134 original evidence entries plus the original stop freeze, independently verify the assembly, and separately record accepted-087 inheritance, pre-STOP090 delta and resumed delta. Immutable original plans/approvals/execution/provenance/failures remain unchanged. The amendment and new approvals are additive inputs; new resume records and receipts belong to the successor. This does not rename or reset a rejected source candidate or authorize another source owner.

M amendment `:117-128` has a complete narrow continuation allowlist. The current production schema/barrel stays fixed. Full replacement units and portable runtime, new public compiler fixture, runner integration, only fixture include additions, additive public docs/trace/PROGRESS, saved focused scope and separate resume records are required. M amendment `:155-185,193-199` retains actual units, workspace types/quality/architecture, all three archive contexts with old factory and unchanged browsers, docs/traces, exact focused `bun run verify`, protected comparisons, final freeze, primary reproduction and fresh independent SOURCE review. Coordinator leases remain required for shared gates. No full/release/HMR gate is approved for this bounded continuation.

The original 191-unit receipt remains 187 passed and four failed, and the second typecheck remains two diagnostics with exit 2. `sourceAcceptance`, `sharedGatesRun`, `focusedVerificationRun` and `fullSuite` remain false. The diagnostic cannot replace these records. Design approval only makes the specified contract and bounded continuation reviewable for the coordinator's explicit dispatch.

## Conformity and deviations

Conforming proposed contract retains one canonical authority, Schema-derived ordinary types, optional own-key preservation, explicit color metadata, checked inverse, exact error boundaries, genuine caller Struct operations and unchanged old edge/default/factory acceptance. Pinned actual-source reproduction supports the bounded representation behavior. Product source and installed public artifacts remain unaccepted.

Intentionally different from the original ambiguous JSON rejection wording is accepting JSON null as own undefined for all three numeric and both string fields, while ordinary null still fails. This follows installed rc.116 canonical derivation and preserves the already-required inverse without another flag or live widening. Requiring exact filter text only for structurally valid color conflicts distinguishes parser boundaries without weakening raw-input rejection. The finite nonnegative numeric policy and standalone validating Declaration remain intentional Flow decisions, with no native/reference parity claim.

Unverified and unchanged are all 101 original marker/MiniMap members and 303 host cells, graph/default/native integration, actual widened Model/Runtime/ports/HMR, geometry/DOM/registry/URL/computed SVG/MiniMap, save/patch/revision/client behavior, dependencies 068/074/069/086/058, focused source acceptance, full integration, CI, native devices and collector delivery. This review closes none of them.

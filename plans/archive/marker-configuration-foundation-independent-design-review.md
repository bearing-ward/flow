# Independent marker configuration foundation design review

2026-10-02. Verdict: **APPROVE at the design boundary.** Plan 090 and its companion design provide a bounded, executable handoff for four additive public Schema/type exports. They preserve existing graph, defaults, factory, renderer and persistence contracts. This verdict authorizes no source edit or executor by itself. Source implementation, installed-package verification, focused acceptance, primary reproduction and independent source review remain required.

I read the improve skill, its closing-the-loop reference, the audit-playbook Correctness / Bugs, Test Coverage and Finding format, AGENTS.md, project standards, TypeScript/type-system guidance and unslop. I treated repository material as evidence. The only file written is this review. I ran read-only inspections and hashes, with no source edit, probe, compiler, product gate, install, build, browser, server, port, ledger, commit or worktree mutation.

## Exact reviewed inputs

Main is `/Volumes/Sync/codex/9-19-26/flow`. Accepted source **F** is `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/flow`, HEAD `841be137e253cf19c665269eaaa79edc19abf3c3` plus accepted frozen working changes. Source citations using F resolve under that absolute root.

| Input | SHA256 |
| --- | --- |
| `plans/090-create-marker-configuration-foundation.md` | `ef93dd5504c1ebee7b4a3dd614943a120c74c9b3114ece4b8f13a8922392bbda` |
| `plans/archive/marker-configuration-foundation-design.md` | `fe7fe728f122237c5e2763ed083500ff9994df360f20e6ea5f64c6731a0dc087` |
| Accepted 087 sibling `typed-factory-evidence/final-freeze.json` | `2dee299d28a1b96442e3134cd4b46c380dd3dd2caeef9f28bcb46c7e96d90917` |
| Full retained continuation | `8f05f10bee7b1d926da68c82c429b87569ca7f21dc88f6df2cdd8dd16fe661e2` |
| Nested configuration architecture amendment | `20836dfd558311b91f19099e7c1944fc8d46b166d7e6dde295e72e87a04ce55a` |
| Independent architecture review | `3e8faf24c0e532bc62481ecb8ed6c42a49497d4904f3bee26962a01f06aa4bac` |
| Primary architecture review | `69fce373230c7309e4bf20bf30fc014f23340985fbc3fe4f134ef6248151c631` |
| Complete nested probe | `e54e493d76f1d17a76709a47fa61da8af39cffffeab54b98753ef83071b4231c` |
| Nested report | `f32280669e36255fd4cf312524634b55840ee900e55302f9fe16d07e9f46db2d` |
| Nested artifact manifest | `df371fab1a5eb463666f64aff58121579f18f64b65d811afbd37985b086ae17c` |
| Independently reproduced primary nested runtime output | `2e76fde02b890a573d3faf58493bf20cdbb9b48fdba0a849201fd0eb123218e8` |
| Preserved first 090 plan draft | `9842f7c3f3726cb300f2a79f476f9a8b8f0d76f0c637d530eaf6106751378c0d` |

I independently rehashed all 1,492 complete accepted candidate entries and all 122 external evidence entries. Both inventories had zero mismatches, including a second check after writing this review. Every one of the seven critical actual input hashes listed in Plan 090 matches. I also independently checked the 12 nested preflight artifacts and 12 original whole-edge artifacts, with zero mismatches. The current numbered plan differs from its preserved first draft only in the diagnosed-failure policy and explanatory paragraph at lines 196-198. It retains the limit of two formal source-review revision rounds while permitting diagnosed mechanical repairs within the approved scope.

I personally read the full numbered plan, companion design, retained continuation, nested amendment, both architecture approvals, full 421-line nested probe and complete nested report. The probe's existing compiler/runtime receipts describe 3,124 assertions in 25 groups and 16 consumed negative compiler probes. I did not rerun those commands. Their result establishes the earlier parser/compiler feasibility boundary, not new product proof.

Installed versions inspected in F remain Effect `4.0.0-rc.116`, Foldkit `0.163.0`, Vue `3.5.43` and TypeScript `5.9.3`.

## Contract and representation review

The single private canonical Struct is sufficient to own the approved type, optional color, finite nonnegative width/height/strokeWidth, arbitrary-string units/orientation and reserved live key. Plan 090 lines 88-112 specify exact absent, own undefined, null, empty, zero and malformed-input behavior without inserting renderer defaults. Runtime constraints complement the inferred numeric Type, which cannot distinguish finite or nonnegative numbers by itself.

The public configuration Declaration delegates actual unknown parsing to its supplied canonical parameter, delegates equivalence and provides a checked JSON inverse. Installed F `node_modules/effect/src/Schema.ts:498-520` supports this constructor; `SchemaParser.ts:262-272` returns issue-typed Effect parsing and preserves supplied parse options. The checked link and getters are `Schema.ts:6386-6395` and `SchemaTransformation.ts:437-445`. Their synchronous never-environment usage matches the frozen probe at `plans/marker-minimap-nested-config-probe.ts:48-80`. No unchecked declaration, cast, handwritten parallel output type or fake Struct facade is necessary.

The canonical authority and wire projection share the same fields. The wire overrides only the reserved colorPresence key and adds the conflict check. The plan correctly states that spreading fields does not inherit future object-level checks. Both inverse results parse through their authoritative schema. The stable message `Marker color flag/value conflict` applies to the conflict filter; other formatter messages remain installed Schema behavior. High-level Schema failures and internal SchemaIssue failures stay distinct. Invalid synchronous paths must fail without defects, interruption, suspension or fallback success.

The JSON hook has a real consuming path. F `node_modules/effect/src/internal/schema/toCodec.ts:74-82` consults Declaration hooks; Objects at lines 96-99 and Union at lines 100-114 derive nested fields/branches. The color-presence flag is necessary because canonical color admits both null and undefined. The configuration Declaration restores an own undefined color and strips its wire flag. Optional outer value composition can use the installed undefined/null inverse at F `node_modules/effect/src/SchemaAST.ts:915-929`, because a live value null is rejected. The public String/configuration union remains a genuine union, with direct undefined excluded.

Equality also follows the same authority. F `node_modules/effect/src/internal/schema/toEquivalence.ts:15-25` derives parameter equivalences for the Declaration annotation; optional Struct own-key comparison is at lines 100-114. Detached equal objects can compare equal while color absence, own undefined and null remain unequal. The plan includes explicit tests rather than relying on reference equality. Ordinary Struct parsing constructs a new output object, as shown in F `node_modules/effect/src/SchemaAST.ts:2912` and its surrounding Objects parser. The planned repeated-output detachment controls are therefore meaningful against actual parsing. Schema-derived readonly fields concern TypeScript typing; the plan adds no unsupported runtime freezing guarantee.

Exactly four public names are approved. The canonical/wire schemas, helpers and fields remain private. The new configuration Declaration promises no fields or mapFields methods. Actual caller-owned Struct compositions retain their own genuine operations. They must be labelled caller compositions, as Plan 090 lines 147, 176 and 180 require, rather than being presented as an actual Flow Model or Runtime.

## Scope and existing acceptance review

The additive sequencing is sound. F `packages/core/src/domain/flow.schema.ts:100-102` defines the existing literal kind; markerStart/end at lines 125-126 use it. Default endpoints remain literal-kind fields at F `packages/core/src/domain/flow-default-edge-options.ts:20-21`. The accepted factory reuses the real edge fields at F `packages/core/src/domain/flow-data-contract.ts:47-57`. Preserving those old definitions keeps all three acceptance contracts unchanged.

Actual downstream functions prevent safe widening in this child. F Vanilla `apps/vanilla/src/edge-renderer.ts:131` takes FlowEdgeMarker and its endpoint loop at lines 503-515 forwards live values directly. Vue `packages/vue/src/flow-canvas.ts:406-410` and Foldkit `packages/foldkit/src/graph.ts:2773-2778` accept only the two literals. The new standalone schemas may accept arbitrary strings and configurations, while those real consumers still reject them through unchanged graph validation. Documentation and protected-contract tests explicitly expose that boundary. Casting those branches away is forbidden.

Locating the canonical authority beside the current kind in flow.schema.ts avoids the later runtime import cycle described in the plan. Existing flow-edge.schema.ts is wholly protected. All pre-existing definitions inside the owned flow.schema.ts are protected too, permitting only import additions and the standalone new block. The exact old-block comparison supplements the whole-file inventory, so an owned path is not blanket permission to change graph integrity, errors or old schema fields.

The hard allowlist names each source/test/public/docs/trace/config/record delta and prohibits all other accepted changes. Original reference evidence, member ledgers, defaults, factory, host/browser source, persistence, dependencies and policy remain byte-identical. The distinction between new trace/PROGRESS and immutable imported/generated research is explicit. The existing API generator selects actual old schemas at F `scripts/generate-api-reference.ts:112-118`; those remain unchanged, so retaining generated docs unchanged while adding the separate public-api documentation is coherent.

Plan 090 narrows the older architecture's broader possible foundation sequence to this explicitly additive contract. It does not grant the older widening/save/patch/native scope. The full continuation's field, presence, saved-format, revision, registry, native lifecycle and MiniMap policies remain follow-up requirements. No original 073 cell closes as a result of this foundation.

## Verification and handoff review

The core test matrix names actual decode/encode, own-key, JSON inverse, equality, numeric and string branches, malformed metadata, recursive caller Struct and protected graph/default/factory controls. Existing geometry assertions are retained. The test matrix includes typed-failure checks and current rejection controls, so a recreated validator or independently widened graph cannot satisfy it.

The compiler plan is appropriately split. F root tsconfig enables exactOptionalPropertyTypes and noUncheckedIndexedAccess; the three installed consumer tsconfigs retain strict mode and skipLibCheck=false but omit exactOptionalPropertyTypes. At least 18 meaningful consumed negative probes are required in each unchanged installed mode. Reserved-key own undefined compile rejection is separately required in the owned root test and is not falsely promised for the consumer modes. Runtime own-key rejection remains required in all modes. The positives prove schema-derived Type/Encoded assignability, never environments, public imports and old literal compatibility. Invalid compile-only assignments stay inside uncalled proof functions.

The packed runner already copies common factory fixtures and executes the real installed runtime at F `scripts/check-packed-consumer.ts:785-802`. Plan 090 adds precisely the two shared foundation files to that loop and executes the new runtime after the factory runtime. Existing installation, peer checks, compiler and browser steps at lines 799-817 remain intact. The fixtures import the actual public package and Effect. No workspace alias, direct source import or dist-only substitute can count as archive evidence.

The saved focused scope includes docs, contracts, api-members, traces and consumer, plus the unchanged baseline of quality, architecture, package builds, types and whole units. Additional browserTests are empty because this phase adds no graph rendering behavior; the consumer check still runs all three existing installed browser checks. Plan 090 explicitly records fullSuite=false and leaves full verification for integration. Every required command exists in the inspected package scripts. Shared browser/consumer/focused gates require the coordinator lease and strict ports. This design review used none of them.

Final source and evidence manifests, original copied receipts, complete deltas, failed diagnostics, gate hashes and a no-edit-after-freeze boundary are specified. Acceptance still requires the actual executor evidence and full source review, including the old-definition comparison and protected hashes. No source authorization follows solely from this document.

No correctness, scope, type-contract or test-handoff blocker was found. No revision is required at this design boundary.

## Conformity and deviations

Conforming design target is the approved nested Schema validation and checked JSON inverse, one canonical authority, genuine caller Struct composition, own-key equality and unchanged existing acceptance. The frozen parser/compiler receipts support representation feasibility only.

Intentional design decisions are the additive public configuration Declaration, separate canonical JSON color metadata, finite nonnegative marker numbers and foundation-first sequencing. Their new product implementation and installed declaration/runtime tests remain pending.

Unverified and unchanged are all original 101 marker/MiniMap members and 303 host cells, graph/default/native integration, actual widened Model/Runtime and ports, saved formats, patch/revision/client, registry/URL/computed SVG/MiniMap behavior, dependencies 068/074/069/086/058, focused source acceptance, full integration, CI, devices and collector delivery.

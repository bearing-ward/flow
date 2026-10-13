# Nested marker configuration Declaration preflight

2026-10-02. **Plans-only alternative, awaiting primary/cold architectural review.** No source/integration approval follows from these checks. Original whole-edge preflight probe, logs/results and manifest remain unchanged. Original manifest SHA `f4e2009c8c34c3cf830a33b00ef4857e19a1dd3cf167d65c3aa32d4259494916`; continuation design remains SHA `8f05f10bee7b1d926da68c82c429b87569ca7f21dc88f6df2cdd8dd16fe661e2`. No source, dependency, build, port/browser/Runtime, capture, commit, numbered plan or member ledger changed.

## Proposed choice after actual proof

**Recommend the nested configuration Declaration alternative over the whole-edge/defaults Declaration alternative.** Keep the existing public FlowEdgeSchema as a genuine Struct and existing FlowEdgeMarkerSchema/FlowEdgeMarker as the two-literal kind contract. One canonical internal configuration Struct owns the new object field types and validation. A typed validating configuration Declaration takes that Struct as its sole parameter, delegates unknown parsing and equivalence to it, and provides the synchronous checked JSON color-presence inverse. The marker value schema is String | that Declaration. The public Edge and defaults Structs retain their existing optional endpoint composition; derivation recursively reaches the nested hook. Existing whole documents, snapshots, pending approval payloads, query/edit/change schemas automatically reach that hook through the shared marker value, rather than needing whole-edge wrappers at every composite placement.

Direct standalone `Schema.toCodecJson(Edge)` and `Schema.toCodecJson(Defaults)` now preserve endpoint/color own-key distinctions. Outer undefined uses the installed null sentinel and restores own undefined, which is unambiguous because live endpoint null is rejected. Nested color undefined uses colorPresence rather than the ambiguous null sentinel; color null remains null. Explicit saved-v2/JSON-patch endpoint flags remain a **separate versioned product projection policy**, not a required override of every derived Model edge JSON object. This separates owned saved-format compatibility from Effect's derived canonical encoding without introducing another graph or Model serializer.

No proposed interface presents a Declaration as S.Struct. Canonical configuration `.fields`/`.mapFields` remains internal authority. If the reviewed new public contract exports `FlowEdgeMarkerConfigurationSchema`, expose the validated Declaration under that name, with type derived from it and ordinary Type/Encoded compatibility checked against the internal canonical Struct. The public marker value union uses the same Declaration. Do not additionally export the bare canonical configuration Struct as a promised lossless standalone JSON codec. These public export spellings/representation need primary/cold approval; no product exports were written.

## Does original 073 require a new public configuration Struct?

Personally inspected main `plans/archive/marker-minimap-design.md:71-79`, the complete group at `plans/057-member-closure.json:14619` and its 15 original EdgeMarker member names, and pinned `packages/system/src/types/edges.ts:92-113`. The upstream surface is a structural EdgeMarker type with required kind/template branch and optional color/geometry/units/orient/strokeWidth, plus String|EdgeMarker and MarkerType. It contains **no Effect Schema export or configuration Struct method requirement**. Manifest public targets for EdgeMarker are mountFlow/FlowCanvas/createProgram and the original field/renderer/member obligations; they do not demand a standalone public configuration Struct. Existing FlowEdgeMarkerSchema is a literal-kind schema in accepted A `packages/core/src/domain/flow.schema.ts:100-102` and exported at `packages/core/src/public.ts:18`.

The earlier proposed public-contract section names a new FlowEdgeMarkerConfigurationSchema (`marker-minimap-design.md:75`), but does not require that schema to expose Struct.fields/mapFields or prescribe its AST representation. Publishing the typed validating Declaration under that new name can preserve the named Schema/type field contract while avoiding a newly promised lossy Struct JSON codec. This is an explicit architecture choice for fresh review, not an inference that the earlier bounded matrix approved the new representation. Existing public Edge Struct capabilities and old kind schema compatibility remain mandatory.

**Bare canonical configuration Struct JSON remains lossy.** A dedicated diagnostic records own color undefined becoming null through direct toCodecJson(Config). The private validating Declaration itself round trips that value correctly, and nested Edge/defaults routes do too. This limitation is clearly disclosed; it is why the raw authority should remain internal if the new public configuration Schema promises JSON derivation. No scalar normalization or narrowing of original object/null/empty/full-CSS field semantics is proposed.

## Exact source/API and input boundary

Accepted source A: `/Users/richardmcandrews/.codex/worktrees/parity-origin-edit/flow`, detached baseline `841be137e253cf19c665269eaaa79edc19abf3c3` plus accepted 085 working changes. All 128 files of external final-freeze SHA `7b3b11860cdfa36bf297883259e9cd1dd87b2d1f25be59519fde7566b6f4cfef` rehash successfully. Installed versions remain Effect4.0.0-rc.116, Foldkit0.163.0, TypeScript5.9.3. No install/build was performed.

Read the actual installed dispatch and public APIs, unchanged from the first preflight: Effect `src/internal/schema/toCodec.ts:75-82` honors Declaration hooks; Objects:100-102 recursively derives its fields, and Union:104-118 recurses through its branches. `Schema.ts:498-524` declareConstructor uses actual schema parameters; `SchemaParser.ts:262-272` validates unknown with Issue-returning Effect. `Schema.ts:6386-6395` link and `SchemaTransformation.ts:437-445` supply checked inverse getters. The Declaration equivalence annotation delegates to the canonical parameter (`internal/schema/toEquivalence.ts:15-25`, optional Struct keys:100-114). Public Struct fields/mapFields are real operations (`Schema.ts:3298-3367`), not fabricated facade members. Default Undefined JSON null mapping is at `SchemaAST.ts:915-929`; actual unchanged legacy Model baseline separately verifies that endpoint sentinel behavior.

The new probe reuses actual accepted public/internal schema fields and imports the same actual modules as the first preflight. Public Edge/defaults candidate Structs include String|PrivateConfig; **zero whole-edge/defaults Declarations**. The full source-composed synthetic Model, animation, approval, reduced query, set/add edit, array add/replace and add/reconnect change candidate shapes reuse actual field definitions. They are parser/compiler constructs only, never installed into a program. Actual App.Model uses unchanged source and receives only valid legacy data; its four legacy cases remain a separate result group. Core package dist remains an existing read/hash input through Foldkit's workspace package imports. The known source reach and real registration/emit citations remain the first results record's inventory; this alternative changes the shared marker value, rather than introducing wrappers throughout that inventory.

## Commands, first receipts and final receipts

Commands from main using the existing compiler:

```sh
./node_modules/.bin/tsc --noEmit --strict --exactOptionalPropertyTypes --noUncheckedIndexedAccess --target ESNext --lib ESNext,DOM,DOM.Iterable --module ESNext --moduleResolution Bundler --allowImportingTsExtensions --skipLibCheck plans/marker-minimap-nested-config-probe.ts
bun run plans/marker-minimap-nested-config-probe.ts
```

The first attempt source SHA `28d7ba88915758ad896016e3eba61cf0205febf6bf8bc635de2b227e956cae87` passed compiler and runtime, both exit0. First runtime: 3,119 assertions/24 groups/16 negative type probes, no failures. It remains preserved in `marker-minimap-nested-config-runtime-first.json`; first logs and explicit exit logs are retained. No first failure was erased because this alternative had no failed attempt.

Final source SHA `e54e493d76f1d17a76709a47fa61da8af39cffffeab54b98753ef83071b4231c` adds explicit private-configuration Type/Encoded and never-environment assertions, retained canonical configuration Struct operations and the bare-Struct-versus-Declaration diagnostic. Compiler and runtime both exit0: **3,124 assertions, 25 groups, 16 negative type probes, no failures**. Actual hook counts: privateConfig JSON hook1; canonical configuration parser1,837; whole-edge/defaults Declaration wrappers0. Final logs are empty and exit logs contain0. All32 malformed decode/encode operations assert typed failures with no defects, interrupts or async-suspension substitutes. No any, cast, unchecked unknown type guard, AST mutation, custom Runtime serializer, replacement product Model or native function/DOM graph field was introduced.

Meaningful 16 negative type probes remain: endpoint null, missing/wrong marker kind, numeric color, null width/units/orient, live inner/outer wire metadata, wire edge as ordinary input, unchecked unknown as edge, declaration fields/mapFields/facade method claims, function marker and wrong flag discriminator. Private config decoded/encoded compatibility and never services now have explicit positive functions; direct Edge Struct fields/mapFields/annotate/check/rebuild and normal branded/encoded contracts also compile.

## Actual comparison and limits

| Property | Whole-edge/defaults alternative | Nested configuration alternative |
| --- | --- | --- |
| Canonical Edge Struct capabilities | retained, but composite items use Declaration | retained throughout Edge/document item routes |
| Standalone Edge canonical JSON | reproduced color collapse | passes all endpoint/color matrix cases |
| Defaults canonical JSON | requires private whole-defaults wrapper | genuine Struct recurses into same nested hook |
| Model/animation/approval/query/edit/change JSON | passes with explicit wrapper placements | passes using shared nested marker schema |
| Direct configuration Declaration JSON | not the earlier selected route | passes own undefined/null distinction |
| Bare canonical configuration Struct JSON | lossy | remains lossy; internal authority only proposed |
| Saved-v2/patch endpoint metadata | explicit flags | same separately checked policy, not canonical Model sentinel |
| Schema type/equivalence authority | canonical Struct delegated by whole wrapper | canonical config Struct delegated by nested wrapper; enclosing Struct normal equality |
| Product/mounted/Runtime/HMR proof | unavailable | unavailable |

The final output records actual canonical Edge JSON `markerStart:null` plus nested `colorPresence`, alongside a separate saved projection with markerEndpointPresence instead. Ordinary Schema encode/decode deliveries contain own undefined values and no metadata. Both symbols, absent/own undefined/null/empty/full-CSS color, empty/ref/literal/undefined endpoints, zero/units/orient fields, changed marker defaults, exact hasOwn/value comparison, source-composed complete Model document/defaults/animation/approval, reduced Query, edit/change schemas and user data keys remain covered. No computed SVG/color, registry lifecycle, device, semantic/reference parity, saved-envelope/client/revision or HMR claim follows.

The earlier necessity for broad whole-edge wrapper reach is superseded as a **proposal** by this narrower primitive-proven option. Existing modules already using shared FlowEdgeSchema/FlowDocumentSchema need no extra JSON wrapper merely to reach nested color preservation. A later numbered source packet still needs exact scope for widening/defaults, saved-v2/patch codecs, equality/revision, native registry, original tests and product integration. No scope permission is granted here. A standalone public configuration Struct guarantee would contradict the observed diagnostic; do not invent it. Existing frozen v1 and old literal kind schema stay separate.

## Conformity and deviations

**Conforming at the compile/primitive boundary:** actual nested-hook dispatch, genuine public Edge/defaults Struct operations, one canonical configuration field/validation authority, ordinary Type/Encoded/service compatibility, presence-aware equivalence and synchronous explicit failures. Standalone Edge/defaults and all prior synthetic composite color/endpoint tests now pass; the unchanged actual legacy Model baseline stays separate.

**Proposed representation awaiting primary/cold approval:** internal canonical configuration Struct with typed validating configuration Declaration as the public object schema/marker union route; canonical outer-undefined null sentinel versus separately flagged saved-v2/patch projection; impossible reserved live metadata keys. No new native registry/API was exercised.

**Unverified:** product source widening/placement, full actual widened Model/Runtime/HMR and ports, frozen/additive saved format/client/patch/revision behavior, native registry failures/ownership/rendered output, original 101-member/303-cell semantic closure, 068 color/074 full style/069 generic/058 UI/086 geometry dependencies, focused/full gates, CI/device/collector delivery. Stop on compatibility drift, incorrect new public Schema exposure, checks/equivalence lost, async services, metadata leak, source scope expansion or failed actual integration. No source implementation or B2 work starts after freezing this record.

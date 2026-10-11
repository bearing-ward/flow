# Typed change utilities compiler feasibility

Bounded design diagnostic, 2026-10-02. Main baseline is `841be137e253cf19c665269eaaa79edc19abf3c3`. Accepted087 source is `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/flow`, with external final-freeze SHA256 `2dee299d28a1b96442e3134cd4b46c380dd3dd2caeef9f28bcb46c7e96d90917`. This report authorizes no source change, Plan094 execution, integration or closure. All twelve original identities below remain OPEN.

## Result and remaining decisions

Recommendation B is compiler-feasible for ordinary caller-owned item records. An actual homomorphic key-remapping implementation compiles its full generic bodies under both unchanged compiler option sets. The naked conditional spelling in the previous report fails in the bodies, with TS2322. The working spelling gives the same distributed result for the tested Schema-derived unions and preserves their type/data correlation. No overload, declaration-only stub, cast, `any`, assertion predicate, non-null assertion, ignored diagnostic or `Object.assign` hides a body error.

That settles a source-shape question, not universal soundness. A whole-item class passes the structural generic bound while spreading removes its inherited method. The proposed mapped result still advertises that method. The actual accepted public helper and the genuine pinned helper exhibit the same runtime loss. Arbitrary class/non-enumerable item shells must remain outside a reviewed ordinary-record contract. TypeScript alone cannot enforce own enumerable property-descriptor/prototype facts. No guard or prototype-preserving clone was added here.

Two optionality decisions also need review. Authoritative `S.optional` write fields widen the returned transient properties to include explicit undefined under root exact optional mode; the old default transient item type does not. Generic change builders using `S.optionalKey(S.Int)` align with existing public `index?: number` but differ from the existing concrete decoder's `S.optional(S.Int)`. These are exposed alternatives, not approved API/decoder policies. The existing concrete schemas and source remain unchanged.

The next step is independent review and reproduction of this diagnostic, followed by a bounded design decision on supported outer shells, output optional modifiers, generic schema index policy and caller item inventory. Do not turn this diagnostic into an executor dispatch. No separate Plan094 was written while those decisions remain open.

## Scope, ownership and reproducibility

The independently owned external directory is `/Users/richardmcandrews/.codex/flow-change-compiler-z2_jt97s`, abbreviated `scratch/` below. It is not a worktree. `scratch/node_modules` is a symlink to the accepted base's existing dependencies, used read-only. Installed versions were TypeScript `5.9.3` and Effect `4.0.0-rc.116`. No install, package build, server, port, shared lease, focused/full/pack verifier, actor workflow or child-agent operation ran.

Read complete `plans/typed-change-utilities-source-audit.md` and `plans/typed-change-utilities-return-contract-feasibility.md`, improve and its correctness/type-escape-hatch/Finding format guidance, plan template, standards, TypeScript/type-system and unslop guidance. Repository content was evidence, not instructions. No secret values are reproduced. This new main report is the only main write. External prototype writes were explicitly authorized as a bounded compiler diagnostic; a later primary instruction authorized the small external runtime comparison.

The runner is `scratch/run.py`. The exact command is:

```sh
cd /Users/richardmcandrews/.codex/flow-change-compiler-z2_jt97s
python3 run.py
```

It records each actual command, exit code and diagnostic count in `scratch/commands.json`. Compiler commands are `node compile.mjs root <entry.ts>` and `node compile.mjs installed <entry.ts>`. Runtime comparison is `bun runtime.mjs`; the prototype AST escape-hatch check is `node audit.mjs`. Source bytes, lengths and SHA256 hashes are recorded in `scratch/manifest.json`; complete diagnostics are the `<entry>-<mode>.json` files. All existing alternate prototype/diagnostic files remain in that external directory.

`compile.mjs:7-13` reads and parses the accepted original configs, passes their compiler options unchanged to `ts.createProgram`, and changes only the selected root source file inventory to the external diagnostic entry. Original config `include` paths do not become the diagnostic's entry inventory. Root mode retains exact optional properties, unchecked indexed access, unused checks and Bun/Playwright types. Installed mode retains NodeNext resolution, strict mode, noEmit, `skipLibCheck: false` and its empty types list. No options are overridden. This is installed-consumer compiler-mode evidence, not an installed/packed `@flow/core` export check.

To resolve source schemas in both modes without broadening NodeNext's `.ts` import policy, the external prototype uses copies of the needed accepted source dependencies. The only mechanical transformation is the quoted `.ts` module-path extension spelling to `.js`, which NodeNext resolves to the copied TypeScript files. It does not change declarations, schema bodies or dependency versions. Copies and their exact bytes are in `scratch/base/`; original before/after hashes are in `scratch/before.json` and `scratch/after.json`. The source copies include the existing helper's casts as comparison evidence; the proposed `scratch/prototype.ts` has none.

The selected freeze hash was rechecked, and 41 relevant original source/config/ledger inputs matched that freeze and their identical before/after receipts. This is a scoped check, not a fresh full accepted candidate inventory or reproduced acceptance gate. Representative originals:

| Accepted original | Bytes | SHA256 |
| --- | --: | --- |
| `packages/core/src/domain/flow-change-compatibility.ts` | 13474 | `702dd93f4e479ec9bd6058b407b39f164ae1afcd88306ac2e4166e668130df5f` |
| `packages/core/src/domain/flow-data-contract.ts` | 1735 | `1cf9e6284e9e3bc6c1580a6e4d84e84e0dde44866a671b697f0d9a24ecb21f02` |
| `packages/core/src/domain/flow-data-contract.schema.ts` | 1782 | `68cf6be77dba34b213e2470df77be9e6ab3420ad1e4e7c4e9272af099d59d51a` |
| `packages/core/src/domain/flow.schema.ts` | 14210 | `b765bb46f60e0470f710907ab61ee9b5403dfff556b658d6bb2fa6e4537a547d` |
| `packages/core/src/public.ts` | 13707 | `3ebe97996606ee5056dfa5db6e104a704ec2d1121e9cfefdb8be0ab7fecb29a3` |
| `tsconfig.json` | 929 | `849600bdcf53e25503a4470b25464df15a228006b4b18ab794ec8fa418b17a63` |
| `tests/consumer/tsconfig.json` | 432 | `873c8b328e5dea2a1dc3fdc5bb717d27b3bd5a965b5cbfcb0984875b5e3639c6` |

The prior main source audit remains SHA256 `68d6b46a7b73d2d6f8068c9d7ea13af3dbb2b92a3d436731527954510c62e197`, and the return-contract report remains `c839a2cb7e229c402131465d87a231c71b7368322aef5f2a3b437524811a81d8`. The exact final external evidence hashes appear in the evidence table at the end of this report.

## Production path and proposed compiler path

Actual public exports are accepted `packages/core/src/public.ts:335-349,374-382`. Node calls enter `domain/flow-change-compatibility.ts:205-208`, edge calls enter `:265-268`, and both call `applyArrayChanges` at `:116-203`. Updates write node selected/position/dragging/measured/width/height/resizing at `:210-256`, edge selected at `:269-270`. No graph actor, schema decode, persistence, isolation, browser lifecycle, scheduler, DOM effect or rendered output belongs to this synchronous supplied-array path. It returns a partial collection, not an integrity-valid document.

The test-only compiler path is `scratch/fixtures.ts` or a negative entry, through `scratch/prototype.ts:82-86`, the cast-free helper at `:51-78` and update bodies at `:23-45`. It does not replace the actual public exports. Actual accepted source is called separately by the external JavaScript runtime entry. Its Date/class inputs are runtime probes through the existing JavaScript function; unchanged accepted public TypeScript bounds still reject those decoded generic payloads.

The write views at `scratch/prototype.ts:8-11` are Schema-derived. Node position/selected reuse `FlowNodeSchema.fields` at accepted `flow.schema.ts:67,76`; dragging/resizing/measured reuse existing change fields at `flow-change-compatibility.ts:13-14,27`; width/height use the same Number fields as the private `DimensionsSchema` at `:8`. The prototype repeats that tiny schema solely because the current original does not export it. A future approved in-module implementation can reuse the original private fields directly. There is no duplicate handwritten writable-field interface. Edge selected reuses `FlowEdgeSchema.fields.selected` at `flow.schema.ts:129`.

The input bounds reuse accepted087 `FlowNodeGeometry` and `FlowEdgeGeometry` at `flow-data-contract.schema.ts:11-17`. They place no JSON restriction on nested caller data. The former current node transient default is preserved as a two-way equivalent Schema-derived mapping at `scratch/prototype.ts:13`; `scratch/fixtures.ts:77-78` proves exact structural equivalence under both modes. `NodeChange`/`EdgeChange` defaults remain concrete FlowNode/FlowEdge, and apply's defaults remain the old transient node domain and concrete FlowEdge, at `scratch/prototype.ts:19-20,82-86`.

## B body proof and failed conditional spelling

The working result mapping is `scratch/prototype.ts:15-18`:

```ts
type NodeRest<N> = {
  [K in keyof N as K extends keyof NodeWrites ? never : K]: N[K]
}
type NodeResult<N> = NodeRest<N> & NodeWrites
```

The edge mapping removes only selected. This homomorphic key mapping retains union branches. `scratch/fixtures.ts:62-63` proves both directions of assignability to the original distributed `Omit` formula for the tested factory unions; `:37-38,64-67` proves branch narrowing, including the false/true-selected union. Wrong pair assignments separately fail, so branch correlation is not inferred from empty-array assignability alone. This is not `N & NodeWrites`.

The separate naked-conditional spelling remains in `scratch/naive-conditional.ts:2-5`. Both compiler modes report TS2322 at lines 4 and 5:

- `Type 'N' is not assignable to type 'DistributedNodeResult<N>'.`
- `Type 'E' is not assignable to type 'DistributedEdgeResult<E>'.`

An overload claiming the conditional return would conceal these body errors. Use the tested homomorphic shape if review chooses B; do not force the conditional through a cast.

The real shared body uses distinct `Output` and `Input extends Output` parameters at `scratch/prototype.ts:51`. Unchanged items are pushed directly at `:63`. Changed state is explicitly Output at `:67`; add/replace copies are Output at `:66,74`. Public calls explicitly instantiate `<NodeResult<N>, N, NodeLiveChange>` and the edge equivalent, at `:83,86`; these calls compile, so the N-to-output relation is checked in the body. The update callback receives the projected output, never hidden narrow N. It returns typed spreads with authoritative field values at `:25-39,45`, replacing unchecked `Object.assign` writes.

The helper's real change union separates add/remove/replace from select/position/dimensions at `:46-50`. Additions get an actual Add queue. The per-ID queue is a nonempty tuple at `:52,56-58`, removing the old first-element assertion without inventing an empty-sequence guard. Remove/replace overwrite the queued sequence; ordinary changes append. The first terminal change controls application, and additions retain native `splice`/push behavior and original addition order. This removes only the three collection assertions and the update escape hatch. Unrelated guards, `addEdge`, connections, actors and schema validation remain outside the proposed scope.

## Actual compiler diagnostics

Final runner completed 18 compiler invocations. Every positive exit was 0 with an empty diagnostics array; every negative exit was 1 with the listed real diagnostic count. No diagnostics were suppressed.

| External entry | Root count | Installed strict count | Proven boundary |
| --- | --: | --: | --- |
| `prototype.ts` | 0 | 0 | Actual generic collection, projection and update bodies |
| `fixtures.ts` | 0 | 0 | Schema-derived union payloads, no-data arm, readonly inputs/mutable returns, literal geometry widening, default domains, one serviceful schema union |
| `inference-positive.ts` | 0 | 0 | Inventory-typed existing arrays plus added/replaced branches |
| `naive-conditional.ts` | 2 | 2 | Naked conditional body failure, TS2322 at 4-5 |
| `negatives.ts` | 25 | 24 | Twenty-four common negative obligations; one root-only old transient return incompatibility |
| `inference-negative.ts` | 2 | 2 | Heterogeneous single-variant arrays/additions need a union inventory |
| `shell-counterexample.ts` | 0 | 0 | Structural bound accepts a method-bearing class and a standalone unregistered type/data shape |
| `optional-index.ts` | 1 | 0 | Existing `index?: number` rejects explicit undefined only in root exact optional mode |
| `schema-optional-index.ts` | 1 | 0 | Existing S.optional(Int) decoded Type cannot assign to public add alias in root mode |

Common negatives in `scratch/negatives.ts` are all observed in both modes:

| Lines | Obligation | Diagnostic |
| --- | --- | --- |
| 4-7 | Node/edge add/replace wrong type/data pairs | TS2322 |
| 8-9 | Encoded Date string substituted into decoded result | TS2322, string not assignable to Date |
| 10 | Private Counter replaced by structural lookalike | TS2741, missing `#value` |
| 11-12 | Widened node/false-selected edge result assigned back to narrow input | TS2322 |
| 13 | Written ordinary coordinate falsely retains geometry brand | TS2322 |
| 14 | Written measured object falsely retains extra required field | TS2339 |
| 15-17 | Written width/dragging/resizing falsely retain literals | TS2322 |
| 18-19 | Explicit inventory application with wrong payload pair | TS2322 |
| 20-21 | No-data arm receives dated data; narrow add item gets wrong branded width | TS2322 |
| 23,25 | Wrong pair through inferred application with a typed union inventory | TS2322 |
| 28-31 | Node selected, width brand, height literal and position Y literal independently widen | TS2322 |

The root-only negative at `scratch/negatives.ts:27` is different. It applies B to the preserved ordinary default item type and tries to return the old exact transient item array. TS2322 records optional undefined in the projected transient fields. Installed strict mode accepts this assignment because its optional-property assignability is different. Broad FlowNode and accepted factory arrays compile at `scratch/fixtures.ts:35-36,74-75` in both modes. Do not describe B as preserving exact assignability to every former default transient annotation.

Readonly arrays and mutable `push`/`splice` compile at `scratch/fixtures.ts:39-40`. Typed empty/add-only and inferred add/replace-only empty calls compile at `:41-44`. Completely untyped `([], [])` yields `never[]` at `:45-46`; callers needing later additions need an item inventory. Existing arrays typed to a union allow those union's additions/replacements in `scratch/inference-positive.ts:3-10`. Mixing a dated-only array with a counted add item, or timed-only array with weighted add, is rejected at `scratch/inference-negative.ts:11-12`. The prototype deliberately does not synthesize a new arbitrary union inventory from incompatible singleton inputs.

A generic bound cannot know an application's type/data registry by itself. `scratch/shell-counterexample.ts:16` with an empty array and an unregistered counted/dated-data combination compiles by inferring that standalone item's shape. Wrong-pair rejection requires an explicit schema-derived inventory or a typed input array, as the negative probes demonstrate. Do not market free inference as inventing schema correlation.

## Explicit schema composition and optionality

The isolated builders at `scratch/prototype.ts:89-90` infer their Struct/Union result from the exact supplied codec. They call neither `S.toType` nor an encoder/decoder. `scratch/fixtures.ts:48-56,70-73` proves add-item Type and Encoded and both service sides for the specific dated/counted/no-data union. The Date encoded side is string; the decoded side is Date. The text transform requires exactly `diagnostic/decode` and `diagnostic/encode` on the respective sides, proven in both directions rather than an `extends` check that would accept never. This proves that concrete serviceful composition, not every possible `S.Constraint`/refinement/environment.

Those builder bodies currently use `S.optionalKey(S.Int)` for index. Existing original concrete node/edge add schemas at accepted `flow-change-compatibility.ts:46,83` use `S.optional(S.Int)`, admitting explicit undefined in the schema Type. Existing public generic aliases at `:65,100` use `index?: number`, which excludes explicit undefined in root mode. `scratch/schema-optional-index.ts:3-6` reproduces the incompatibility. Installed strict mode's acceptance does not fix the root discrepancy.

The Int versus public number domain is separately unchanged. Pure apply accepts the typed number domain and uses native splice; explicit decoder retains Int. Prototype runtime tests include fractional, negative, oversized, NaN and Infinity indices only through pure apply. No generic schema decoding parity for those indices was claimed.

Smallest safe design alternatives are to review an explicit absent-only generic index policy while leaving existing concrete decoders unchanged, or to defer new schema builders and approve only the already typed pure-helper shape first. If review instead changes the public alias's explicit-undefined domain or output transient modifiers, that is a separately recorded API decision requiring new compiler fixtures. Do not silently substitute `S.optionalKey` into existing concrete schemas or widen their decoder to Number.

## Runtime comparison and outer-shell counterexample

`scratch/runtime.mjs:2` imports accepted original `packages/core/src/public.ts` directly. `:3` imports the proposed external body. `:4` imports the unchanged pinned source at accepted `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/utils/changes.ts`. That genuine source file is SHA256 `1ffafc9000f4ba67a4b487527126b076a30b68b3226c9e3fd05a031568b2c5fb`, 9499 bytes, matching the frozen manifest. Bun executes those actual imported functions with type-only imports removed. It does not replace them with an oracle reducer.

This is direct immutable-source execution in the external diagnostic, not a verified build of the full pinned checkout, reference package artifact, packed Flow package, browser harness, or repeated independent capture. An approved implementation plan must still require independently owned full-pin provenance/build and actual built-function/repeated captures where the existing utility reference policy requires them. No build, archive capture or shared reference project was run here.

Runtime exit 0 compares 135 node cases and 30 edge cases across all three functions. Cases include all three-operation selections/position/dimension/remove/replace permutations from the selected operation inventory, duplicate IDs, ID-changing replacement, additions after terminal operations, original insertion order and native index behavior. These are bounded generated cases, not every possible utility input. Comparisons use the actual functions' value outputs; dedicated identity observations separately avoid a JSON-only alias claim.

All three prove unchanged outer identity, changed/add/replace outer copies, exact nested data/Date/private Counter identity and caller mutation aliases. Node and edge changed class shells lose prototypes and inherited methods; non-enumerable own methods disappear too. Copied outputs have Object.prototype, while unchanged items retain the original caller object. Nested Counter methods keep working because the nested object remains the exact caller reference. Declared codec decode/encode/isolation counters remain zero. The capability functions are deliberately not called or supplied as a hidden apply policy; output identity and source tracing establish the shallow boundary, not actor isolation or a codec invocation promise for unrelated workflows.

The static counterexample is `scratch/shell-counterexample.ts:3-14`. Its whole-item class, including a private field and inherited read method, compiles through B and exposes `output[0]?.read` without error in both modes. The runtime observed method is undefined after a change. That is a concrete disproof of universally sound Omit preservation over arbitrary shell objects, even when the implementation contains no casts.

A reviewed ordinary-record domain should mean a plain caller-owned outer record whose required fields are own enumerable data properties. Nested Date/private-class payloads are supported by identity. Whole-item classes, non-enumerable required fields and prototype/accessor-dependent invariants require a separate contract decision. A schema-derived ordinary Struct builder is evidence for that intended domain; a broader arbitrary graph codec is not proof of it. No static geometry predicate, mapped Omit or normal shallow spread can establish all such runtime descriptors.

## Original identity mapping and next design boundary

The exact mapping is retained from main `plans/typed-change-utilities-source-audit.md:76-87`. Each page is under `https://reactflow.dev/api-reference/`. All twelve remain OPEN; no ledger fields, prerequisites or original host targets were changed.

| Page suffix | Owner | Exact original identity |
| --- | --- | --- |
| `types/node-change` | 069 | `NodeChange#1.<union:5>.<type:NodeAddChange>.item.<type:NodeType>` |
| `types/node-change` | 069 | `NodeChange#1.<union:6>.<type:NodeReplaceChange>.item.<type:NodeType>` |
| `types/node-change` | 069 | `NodeChange#1.NodeType` |
| `types/edge-change` | 069 | `EdgeChange#1.<union:3>.<type:EdgeAddChange>.item.<type:EdgeType>` |
| `types/edge-change` | 069 | `EdgeChange#1.<union:4>.<type:EdgeReplaceChange>.item.<type:EdgeType>` |
| `types/edge-change` | 069 | `EdgeChange#1.EdgeType` |
| `utils/apply-node-changes` | 072 | `applyNodeChanges` |
| `utils/apply-node-changes` | 072 | `changes` |
| `utils/apply-node-changes` | 072 | `nodes` |
| `utils/apply-edge-changes` | 072 | `applyEdgeChanges` |
| `utils/apply-edge-changes` | 072 | `changes` |
| `utils/apply-edge-changes` | 072 | `edges` |

069 generic groups retain original public-state targets. 072's singleton utility groups require069 and retain the original mounted host entry/test obligations. Pure external diagnostics cannot close those host cells. Any future pure-helper child must first receive reviewed target/obligation changes for these exact identities. The complete node/edge variant matrix and separately catalogued fields are still broader than this mapping.

A bounded future design can use the working Input/Output and homomorphic result shape, retain supplied-array synchronous ownership, and reuse existing schema fields in the same module. Before execution, independently reproduce these diagnostics, review shell/optional/index decisions, specify typed inventory inference guidance, and assign real public export, installed declaration, runtime/reference provenance and repeated-capture obligations. Keep actor isolation, mounted selectors/renderers/events, checkpoint encoding, persistence, Foldkit Model placement, arbitrary whole-item classes and arbitrary caller-schema refinements outside that pure-helper child. Hidden positive-number/dependent schema constraints still require explicit caller validation of decoded output if the caller needs schema validity. Pure apply must not introduce that validation as an implicit effect or failure channel.

No `bun run verify` profile or focused/full/pack gate passed in this diagnostic. These commands were deliberately out of scope. Once an independently reviewed implementation is authorized, update the focused active scope and run the required public/unit/consumer/reference checks plus `bun run verify`; full acceptance and integration require their separate gates. Do not reinterpret this diagnostic as such acceptance.

## Exact external evidence

Final `scratch/manifest.json` SHA256 is `cb1a2d8cea6edfc397acd3131264e180c31368584b46819722fce998b21ac4e6`. The identical 41-input before/after receipt hash is listed below. Other diagnostic JSONs, copied sources and preserved alternatives are enumerated with bytes/hashes by the manifest.

| External evidence file | Bytes | SHA256 |
| --- | --: | --- |
| `scratch/prototype.ts` | 6815 | `4b0082911539bfd05b54f2e38e828754ed5d36bc8fe9ca3e675dc0c61c1b6a69` |
| `scratch/fixtures.ts` | 10093 | `13b385fb7e2c6f5810b1a300d07102b4e4cd9269755a8cc9f00fd9b74c149097` |
| `scratch/negatives.ts` | 2764 | `cc6886d9f2b2a7b8e2737b5017f577d931f8e3123a1194f75ffe134e1deecde7` |
| `scratch/naive-conditional.ts` | 459 | `1e2381c5e40cf64ab1636a4acfdf5a450ad19f7965ff4441f47db8bc3df2cab2` |
| `scratch/shell-counterexample.ts` | 623 | `dc8667e4aeabb089f47afb25eda503ba53cbb1df34a10b46fc21f0a8697d767e` |
| `scratch/compile.mjs` | 967 | `fa32008c69784683b2b0974dcae32942381b4087732114535004797f734a9de3` |
| `scratch/run.py` | 3545 | `d621e8ecc04cf28b2bde7b52507be55edf2b09d05a99f4ee1d063e9faa1c50a6` |
| `scratch/commands.json` | 4984 | `e687782e544275e439f23e1ca5bd097e013ce591b7a09ef0eaf1f7b20db5c1ee` |
| `scratch/runtime.mjs` | 6811 | `8c09e49b34f9f90111126dffbacb50135cad45d574831dede65a11d9ccb793bb` |
| `scratch/runtime.json` | 2033 | `341ea4991cdf2995527df60392d706422a1dc35fa3c816804a3c7ae75e0d84fe` |
| `scratch/before.json` | 6512 | `382541405800a2a4a1d7de6d8b7944cbb838eea0187002ae016ae5c34257fa2e` |
| `scratch/after.json` | 6512 | `382541405800a2a4a1d7de6d8b7944cbb838eea0187002ae016ae5c34257fa2e` |
| `scratch/audit.json` | 48 | `8ce1a482db70288718e3326dbe658b0c52f083da7c58911c99295041107ff157` |

## Conformity and deviations

Conforming within the bounded direct-source runtime test: selected supplied-array ordering and terminal precedence, native splice insertion behavior, shallow outer copies, unchanged identity, exact nested Date/private-class/data references and caller mutation aliases. Evidence is the actual accepted087 public source, genuine immutable pinned source and external proposed body, with 135 node/30 edge case comparisons and explicit identity observations. It is not built-reference or mounted-host acceptance.

Intentionally different proposed declaration B: written geometry widens honestly, retaining Schema-derived type/data correlation and unrelated metadata brands. Readonly inputs/mutable output arrays and Flow's concrete branded/label/JSON defaults remain native contract differences. The tested root exact-optional return weakening and proposed absent-only generic index builder policy are exposed review decisions, not approved changes. Conditional-type syntax differs from the previous sketch because real body diagnostics require the tested homomorphic mapping.

Unverified or outside the proposed supported domain: arbitrary prototype/non-enumerable/accessor item shells, full caller Schema validity, every serviceful Constraint/environment, actual new public/packed exports, independently built pinned artifacts/repeated captures, original member-specific mounted host cells, all twelve closure identities, actors/persistence/UI/DOM delivery, full suite, CI/devices and collector delivery. Whole-item class preservation is specifically disproved. No source approval, Plan094 dispatch or acceptance transition follows from this report.

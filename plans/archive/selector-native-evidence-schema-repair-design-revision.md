# 095 flat native evidence schema repair design revision

2026-10-02. Planned against main and candidate HEAD `841be137e253cf19c665269eaaa79edc19abf3c3`. P1, M effort, MED implementation risk. **DESIGN PREPARATION ONLY.** Same095 remains STOPPED. Formal SOURCE rounds consumed: zero. All 513 parent cells remain OPEN. The current shared verification lease belongs to 092; the prior 091 lease has ended.

Replace the failed recursive evidence schema with a finite Schema-derived postorder node table. This changes only the native test attachment representation and the expected values in newly introduced transport/receipt assertions. Complete payload, own presence, holes, signs, ordering, synchronous detachment, callback owner/generation/index, native lifecycle phases, public APIs, original tests, provenance and cleanup-before-promotion remain binding. Production/public/reference plain JSON contracts do not change. Root explicitly relaxed the prior plan's recursive-wire constraint because it was an evidence-only plan choice, not a human requirement or accepted public contract. This revision requires primary and cold design review followed by a separate same095 LOCAL resume; it supplies no execution release.

The prior design, cold review and failed external feasibility probe remain immutable. This advisor performed read-only source/declaration/evidence inspection and wrote this main `plans/` document. No candidate source, compiler, build, quality gate, browser, server, install, archive, port, pin or child operation was performed for this revision. One preparation deviation was reported directly to root: a temporary plan-editing script was inadvertently created at `/tmp/selector-flat-design-editor.py`, outside the main-plans-only write scope. It contains plan text, not candidate repairs or secrets. It will not be reused; outside-scope cleanup is left to root. This does not authorize any executor path expansion.

## Frozen inputs and drift boundary

Use these absolute paths throughout:

- Main: `/Volumes/Sync/codex/9-19-26/flow`.
- Candidate W: `/Users/richardmcandrews/.codex/worktrees/095-native-selector-lifecycles/flow`.
- Existing evidence E: `/Users/richardmcandrews/.codex/worktrees/095-native-selector-lifecycles/selector095-evidence`.
- STOP source copy: `E/recording-amendment-stop/source`.
- Earlier complete pre-amendment preservation: `/Users/richardmcandrews/.codex/worktrees/095-native-selector-lifecycles/selector095-pre-recording-amendment`.

The exact current governing STOP is `E/recording-amendment-stop-freeze.json`, SHA256 `6519afde3d2cc37b5c1a132fa01bc407a899e6336e3e9111f9e7e6e42b82a9e7`. The earlier immutable proof freeze is `E/proof-source-freeze.json`, SHA256 `1fbde98287156c15a1ffe7fc4e5dda1f1632f5b98b48c8620c84143959dbb4ef`. Retain both, all old STOPs, raw logs, source copies and all failed input evidence byte-identically.

Main's exact manifests are `plans/selector-recording-stop-source-manifest.json`, SHA256 `27983ef6d870147c82b50741f913e01d298279ea0d74487cab7a97faa0f729f4`,1516 entries, and `plans/selector-recording-stop-evidence-manifest.json`, SHA256 `4e684505cbaab9f1a4e4712cac609ebce967b0fc9e31ec94f9c67daae1c2fe71`,11086 entries. `plans/selector-recording-stop-primary-integrity.json`, SHA256 `1f85a0acb5500db2b984f620283183971cc3dc0a8c029e248d2bb1f799c95821`, records root's independent zero-mismatch rehash of all1516current,1516copy and11086E files. That receipt proves integrity only. This advisor personally re-read the exact STOP identity, the schema in full, all ten amendment deltas, the native type and quality logs, transport tests, promotion source, current contracts and installed RC declarations. The earlier independent integrity receipt is not a new source or runtime acceptance claim.

The following approved packet identities remain required inputs. Full source corrections must retain their obligations except that this revision explicitly supersedes their recursive native attachment shape and the corresponding NEW expected envelopes. It preserves every other obligation. The reference schemas at fixture-schema.ts:1-61 remain unchanged.

| Main `plans/` file | SHA256 |
| --- | --- |
| selector-proof-payload-and-promotion-proposal.md | `5168c3461bfc7efe53180f1ff267df72a763a371cb6db390edeb7926b483ddc5` |
| selector-proof-payload-and-promotion-revision.md | `bb3b20222d3d70dde1d0a306737d543190a20e2d37e9110e8b1ce11abd7c2799` |
| selector-proof-foldkit-handle-path-amendment.md | `fc51f43eab545cab76c85d1c9abbfc03baf8c261c4fc3f2dea905fe4dfed28d6` |
| selector-proof-recording-number-amendment.md | `2037b92b055d7958e0f26f666ef05b9afc63c3b8822b9a39e4eb443b6da83c65` |
| selector-proof-payload-and-promotion-primary-approval.md | `19d2d5c97d13662094039209b4154db4d32b297c3e4b93d423c92e94105e31c6` |
| selector-proof-recording-number-primary-approval.md | `25ae00adf0da6782a62f56d8d904ed3ffe5d7849f7524247edb9bd91ca7ca3d7` |
| selector-proof-foldkit-handle-path-independent-review.md | `a21be91395329ba33fc7a721fad110e9d0e64020f3cf60752f69995bd58950d3` |
| selector-proof-recording-number-independent-review.md | `5078e2b1e41eb7fdcf779fb4b62fbec0e13bb7e4c455adf342ff6c363420f2ce` |

The existing original095 plan and approved lifecycle resumption/contextual-toolbar packet continue to govern ownership, original body retention, genuine reference/installed/native proofs and eventual review. This successor authorizes no change to their broader production scope.

## Failed design and prototype: retained facts, not retries

The previous main design `plans/archive/selector-native-evidence-schema-repair-design.md`, SHA256 `53ac78f02defd85c127edca727206b5936bfed7052eac15fb9136aee06e4d8e6`, and full cold review `plans/archive/selector-native-evidence-schema-repair-independent-design-review.md`, SHA256 `152597f7510aeaf707fa25b7093293ff8df4433756a978e6aac8c8222e8f5017`, remain historical inputs. The review correctly identified a circular inferred factory return/base dependency despite acyclic runtime imports.

Root separately authorized exactly one external prototype under `E/type-feasibility`; same095 compiled it with W's actual TypeScript 5.9.3, inherited compiler options and Effect RC116. Its actual exit was 2: TS2456 for the derived NativeEvidenceValue alias; TS7023, TS2577 and TS2506 for both factories/class bases; secondary TS2322 for the resulting any-service Codec. This is observed failure, not a conjecture. No candidate native source gate was run by that prototype and no retry is authorized here.

| Immutable prototype artifact | SHA256 |
| --- | --- |
| E/type-feasibility/compiler-first.stdout.log | `46fbd316a0a76a026239ab6a12a73cf7ced606097467917a1cf6f000f912e969` |
| E/type-feasibility/compiler-first.result.json | `b500227bee4fe1ba3cc8515b8c7ff77389818be6353de4cc15427ef056911f13` |
| E/type-feasibility/feasibility-freeze.json | `ea6ad951e679f59b46cce48327a4c3a484db1d8d14b261b540cfa084cdabd746` |

The complete prototype freeze covers 18 external files and the node_modules symlink target. Root's before/after rehash found zero differences in all 1516 current/copy, 11086 old evidence and 14 protected inputs. Retain the additional prototype corpus independently of the older 11086-file manifest. This revision does not rewrite either corpus, pretend the failed probe passed, or introduce a second Class feasibility attempt.

## Findings confirmed against actual source

All relative source locations in this document identify W's frozen source unless expressly called main or installed dependency. Line numbers describe the STOP source, not a future edited file.

| Finding | Impact | Effort / risk / confidence | Evidence |
| --- | --- | --- | --- |
| Introduced broad recorder inputs and primitive probing violate the installed rules | Current quality gate exits1; a formatter cannot repair the contract | M / MED, recording can erase distinctions / HIGH | `research/harnesses/selector-lifecycle/fixture-schema.ts:92,101,104,131,152,156`; `apps/foldkit/e2e/test-harness.ts:370`; exact raw quality log |
| Introduced recursive declarations violate class and forward-reference rules | Two classes in one file and local forward value references block quality | S / MED, lazy schema initialization / HIGH | `fixture-schema.ts:74-90`, two `S.Class` declarations and `suspend` references |
| Introduced unsupported object handling silently records empty objects | `Date`, `Map`, `Set` and ordinary class instances can become `{tag:'object',entries:[]}` and falsely look like supported evidence | S / MED, reject only at evidence boundary / HIGH | `fixture-schema.ts:110-125` checks object/symbols but no prototype or callable exclusion |
| Introduced Vue fixture expressions fail actual native tsc | Target string is not branded `NodeId`; optional hook argument is indexed before excluding undefined | S / LOW / HIGH | `apps/vue/src/test-harness.ts:714,1577`; `E/recording-complete-first-types.log` |
| Introduced formatting and mechanical quality issues obscure required sequential behavior | Blindly applying suggested parallelization would change query/frame/lifecycle order | S / MED / HIGH | All ten files in raw quality log; Foldkit handle frame/setup/query loops `handle-connections.e2e.ts:334-438` |

`docs/standards.md:9-12` requires Schema contracts and decoding once at external boundaries; `docs/standards.md:15-17` separates evidence, required verification and intentional differences. Main and W pin `effect` and platform packages to `4.0.0-rc.116` in `package.json`. Do not update them or the lockfile.

Current encoder excerpts, retained here to make the drift check concrete:

```ts
// W/research/harnesses/selector-lifecycle/fixture-schema.ts:92
const dataProperty = (value: object, key: string): unknown => {
  const descriptor = Object.getOwnPropertyDescriptor(value, key)
  // rejects missing/accessor descriptor; returns descriptor.value as unknown
}
// :101, :131
const encodeNativeValue = (
  value: unknown,
  ancestors: Set<object>
): NativeEvidenceValue => {
  /* typeof branches */
}
export const encodeNativeEvidenceValue = (
  value: unknown
): typeof NativeEvidenceValueSchema.Type => encodeNativeValue(value, new Set())
```

The actual descriptor helper does not call property getters. Preserve that property. Fixing the broad contract by decoding `S.Record` or `S.Array` directly from caller data would lose holes or evaluate accessors and is forbidden.

## Exact successor source scope

Only these ten existing paths from `STOP.deltaFromImmutableProofFreeze` may change. No additional source file is permitted. Existing original095 source outside this list stays exactly at its STOP bytes for this successor.

| Path | STOP SHA256 | Permitted correction |
| --- | --- | --- |
| apps/foldkit/e2e/handle-connections.e2e.ts | `a8f946d49d01acdb684239b2b11eb5860f9cd48490142e109d935a21c83a8089` | New full-edge proof quality, sequential frame/query/setup mechanics and source decode calls |
| apps/foldkit/e2e/public-state.e2e.ts | `274c711a925ca5a9f5ffbac3460b591a3daddfd29541acedd88b92447266ab13` | Additive receipt/assertion/attachment quality and decode calls |
| apps/foldkit/e2e/test-harness.ts | `827ef09b9eacbed246acf2fbdd6847bdb659d7de3d9519662b08e383ac2d5010` | New recorder callers derive native payload types and decode at delivery/checkpoint boundaries |
| apps/vanilla/e2e/handle-connections.e2e.ts | `2a6db4eb18e3f028f5249bb82ac17a87c6b0765e62ea158ce152662106108a88` | New recording/import/attachment quality and decode calls |
| apps/vanilla/e2e/public-state.e2e.ts | `75bf3e5c00b1ecdd480625fa981d07ceef7f0d3acf387ff5a1ed25862d4011c6` | New recording/import/attachment quality and decode calls |
| apps/vue/e2e/public-state.e2e.ts | `cbfba585e342a4e97ede17727204a89cdc4e3f5864cd6b7911a73578fb96aa5a` | New full-receipt assertion/attachment quality and decode calls |
| apps/vue/src/test-harness.ts | `8ebfb42ea08952d9641c9865861a4f2f1054bb3478602fefafce96654791ce81` | Two exact type corrections and new recorder/checkpoint boundary decode |
| packages/conformance/src/selector-lifecycle-reference.test.ts | `91bfaf6c6c5576faba1a88a61d5975d976570b435d35f4104a6ff4e75b911005` | Independent transport controls and mechanical quality; genuine fixture case unchanged |
| research/harnesses/selector-lifecycle/fixture-schema.ts | `d16ffe9c3661bb4f4758fc3829d5293dc22a28ce82e8fe64800bd785a0622dd1` | Authoritative source domain, typed postorder descriptor traversal, finite flat schemas and unchanged receipt/recorder metadata |
| scripts/capture-selector-lifecycle-reference.ts | `3bdca2f8e12fd1698100e2893be805403bd7cc495f6e6a6b1cd5d555b5174d63` | Formatting of amendment only; preserve the actual five-file owned capture closure |

The previously proposed `native-evidence-array.schema.ts` and `native-evidence-object.schema.ts` are absent in W and must remain absent. Remove the two introduced Schema classes from fixture-schema and replace their evidence-only exports with the finite schemas below. Inspection found no external constructor caller; all real callers use the aggregate encoder/schema. Search again before implementation: any unexpected constructor dependency requires review rather than a compatibility shim. No new helper module, package export or import cycle is needed.

Protected scope includes all production files, `packages/core`, reusable Vue/Foldkit implementations, Vanilla host implementations, Model, persistence, snapshot client and its tests, installed consumers/archive runner, package/compiler/lint/formatter/verification config, lockfile, docs, traces, ledger, catalog, imported `research/artifacts`, React TSX harness, pins, ports and fixtures. Do not write `research/fixtures/selector-lifecycle-reference.json` during this LOCAL successor. `verification.config.json` and the original future focused scope remain untouched until the shared phase is explicitly released. Main index belongs to the coordinator.

All fourteen `STOP.protectedMatched` paths remain hash-identical, including seven versioned-persistence fixtures/tests/helper, `bun.lock`, `package.json`, both snapshot-client files, `plans/057-member-closure.json`, `research/catalogs/api-members.json`, and `research/traces/complete-versioned-persistence.md`. All other paths outside the ten-file successor allowlist are protected by the complete1516source manifest, not only this highlighted list.

Preserve original historical test bodies, native fixture inputs, shortened histories, assertion order, gesture coordinates, polling/readiness, installed bodies and production bytes. Formatting may alter trivia only in original bodies. New amendment bodies may be corrected as specified, with exact before/after diff evidence. Do not delete an inconvenient assertion, downgrade full-value checks, change the original genuine test to skip/todo, or add a fake fixture.

## Authoritative source domain and descriptor traversal

Define the source contract in the existing `fixture-schema.ts`, before any encoder helpers that use it. It is deliberately shallow at each container: it validates its prototype and own descriptor metadata while preserving the exact source reference. Child values cross their descriptor boundary and decode recursively. No raw payload is read via `value[key]`, spread, `Object.values`, raw JSON serialization, or a raw `S.Record`/`S.Array` parser.

RC116 facts personally inspected:

- Installed `node_modules/effect/src/Schema.ts:3102-3110` defines `ObjectKeyword` as `object` and explicitly accepts functions. A prototype-only check is insufficient: a callable can have its prototype set to null.
- `SchemaAST.ts:1250-1251` uses `Predicate.isObjectKeyword`; `SchemaAST.ts:4689-4696` returns `InternalParser.sameExit` after the refinement. Thus this base does not enumerate or clone caller properties.
- `Schema.ts:6455-6459` declares `makeFilter` with a contextually typed input and `FilterOutput`; `.check` does not change the source Type. Use `S.ObjectKeyword.check(S.makeFilter(...))` so the filter callback has its actual schema-owned inferred input, not an explicit unknown/object parameter.
- `Predicate.ts:927-928` exports the official `Predicate.isFunction` guard. Call it in this input filter to reject callable values before prototype checks. Do not implement a local `typeof` replacement or a pretend generic contract.
- `Schema.ts:1811-1814` returns a decoder `(input: unknown) => S['Type']`; `SchemaParser.ts:138-139` returns a real schema type guard. Use these library boundary functions directly, and use `S.is(S.Boolean)`, `S.is(S.String)` and `S.is(S.Finite)` to narrow already decoded scalar variants.
- Local anti-slop `no-object-parameters.ts` resolves explicit broad object aliases; `no-unknown-returns.ts` resolves unknown return aliases; `no-unknown-type-aliases.ts` rejects aliases that conceal unknown. A real source Schema-derived type is justified by runtime prototype/descriptor checks, not by evading these syntax checks.

Required source shape, pseudocode rather than a tested implementation:

```ts
const NativeSourceContainerSchema = S.ObjectKeyword.check(
  S.makeFilter((container) => {
    // official Predicate.isFunction(container) => explicit filter failure
    // Capture own names, symbols and DATA descriptors before child parsing.
    // Accept ordinary arrays and Object.prototype/null-prototype objects only.
    // Ordinary array prototype is Array.prototype; reject array subclasses.
    // Reject all own symbols and all own accessor descriptors, including
    // nonenumerable accessors and indexed accessors. Never invoke a getter.
    // Array length is read from its captured own data descriptor and decoded.
    // Reject every own array name other than length or canonical index < length.
    // Return an explicit failure string or undefined for success.
  })
)
const NativeSourceValueSchema = S.Union([
  S.Undefined,
  S.Null,
  S.Boolean,
  S.Finite,
  S.String,
  NativeSourceContainerSchema,
])
type NativeSourceValue = typeof NativeSourceValueSchema.Type
type NativeSourceContainer = typeof NativeSourceContainerSchema.Type
const decodeNativeEvidenceSource = S.decodeUnknownSync(NativeSourceValueSchema)
```

Export the source schema and the generated decoder where the typed host/test boundaries need them. No function authored in this successor accepts or returns explicit `unknown` or `object`; no unknown alias, generic input escape, handwritten recursive interface, assertion function, `as`, null cast, suppression, or lint/config change. A local raw variable may remain explicitly `unknown` between `PropertyDescriptor.value` and immediate decode. `PropertyDescriptor` is the platform's descriptor contract, not a payload type. Do not return its raw value to an encoder caller.

The filter must distinguish all unsupported categories explicitly through the Schema failure path. Date/Map/Set/class instances, callable values including null-prototype functions, symbols, bigint, nonfinite numbers, own symbols, accessors and extra array properties cannot encode as an empty object or disappear. Reject nested unsupported children at their real descriptor boundary as well. This policy belongs only to test evidence; it does not change what the graph accepts.

Use noncapturing Unicode regex `/^(?:0|[1-9]\d*)$/u` for canonical decimal names, followed by numerical range < captured length. Reject `01`, `-1`, `1.0`, extra string names and the maximum non-index name rather than silently omitting them. A genuine array hole is an absent own indexed descriptor, not `undefined`. Ordinary object ordering follows captured `Object.getOwnPropertyNames` order. Keep nonenumerable data keys, own undefined, null and all string keys including tag/value/entries and `__proto__` as entries. Do not sort, normalize or merge them into envelopes.

The encoder accepts `NativeSourceValue`, returns the finite flat output Schema Type, and uses `Set<NativeSourceContainer>` for active ancestors. Decode each captured descriptor.value immediately, then synchronously recurse. Capture the full own descriptor set before beginning child traversal; retain source reference identities in the ancestor set, and delete the current container in `finally`. This permits repeated non-cyclic references to appear twice while rejecting an actual back-edge. No await/yield, source clone, or asynchronous validation occurs between callback delivery and detached envelope creation.

At runtime, check undefined/null directly. Use official Schema guards to narrow booleans/strings/finite numbers. Encode `Object.is(value,-0)` as `{tag:'negative-zero'}`; finite positive zero remains `{tag:'number',value:0}`. The remaining decoded branch must narrow to the validated container without a cast. If TS cannot establish this using the actual guards, STOP with the exact diagnostic; do not annotate it into submission. Constructor/output validation may inspect the newly created envelope, never the caller's raw object.

This design guarantees no evaluation of ordinary caller property getters. JavaScript proxies can execute metadata traps and cannot be universally identified by this contract; arbitrary proxy serialization is not claimed. If real native DTOs violate the ordinary data-container boundary, preserve the actual input category and fail evidence collection. Do not introduce new proxy/class support, change graph policy, or skip the observation.

## Chosen finite output contract and alternatives

Three shapes were considered. The observed two-factory recursive Class design is rejected: it actually fails the exact compiler with circular alias/return/base errors and adds two source files. An explicitly annotated nominal Class or Data.Class anchor could attempt to break inference, but still requires a recursive model independent of inferred fields, introduces additional Class machinery and remains unproven under the no copied DTO/no cast constraints. A recursive Struct with a handwritten recursive interface would merely duplicate the authoritative fields and is prohibited. None is another authorized prototype.

Choose one finite Struct containing a flat postorder table. Its Schema has no recursive type edge, suspend, Class, mutable schema holder, factory inference, new module or runtime import cycle. The encoder still traverses source containers recursively, but emits integer edges into an already completed table. Recursion in ordinary synchronous traversal does not require a recursive TypeScript DTO. The table preserves the same tagged leaf distinctions and ordered container relationships. There are no accepted native artifacts requiring old attachment compatibility. Do not add a legacy decoder or emit both shapes.

The exact minimal schema declarations and canonical filter proposed for the existing fixture-schema module follow. These are reviewable declarations grounded in RC116; they have **not** been compiled/linted by this advisor. In source, imports precede this block; existing reference declarations remain ahead of it, with no forward value use. All payload Types below derive solely from actual schemas.

```ts
const NativeEvidenceIndexSchema = S.Int.check(
  S.isGreaterThanOrEqualTo(0),
  S.makeFilter((index) =>
    Object.is(index, -0) ? 'index must use positive zero' : undefined
  )
)

export const NativeEvidenceNodeSchema = S.Union([
  S.Struct({ tag: S.Literal('undefined') }),
  S.Struct({ tag: S.Literal('null') }),
  S.Struct({ tag: S.Literal('hole') }),
  S.Struct({ tag: S.Literal('negative-zero') }),
  S.Struct({ tag: S.Literal('boolean'), value: S.Boolean }),
  S.Struct({
    tag: S.Literal('number'),
    value: S.Finite.check(
      S.makeFilter((value) =>
        Object.is(value, -0) ? 'negative zero requires its own tag' : undefined
      )
    ),
  }),
  S.Struct({ tag: S.Literal('string'), value: S.String }),
  S.Struct({
    tag: S.Literal('array'),
    values: S.Array(NativeEvidenceIndexSchema),
  }),
  S.Struct({
    tag: S.Literal('object'),
    entries: S.Array(S.Tuple([S.String, NativeEvidenceIndexSchema])),
  }),
])

type NativeEvidenceNode = typeof NativeEvidenceNodeSchema.Type

export const NativeEvidenceValueSchema = S.Struct({
  root: NativeEvidenceIndexSchema,
  nodes: S.Array(NativeEvidenceNodeSchema),
}).check(
  S.makeFilter((tree) => {
    if (tree.nodes.length === 0 || tree.root !== tree.nodes.length - 1) {
      return 'root must be the last node of a nonempty tree'
    }

    const parents = new Map<number, number>()
    const starts = new Map<number, number>()
    for (const [nodeIndex] of tree.nodes.entries()) {
      parents.set(nodeIndex, 0)
    }

    for (const [nodeIndex, node] of tree.nodes.entries()) {
      if (node.tag === 'object') {
        const keys = new Set<string>()
        for (const [key] of node.entries) {
          if (keys.has(key)) return 'object entries require unique keys'
          keys.add(key)
        }
      }

      const children: (typeof NativeEvidenceIndexSchema.Type)[] = []
      if (node.tag === 'array') {
        for (const childIndex of node.values) children.push(childIndex)
      } else if (node.tag === 'object') {
        for (const [, childIndex] of node.entries) children.push(childIndex)
      }
      let start = nodeIndex
      let cursor: number | undefined
      for (const childIndex of children) {
        if (childIndex >= nodeIndex) return 'children must precede their parent'
        const childNode = tree.nodes[childIndex]
        const childStart = starts.get(childIndex)
        const count = parents.get(childIndex)
        if (
          childNode === undefined ||
          childStart === undefined ||
          count === undefined
        ) {
          return 'child index must identify a complete earlier subtree'
        }
        if (childNode.tag === 'hole' && node.tag !== 'array') {
          return 'holes may occur only as array slots'
        }
        if (count !== 0) return 'a node must have exactly one parent'
        parents.set(childIndex, count + 1)
        if (cursor === undefined) {
          start = childStart
        } else if (childStart !== cursor) {
          return 'child subtrees must be contiguous in their recorded order'
        }
        cursor = childIndex + 1
      }
      if (cursor !== undefined && cursor !== nodeIndex) {
        return 'the last child subtree must end immediately before its parent'
      }
      starts.set(nodeIndex, start)
    }

    for (const [nodeIndex, node] of tree.nodes.entries()) {
      const expectedParents = nodeIndex === tree.root ? 0 : 1
      if (parents.get(nodeIndex) !== expectedParents) {
        return 'every nonroot node must have one parent and root must have none'
      }
      if (nodeIndex === tree.root && node.tag === 'hole') {
        return 'an absent array slot cannot be a root value'
      }
    }
    if (starts.get(tree.root) !== 0) return 'root must cover every node'
    return undefined
  })
)

type NativeEvidenceValue = typeof NativeEvidenceValueSchema.Type

export const NativeCallbackReceiptSchema = S.Struct({
  owner: S.String,
  observer: S.Literals(['node', 'handle']),
  generation: S.Literals(['old', 'new']),
  kind: S.Literals(['connect', 'disconnect']),
  deliveryIndex: S.Int.check(S.isGreaterThanOrEqualTo(0)),
  encodedValues: NativeEvidenceValueSchema,
})

export const NativeCheckpointSchema = S.Struct({
  owner: S.String,
  phase: S.String,
  records: S.Array(NativeCallbackReceiptSchema),
  observation: NativeEvidenceValueSchema,
})
```

This block uses RC116's actual `S.Struct`, `S.Array`, `S.Tuple`, `S.Union`, `.check` and `S.makeFilter`. Installed `Schema.ts:3298-3304` exposes mapped Struct Type/Encoded; `:191` permits multiple checks; `:6455-6459,6490-6500` permits contextual filter input and string/undefined failure results; `:1811-1814` supplies the boundary decoder. No declaration depends on NativeEvidenceValue while constructing NativeEvidenceNodeSchema. Type resolution is strictly Index → finite Node union → Value Struct → derived Value type → receipt/checkpoint schemas. Runtime declaration order is the same. The source domain is independent; no reference back from it to the flat output. Removing both Class definitions also removes their class-count and forward-binding errors without changing any rule.

Canonical validity is stronger than mere acyclicity. Child indexes are nonnegative integers from the field schema, valid earlier nodes from the filter, and cannot be shared. Every nonroot has one parent, root none. Following strictly increasing parent indexes must terminate at the sole zero-parent node, proving reachability and no cycle. The starts/cursor check additionally proves each ordered child's subtree is contiguous and immediately precedes the next child/parent, so arbitrary index reorderings cannot produce an alternate valid serialization of the same ordered tree. Empty containers are single complete nodes. Holes are only array-child nodes, never an object value or root. Object keys stay unique and in the supplied order; the Schema does not sort them. Finite number -0 is rejected under number tag, forcing the separate negative-zero tag; +0 remains number/value0. The source's own-property order is retained independently by the encoder. Do not claim the filter verifies a node table against unavailable source descriptors.

### Synchronous postorder encoder

Keep the source domain and descriptor restrictions in the preceding section. Introduce no broad source contracts. The recursive traversal accepts only `NativeSourceValue`, a mutable `NativeEvidenceNode[]` working table and `Set<NativeSourceContainer>` ancestors; it returns a numeric index. A small append helper accepts an actual `NativeEvidenceNode`, captures `nodes.length`, pushes exactly that complete node and returns that index. Its array type is a Schema-derived node collection, not a copied DTO. Integers arise solely from real array positions, and final schema validation enforces their domain.

Define the append helper before traversal and traversal before the exported encoder. Self recursion inside the traversal function is ordinary self reference, not a use of a later aggregate value. The primitive branches append exact leaf nodes; hole nodes are appended only by the array's missing-own-descriptor branch. For an object, capture all own DATA descriptors, decode each child descriptor.value immediately with the authoritative source decoder, traverse children synchronously in captured name order, then append `{tag:'object',entries}`. For an array, walk actual length sequentially, append hole for an absent own index, otherwise decode/traverse its captured descriptor value, then append `{tag:'array',values}`. There is no provisional parent, reserved ID, forward child ID, delayed mutation of a node or placeholder record. Every emitted node is complete at push time.

```ts
// Algorithm sketch: precise types are from the schemas above/source section.
// append(node, nodes): index = nodes.length; nodes.push(node); return index
// traverse(value, nodes, ancestors):
//   scalar -> append corresponding literal node
//   container -> reject active ancestor, add source identity
//     try:
//       capture/validate descriptors before parsing children
//       array -> sequential child IDs, including explicit hole IDs
//       object -> sequential [capturedKey, decoded-child-ID] entries
//       append complete parent and return its actual index
//     finally: delete source identity
// exported encode(decodedSource):
//   fresh NativeEvidenceNode[] and ancestor Set
//   root = traverse(decodedSource, nodes, ancestors)
//   return decodeUnknownSync(NativeEvidenceValueSchema)({root, nodes})
```

Final output decode inspects only new plain evidence data, never raw caller containers. Primitive guards are actual `S.is` guards; no local runtime typeof or cast. Source container narrowing, captured descriptor typing, exact literals and readonly/mutable array assignability must pass the actual compiler and existing quality gate; if not, preserve the exact failure and STOP. There is no promise that prose or this unexecuted snippet is compile-green.

The encoder unrolls repeated non-cyclic source aliases into separate complete subtrees and indexes. Active-ancestor detection rejects actual cycles before recursion, removing the ancestor in finally. A failed encode abandons its local partial table and appends no receipt. Metadata descriptor traps from proxies remain outside the no ordinary-getter guarantee; no broader object policy is added. Full tree depth/count/ordering is preserved, subject to ordinary synchronous JavaScript stack limits; no new arbitrary truncation or cycle replacement is allowed. The evidence preserves own data-property presence, order and values, including nonenumerable values. It does not preserve writable/configurable/enumerable flags or arbitrary JavaScript object identity; that limitation also applied to the old envelope contract.

### Independent exact expected tables and full host comparisons

Tests must specify literal expected JSON tables, not ask this encoder to create its own expectation. For example:

```json
{
  "root": 2,
  "nodes": [
    { "tag": "hole" },
    { "tag": "undefined" },
    { "tag": "array", "values": [0, 1] }
  ]
}
```

This is the expected real two-slot array with absent own index0 and own undefined index1. For a captured object with own names `a,b` where a is own undefined and b is `[null,-0]`, the independent table is:

```json
{
  "root": 4,
  "nodes": [
    { "tag": "undefined" },
    { "tag": "null" },
    { "tag": "negative-zero" },
    { "tag": "array", "values": [1, 2] },
    {
      "tag": "object",
      "entries": [
        ["a", 0],
        ["b", 3]
      ]
    }
  ]
}
```

For `[shared,shared]` with shared having `x:1`, the table contains two distinct x/1 leaf/object subtrees:

```json
{
  "root": 4,
  "nodes": [
    { "tag": "number", "value": 1 },
    { "tag": "object", "entries": [["x", 0]] },
    { "tag": "number", "value": 1 },
    { "tag": "object", "entries": [["x", 2]] },
    { "tag": "array", "values": [1, 3] }
  ]
}
```

These examples become explicit NEW expected assertions, including root equality, full nodes order, all child IDs and full node contents after actual JSON text serialization/parse/schema decode. The old recursive expected envelopes are superseded, but remain immutable in the historical STOP/source copies and earlier four-pass log. New host assertions compare the complete canonical table for the **actual complete public callback values**, alongside independent actual accepted public DTO assertions. Expected tables must enumerate every actual field/own property at each checkpoint, including IDs/endpoints/handles/data/hidden and any host contract field; no node/handle projection can supply a missing field. Expected node and handle tables are distinct where actual public DTOs differ. Separate identity/history assertions retain owner/observer/generation/kind/index, and silence checkpoints compare whole prior receipt histories plus actual accepted/preview state. Abbreviated original assertions remain at their original checkpoints. No generic helper can replace these independent expected tables by encoding the actual value twice.

### Capture source closure

`scripts/capture-selector-lifecycle-reference.ts:159-165` currently owns exactly the driver, index.html, main.tsx, fixture-schema.ts and vite.config.ts. This design adds no module, so preserve that real five-file closure. The absent factory filenames must not enter provenance. Both pre-capture and post-cleanup inventories still cover the actual transitive owned source. The reference schemas and captured React plain JSON shape remain unchanged even though the shared file's native evidence section changes.

## Recorder callers and actual host contracts

Change `encodeNativeEvidenceValue`, recorder.record and recorder.checkpoint to accept the authoritative decoded source Type. Invoke the generated decoder at each raw callback/checkpoint/expected-fixture boundary before the recorder/encoder. Likewise the descriptor reader returns decoded `NativeSourceValue`, never unknown. Calling the library decoder is the actual boundary; calling a generic helper which assumes raw input is already parsed is not.

Each native callback retains its actual public payload type. Vanilla and Foldkit node callbacks deliver `readonly FlowNodeConnection[]`; their handle callbacks deliver `readonly FlowEdge[]`. Vue's node and handle hooks deliver `readonly FlowNodeConnection[]`. Evidence: W `apps/vanilla/src/mount-flow.ts:927-952`; `packages/foldkit/src/observers.ts:94-122`; `packages/vue/src/use-flow.ts:345-365`. Foldkit `observers.ts:433-456` uses node selection directly and handle selection as full edges; do not derive handle evidence from the internal node projection.

In `apps/foldkit/e2e/test-harness.ts:370`, replace `values:unknown` with a union of the actual node and handle public callback parameter Types derived through `Parameters` and `NonNullable`. This union describes two real payload contracts, not arbitrary data. Decode it at the actual `onConnect`/`onDisconnect` boundary before recording; keep its full values. The existing native owner at `test-harness.ts:1473-1524` is constructed from the real Runtime acceptedStates/connectionPreviews ports and a decoded initial snapshot. Preserve that owner, snapshot client, Runtime and actual unsubscribe/disposal paths. Do not compose another test Runtime.

Recorder ordering remains synchronous: full decode and detached encode, receipt construction, append once, then the existing shortened projection. If encoding fails, throw/retain the actual failure and no receipt/index increment; complete expected callback assertions must reveal missing evidence. Do not manufacture a receipt with empty values or catch-and-continue. One owner's index starts0 and increments only on actual callbacks across its node/handle records; checkpoints, proposals, screenshots, query replacements and silence do not increment it. Stable old/new functions close over generation identity. Never relabel stored history.

Fix only these exact Vue type expressions:

```ts
// test-harness.ts:1577: exclude optional argument BEFORE indexing onConnect
type NodeValues = Parameters<
  NonNullable<
    NonNullable<Parameters<typeof useNodeConnections>[0]>['onConnect']
  >
>[0]
```

At `test-harness.ts:710-714`, read the real accepted snapshot once, find its accepted node with id `target`, and use that node's existing branded id in `flow.updateEdge(edge.id,{target:targetNode.id})`. Fail explicitly if the required accepted node or edge is missing. The fixture's input is unchanged. Alternatively the authoritative public `NodeIdSchema` exported from `@flow/core` may decode the literal at this fixture boundary; prefer the actual accepted target node. `packages/core/src/domain/flow-values.ts:3-5` is the authoritative branded Schema. No cast, public API widening, private state setter or unrelated fixture repair.

## Preserve every sequential native phase

The following sequences are original obligations, not authorization to execute native tests during LOCAL repair. Full snapshots/preview/receipt attachments remain required and currently unrun.

- Vanilla node owner: initial active/idle silence; trusted connect target; trusted reconnect next gives old disconnect(target), old connect(next), with the original three shortened assertions at their original checkpoint. Replace callbacks silently; query missing then source silently on the same subscription, settling each. Real public first.update changes the existing accepted edge next→target, preserving ID/handles; actual accepted readiness precedes new disconnect(next), new connect(target). Idle owner stays silent. Original drag/wheel/selection, actual disposal, six frames and late input remain. Source `public-state.e2e.ts:1712-1744,1815-1836`.
- Vanilla handle: preserve all original absent/null/empty/named/direction filter assertions. Capture the actual accepted source-b full edge before removal. Existing real query and callback replacement stays silent, then real removal delivers new/disconnect with that full edge. Actual unsubscribe, late public update and six-frame disposal stay quiet. Source `handle-connections.e2e.ts:103-173,191-204`.
- Foldkit node: actual uncontrolled and controlled Runtime owners; trusted connect/reconnect; original length3 checkpoint; missing query then callback replacement in the existing order, both silent; restore source silently; real replacePublicDocument retains edge ID/handles and changes next→target; requestSnapshot/accepted readiness before new disconnect(next), new connect(target). Original idle/selector/viewport/accepted state and snapshot-client disposal remain. Source `public-state.e2e.ts:1539-1571`; fixture `test-harness.ts:2111-2158`.
- Foldkit handle: the separate actual observeHandleConnections case remains separate from the original accepted-handle-filtered node test. Setup both real Runtime documents and accepted snapshots sequentially; attach out-a old subscriptions; missing then out-a query silence on each. Uncontrolled accepted matching+other edge yields old/connect matching full accepted edge. Replace callbacks silently; missing→out-a resets silently; remove matching yields new/disconnect previous full edge; restore yields new/connect actual accepted full edge. Actual controlled requestPublicEdit gives proposal while accepted remains empty and callback history unchanged; external real replacePublicDocument accepts matching and only then new/connect occurs. Unsubscribe uncontrolled, accepted late update stays silent; dispose controlled observer owner, accepted late update stays silent; dispose both original snapshot-client/Runtime handles; six frames and late trusted input keep both histories unchanged. Source `handle-connections.e2e.ts:391-487` and approved handle amendment.
- Vue node: actual mounted scoped Probe uses getters reading native query/generation refs and stable generation functions. Controlled connect proposal/refusal has no accepted callback; actual parent acknowledgeSelectorProposal delivers old/connect. Selection ACK does not change connections. Controlled reconnect refusal retains target/history; actual ACK delivers old disconnect(target), old connect(next). Replace generation silently; missing then source query resets silently. Actual public updateEdge next→target creates a controlled proposal; accepted remains next and callbacks unchanged until actual parent ACK. Then new disconnect(next), new connect(target). Original drag/wheel/selection, plain-string/live readonly-ref context tests, both scope disposal, six frames and late input remain. Source `public-state.e2e.ts:613-735`; `test-harness.ts:1574-1585`; actual hook `packages/vue/src/use-flow.ts:987-1057`.

Quality repair must not parallelize any of these stateful sequences. Handle fixture loops currently flagged by `no-await-in-loop` are ordered experimental steps. Spell the bounded two-owner/two-query setup as straight awaited statements or use Effect.gen with `yield* Effect.promise` for a genuine ordered iteration. No `Promise.all` for frame ticks, owner lifecycle, query replacement, callbacks, documents, ACKs or capture invocations. Concurrent independent read-only attachments can use Promise.all without changing native actions or phase placement. Replacing `(await checkpoint(...)).records` with `const observed = await checkpoint(...); expect(observed.records)...` must retain each exact call's position; do not hoist reads across a native transition.

Use the existing real six-frame callback pattern already in `capture-selector-lifecycle-reference.ts:278-295`: `Promise.withResolvers<undefined>()`, callback increments count and schedules next requestAnimationFrame until six, resolves once, then await its promise. This removes the new Promise constructor and await-in-loop without making six requests concurrently. A helper wrapping it remains test-only; preserve the sixth actual frame boundary and late input checks.

## Exhaustive quality correction ledger

`E/recording-complete-first-quality.log` is273lines/44993bytes, SHA256 `01b235984499ac416184b7d08332f681046aeb14abcfe35fe6baaeccbd89fe85`. It reports formatting in all ten files and the following categories. Each must be resolved with source changes inside the allowlist, not by waiving policy.

The actual native type log `E/recording-complete-first-types.log`, SHA256 `c786f40af3b3832574b9d0a459fb658229cbf870aa2097ac1b9f00176d32145d`, exits2 with the two Vue expressions above. It is separate from the later external factory prototype's exit2. Both remain immutable actual failures.

| Category | Actual count | Required correction |
| --- | --: | --- |
| max-classes-per-file / no-use-before-define | 1 /2 | Remove both introduced Classes; finite Index/Node/Value schemas in declaration order and traversal self recursion; no module/cycle/waiver |
| no-object-parameters / no-unknown-returns / no-unknown-parameters / no-runtime-typeof | 1 /1 /6 /5 | Authoritative Schema-derived source, immediate descriptor/callback decode, actual native callback types, official guards |
| prefer-type-error | 2 | Explicit TypeError at encoder structural failure where applicable; keep generated genuine Schema failures at decode boundary |
| prefer-named-capture-group / require-unicode-regexp | 1 /3 | Noncapturing canonical-index group, Unicode flag on every introduced assertion/validation regex |
| prefer-number-properties | 1 | `Number.NaN` and finite controls; retain both infinities |
| consistent-function-scoping | 1 | Module-scope transport helper with decoded source input |
| prefer-structured-clone | 2 | Test actual JSON transport using separate serialized text and parsed unknown variables, followed by Schema decode; never replace this transport proof with structuredClone |
| no-new-array | 1 | Create actual hole without new Array: a schema-derived source-value array with length assigned2 and index1 assigned undefined, then assert own index0 absence before encode |
| no-known-value-widening | 1 | Construct real cycle via schema-derived source-value array `cycle.push(cycle)`; avoid the handwritten optional-object cycle type |
| padding-around-test-blocks / require-readable-spacing | 5 /159 | Required blank lines and scoped formatting; original body token identity unchanged |
| import/no-duplicates / no-duplicate-imports | 3 /3 | Merge duplicate @playwright/test type imports into one top-level import type and retain one runtime import; match existing import/consistent-type-specifier-style preference for top-level type imports |
| consistent-type-imports | 2 | Module-level `import type * as EvidenceModule` for typed dynamic module variables; preserve actual dynamic runtime import path |
| no-shadow | 10 | Rename newly introduced destructured parameters to callbackOwner/phaseName/queryHandleId, preserving values and boundary order |
| no-unused-vars | 3 | Avoid dropping encodedValues just to omit it; explicitly project receipt identity fields for identity assertions and retain separate full-value comparison |
| no-await-expression-member | 31 | Await into locals at the same checkpoint, then inspect member |
| no-await-in-loop | 10 | Straight bounded sequential statements or actual Effect sequential workflow; independent attachment writes may be parallel |
| promise/avoid-new / no-useless-undefined | 1 /1 | Existing withResolvers plus recursive frame callback; resolve without explicit undefined |

Do not run repository-wide autofix. After execution is authorized, target formatting to these ten paths only. Re-check complete quality afterwards. If JSON transport's separated statements still trigger the rule, preserve the diagnostic and STOP rather than adding a suppression or replacing JSON with clone. If any new source path is needed or a structural rule cannot be met, STOP for a bounded design revision.

## Meaningful independent tests

Keep the original genuine fixture-dependent describe/test at `selector-lifecycle-reference.test.ts:8-46` unchanged and unskipped. It is required, fixture is currently absent, and its status is **UNRUN_REFERENCE_ACQUISITION_WITHHELD**. A local name filter for the independent transport describe is an explicitly scoped run, not a replacement fixture or full unit acceptance.

Transport helper must accept the actual decoded source Type, synchronously encode, assign JSON.stringify result to a text variable, assign JSON.parse result to a local unknown, then decode through NativeEvidenceValueSchema. Call decodeNativeEvidenceSource at every test input boundary. Tests assert explicit expected envelopes, own-property distinctions and actual errors rather than comparing two calls to the same implementation alone. Flat expected tables above and equally explicit tables for all remaining controls are mandatory.

Required controls, each with visible independent assertions:

1. Actual absent/own undefined/null/empty/named handle values yield distinct ordered entries after JSON transport and Schema decode. Include nested own undefined and nonenumerable data key retention, null-prototype object acceptance and exact object order.
2. Collision objects with own tag/value/entries keys, including `__proto__` via a data descriptor, remain ordinary entries; caller names never overwrite tags.
3. A real two-slot array has absent index0 and own undefined index1 before encode, then the explicit hole/undefined flat table after transport. Include nested arrays/objects and repeated shared non-cyclic source references. Import the finite aggregate directly and exercise its canonical filter; no helper module is added.
4. Finite values include negative0, positive0, an ordinary positive and negative finite number. Distinct negative-zero vs number/value0 survives JSON; reconstruct signs in the test and assert Object.is. NaN/±Infinity fail both at root input decode and as actual nested descriptor values. Do not claim production numeric policy changed.
5. Date, Map, Set, an actual ordinary class instance, regular function, null-prototype function, bigint and symbol root fail. Nested instances also fail rather than becoming empty envelopes. Declare exactly one test-only ordinary rejection class in this file, reusing its instances for root/nested controls. Test the array prototype boundary with an actual array whose prototype is deliberately set to a fresh object inheriting Array.prototype, proving Array.isArray remains true while encoding rejects it. This tests the same unsupported derived-array prototype boundary without a second class or an implicit new file.
6. Object getter and nonenumerable getter, indexed getter, own symbol, decorated extra array key and invalid canonical index own names fail. Getter counters remain exactly0. Inspect data descriptors before encode as independent controls. No test may call the getter itself to form expected values.
7. An actual source cycle and nested back-edge fail; a repeated non-cyclic alias succeeds with two explicit expected children. Use a Schema-derived array type for cyclic construction; no optional handwritten object shape or casts.
8. Recorder capture is detached synchronously before a later source mutation. Assert explicit original encoded values remain, silent checkpoint adds no record/index, real node old/connect followed by handle new/disconnect yields indexes0/1, failed unsupported callback adds no record/index, and next successful callback has index2. Check actual full receipts after JSON decode. Preserve the existing separate detachment test and strengthen its expected value assertions, not just transport-to-transport comparison.

Unsupported tests must exercise actual root decoder rejection and actual recursive descriptor rejection separately. A test calling only a typed encoder with a fabricated already-valid value is insufficient boundary proof. The fifth recorder test was authored after the earlier four-test pass and remains unrun at STOP. New rejection tests, prototype controls and flat output/canonical acceptance have not run. Add independent invalid-table controls for empty/wrong/not-last root, negative/fractional/negative-zero indexes, out-of-range/forward/self child, multiple parents, orphan, duplicate object keys, root/object hole, numeric -0 under number tag, and noncontiguous or reversed subtrees. Include structurally valid hand-authored tables (empty object, empty array, scalar root, nested ordered tree) so the filter is not tested only by rejection or encoder roundtrip. Assert negative-zero rejection before JSON serialization, which would otherwise erase that malformed index/sign.

## Capture and publication obligations retained

Do not execute reference capture in this LOCAL successor. Current `capture-selector-lifecycle-reference.ts:458-480` writes the external fixture, stages it, validates tracked pin/source, closes browser/page and owned server, preserves stdout/stderr; `:482-486` promotes only after final post-cleanup tracked/source validation. Retain this sequencing byte-for-byte except formatting. The five actual ownedSourcePaths remain complete; do not add nonexistent dependencies. No finally-block promotion. Any preceding failure preserves previous candidate fixture bytes or absence. Final candidate write remains conditional on successful enclosing cleanup.

Reference source observes real browser/public hooks. `capture-selector-lifecycle-reference.ts:315-336` saves complete raw JSON before Schema parsing and screenshot; `:350-407` runs the actual sequential phases; `:415-429` compares two fresh internal mounts. Original required acquisition is **two separate actual CLI invocations into separate fresh outside directories**; the two internal mounts are additional repeatability, not a substitute. All697tracked pin hashes, status and complete owned capture-source hashes must revalidate before promotion. Own strict-port listener identity and cleanup are mandatory; preserve external failed observations.

The future exact CLI form is `bun run scripts/capture-selector-lifecycle-reference.ts --checkout ABS_OWNED_PIN --evidence ABS_FRESH_EVIDENCE`. Pin is `0a1f9575b25679f2880175de8d3eae21aedde921`, owned strict port4197. Root native `bun run typecheck` excludes the React `.tsx` file: actual real React/system declarations and JSX compilation remain **UNRUN**, requiring their existing separately reviewed compiler/acquisition specification. Do not install, cast peers, stub declarations, change a pin/port, suppress errors or call Vite transpilation compiler proof.

Reference raw event strings stay byte-identical and retain their disclosed plain-JSON limitations for own undefined and signed zero. Tagged native records do not establish reference optional-presence/sign parity. Actual native/reference comparison, archives, collector/native-device/CI and member closure remain unverified.

## Ordered local execution after separate release

These are future executor steps, not commands run by this advisor. Use same095 and the same W. No new worktree, Git commit/merge/push/PR or archive operation.

1. Verify HEAD, all packet hashes and STOP hash. Run main's rerunnable integrity checker against all three frozen corpora before creating any new evidence. Expected exit0,1516/1516/11086 checked with zero mismatches. Preserve a newly named complete pre-repair snapshot outside W and E's immutable trees, such as sibling `selector095-pre-flat-recording-repair`, failing if it already exists. Preserve all source and all old evidence bytes and manifests, not just the ten paths. Independently rehash the retained 18-file type-feasibility freeze and symlink target as well. No source amendment starts until this succeeds.
2. Add the source schema, finite flat schemas and synchronous postorder traversal in the existing fixture-schema module; remove its two introduced Classes. Adjust all new recorder/test callers at actual boundaries and replace NEW recursive expectations with independent full flat tables. Preserve the actual five-file capture closure without helper additions. Apply the exact two Vue type repairs. Preserve all original obligations and inputs. Run native types/build and independent transport checks. If the actual declarations cannot express this design without casts/waivers, STOP rather than continue mechanic work.
3. Resolve every listed mechanical quality category within the ten paths, keeping sequential semantics and exact original body tokens. Run targeted formatter only on those paths, then complete quality and native typecheck. Do not modify lint/config or transform unrelated files.
4. Run architecture, scoped independent units, historical/installed retention and diff. Retention programs write old evidence paths today: copy those programs into a newly named successor evidence directory and change ONLY their output destination paths before invoking them. Record original helper hash and exact output-only changes. Do not rerun immutable programs so that they overwrite frozen receipts. Preserve the actual checks/allowances. Fresh receipts must show zero token mismatches and original installed statement order.
5. Freeze complete current source and complete new/old evidence, protected hashes, before/after ten-file delta and commands/log hashes. No helper files are permitted; record the actual complete source count and explain any count difference rather than assuming1516. Any unexpected new/deleted source path is a STOP. Independently rehash current source and snapshot copies. Retain STOP counts as historical inputs. Record exact local scope, all unrun shared/reference/compiler/archive checks and no acceptance/member promotion. Stop at LOCAL preparation.

Concrete pre-edit read-only integrity command from main:

```sh
python3 plans/check-frozen-inputs.py \
  --corpus 095-current /Users/richardmcandrews/.codex/worktrees/095-native-selector-lifecycles/flow plans/selector-recording-stop-source-manifest.json 27983ef6d870147c82b50741f913e01d298279ea0d74487cab7a97faa0f729f4 1516 \
  --corpus 095-copy /Users/richardmcandrews/.codex/worktrees/095-native-selector-lifecycles/selector095-evidence/recording-amendment-stop/source plans/selector-recording-stop-source-manifest.json 27983ef6d870147c82b50741f913e01d298279ea0d74487cab7a97faa0f729f4 1516 \
  --corpus 095-evidence /Users/richardmcandrews/.codex/worktrees/095-native-selector-lifecycles/selector095-evidence plans/selector-recording-stop-evidence-manifest.json 4e684505cbaab9f1a4e4712cac609ebce967b0fc9e31ec94f9c67daae1c2fe71 11086
```

Commands run from W only after local resume; each requires actual exit0 and complete stdout/stderr/command/hash receipt with a fresh name. Existing `E/run-local.py` can be reused with a fresh result basename, never an existing basename.

| Purpose | Exact command / invocation | Required observation |
| --- | --- | --- |
| Native build/type | `bun run typecheck` | All package builds and actual root tsc0; React TSX/installed boundaries expressly unrun |
| Quality | `bun run check` | Complete Ultracite format/lint0, no rule/config waiver |
| Architecture | `bun run check:architecture` | Actual production architecture fixtures/check0; review the research fixture import closure separately because architecture scanner covers production src, not the evidence section; no helper imports permitted |
| Independent recording units | `bun run test -- packages/conformance/src/selector-lifecycle-reference.test.ts -t 'native evidence transport'` | All current independent recording cases pass; exact count recorded; genuine named case unrun by filter, no source skip and no full-suite claim |
| Preserved scoped native units | `bun run test -- packages/foldkit/src/application.test.ts packages/foldkit/src/observers.test.ts packages/core/src/domain/flow.schema.test.ts` | Existing complete scoped tests pass, count from actual log |
| Historical token retention | Copy of `E/proof-source-preparation/audit-final-retained-proof-tokens.ts`, output destinations uniquely renamed | Original historical bodies and contextual-toolbar bodies zero token mismatches; original inputs/assertions unchanged |
| Installed token retention | Copy of `E/proof-source-preparation/audit-installed-retention.ts`, output destinations uniquely renamed | Six original installed fixture bodies and archive-runner functions/order unchanged; zero mismatches |
| Delta whitespace | `git diff --check` | Exit0; separate whole-source manifest delta proves only permitted path changes, including untracked files |

A full final source review must read the actual ten-file source/diff and the meaningful new tests, not infer acceptance from these commands. Existing prior102scoped-unit passes and earlier four transport passes belong only to their earlier source identities.

## Withheld shared gates and completion boundary

092 owns the sole current shared lease. No verifier, browser/native suite, HMR, reference acquisition/server/install/listener, pin checkout/build, archive/consumer gate, React compiler preparation or cleanup is permitted by this LOCAL successor. No source/member acceptance follows a local pass.

After a separate shared release, original095 focused scope still requires checks docs/catalog/api-members/contracts/traces/consumer/build/vue-build/foldkit-build and public-state, handle-connections, interaction-lifecycle browser files in all three hosts. Save that active scope under the governing original plan, preview with `bun run verify --list`, then run `bun run verify` and record exact profile/scope/counts. Complete real native suites, three actual installed archives, two actual separate reference captures, real React declaration compilation, genuine fixture-dependent expanded units, root reproduction and fresh SOURCE review all remain obligations. `bun run verify:full` and release dry-run remain integration/release gates before any broad parity claim. No focused-only pass closes full-suite, parent, CI, device or collector acceptance.

## STOP conditions and maintenance

Stop immediately and preserve raw evidence if any frozen hash/count/HEAD/packet identity differs; original/historical/installed tokens or protected bytes drift; source correction requires an eleventh path or any production/API/policy/compiler/dependency change; source schema calls a getter or erases source identity/hole/own undefined/sign; accepted real DTOs are outside the stated container domain; Date/Map/Set/classes/callables encode successfully; output declarations introduce Class/suspend/recursive type edge, forward schema value, placeholder node, shared index, unreachable/reordered subtree or mutable schema holder; real guards fail to narrow types without a cast; quality needs a waiver or alias/generic concealment; any native phase would require a private setter/fake ACK/parallel stateful loop; promotion moves earlier or captures are substituted; a required unit fixture is skipped/faked; or shared work starts without lease release. Retain every failed attempt. No speculative retries across a structural STOP.

Future recording changes must preserve descriptor-only raw traversal, signed zero, complete ordered entries and canonical postorder tables. Review new native payload fields against authoritative callbacks and update explicit expected tables; never write a projected replacement DTO. An extra dependency or another recursive schema/type attempt requires a separate bounded design review.

## Conformity and deviations

**Conforming by inspected design:** full actual native node/handle callback values remain distinct from accepted public DTOs and are synchronously detached before shortened histories; owner/generation/kind/index/order, own data presence, nonenumerable values, holes, signs and collision-safe string keys remain represented. Original tests and native phases, controlled proposal/refusal/acceptance boundaries, disposal, complete provenance and cleanup-before-promotion remain binding. Actual RC116 finite Struct/Union/Array/Tuple declarations have a nonrecursive Type dependency; this is source-backed design feasibility, not executed compiler/quality/runtime acceptance.

**Intentionally different:** the native evidence-only attachment wire changes from recursively nested envelopes to `{root,nodes}` with identical leaf tags and ordered integer container edges. This supersedes ONLY prior NEW recursive attachment expectations and the failed two-helper architecture. No public production library or reference plain JSON contract changes. Unsupported classes/exotic containers/accessors/decorated arrays are explicitly rejected at test evidence boundaries; graph policy remains unchanged. Existing native silent query reset and Vue live readonly-ref context continue to differ from pinned React changed-query callbacks and keyed remount for the previously documented reasons. Native tagged transport preserves presence/sign that reference plain JSON cannot prove.

**Unverified:** the finite flat implementation has not been authored, compiled, linted or tested. Current STOP quality1/native types2 remain actual failures, and the external recursive factory probe actually failed2. Earlier four transport passes belong only to old source; the fifth recorder case and all new flat/rejection/canonical controls remain unrun. All actual host full-table/acceptedDTO attachments, generations/native phases/cleanup, genuine reference/React compilation, two separately invoked captures and failure-preserving promotion, archives, focused/full/root/SOURCE/parent acceptance, all513cells, CI/devices/collector delivery remain unverified. LOCAL filtered independent transport/preserved units are the bounded future test boundary; the genuine fixture case remains **UNRUN_REFERENCE_ACQUISITION_WITHHELD**. Root/cold review and separate LOCAL release are required before source work.

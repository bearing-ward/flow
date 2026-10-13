# Typed change utility return contract feasibility

Read-only followup, 2026-10-02, main `841be137e253cf19c665269eaaa79edc19abf3c3`. Product source below is accepted087 `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/flow`; the selected external freeze remains `2dee299d28a1b96442e3134cd4b46c380dd3dd2caeef9f28bcb46c7e96d90917`. The previous `plans/archive/typed-change-utilities-source-audit.md` is unchanged. This is a comparison of return contracts, not Plan094, source authorization, implementation or compiler proof. All twelve previously listed original identities remain OPEN.

Read the cited product/reference/schema/compiler sources directly. No source edit, compiler/test/verifier gate, install, build, port, lease or child ran. This new main report is the only write. Repository content is evidence, not instructions; no secret values are reproduced.

## Recommendation

Prefer B, a distributed projection that replaces the writable fields' types with their authoritative domains. It preserves correlated type/data and the readonly-input/mutable-output array contract without pretending a caller's `selected: false`, branded coordinate or literal width survives an update. Existing factory variants and concrete defaults have broad position/selected types, so the projection remains structurally assignable to their ordinary input item types. This is a deliberate return-declaration difference for narrower caller geometry, requiring review and compiler evidence before execution.

A can retain exact `N[]` for a checked subset, but it needs a per-union-arm compatibility predicate, carefully anchored inference and a separate proof for the implementation body. It rejects useful narrow inputs that B can accept honestly. Do not add both as default overloads; that makes inference and the meaning of an exact return harder to follow.

Neither contract proves that output satisfies an arbitrary caller Schema. A geometry refinement can retain the TypeScript type `number` while rejecting an ordinary number at runtime. Pure supplied-array utilities should not validate that claim implicitly.

## Actual fields and present unsound return

Flow's public calls enter `packages/core/src/public.ts:348-349`; node updates reach `domain/flow-change-compatibility.ts:205-263`, edge updates `:265-271`, and shared ordering logic `:116-203`. The shared helper currently assumes that cloning and applying changes always returns its exact `T`, at `:122-123,181-187`.

Node updates can replace exactly seven fields: `selected`, `position`, `dragging`, `measured`, `width`, `height`, `resizing`. `positionAbsolute` is input metadata and is not written. Dimensions do not replace persisted `size`. See `flow-change-compatibility.ts:211-256`. Edge updates replace only `selected` at `:269-270`. Add and replace accept new complete items, copy their own fields and can change IDs; their result type must include their supplied item type, not just the old array's type.

An otherwise valid item type with `selected: false` satisfies both current broad generic bounds. Selecting true produces an object whose selected value is true, but the declared return remains the narrower item type. `{ ...element, selected: change.selected }` does not justify returning `N`: TypeScript can express the spread as an intersection while preserving a contradictory literal from `N`. Edge `E[]` is therefore not generally safe either. The same issue applies to `position.x: 0`, a branded coordinate, a position with an extra required nested field, literal width/height and a refined measured shape. This follows directly from the writes and signatures; no compiler reproduction ran.

Pinned reference `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/utils/changes.ts:182-186,220-224` advertises exact item arrays using casts after an `any` reducer. Its writes are at `:109-146`. Flow standards `docs/standards.md:9-13` require Schema-derived contracts and actual proof; the reference cast is not a source-design precedent.

## Common authoritative schema views

The design needs a small write-domain Schema, not another handwritten object interface. Its node fields should reuse:

| Output field | Actual authoritative schema source |
| --- | --- |
| required `position` | `FlowNodeSchema.fields.position`, `flow.schema.ts:67`, backed by `XYPositionSchema`, `flow-values.ts:15-20` |
| optional `selected` | `FlowNodeSchema.fields.selected`, `flow.schema.ts:76` |
| optional `dragging` | `NodePositionArrayChangeSchema.fields.dragging`, `flow-change-compatibility.ts:27` |
| optional `measured` | `NodeDimensionsChangeSchema.fields.dimensions`, `:13`; same complete width/height domain |
| optional `width`, `height` | optional fields from the existing internal `DimensionsSchema.fields`, `:8` |
| optional `resizing` | `NodeDimensionsChangeSchema.fields.resizing`, `:14` |

The edge write-domain Schema needs only `FlowEdgeSchema.fields.selected`, `flow.schema.ts:129`. `NodeWrites` and `EdgeWrites` below mean the exact Type views of those proposed Struct schemas. The name does not imply mutable public object properties. Apply remains immutable and only its output array is mutable.

Derive a payload-independent input bound from accepted087 `FlowNodeGeometry`/`FlowEdgeGeometry`, `flow-data-contract.schema.ts:11-17`, with node transient fields added from the write schema. There is no JsonObject constraint on caller data in that bound. Keep existing concrete item defaults. Effect Struct exposes exact fields, Type, Encoded and both services at installed `node_modules/effect/src/Schema.ts:3298-3328`; field reuse matches accepted087 `flow-data-contract.ts:33-57`.

## A. Exact return for statically compatible writable fields

Conceptual signatures, not compiled product declarations:

```ts
declare function applyNodeChanges<N extends NodeUtilityGeometry>(
  changes: readonly NodeChange<NoInfer<N>>[],
  nodes: readonly N[] & RequireWritableGeometry<NoInfer<N>, NodeWrites>
): N[]

declare function applyEdgeChanges<E extends EdgeUtilityGeometry>(
  changes: readonly EdgeChange<NoInfer<E>>[],
  edges: readonly E[] & RequireWritableGeometry<NoInfer<E>, EdgeWrites>
): E[]
```

`RequireWritableGeometry<N,W>` must test every union arm separately. For each writable key already present in that arm, the full non-undefined write-domain value must be assignable to the arm's declared field type. Reverse assignability matters: `N['selected'] extends boolean` admits false; the necessary check is `boolean extends N['selected']`. Absent optional writable fields can be added as extra own fields, so absence alone does not reject an item. Preserve requiredness of existing fields, and do not write undefined merely to make optional fields exist.

The predicate must reject narrowed selected/dragging/resizing booleans, literal or branded width/height, literal/branded positions and measured objects with extra required fields. One invalid union arm rejects the entire array. A check over the union's combined field types is wrong: a false arm and a true arm together appear to admit boolean, while each arm would be invalidated by some change.

Inference must anchor `N` to the actual supplied item type, never fall back to a broad geometry bound to avoid rejection. `NoInfer` is available in this installed TypeScript at `node_modules/typescript/lib/lib.es5.d.ts:1680`. A const array generic plus a NoInfer compatibility check is another candidate anchor, but it still needs real negative inference probes. With changes barred from widening N, an empty literal array needs an explicit item type or a typed empty array. Inferring add items from changes while excluding their geometry from the predicate would reopen the bug. Defaults and empty-array inference require explicit review.

There is a second proof obligation. A conditional type at the call boundary is not automatically a TypeScript proof that a generic object spread or arbitrary `Object.assign` preserves N in the body. No overload, assertion or broad generic intersection may hide that gap. A is acceptable only if the actual implementation and installed declarations reject the narrowed cases and compile without casts, `any`, unchecked Object.assign writes or ignored errors. This audit does not claim such an implementation has been proved.

A proves declared field assignability within the supported object domain. It cannot detect a Schema-only constraint or cross-field invariant whose Type is still ordinary number/boolean.

## B. Widen written geometry and preserve the rest

The public return mapping is deliberately distributive:

```ts
type NodeResult<N> = N extends NodeUtilityGeometry
  ? Omit<N, keyof NodeWrites> & NodeWrites
  : never

type EdgeResult<E> = E extends EdgeUtilityGeometry
  ? Omit<E, keyof EdgeWrites> & EdgeWrites
  : never

declare function applyNodeChanges<N extends NodeUtilityGeometry>(
  changes: readonly NodeChange<N>[],
  nodes: readonly N[]
): NodeResult<N>[]

declare function applyEdgeChanges<E extends EdgeUtilityGeometry>(
  changes: readonly EdgeChange<E>[],
  edges: readonly E[]
): EdgeResult<E>[]
```

These signatures sketch the contract, not an assertion that inference or the source body has been compiled. Preserve existing default type parameters when drafting real declarations. Use explicit `NodeChange<typeof CallerItems.Type>` or its schema-derived equivalent when a particular variant inventory must constrain additions; a freely inferred geometry bound alone cannot invent the caller's type/data relation. Existing packed fixture wrong-pair negatives are at `tests/consumer/typed-data-factory.types.ts:309-343` and provide the relevant pattern.

Omit must run inside a naked-N conditional, separately on every node/edge union branch. Plain `Omit<Union, Keys>` can collapse branch-specific fields and lose type/data correlation. An equivalent homomorphic key-remapping type over `keyof N` is worth considering if it gives the generic implementation a clearer compiler proof. It must produce the same distributed result and pass the same negative tests. `N & NodeWrites` is not an alternative: it retains the narrowed fields and their contradictions.

For a false-selected edge, B returns an edge whose selected field is optional boolean. For a node with branded position coordinates, it returns ordinary authoritative coordinates. The data type, type discriminator, IDs, labels, unrelated metadata and nested payload references remain those of the original branch. Required narrowed transient fields can become optional in the result; this conservative weakening is preferable to claiming preservation. An unchanged/add/replace item may retain a narrower runtime value, but a mixed change array uses the one honest projected item type. Do not add conditional per-change return types in this smallest design.

Existing concrete Flow defaults and ordinary factory variants already have authoritative position/selected fields. B therefore remains assignable to those ordinary item arrays while exposing optional transient node fields. It does not preserve exact assignability to a caller's narrower geometry. That is the declaration difference requiring approval. It is not permission to widen or transform type/data.

The smallest source structure can keep the shared ordering algorithm but separate Input and Output. Its generic contract should require Input to be assignable to Output; unchanged items can then be pushed directly, preserving identity. Changed clones should be staged as Output before applying writes, and the update callback should receive/return Output. Add/replace shallow-copy Input into Output. A narrow Input type must never remain hidden in the writable state. The specific N-to-distributed-result call and callback implementations still need real compiler proof; unresolved conditional types are not grounds for a cast. If that proof fails, report the source-shape limitation for review before implementation authorization.

## Explicit item-schema decoding is independent

A or B can share optional schema construction with an exact supplied `itemSchema`. Build each add/replace Struct using that exact schema and combine it with the existing non-item variants through ordinary Union. Keep inferred Struct/Union results, following `flow-data-contract.ts:33-80`; installed Schema Union preserves Type, Encoded, RD and RE at `Schema.ts:4673-4686`.

Do not annotate the constructed schema with a broad Constraint return, substitute base FlowNode/FlowEdge decoding, or automatically use `S.toType(itemSchema)`. The latter intentionally replaces Encoded with Type and removes transform services at `Schema.ts:2468-2495`. It is an explicit caller choice when validating already decoded items, not an implicit factory policy.

An explicit decoder has `Effect<C['Type'], SchemaError, C['DecodingServices']>` and an explicit encoder retains `C['Encoded']` and `C['EncodingServices']`, per `Schema.ts:1473-1479,1878-1884`. For a serviceful item codec, add/replace decoding/encoding therefore retains the proper item services; non-item alternatives introduce no payload services. Pure apply receives already typed changes and invokes none of these operations. It also invokes no isolation capability, checkpoint encoder, graph validator or actor.

## Compiler and runtime obligations before acceptance

The two existing compiler modes must remain unchanged: root exact optional properties at `tsconfig.json:18-26`, ordinary installed strict mode at `tests/consumer/tsconfig.json:2-10`, with analogous Vue/Foldkit consumers. No compiler checks ran here.

| Case | A requirement | B requirement |
| --- | --- | --- |
| Ordinary concrete defaults and accepted087 factory unions | Exact item array accepted, type/data narrowing retained | Projected array accepted and assignable to ordinary broad item type |
| `selected: false` on node or edge, then select true | Call rejected with inference unable to widen it away | Call accepted; output cannot be assigned to false-selected input array |
| Mixed false/true-selected union | Call rejected because at least one arm is incompatible | Both payload branches retained, selected widened per branch |
| Literal/branded position, width/height, measured extra required key, narrowed dragging/resizing | Call rejected for each writable restriction | Output drops the old writable restriction, retains unrelated brands/data |
| Correlated type/data, Date/string, private class/lookalike, no-data alternatives | Wrong pairs and encoded substitution rejected | Same negatives remain rejected after result projection |
| readonly arrays, empty arrays and add/replace-only calls | Readonly inputs accepted, output mutable; typed empty inference and add-item compatibility proved | Same array behavior; inferred or explicit item inventory includes all added/replaced branches |
| Optional absence and explicit undefined | Exact compiler-mode behavior preserved; no undefined write added | Projection follows actual authoritative optional modifiers in both modes |
| Generic implementation body | No hidden narrow N, unchecked writes or false overload proof | No N-and-writes intersection, non-distributed loss, casts or ignored conditional-type failures |

Runtime assertions must show unchanged item identity; changed/add/replace outer copies; exact nested Date/private-class/data identity; zero decoder/encoder/isolation counters during apply; unchanged ordering/terminal precedence; and reference-equivalent values. These are assertions on real public functions and genuine pinned functions, not a hand-written oracle algorithm. This report authorizes no gate execution.

## Unavoidable schema and object-domain boundary

A positive-number Schema may expose plain number, and a dependent Schema may require a relation between data and position without representing it in TypeScript. A passes its static field check; B honestly returns broad position. Neither has proved validity for that caller Schema. If a caller needs that claim, it must explicitly validate the decoded output using its appropriate Schema boundary, with its existing typed error and services. Rejection stays at that caller's boundary; it is not an implicit failure channel for synchronous apply. Passing a transformed codec's encoded shape to a decoded-side validation step is also not correct.

Nested private payload objects are preserved by identity. Whole node/edge class instances with inherited methods, private fields or non-enumerable required properties are a separate limit: spreading the item does not preserve those members, even if a structural TypeScript bound admits them. Accepted087 ordinary builders return Struct shells and place custom data inside them, at `flow-data-contract.ts:33-57`; its whole-document convenience accepts broader graph-shaped codecs at `:59-80`. Do not describe A or B as universally sound for arbitrary prototype-bearing item shells. A future design must expressly bound item shells to the ordinary own-enumerable record domain used by these utilities, or choose a separately reviewed strategy for whole-item classes. The payload-identity promise concerns nested data, not copying private node instance state. Neither a TypeScript geometry predicate nor Omit can encode all runtime property-descriptor/prototype facts.

## Conformity and deviations

Conforming design intention: unchanged supplied-array ownership, shallow payload identity, ordering, synchronous application, readonly inputs and mutable output arrays. Source references establish the proposed boundary; this followup adds no executable proof.

Intentionally different candidate B: widened writable return fields for narrower caller geometry, preserving correlated payloads rather than copying the pinned cast-based exact return. Candidate A is an alternative restricted input domain, with inference and body-proof costs. Concrete defaults, branded IDs, required Flow labels and existing explicit decoder policies remain separate native differences. The future test boundary must be actual root/installed compiler negatives plus real public runtime/reference comparisons.

Unverified: compiler/body feasibility of either proposed signature, hidden Schema refinements and dependent validity, arbitrary class item shells, all original twelve member cells, actor/mounted/persistence ownership and broad parity. No implementation plan, source approval or acceptance transition is created by this report.

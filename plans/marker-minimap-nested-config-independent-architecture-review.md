# Independent marker and MiniMap architecture review

2026-10-02. Verdict: **APPROVE at the architecture design boundary.** The nested configuration representation is feasible against installed Effect 4.0.0-rc.116 and preserves the existing enclosing Struct contracts. Approve the retained continuation policies together with the explicit replacement in the nested configuration amendment. This verdict creates no numbered execution plan, grants no source scope, and closes none of the original 101 members or 303 host cells.

Main checkout is `/Volumes/Sync/codex/9-19-26/flow`, HEAD `841be137e253cf19c665269eaaa79edc19abf3c3`. I read the improve skill, closing-the-loop reference, audit-playbook Correctness / Bugs, Test Coverage and Finding format, project standards, and the TypeScript and unslop instructions. All repository material was treated as evidence. No source, dependency, imported artifact, member record, browser, server, gate, installation or build was changed. The only file written is this review.

## Exact inputs and independent checks

| Input | SHA256 |
| --- | --- |
| Full retained continuation, `plans/marker-minimap-continuation-design.md` | `8f05f10bee7b1d926da68c82c429b87569ca7f21dc88f6df2cdd8dd16fe661e2` |
| Nested representation amendment, `plans/marker-minimap-nested-config-architecture-amendment.md` | `20836dfd558311b91f19099e7c1944fc8d46b166d7e6dde295e72e87a04ce55a` |
| Complete nested probe, `plans/marker-minimap-nested-config-probe.ts` | `e54e493d76f1d17a76709a47fa61da8af39cffffeab54b98753ef83071b4231c` |
| Full nested report, `plans/marker-minimap-nested-config-results.md` | `f32280669e36255fd4cf312524634b55840ee900e55302f9fe16d07e9f46db2d` |
| Nested manifest, `plans/marker-minimap-nested-config-results.json` | `df371fab1a5eb463666f64aff58121579f18f64b65d811afbd37985b086ae17c` |
| Primary preflight review | `573c3e98ba0fbb202221912a5b94e41271fdf261009de81d7185f1e2cda00e79` |
| Frozen final and independently reproduced primary runtime output | `2e76fde02b890a573d3faf58493bf20cdbb9b48fdba0a849201fd0eb123218e8` |
| Original whole-edge manifest | `f4e2009c8c34c3cf830a33b00ef4857e19a1dd3cf167d65c3aa32d4259494916` |
| Accepted 085 external source freeze | `7b3b11860cdfa36bf297883259e9cd1dd87b2d1f25be59519fde7566b6f4cfef` |

I personally read the entire retained continuation, amendment, nested probe, report, manifest and primary review. I independently checked all 12 nested artifacts, all 12 original artifacts, all 128 source files listed in the accepted 085 freeze, and all nine actual source/dependency hashes in the final runtime observations. There were zero mismatches. The final runtime and primary runtime files are byte-identical. Their recorded result is 3,124 assertions in 25 groups, 16 negative compiler probes, no failures. I did not rerun compiler or runtime commands in this design review; those executed results belong to the frozen and primary receipts.

Accepted source citations below use **A** for `/Users/richardmcandrews/.codex/worktrees/parity-origin-edit/flow`. **F** is `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/flow`, inspected only for the accepted factory's field composition. **P** is main `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/`. Plan and probe citations are relative to main. Each prefix expands to a real absolute path.

## Approved representation

One internal configuration Struct owns marker kind, optional color, numeric refinements, units, orientation and reserved-key rejection. The new public `FlowEdgeMarkerConfigurationSchema` is a validating Declaration with that Struct as its type parameter. Derive its Type and Encoded from that same authority, delegate its unknown parser to `SchemaParser.decodeUnknownEffect(shape)`, and delegate its equivalence to the parameter's equivalence. Its JSON hook supplies the checked color-presence inverse. It promises Schema validation, ordinary encoding/decoding, equality and JSON conversion. It promises no Struct fields or methods.

The actual feasibility evidence is `plans/marker-minimap-nested-config-probe.ts:48-80`. Declaration dispatch consults the JSON hook at **A** `node_modules/effect/src/internal/schema/toCodec.ts:74-82`; Objects recursively derive their existing fields at `:96-99`, and Union recursively derives its branches at `:100-114`. The public validating constructor is **A** `node_modules/effect/src/Schema.ts:498-520`; parsing uses `SchemaParser.ts:262-272`. Checked links and transformations are `Schema.ts:6386-6395` and `SchemaTransformation.ts:437-445`. These are real installed APIs, not assumed framework features.

The `String | validating configuration` union becomes the shared live marker value schema. Existing `FlowEdgeSchema` and `FlowDefaultEdgeOptionsSchema` stay genuine Structs and retain ordinary `.fields`, `mapFields`, `annotate`, checks and rebuild operations. Existing two-literal `FlowEdgeMarkerSchema` and its type remain compatible. No whole-edge wrapper, fake `.fields` attachment, Struct cast, AST mutation, second Model or custom Runtime serializer is needed.

The original continuation's saved-schema sketch at `:87-90` is superseded by amendment `:11`: saved configuration fields come from the same internal canonical Struct, with the dedicated wire override. They cannot come from `.fields` on the new public Declaration. Sharing fields does not implicitly copy future object-level checks; a numbered implementation must retain or explicitly delegate every canonical validation check, rather than assume field spreading preserves one.

The public configuration declaration is additive. The upstream EdgeMarker type at **P** `packages/system/src/types/edges.ts:92-113` requires its fields and union branches, not Effect Struct operations. Existing Flow's marker kind schema is **A** `packages/core/src/domain/flow.schema.ts:100-102`. The amendment therefore does not withdraw an existing public configuration Struct capability.

## Presence and transport decisions

The outer optional endpoint can use the installed canonical JSON null sentinel because null is rejected as a live endpoint. Its undefined inverse is **A** `node_modules/effect/src/SchemaAST.ts:915-929`. Nested color cannot use that sentinel because both null and undefined are valid and have different rendering behavior. Its checked `colorPresence` wire projection preserves absent, own undefined, null, empty and concrete string separately. Ordinary Schema deliveries retain native values and never expose the wire flag.

Configuration live `colorPresence` and edge/default live `markerEndpointPresence` are rejected with optional-key Never. The probe rejects own undefined reserved keys as well as concrete flag values, checks malformed conflicts synchronously, and leaves similarly named arbitrary user-data keys untouched. Its facade experiment at `:346-349` is a negative diagnostic showing the missing Struct method; it is not an approved product implementation.

Canonical Model JSON and the explicit saved-v2/edge-update transport remain distinct encodings. The former recursively reaches the nested hook and uses outer null sentinels. The latter reserves exact endpoint flags and checks flag/value conflicts before restoring live own keys. The separate wire codec cannot be passed off as the ordinary live Encoded contract. The probe's source-composed widened Model, animation, approvals, queries and changes establish parser feasibility only. Installed Runtime really derives Model JSON at **A** `node_modules/foldkit/dist/runtime/runtime.js:100-104`, so later product proof must run the actual widened application Model and genuine preservation plugin.

The retained persistence policy is coherent. Freeze legacy literal1 fields, acceptance and output, including its own-undefined limitation. Keep origin, native-fields and noncanonical-handle rejection priority, then append the new marker-extension reason. Select additive2 separately for any own-undefined endpoint, even without current defaults; selecting2 must not invent a legacy rejection. Current one-reason coupling is visible at **A** `packages/core/src/domain/flow-persistence.ts:108-144,300-312`. The old reader's unknown-key stripping is a recorded limitation; a new additive1 guard checks known marker extensions before stripping. This policy requires evidence that literal2 remains unreleased, as the continuation explicitly states.

Marker patch decoding must occur before merge/replace and final edge validation. Current core update-edge merges the raw patch at **A** `packages/core/src/domain/flow-edit.ts:168-180`; current Vue filters undefined at `packages/vue/src/use-flow.ts:62-69,555-573`. The proposed narrow helper preserves marker presence while retaining unrelated filtering. Foldkit's revision comparison still uses JSON at **A** `packages/foldkit/src/application.ts:2498-2500`; the narrowly scoped presence comparison is necessary even when canonical Schema equality works. Delegated equivalence preserves optional own-key distinctions at **A** `node_modules/effect/src/internal/schema/toEquivalence.ts:15-25,100-114`.

The accepted factory reuses authoritative edge fields at **F** `packages/core/src/domain/flow-data-contract.ts:47-57`, and document fields at `:60-82`. Keeping genuine edge Struct fields allows that composition to reach the marker declaration. Actual combined factory type/runtime tests remain required; this inspection is not combined source acceptance.

## Retained native and MiniMap policy review

The retained marker behavior matches the inspected reference decisions where intended. **P** `packages/react/src/components/EdgeWrapper/index.tsx:39-41,110-117,244-245` proves effective spread defaults and resolved URL props. Definition collection is a separate path at **P** `packages/system/src/utils/marker.ts:38-43`; it can generate unused defaults when an endpoint is own undefined. Color spread followed by symbol defaults distinguishes absent, own undefined, null and empty. Symbol defaults and conditional styles are **P** `packages/react/src/container/EdgeRenderer/MarkerSymbols.tsx:8-38`; attributes and numeric defaults are `MarkerDefinitions.tsx:12-40`. Finite/nonnegative numbers and legacy built-in string interpretation remain explicit Flow differences. Actual computed SVG and paired reference captures are still mandatory.

The native-only registry contracts keep functions, components, resources and URLs out of graph state. Approve the declared owner-local logical-name policy, no URL plus deduplicated diagnostic for missing names, immutable creation registries for Vanilla/Foldkit and reactive Vue reconciliation. Root ownership, opaque ID allocation, stable resources, detached contexts, generation checks, URL-before-release ordering and exactly-once cleanup are specified sufficiently for later bounded native children. This design grants no such child source scope.

Failure containment is a required feasibility boundary for those later children. Existing Foldkit directly invokes its edge renderer at **A** `packages/foldkit/src/graph.ts:2874-2889`; existing Vue builds marker VNodes directly at `packages/vue/src/flow-canvas.ts:4476-4524`. These do not prove that arbitrary new component, mount, update or teardown exceptions are contained. The continuation requires actual owned error handling and a STOP if the installed native composition cannot preserve healthy resources and accepted graph state. Retain that requirement. Do not infer containment from a try/catch around VNode construction, weaken it to a Runtime crash, or promise rollback of caller-owned external DOM side effects.

MiniMap retains every original prop, graph-space geometry, selected/class/shape-rendering fields, full detached custom style and native event/id callback behavior. **P** `packages/react/src/additional-components/MiniMap/types.ts:116-131` gives the full contract; `MiniMapNodes.tsx:111-123` passes the full style to custom rendering, while `MiniMapNode.tsx:22-40` reads only two background keys for its own rectangle. Existing Flow scaled minimum-pixel boxes at **A** `packages/core/src/domain/flow-minimap.ts:77-85` must remain for default UI. A separate graph-space custom projection in that same owner is appropriate. It does not authorize another graph or a reduced two-key style contract.

No architectural blocker was found in these retained policies. The unresolved color, full CSS style, typed propagation, native geometry and whole-component UI dependencies remain real dependencies, rather than being satisfied by the nested codec. A later child must supply exact public names, source paths and actual lifecycle/error gates before execution.

## Required next handoff boundary

A separately numbered core marker foundation can now be drafted against an explicit accepted candidate. It must specify exact field/config placement, imports and exports, shared wire/check helpers, frozen/additive reader paths, ordered errors, encode/decode operations and all own-key cases. It must name compiler, unit, actual package-consumer and focused verifier scope, including integration with authoritative factory fields. It must not silently implement native registry, Runtime revision/client, full style or MiniMap changes under core schema authorization.

Later native children retain the full actual widened Model, ordinary ports, save/client settlement, marker patch/revision, two-owner physical definition/URL, callback failure/reentrancy/disposal, reference capture, reload/HMR and full integration checks. The original 30 groups and 101 member identities remain unchanged. A read-only query confirmed those counts and their three public host targets; no member state was modified.

The advisory documents are not yet self-contained executable source packets. That is an explicit sequencing requirement, not a reason to repeat the now-settled representation experiment. No new probe, source executor or numbered plan was created here.

## Conformity and deviations

Conforming at the reviewed parser/compiler boundary: one canonical configuration validation authority, checked nested JSON inversion, genuine enclosing Struct methods, ordinary Type/Encoded compatibility, never environments and delegated presence-aware equality. The frozen and independently reproduced receipts establish this boundary only.

Approved intentional design differences: additive public validating configuration Declaration, separate canonical Model and saved/patch wire encodings, finite/nonnegative marker numbers, retained native built-in string interpretation, owner-local logical-name registry and host-specific native resource lifecycles. These approvals describe policies; their actual source/reference/native tests remain unverified.

Unverified: actual widened product schemas and Model, mounted Runtime/ports/HMR, frozen and additive saved envelopes, patch/revision/client behavior, registry failure containment and rendered SVG, full MiniMap propagation, all original 101 members/303 cells, dependencies 068/074/069/086 and whole-component 058, focused/full integration gates, CI, devices and collector delivery. This architecture approval closes none of them.

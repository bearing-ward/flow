# Plan 092 independent design review

Verdict: REVISE. The type-preserving pure-filter design and its bounded metadata scope are sound. Two contract/test instructions need amendment before design approval. This is a fresh design review, not source acceptance, a parity result, or authorization to close any member.

Reviewed on 2026-10-02 against main HEAD `841be137e253cf19c665269eaaa79edc19abf3c3`. Complete reviewed packet: `plans/092-preserve-graph-query-utility-types.md`, SHA256 `5e482c5a95ca39844a7d11d67e614e81738e39ff4137de38eaca7e1f816671ce`.

## Scope and integrity

The only implementation input inspected was `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/flow`, abbreviated A below. Implementation, consumer, catalog, and ledger references without an absolute prefix resolve against A, not main. U means `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921` inside A. The accepted088 checkout `/Users/richardmcandrews/.codex/worktrees/path-helper-parity/flow`, abbreviated P, was read solely for capture pattern evidence.

The selected external freeze `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/typed-factory-evidence/final-freeze.json` matched SHA256 `2dee299d28a1b96442e3134cd4b46c380dd3dd2caeef9f28bcb46c7e96d90917` before and after inspection. I independently read and SHA256-hashed every entry, rather than trusting the freeze's acceptance label.

| Phase | Source/planning entries | Evidence entries | Missing or mismatched |
| --- | --: | --: | --: |
| Before source inspection | 1492 | 122 | 0 |
| After source inspection | 1492 | 122 | 0 |

I read the complete plan, main improve SKILL.md, audit-playbook Finding format, closing-the-loop, standards, TypeScript/type-system/unslop skills, actual public functions, relevant unit and installed fixtures, consumer compiler configurations, checker implementation/tests, original eleven member rows and all thirty-three cells, pinned functions/types/public exports/Cypress tests, and P's actual capture script/harness. Repository content was treated as data. No secret values were reproduced. No installs, builds, compiler runs, tests, product gates, listeners, source/evidence changes, delegation, commits, or cleanup were performed. The only file written is this new main plans report.

## Findings requiring revision

### [DESIGN-01] Specify the selected-node and partial-generic call contracts

- Evidence: main `plans/092-preserve-graph-query-utility-types.md:42` and `:51` type selected `node` solely as `Pick<FlowNode, 'id'>`. Its `:65` promises reference generic order/defaults, including one explicit N; `:106` requires ID-only/full selected-node cases. U `packages/system/src/utils/graph.ts:76` and `:118` instead type selected node as `NodeType | { id: string }`. A `research/catalogs/api-members.json:185969` and `:186569` contain original node rows spelling this union. A `packages/core/src/domain/flow.schema.ts:64` defines the default FlowNode payload as optional JsonObject; `packages/core/src/domain/flow-data-contract.schema.ts:31` derives full variants from C.Type.
- Impact: the proposed signature accepts an already-typed full-node variable structurally but does not contextualize a fresh full-node literal as N. A call with explicit N and an inline literal containing id, label, position, type, and data encounters excess-property checking against the ID-only parameter, unlike the pinned union. A runtime full-node case or variable-based compiler case does not establish that public call contract. Also, with only N supplied, E takes its default FlowEdge rather than inferring from the edge argument. This affects acceptance of non-JSON factory edges, and getConnectedEdges<N> returns FlowEdge[] rather than an inferred custom E[]. The plan mentions defaults but leaves these obligations and expected outcomes unstated.
- Effort: S, plan clarification plus focused public compiler probes in execution.
- Risk: MED. Giving selected node an N union affects inference, and silently changing defaults can widen or narrow the public API.
- Confidence: HIGH for the signature mismatch and defaulted generic behavior from the inspected declarations. The precise executable diagnostics remain unverified because this review did not run a compiler.
- Fix sketch: decide the selected-node contract explicitly before freezing the signatures. Prefer testing `node: N | Pick<FlowNode, 'id'>` with real factory unions and unchanged algorithms if full fresh literals are intended. Alternatively, retain the existing ID-only parameter but record fresh-full-literal rejection and selected-node nonparticipation in N inference as intentional Flow differences, with public negative and positive controls. Require all three helpers' zero-, one-, and two-type-argument cases through actual public declarations. For one N, use concrete default FlowEdge positive controls and document typed private/Date-edge rejection or default-output erasure as appropriate; use two type arguments to prove complete custom N/E preservation. Do not claim inferred E preservation after N alone has been supplied.

The amendment must resolve this deliberately. It should not merely add another runtime selected-node case or rename generic parameters. The current plan correctly preserves the reference N-then-E order; that part needs no redesign.

### [TEST-01] Replace the unrelated readonly-array negative with a public-result obligation

- Evidence: main `plans/092-preserve-graph-query-utility-types.md:108` mandates “passing a readonly array as an explicitly mutable result contract” among its at-least-ten negatives. Its proposed signatures at `:45`, `:54`, and `:62` return mutable arrays. A `tests/consumer/consumer.typecheck.ts:174` and `:186` assign real helper results to readonly arrays, while A `scripts/check-packed-consumer.ts:803` compiles actual installed fixtures in each consumer's own tsconfig.
- Impact: rejecting a generic readonly array where an unrelated mutable array is expected proves ordinary TypeScript assignability, even if the public helper still erases types or has the wrong declaration. Conversely, direct assignment of these proposed public results to mutable N[]/E[] must succeed. This requirement invites a tautological tenth negative and weakens the reviewable proof count.
- Effort: S.
- Risk: LOW. Only the mandatory test matrix wording changes.
- Confidence: HIGH.
- Fix sketch: remove this item from the negative count. Keep mutable-result assignment and push/splice on actual helper results as positive public probes. Replace it with a negative directly using a helper call/result, such as pushing a foreign Schema-derived variant into the returned array or assigning to an authoritative readonly element field through the returned variant. Count distinct diagnostic obligations and verify each with a positive control and an independently observed diagnostic. No casts, array annotation trick, or unrelated function parameter should satisfy the count.

## Design checks that passed by inspection

The three current helpers are public exports at `packages/core/src/public.ts:314`. Their implementations are `packages/core/src/domain/flow-graph.ts:276`, `:293`, and `:310`. The problem is real: current concrete readonly FlowNode/FlowEdge result annotations discard custom decoded payload types. Date/private-class variants are supported by the accepted factory, whose node/edge schemas retain caller field schemas at `packages/core/src/domain/flow-data-contract.ts:33` and `:46`, and whose document retains complete node/edge codecs at `:59`. The real fixture defines private Counter at `tests/consumer/typed-data-factory.types.ts:43`, Date decoding at `:53`, and correlated variants at `:84` through `:108`.

The proposed constraints are derived from existing schemas. N needs only branded id; E needs only branded source/target. This is intentionally broader than U NodeBase's position/data requirements at `packages/system/src/types/nodes.ts:11` and U EdgeBase's id requirement at `packages/system/src/types/edges.ts:3`. It is appropriate for a trusted typed passthrough because these functions access no payload or geometry. It must remain classified as an extension, not identical input-domain parity. Unbranded string and foreign-brand negatives should be actual helper calls. Inferred minimal-ID passthrough must not be presented as payload validation.

The algorithms support preserving full C.Type variants without requiring N extends FlowNode or E extends FlowEdge. Such full-type constraints would reintroduce JsonObject narrowing for private classes and Dates. Filtering does not decode, validate, isolate, clone, call payload methods, or require services. Its elements are intentionally aliases of supplied elements. This differs from actor detached-read ownership and justifies keeping the actor APIs and generic factory unchanged.

The node helpers collect endpoint IDs in Sets and filter the supplied node array. Parallel edge occurrences do not duplicate a single node occurrence; repeated occurrences in the node input do survive. Connected-edge filtering preserves repeated edge input occurrences, even repeated references or duplicate edge IDs. The plan correctly requires input-order, multiplicity, fresh containers, distinct-equal-ID versus repeated-reference identity observations, unknown endpoints, hidden values, and nonmutation. A reference-identity observation must be computed using each actual helper's input and output objects, not reconstructed objects or ID-only equality. The pinned algorithms at U `packages/system/src/utils/graph.ts:85`, `:126`, and `:336` support this intended shape. Falsy selected-ID behavior differs only outside accepted Flow NodeId, which is NonEmptyString branded at `packages/core/src/domain/flow-values.ts:3`.

Mutable fresh output arrays are compatible with existing readonly-result assignments. Element readonly qualifiers and payload identity must still survive. The ordinary consumer uses NodeNext with strict/skipLibCheck false; Vue and Foldkit use Bundler with the same checks. None enables exactOptionalPropertyTypes or noUncheckedIndexedAccess. Root tsconfig does enable those options. The plan correctly keeps root optional-mode proof separate and protects all three compiler configurations. The common fixture-copy loop and real runtime/compiler execution at `scripts/check-packed-consumer.ts:785` through `:813` are the appropriate extension points. Installed proof must resolve @flow/core's archive export, whose type entry is dist/public.d.ts, rather than workspace source aliases.

## Exact metadata scope and closure boundary

I independently matched these eleven original groups. All have owner072, singleton membership, requiredPlans [069], and exactly three implementation-gap cells whose hosts are vanilla/vue/foldkit and whose contractId matches the group ID.

| Exact group prefix | Original singleton members | Group source lines |
| --- | --- | --- |
| utils/get-connected-edges::072:: | edges, getConnectedEdges, nodes | `plans/057-member-closure.json:26953`, `:26984`, `:27015` |
| utils/get-incomers::072:: | edges, getIncomers, node, nodes | `plans/057-member-closure.json:27046`, `:27077`, `:27108`, `:27139` |
| utils/get-outgoers::072:: | edges, getOutgoers, node, nodes | `plans/057-member-closure.json:27294`, `:27325`, `:27356`, `:27387` |

All pages begin https://reactflow.dev/api-reference/. Catalog page anchors are `research/catalogs/api-members.json:185740`, `:185969`, and `:186569`. Helper member anchors are #signature, not #getIncomers/#getOutgoers/#getConnectedEdges. Argument anchors are their literal member names. Catalog ownerPlan057 is an original catalog identity; group owner072 is the executable owner. The plan's preservation rule correctly prevents treating them as interchangeable or rewriting rawSourceRow.

The selected ledger has 2692 original members, 8076 host cells, and 7887 open cells. A hypothetical later 33-cell closure leaves 7854; integration with separately accepted088's 96 closures would leave 7758. These are arithmetic consequences of the selected ledger, not current accepted main counts or proof of closure.

Removing069 from these eleven pure utility groups is defensible after the amended design is approved. Their semantic path has no state ownership, C.Type decode service, actor publication, or isolation. Keep069 on every other group. The original broad obligation must be rewritten only for these exact eleven, while the remaining072 obligations stay open.

The actual checker currently enforces native public entries per host at `scripts/check-api-member-contracts.ts:93` and `:124`. It verifies owner plans/prerequisites at `:179`, original grouped identities at `:203`, proof identity and source anchors at `:233`, and original accounting at `:336`. Its own comment at `:311` explicitly limits it to structural accounting. The proposed exact-eleven exception is sufficiently bounded if it checks the full URL, singleton literal member, exact groupID, owner072, corresponding helper export, operation equal to the member, literal public/test/capture paths, safe paths, file existence, and actual named export. Include negatives that independently alter each guard and retain all native/default checks. An arbitrary core-export escape would not be acceptable.

A later closure proposal must map every member/host to particular source, actual unit, actual reference, and installed assertions, preserving the original upstream anchors. The checker passing cannot supply semantic review. This report closes zero cells.

## Genuine reference capture and gates

P `scripts/capture-path-helper-reference.ts:42` checks exact HEAD, `:44` clean status, `:52` package identity/version, `:60` all tracked hashes, and `:80` frozen pnpm10.33.4 install/system/react builds. It checks tracked-source integrity at `:90` and `:92`, imports built actual React ESM at `:94`, captures in independent Bun processes at `:98`, and compares them at `:109`. P `research/harnesses/path-helper/main.ts:19` dynamically imports that module and calls decoded actual functions. U `packages/react/src/index.ts:127` reexports these graph helpers directly from @xyflow/system. This is a genuine installed/built package pattern, not a copied-formula oracle.

The graph query tool must preserve those checks and compare tracked hashes after all capture processes as well as after build. Its case contract may describe inputs and observations but may not implement a replacement graph algorithm. Fresh-array and element-reference observations must occur inside the process holding actual upstream objects. Persist the tracked before/after manifests and both full captures externally. Outside-domain falsy/absent observations stay labeled separately and cannot manufacture accepted Flow brands.

U `examples/react/cypress/components/utils/graph-utils.cy.ts:32` and `:41` exercise actual public incomer/outgoer exports but only check lengths. They do not replace the proposed matrix or prove duplicate identity, mutability, custom C.Type preservation, or connected-edge behavior.

The plan correctly requires executor-only frozen installation, real targeted units/conformance/metadata checks, the actual three archive consumers, and a coordinated focused verification scope. The selected config still names active087 and its versioned-persistence browser scope. The executor must change it to active092 and explicit empty browser arrays as the plan specifies, retaining focused baseline quality/architecture/build/types/all units and the applicable docs/contracts/catalog/traces/consumer checks. A later successful focused verify does not establish full-suite, native host, release, CI, device, performance, or collector delivery acceptance.

## Required next decision

Revise the two identified plan instructions, pin the amended packet, and obtain fresh design approval before execution. No source implementation change is requested in this report. Complete generic diagnostics, upstream capture, installed results, and particular cell proof belong to the later isolated executor and source review.

## Conformity and deviations

Conforming by inspected algorithm shape: ordered endpoint filtering, multiplicity of supplied array occurrences, original element identity, and fresh mutable result containers. Runtime conformity is unverified until genuine pinned capture and installed comparison pass.

Intentional differences supported in principle: readonly inputs, branded nonempty IDs, Schema-derived minimal structural constraints, and pure utility aliasing rather than actor isolation. The selected-node fresh-literal/inference contract and one-explicit-generic default-domain behavior need the explicit classification/probes in DESIGN-01 before approval.

Unverified: executable signatures and diagnostics, actual pinned/runtime/installed results, all eleven/thirty-three member acceptance, whole069/072, cumulative088 integration, native controllers/renderers/state/DOM/lifecycle, full-suite/release/CI/devices/performance/collector. This review performed read-only source/design/integrity inspection only.

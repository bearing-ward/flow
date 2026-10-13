# Independent generic-role residual review

2026-10-02. **APPROVE — bounded semantic design correction only.** The CORRECTNESS-03-R1 residual in the second cold review is resolved. This verdict covers the corrected generic-role packet and preservation of previously reviewed nongeneric policies. It does not authorize a source child, assign a plan number, approve a public API, or close an original member cell.

## Reviewed identities

| Input | SHA256 |
| --- | --- |
| Current receipt | `29b9125c2b4cb2270b7276f08800e079e94e34e961ca352d21d3a8f54e51c8ec` |
| Current generator | `4dad6e05c2aa3280917df342ae3f604468b982ef7e73c14378b8be8d92b4afcc` |
| Current 071 JSON | `cf4ffc13a4c7abb13be043bbce67933855706320e65160ede706bc42e3709340` |
| Current 074 JSON | `47921b4865e7c12e1422178871613d7a7e74ea25e308b277d6f96e7a20fd7e14` |
| Current 071 Markdown | `7d9a9aa43b5d1604ff8a66d9bc2c913382ab4fbe88ac5a88890325e2ff5a82a3` |
| Current 074 Markdown | `a0d7b2273509d7427626442e1a481d6800a15c631c88545287a115fdd4d4938b` |
| Second-review input archive | `15e7b7fe2463041e1aff43a44d419c0c2dfd11f60dc567ff495e0e2b8d34d498` |
| Preserved second review | `498e1464635764362703f095a41c8c97d3a4f781273b9664b739ed90b527399d` |
| First-review input archive | `c7e791f03d4f80694ca84089d6950c0b93d1a085b6999ad4a1a0a7e17c15ddd3` |
| Preserved first review | `2d698855c15dec8a2c8a33e2c5699e8c861ea603fd932815b2b1e7d231021a6b` |

Personally read the revised generator's changed role, operation, compiler-obligation, variant and regression logic; both corrected policies; all six cells' ten dimension expectations; current receipt; and actual pinned/accepted type and isolation sources. Parsed the full current JSONs and independently compared them with the preserved second packet. Verified all receipt input/output/pinned-source/lineage hashes, every archived manifest entry, and preserved historical review/archive hashes against actual bytes. No historical review was rewritten.

## Correctness and coverage findings

No remaining finding within this bounded residual scope.

The exact corrected identities are:

| Page/member | Host cells | Role and consuming value |
| --- | --- | --- |
| `https://reactflow.dev/api-reference/types/node` / `Node#1.NodeData` | vanilla, vue, foldkit | `type-only-declaration`; actual `node.data`, required by NodeBase |
| `https://reactflow.dev/api-reference/types/edge` / `Edge#1.EdgeData` | vanilla, vue, foldkit | `type-only-declaration`; actual `edge.data`, optional in EdgeBase |

Actual declarations confirm the correction. Under pinned root `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/`, `packages/react/src/types/nodes.ts:13`–`:16` and `packages/react/src/types/edges.ts:54`–`:57` declare the type parameters with constraint and default `Record<string, unknown>`. `packages/system/src/types/nodes.ts:23` declares `data: NodeData`; `packages/system/src/types/edges.ts:24` declares `data?: EdgeData`. There is no runtime NodeData/EdgeData property.

Both corrected records now explicitly carry `isGenericParameter`, type-only original/native roles, no runtime property presence, exact compiler constraint/default and positive/negative consuming-type obligations. Generic omission refers to an omitted type argument and its compile-time default. Runtime data presence is checked separately under the NodeBase/EdgeBase contract. The default is not a runtime scalar value, and own-undefined is not a fabricated generic-parameter patch.

All 60 dimension records—six cells times default, absent, ownUndefined, explicitFalse, explicitZero, update, cancel, dispose, order and independentOwner—are direct-applicability false, type-only, and `viaConsumingOperation: true`. Their operation IDs are `typed-node-data-document-update-and-renderer` or `typed-edge-data-document-update-and-renderer`. Update/refusal/cancellation/disposal/order/isolation requirements observe the actual data-carrying owner and renderer after 069 integration; they do not imply resources or commands on a type parameter. The cancellation baseline remains operation-specific and preserves the last accepted data subtype.

The new regression coverage audits all 511 retained descriptions before role filtering. The 071 prefix audit sums to 217 records with no generic-parameter row; 074 sums to 294 with exactly the two generic rows above. This closes the earlier coverage hole in which a record omitted from the type-only set escaped checks over that set. Exact identities and all six cells are asserted, without relying solely on a count.

Decoded data remains separate from encoded transport/persistence. The corrected ownership/proof/operation text explicitly preserves codec-decoded class/service/type channels and supplied isolation, without JSON coercion or a new decoded-value restriction derived from the compiler Record bound. Accepted 087 source at `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/flow/packages/core/src/domain/flow-data-contract.schema.ts:24`–`:33` derives node/edge types from codec Type; `:56`–`:65` specifies Effect isolation over that decoded Type. The same foundation's `flow-data-contract.test.ts:192`–`:219` supplies Date/Counter copies and `:324`–`:354` contains independent-copy assertions. Those are personally read source/test declarations, not newly executed tests or proof of native host adaptation. Actual 069 public-owner/renderer integration must still demonstrate that decoded class values and isolation survive native adaptation.

## Preservation and read-only checks

Independent structured comparison found exactly two changed member policies and six changed cells. All 509 nongeneric member records and 1,527 nongeneric cells are equal to the second-review archive as full structured values. The generic records retain every original member metadata field; their original cells, targets, production routes and proof identities remain intact. Every original group, child source/member allowlist and separate numbered API prerequisite remains equal to the preserved packet. No unreviewed nongeneric semantic change was found.

The current cardinalities remain 071: 108 groups/217 members/651 cells and 074: 121 groups/294 members/882 cells. Every one of the 1,533 cells is still OPEN/unverified; proposed proofs remain unpassed. Both API plan number and public command remain null. 086 remains unaccepted, and 087 is a foundation rather than actor/host acceptance.

Executed only the explicitly requested read-only design check, `python3 plans/callback-field-matrix-design.py --check`: exit 0, 18 semantic assignment regression checks passed. Independently checked archived/current values and hashes rather than treating that result as semantic proof. This is a generator/accounting regression result, not a compiler, browser, focused/full verification, integration or parity pass.

No source, imported evidence, matrix, generator, receipt, historical archive or historical review was edited in this recheck. No product probe/gate, install, build, browser, port or other agent was used. Only this review artifact was written. Previously resolved findings retain the second review's source evidence and limits; this recheck did not reopen all upstream/runtime branches.

## Conformity and deviations

Conforming at this design boundary: the two generic parameters now have compiler roles, exact bounds/defaults and actual data-consuming lifecycle links; all nongeneric reviewed policies, original identities/dependencies, source proposals and open states are preserved. The bounded CORRECTNESS-03-R1 residual is resolved.

Native events/presentation, subtype isolation, ancestor visibility, atomic graph integrity and reliable key-option replacement retain their prior unapproved difference candidates and future paired/native evidence boundaries. Product behavior, compiler probes, native adaptation, complete source packets and broader parity remain unverified. **APPROVE applies only to this semantic design packet; no semantic product closure or executor authority follows.**

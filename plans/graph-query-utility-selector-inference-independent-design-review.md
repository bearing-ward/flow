# Graph query selector inference independent design review

REVISE DESIGN. The proposed built-in `NoInfer` correction is sound in the independently reproduced public compiler matrix. One execution-order conflict needs a bounded clarification before resuming the stopped executor. This is a design verdict only. It grants no source acceptance or member parity.

Reviewed 2026-10-02 against main `841be137e253cf19c665269eaaa79edc19abf3c3`. Sole candidate `/Users/richardmcandrews/.codex/worktrees/graph-query-utility-types/flow`. Evidence and actual upstream checkout are its siblings `graph-query-utility-evidence` and `graph-query-reference-xyflow`.

## Exact packet and immutability

I read the complete selector amendment, original Plan092 and installed fixture amendment, in that order. Their independently calculated SHA256 values match the requested inputs:

| Artifact | SHA256 |
| --- | --- |
| `plans/graph-query-utility-selector-inference-amendment.md` | `b7789481afd7014d0b498a32e7bbf5aadaed3e987374a19a7b565de9f98f4249` |
| `plans/092-preserve-graph-query-utility-types.md` | `1d409e895b7ea113eb336bc41ffaaff373465d5f6bf1aaea5e0f320e4015ff6c` |
| `plans/graph-query-utility-installed-fixture-amendment.md` | `a2e33127aabeed3a9784f5559adf8eca445a02e27e22b1368b102eceaa9bb8b1` |
| Sibling `diagnostic-report.json` | `8ca0e74bf982621600d0a942274c0c4f5a8567d184f180bb1b2c63efa0e5e2ab` |

I independently rehashed every source and evidence entry in both complete manifests before and after the compiler investigation. Neither manifest, any covered file, nor the original failure evidence changed.

| Freeze | Source entries | Evidence entries | Before mismatches | After mismatches | SHA256 |
| --- | --: | --: | --: | --: | --- |
| `stop-freeze.json` | 1503 | 157 | 0 | 0 | `02b51688c974a07d6a49287e6aa78fe12de1bde37f3c5de7db7251a34a3d7778` |
| `diagnostic-freeze.json` | 1503 | 186 | 0 | 0 | `fd4a58e9b2fad6036ddf1c3985b336c85b75ca6cb02a2898b11ab55d9a09833f` |

The actual upstream checkout is clean at `0a1f9575b25679f2880175de8d3eae21aedde921`, with 697 tracked files. I rehashed all 697 against the frozen before manifest with zero mismatches. The recorded after-build and after-capture manifests equal that before manifest. I did not install or rebuild upstream.

## Finding

### [DESIGN-01] Make cell transition ordering executable

- **Evidence**: `plans/graph-query-utility-selector-inference-amendment.md:35` keeps all 33 cells OPEN until all original gates and primary/fresh independent SOURCE approval. `plans/092-preserve-graph-query-utility-types.md:118` orders proof approval and bookkeeping before focused verification. `plans/092-preserve-graph-query-utility-types.md:119` then requires final freeze, primary reproduction and cold SOURCE review. Amendment `:39-41` preserves the original scope and gates without naming a replacement sequence for this conflict.
- **Impact**: An executor following original step 5 would transition cells before the newly required source approvals. An executor following the amendment must defer bookkeeping past the original final freeze and source review, then change the reviewed source packet. The current text does not say which stages must repeat or which approval authorizes that final delta.
- **Effort**: S, a bounded plan clarification and fresh hash review.
- **Risk**: LOW. Clarifying the sequence does not require a signature, runtime, test, config-policy or ledger-policy change.
- **Confidence**: HIGH. Both instructions are explicit and apply to the same 33 cells.
- **Fix sketch**: Keep the original plan immutable and state the overriding sequence in this amendment. To preserve its stronger OPEN requirement, first run the complete gates with the 33 cells open, freeze source and the particular-member proposal, and obtain primary/cold SOURCE plus root proof approval. Then authorize only the exact reviewed 11-member/33-cell bookkeeping, rerun the required affected checks and focused verifier, freeze again and obtain final primary/cold SOURCE confirmation before DONE. State this staged sequence expressly. Alternatively, explicitly restore original proof-approved bookkeeping before final verification, while retaining source approval as a completion requirement, if that is the coordinator's intended policy.

No other blocking design finding was found in this bounded review. The review does not require broadening the corrective source delta.

## Independent compiler evidence

I read the actual `virtual-noinfer-v2.mjs`, `public-selected-inference.ts`, complete `virtual-factory-types-v2.ts`, every obligation in `virtual-noinfer-negative-proof-v2.json`, the complete diagnostic report and main `plans/graph-query-utility-primary-selector-diagnostic.json`. I inspected the primary's individual diagnostic codes and obligation matches rather than relying on its summary.

I then authored a separate diagnostic driver in `/var/folders/kd/6rwxf_c92zn45w5n_75r3gx80000gn/T/flow-092-cold-design-lkkr5unn`. It imports the candidate's actual TypeScript 5.9.3, parses the frozen external compiler config, imports actual public production declarations through the frozen probes, and overlays exactly two selector strings in the compiler host. It never emits or writes candidate source, probes or frozen evidence.

Reproduction command:

```sh
bun /var/folders/kd/6rwxf_c92zn45w5n_75r3gx80000gn/T/flow-092-cold-design-lkkr5unn/review.mjs
```

The driver exited 0 after checking these expected results:

| Diagnostic mode | Actual result |
| --- | --- |
| Physical stopped signatures, v2 probes with directives | Four errors: public probe lines 11 and 12, TS2322; lines 13 and 14, TS2345 |
| Exactly two virtual `NoInfer<N>` selector replacements | Zero positive diagnostics |
| Same virtual signatures, all expect-error directives removed | 19 errors, individually matched to all 19 intended argument/result lines |
| Physical source and frozen v2 probe after compilation | Byte-identical to their initial contents |

Driver SHA256 is `6cb3d21801607a9542746f0659f6fd0bda59707cb44e5f1cd9a7cbd7f37ef973`. Receipt `receipt.json` SHA256 is `09564f7dbe28bc6b2c66346a5e70043229e4f37165b17a8dd44f5b8e71ed5760`.

This uses the external diagnostic config's strict/exact-optional mode. It is an independent design probe, not the candidate whole typecheck or any installed consumer compiler gate. All three actual archive modes still must run unchanged.

## Type and runtime assessment

Actual production exports are `packages/core/src/public.ts:314-317`; they reach the three pure helpers at `packages/core/src/domain/flow-graph.ts:276-328`. Neighbor selectors at `:280` and `:300` can currently infer the minimal `N` from a named ID-only selected variable. Their runtime returns elements from the supplied node collection, so the minimal return type erases the actual element payload. The frozen whole-typecheck log preserves the failure of the original reference-inclusion assertion at `packages/core/src/domain/flow-graph.test.ts:500`.

Built-in `NoInfer` is the installed compiler intrinsic at `node_modules/typescript/lib/lib.es5.d.ts:1680`. Blocking inference only through the selected `N` branch lets the supplied nodes determine `N`. It adds no import, cast, helper, dependency or runtime check. The v2 public probes preserve full FlowNode results and inclusion compatibility; zero/two-argument custom node and edge unions, decoded Date/private Counter fields, full contextual literals, optional/untagged variants and mutable result arrays compile. One explicit `N` retains the approved `FlowEdge` default and does not infer custom `E`.

The selected union supplies an ID, not authoritative payload validation. The proposed correction at frozen external `virtual-factory-types-v2.ts:115` puts the malformed discriminator/data pair in an explicit `N` nodes argument. That is the correct boundary to test. The physical owned consumer negative at `tests/consumer/graph-query.types.ts:115` remains unrepaired, and the failed v1 TS2578 remains frozen. It must be preserved as failed evidence. No runtime decoder belongs in this correction.

Each of the 19 stripped negatives consumes a real helper argument or result. The matrix has more than ten distinct semantic obligations even though the three one-N default-edge rejections exercise the same rule across three APIs. The last `wrongPrivate` probe at external `virtual-factory-types-v2.ts:139` rejects Counter versus Date structurally; its actual diagnostic should not be described as proof of incompatibility between two distinct private brands. Exact Counter preservation is supported by the positive narrowed-result assignments at `:78-80` and `:88-90`.

I compared all three stopped runtime bodies to main's corresponding bodies and found them byte-identical. Main's graph test has the original plan's hash `4c5455f39b11ab45fdc901b692be5dc98b56d99841991680ce2a05ca830fde77`; those entire 17207 bytes are an exact prefix of the stopped candidate's test. Existing assertions were preserved, with candidate additions afterward. This is scope evidence, not runtime acceptance. The corrective implementation must keep those bodies and original assertions unchanged.

Production reads IDs/endpoints, constructs a Set and filters the supplied array in input order. This path has no browser state, geometry projection, DOM work, scheduler or lifecycle effect. Unit tests reach the real implementation. The compiler probes import the public core source; planned installed probes must reach the real `@flow/core` archive. These are different proof contexts.

## Pinned declarations and deliberate differences

I read the genuine built public declaration chain and upstream compiler probe. Actual system `dist/esm/utils/graph.d.ts:42`, `:68` and `:152` use `NodeBase` and `EdgeBase` defaults. `dist/esm/types/nodes.d.ts:10-19` requires position and data in addition to ID, so an ID-only selector cannot supply a complete `NodeBase` inference candidate. Flow intentionally permits the lower Schema-derived branded-ID minimum. Its `NoInfer` mechanism need not match upstream compiler internals.

Actual `dist/esm/types/edges.d.ts:2-20` uses default `Record<string, unknown>` data. Frozen upstream probe `upstream-generic-declarations.ts:38-42` accepts the nested Date/private Counter edges with one explicit `N`, while losing precise `E` in its result. Flow's corresponding one-N default is JSON `FlowEdge`; external v2 `:125-131` rejects those non-JSON inputs and rejects treating the default result as precise custom `E[]`. The amendment correctly makes this difference explicit at `:33`. Readonly input acceptance, minimal node/endpoint structures and branded IDs are also deliberate domain differences.

## Execution scope and outstanding proof

The combined packet confines the corrective implementation to two selector strings, the one owned authoritative-node negative correction and owned additive public probes. Original allowed fixtures, exact fixed checker exception, documentation and conditional metadata work remain governed by the complete original packet. No algorithm/default/schema/barrel/framework/actor change is needed.

The installed amendment is operationally concrete. Existing new runtime imports at `tests/consumer/graph-query.runtime.ts:5-6` require its nested source-relative layout. It specifies four byte-identical copies per disposable consumer, exactly two new nested include entries per existing config, normal traversal of the case module and invocation of the nested runtime. Existing runner `scripts/check-packed-consumer.ts:774-816` preserves the old consumer copy loop, two factory copies, factory invocation, actual archive import, peer/compiler/browser checks and disposal. Those old flows must remain unchanged. None of the new installed-copy or archive gates has run in this review.

The actual ledger has exactly 11 selected groups and 33 cells, all currently `implementation-gap`. Across the candidate there are 7210 implementation gaps and 677 evidence gaps, or 7887 open cells. All selected `requiredPlans: ['069']` entries remain unchanged. Checker `scripts/check-api-member-contracts.ts:51-71` supports both `implemented-with-evidence` and `reviewed-native-difference`; the latter requires specific review reason and test boundary. The amendment correctly forbids forcing equivalent disposition where the accepted type domains differ. It preserves every unrelated 069 dependency and leaves whole 072/069 open.

After the ordering clarification and new design approvals, required proof remains the actual whole typecheck, focused graph/checker/conformance units, individually consumed public/factory negatives, paired 22-case real upstream captures, complete immutable pin/build receipts, exact metadata/contracts/dependency reconciliation, all original quality/architecture/docs/traces gates and four copied-byte receipts in each of three actual archive contexts. Shared archive/focused runs still require the coordinator's explicit lease in the stated 086, 089, 091, 092 order. The configured focused verification must retain baseline checks and name the added checks with empty browser test lists and `fullSuite: false`. Final complete freezes, primary reproduction and independent SOURCE approval remain mandatory.

This review read the requested improve skill, closing-the-loop guidance, finding format, project standards and TypeScript/type-system/unslop skills. It wrote only this new main plan report and the separately allowed external diagnostic driver/receipt. It did not edit candidate source/evidence, install/build, run shared checks or ports, dispatch agents, transition metadata, commit, merge, publish or clean up. I did not audit the full implementation, every runtime/capture assertion or unrelated plans and source.

## Conformity and deviations

Conforming in this design diagnostic boundary: full supplied node/edge types survive zero/two generic calls, the selected ID-only variable no longer erases node-array types, contextual full selectors compile, and corrected authoritative-node negatives fail through actual public arguments. Runtime bodies and protected original assertions remain unchanged. These observations approve the proposed type mechanism only.

Intentionally different: Flow branded IDs, minimal structural helper input, readonly collection acceptance and JSON default `FlowEdge` data under one explicit `N`. The actual pinned default accepts Record payloads including the tested Date/private Counter fields. Final member evidence must name those differences and its compiler/runtime test boundaries.

Unverified: corrected physical source, actual whole typecheck and unit/conformance executions, all three new installed archives, focused verifier acceptance, final source review, particular 11-member/33-cell closure, whole 072/069, cumulative integration, browser/native rendering, full-suite/release/CI/devices/collector delivery and publication. The staged cell-transition sequence is the one design revision required before restart.

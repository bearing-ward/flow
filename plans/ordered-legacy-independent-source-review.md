# Independent ordered legacy source review

2026-09-30. **Provisional source verdict: APPROVE the reviewed 082 source and test checkpoint, pending executor gates, final documentation/provenance freeze and primary reproduced verification.** No blocking source finding remains in this checkpoint. This does not accept complete070, activate081 or close any original member or parent.

The reviewer read the complete canonical082 plan and its complete-envelope and assembly-quality clarifications, the independent and primary architecture records, the frozen070 implementation, the actual frozen reader oracle and the new source/tests. Only this main planning record was written. No source/input/status-index edits, dependency installation, builds, tests, verification commands, browsers or ports were used. Read-only file inspection, diffs and SHA-256 computation establish the claims below. Executor-reported gate results were not independently reproduced by this reviewer.

## Compared source checkpoints

Input root: `/Users/richardmcandrews/.codex/worktrees/complete-persistence-integration/flow`. Reviewed082 root: `/Users/richardmcandrews/.codex/worktrees/ordered-legacy-integration/flow`. Both use baseline `841be137e253cf19c665269eaaa79edc19abf3c3`. The executor identified the source/test checkpoint as stable for reading; documentation and gate recording were still active. These are exact reviewed source hashes, not a claim that the complete output inventory has reached final acceptance.

| File | Frozen070 SHA-256 | Reviewed082 SHA-256 |
| --- | --- | --- |
| packages/core/src/domain/flow.schema.ts | e6f3f97ffbaa99721b71d4e3474135e37cdf6030731f66eedb98b934e454130c | e16ec445c9cdb041ca1da01633a2a041f43498cb9a52ba85640014aaab7379a6 |
| packages/core/src/domain/flow-persistence.ts | fb4233531b44958dc03adf71bf7cb38ee52d767571b86614f4b081f3a11a5077 | b28e1ba66049810f61d653ad7990531201a37074bac95a860aefe4a5214628e0 |
| packages/core/src/domain/flow-origin-persistence.test.ts | b718c76fe613116d8a7aa3e7367a8a41513137a8624aaafc0f4af17181d692f9 | ad0954e2301a96bb3279cf4f22e3813e472be23f03fbca80308104c032c9c96b |
| apps/shared-e2e/interaction-lifecycle-contract.ts | aaa42793c564fb2ee64d0c6838730eeb54829f17a780e0316e52261356bca67e | d8ebc0e2f556521649bb06eb8da7aa5b76399f5a27c50455c4515516e51566cb |
| apps/vanilla/e2e/interaction-lifecycle.e2e.ts | 03cef7b67b9821505f713839a1a7f24223f326fa97d8b890f569f9294dc72b52 | 3927b8be44fc58437bfa198bc0e655d99e745fc6112a678543b12fef99695083 |
| apps/vue/e2e/interaction-lifecycle.e2e.ts | b2420222ed07ecf201695e94a769fa1bb45a7158fb4bcd7663684d9f8ad11eb0 | 3f530b7fb0d0b52bf99b4b02a2cd966714ee2c733540ebda61657517a027e4e9 |
| apps/foldkit/e2e/interaction-lifecycle.e2e.ts | eda7dceeb989fe6ff1cb928217b786e3ad5bb0aaa9409fb0ecbf9e0aa16b1e7a | 38d579b3b3681ab6483a17009fd5b8625570572db0de85cef931bd29e1dce28c |

Personally checked unchanged in both roots:

| Evidence | SHA-256 |
| --- | --- |
| research/fixtures/interaction-lifecycle.json | 7ac47c49a0d567580fb3076c7252b60b89976df9bb866ca373e07663925d7db1 |
| research/fixtures/origin-connection-reference.json | 06d04831bd9bae9886bb8d62676ecfc44547e160cda0e7a40b0ba2fee5515643 |
| packages/conformance/src/fixtures/legacy-v1-persistence/baseline-reader-writer.js | 5fddef8419c2e15a65e898a1e6578a1ec960a6574076ac2612845f93194f2998 |
| bun.lock | e6cd3b1436a12de7c05349f4dcb248238df53b9f93862d9f80b7c57b7cbabb4d |

The primary's separate108-file provenance audit and earlier gate histories are retained evidence, not reproduced here. This review compared the bounded implementation/test delta against frozen070 rather than attributing inherited assembly hunks to082.

## Production policy and envelope ordering

`packages/core/src/domain/flow.schema.ts:287-362` adds a private discriminated physical-ID/canonical-kind policy inside the existing ordered integrity traversal. Duplicate node indexing, parent checks/cycles, duplicate edges and duplicate handles retain their order. Each edge still checks source node, target node, source handle and target handle in document order. Only the explicit handle predicate adds canonical kind under the legacy policy. Missing and own-undefined handle IDs retain the existing absence behavior. This resolves both global-priority and earlier/later-edge defects without an all-edge kind precheck.

The shared validation/decode workflow at `flow.schema.ts:414-468` retains current error classes, structured integrity attributes, logging and spans. Public `validateFlowDocument` and `decodeFlowDocument` keep the physical-ID default and existing signatures. `decodeLegacyFlowDocument` is module composition for persistence; it is absent from `packages/core/src/public.ts`. There is one graph authority and one traversal per reader path.

`packages/core/src/domain/flow-persistence.ts:186-232` now routes frozen document/session projections through that ordered legacy decoder. The additive1 complete expanded envelopes at :259-267 include the unchanged viewport schema. Document/session branches at :349-354 and :384-391 validate the complete envelope before their single graph traversal. The helper at :329-339 reuses the validated document, checks known format semantics and applies the frozen field schema projection. It does not call the full legacy reader again. Thus malformed/missing viewport schema failures can precede graph integrity, while valid origin/native metadata cannot mask ordinary legacy graph errors. Live/v2 uses the unchanged physical-ID decoder. The old kind helper remains only a writer capability predicate after ordinary validation.

## Test assertions and historical evidence

`packages/core/src/domain/flow-origin-persistence.test.ts:681-918` supplies17 mixed-invalid graph cases, including every global-priority category, both endpoint nodes, missing versus wrong-kind handles and both earlier/later-edge directions. Expected failures come from the immutable frozen reader. Schema-derived encoding compares the complete typed tag/payload fields across frozen/current/additive document and session readers; separate assertions check actual current error constructors and unchanged input. This is independent oracle comparison, not expected output computed from the changed traversal.

The viewport matrix at :921-960 combines each graph case with zoom0, wrong primitive zoom and missing viewport. It compares actual SchemaError identity and formatted issue paths/details with the frozen session reader. Absence/own-undefined and invalid excess stripping remain compared at :962-1008. Known origin/native metadata combined with ordinary invalid graphs remains tested at :1010-1050. Existing valid-v1/v2, version, ownership and format matrices remain present.

`apps/shared-e2e/interaction-lifecycle-contract.ts:15-35` preserves the historical export and creates a distinct current projection. Its only transition is the named historical target-target case. Vanilla's assertions at `apps/vanilla/e2e/interaction-lifecycle.e2e.ts:963-997` retain all five historical IDs, prove the four unaffected current cases equal the originals and explicitly state the new literal directed identity, edge ID and accepted event order. Its exhaustive loop at :1001 and Vue's at `apps/vue/e2e/interaction-lifecycle.e2e.ts:869` alone consume the new projection. Neither fixture file changes, and expected direction is not generated by production connection code.

The new Foldkit proof at `apps/foldkit/e2e/interaction-lifecycle.e2e.ts:3354-3535` mounts the actual public Runtime/harness, drives a real target-target pointer gesture and reads the accepted graph through the shared public client. It polls public initialized/current positive handle measurements, asserts exact `target/in -> loose-source/in` storage and one edge-add, then compares literal SVG path geometry and actual SVG endpoint sampling against public measured physical identities. The inspected SVG is the hit-target path; the default visible path consumes the same `geometry.path` in `packages/foldkit/src/graph.ts:2833-2891`. Repeating the gesture asserts rejected completion, no second edge-add, unchanged public snapshot and exact actual callback event order. No tolerance, skip, readiness sleep or historical rejection guard was introduced.

The three inherited fresh commit paths remain once-only constructor consumers. The approved inherited Foldkit whitespace correction has no semantic change. Other cancellation, duplicate, reconnect and strict assertions are preserved in the compared delta.

## Approved mounted observer fixture recheck

The reviewer reread the complete canonical082 measurement fixture prerequisite and its primary scope approval, then personally compared the stable fixture delta against frozen070 and the earlier082 checkpoint. **Provisional source APPROVE remains unchanged.** The first reported Foldkit37/38 run and repaired browser result were not reproduced here. All gates remain executor/primary evidence.

| File | Compared input SHA-256 | Reviewed observer checkpoint SHA-256 |
| --- | --- | --- |
| apps/foldkit/e2e/test-harness.ts | ad3c247c54468e6e54de5528e948f64b5b1e58b709002a0eb76089f385190abc | cdcf433a2da46c93ebf376960d935bfd2e0eb1019c6a4bf102b477d011f49746 |
| apps/foldkit/e2e/interaction-lifecycle.e2e.ts | 38d579b3b3681ab6483a17009fd5b8625570572db0de85cef931bd29e1dce28c | 15ce38d560cc99748dfc0a7744de9575ea8e782d57ce509be2aa6877203b8024 |

The harness input is frozen070; the test input is the earlier082 reviewed hash above. The test's new hash supersedes its earlier reviewed output hash. The unchanged public producer `packages/foldkit/src/measurement-observer.ts` has SHA-256 `6a782da110fe52349d01ba0bc07cf75a8e0697024e656da6e27fad153331f37a` in both roots.

`apps/foldkit/e2e/test-harness.ts:330-360` at that checkpoint stored the public observer type in a Runtime-keyed WeakMap. The setup captured the existing Runtime handle and assumed `#app` remained the owner, rejected missing ownership, disposed a previous observer for that same handle, and composed the exported `createFoldkitNodeMeasurementObserver`. The later failed runtime gate invalidated that owner assumption; the final owner-resolution recheck below supersedes it. Its zoom1 callback matches this fixture. Native node/handle measurements enter the captured Runtime through existing `HostAction.MeasureNode`; port send failure is explicitly checked. No private model setter, second graph or measurement authority is introduced. The producer reads actual DOM rectangles and handle centers at `measurement-observer.ts:71-132`, and owns mutation/resize observer reconciliation and disposal at :141-188.

`test-harness.ts:387-405` disposes and removes the measurement observer before snapshot-client and Runtime disposal. The callback captures its Runtime rather than reading the subsequently mutable global handle. This prevents remount ownership from redirecting measurements. Existing mount defaults and other tests remain unchanged.

`apps/foldkit/e2e/interaction-lifecycle.e2e.ts:3376-3378` starts that composition only after the final loose mount. The initialized/current positive-handle polls, literal accepted edge, exact SVG geometry, real SVG endpoint sampling, duplicate rejection and unchanged accepted-state assertions remain intact. This adds the actual missing measurement producer; it does not replace readiness with timing or soften rendered expectations. Only this planning record was amended during the recheck.

## Final rendered-owner fixture recheck

The earlier fixture source review did not establish that `#app` survived Runtime mounting. Browser repair1 reportedly failed with missing owner, while37 existing cases passed again. That failure is retained separately from the initial missing-observer readiness failure. Neither run was reproduced by this reviewer, and the earlier provisional source approval never established runtime success. The canonical082 final owner clarification and primary record were reread in full.

| File | Prior fixture SHA-256 | Final reviewed owner SHA-256 |
| --- | --- | --- |
| apps/foldkit/e2e/test-harness.ts | cdcf433a2da46c93ebf376960d935bfd2e0eb1019c6a4bf102b477d011f49746 | 395d4947cf90c2ed97ab2fc076e58f46fe7427982c41e8fc7d2fb67edd2c8f7f |
| apps/foldkit/e2e/interaction-lifecycle.e2e.ts | 15ce38d560cc99748dfc0a7744de9575ea8e782d57ce509be2aa6877203b8024 | 15ce38d560cc99748dfc0a7744de9575ea8e782d57ce509be2aa6877203b8024 |

**Provisional source APPROVE for the final owner delta, with runtime evidence still pending.** `packages/foldkit/src/application.ts:2539-2546` renders the actual `.flow-foldkit-root` without the mount ID. The corrected setup at `apps/foldkit/e2e/test-harness.ts:335-360` queries that rendered root and rejects missing Runtime, zero/multiple roots or missing indexed owner. This is the approved single-owner fixture lookup, not an assumption that an arbitrary root can belong to any Runtime.

The captured Runtime, public observer, zoom1, checked public MeasureNode send, WeakMap lifecycle and disposal-before-client/Runtime behavior remain unchanged. The test file hash proves the new test's setup call, measured readiness, exact edge/SVG endpoints, duplicate/state checks and all existing assertions are unchanged by this repair. Only this planning record was amended during the recheck. Browser repair2 is the final permitted attempt under082; its result and primary reproduced gates remain outside this read-only source verdict.

## Conformity and deviations

**Source-conforming to the approved design:** ordered canonical-kind literal1 policy, complete envelope before one traversal, unchanged generalized live/v2 policy, preserved immutable historical evidence and explicitly current named gesture expectations. Passing runtime behavior still requires the executor and primary gates.

**Intentional difference:** Flow's accepted named target-target physical edge is expected to render, while the pinned native callback/storage observation reports error008 and no native path. The test asserts Flow's own measured output; it does not assert native rendered parity.

**Unverified or pending here:** executor browser/saved verifier results, primary reproduced gates, final moving docs/provenance,081 rendered origins/preview/restoration, full integration/release, original member closure, generic/unnamed/accessibility contracts and device/CI/collector delivery. Any semantic source change after the listed hashes requires another review checkpoint.

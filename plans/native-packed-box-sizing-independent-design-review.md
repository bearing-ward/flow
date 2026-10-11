# Native packed box sizing independent design review

2026-10-02. Verdict **APPROVE**, design only.

I read the complete amendment at SHA256 `6cd858d51f93d5c15012d4e7ee785df421ae4ad28f6e90d151ac5727165cb668`, the complete main Plan 086, project standards, and the actual candidate source listed below. The amendment authorizes exactly one additional functional production change: `box-sizing: border-box` in the existing `.flow-foldkit-node` rule. Its packed assertions belong in the already authorized `scripts/check-packed-consumer.ts`. No blocking design finding remains. This verdict does not approve implementation, close 086, or establish parity.

## Reads and receipts

Candidate root is `/Users/richardmcandrews/.codex/worktrees/native-parity-acceptance/flow`, HEAD `841be137e253cf19c665269eaaa79edc19abf3c3`. Candidate-relative source citations below refer to that root. Main plan and standards reads refer to `/Volumes/Sync/codex/9-19-26/flow`.

- Main `plans/native-packed-box-sizing-amendment.md:1-21`, complete document, SHA256 `6cd858d51f93d5c15012d4e7ee785df421ae4ad28f6e90d151ac5727165cb668`.
- Main `plans/086-complete-native-parity-acceptance.md`, complete document, SHA256 `2e1c527c93dc787e8f8520666f52c6aa09932792e80be821de0739be4497b27f`. Candidate copy SHA256 `f23b9b27c46b35f65b3d10845798bebd01d96bfe58bdb30c21ed21fcbe1422a0` differs only by two blank lines, confirmed with a full diff.
- `docs/standards.md`, complete document, SHA256 `900c20dde3c23d173866db1853a8070cb9893bab7687ccb767e57aedb8bfd430`. Main and candidate hashes match.
- `packages/foldkit/src/style.css:1-240`, including the complete node rule at 125-136, SHA256 `4a0f3a44ddedefbe9be0fda6b5e7b45338fb427ff42f13bd7fe8d506537fbbed`.
- `packages/foldkit/src/measurement-observer.ts:1-419`, complete file, SHA256 `2c4d09403a7c18c85deb68bbd61beb3b81ada0b14f8cec75963143ebb59c4c44`.
- `packages/foldkit/src/graph.ts:610-643,2298-2323,3570-3700,3740-3790,4360-4425`, SHA256 `d1e13b9b575550b25f9a8f02f22defb05019a5311864859175cfb5750997bf20`.
- `scripts/check-packed-consumer.ts:1-65,594-978,1060-1165,1168-1280`, SHA256 `2403c35800ca90cc61923b0a339e8a322885edb348b256f6bccf046473f89d09`.
- Complete `packages/foldkit/package.json`; `packages/foldkit/src/public.ts:80-94,175-189`; snapshot client query, response and request paths at `packages/foldkit/src/snapshot-client.ts:1-38,45-118,202-280`; `packages/foldkit/src/application.ts:164-245,302-322,724-763,935-963,1100-1160`.
- Complete `packages/foldkit/src/update-node-internals.ts`; `packages/core/src/domain/flow-measurement.schema.ts:1-30,335-388`; `packages/core/src/domain/flow-graph.ts:72-98`; `packages/core/src/domain/flow-snapshot.ts:1-22`.
- Complete `scripts/foldkit-hmr-server.mjs`; installed `node_modules/foldkit/dist/runtime/runtime.js:95-160`; `apps/foldkit/src/playground.css:1-15`; immutable upstream `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/system/src/styles/init.css:184-215`.
- Complete audit playbook, with Correctness / Bugs, Test Coverage and Finding format specifically applied, plus complete `.agents/skills/improve/references/closing-the-loop.md`. I applied the TypeScript and type-system guidance to public proof APIs and the unslop guidance to this report.

The preserved failure receipt is `/Users/richardmcandrews/.codex/worktrees/native-parity-acceptance/native-parity-acceptance-evidence/consumer-third.log`, SHA256 `8b7a57f57bc8b52f1107825637fd459d14a7e94fe7eded303f4171b0ecfb8742`, matching the supplied receipt. I read its relevant installed-package and failure section at 90-117. I did not independently reproduce that execution.

## Correctness and production path

The generated packed browser entry imports `@flow/foldkit/style.css` at `scripts/check-packed-consumer.ts:599`. The package exports `dist/style.css` at `packages/foldkit/package.json:15`, and its existing build produces that file at 18. The generated entry at 594-661 and HTML at 1234-1236 contain no global sizing reset. The playground's reset at `apps/foldkit/src/playground.css:6-8` is a separate application stylesheet. A search of candidate adapter styles and generated probe found no package box-sizing rule that would already fix the node.

The actual measurement callback sends `HostAction.MeasureNode` at `scripts/check-packed-consumer.ts:637-639`. The observer reads the DOM border rectangle and reports zoom-normalized node and handle geometry at `packages/foldkit/src/measurement-observer.ts:180-226`. The host action routes through `Graph.Message.MeasureNode` at `packages/foldkit/src/application.ts:1113-1117`. The graph accepts only the current issued generation at `packages/foldkit/src/graph.ts:2304-2318`. Positive accepted measured dimensions take priority over declared size at `packages/core/src/domain/flow-graph.ts:84-89`. The adapter writes those dimensions to inline width and height at `packages/foldkit/src/graph.ts:3617-3635`, on the node carrying the affected class at 3752-3759.

The current CSS at `packages/foldkit/src/style.css:125-136` adds 28px horizontal padding, 24px vertical padding and two 1px borders. With content-box sizing, reporting that border rectangle and then writing it as a content width and height adds 30px and 26px on the next render. The proposed rule aligns both ends of this existing path. It keeps graph meaning, generation authority and observer measurements unchanged, consistent with `docs/standards.md:7-16,50-56`.

The failure log supports the diagnosis but has a narrower observation boundary. At 105 it reports accepted declared size 100x80, edited origin and viewport. At 106 it shows both rendered nodes with inline CSS dimensions 1030x886 and a pointer target on node B, then at 107-117 the preview wait times out. Those inline CSS dimensions are not a separately recorded `getBoundingClientRect()` result or a measured internal-node snapshot. Source establishes the feedback mechanism; the log does not prove the number of cycles or a completed successful gesture. Later WS-count assertions at `scripts/check-packed-consumer.ts:928-936` had not run after that failure.

## Required test boundary

The amendment at main `plans/native-packed-box-sizing-amendment.md:15-17` requires meaningful repeated public cycles, both nodes, actual second boot, current handles and native gestures. That is sufficient design scope. Final source review must reject any implementation that substitutes the following weaker observations for completion.

1. Run several distinct cycles for both nodes before preservation and again on the genuine restored boot before hit testing. Each cycle must actually invoke the public observer measurement path or existing refresher, await its correlated accepted response, obtain a fresh public node snapshot, and observe current rendered bounds. Record completed cycles and node-specific observations. A count increase alone proves callback delivery, not accepted measured geometry. Repeated reads or an arbitrary frame sleep do not establish a cycle.
2. Use the existing measured public snapshot. `requestVersioned({ nodeId })` is supported by `packages/foldkit/src/snapshot-client.ts:16-18,64-67` and `packages/foldkit/src/application.ts:171-175,749-752`. Require `internalNode.measurementStatus === 'measured'`, width 100, height 80 and the accepted node's declared 100x80 size. `packages/core/src/domain/flow-measurement.schema.ts:352-368` distinguishes accepted measured values from fallback values. The DOM-only fallback mentioned in the amendment is unnecessary for this candidate. The existing no-argument read intentionally returns `internalNode: null`.
3. A measurement can be correlated through the existing requestId and `measurementResults` response at `packages/foldkit/src/application.ts:307-313,948-953,1141-1150`. If the public refresher is used, its `requested` result at `packages/foldkit/src/update-node-internals.ts:57-81` must still be followed by acceptance and DOM evidence. It settles scheduling and submission, not the reducer's ACK.
4. At zoom 1 require computed border-box sizing and actual border rectangles of 100x80. Check stable current handle identities, accepted measured handles and their rendered centers within each unchanged document/viewport phase. Compare edited pre-flush state with restored state, not the initial position with the intentionally edited position. Do not mutate declared size, CSS decoration or private Model state to manufacture stability.
5. Keep the real revision write at `scripts/check-packed-consumer.ts:1259-1264`, second-boot/revision/raw-null readiness at 888-897, preserved authority check at 907-923 and successful native gesture proof at 926. Preserve independent positive-threshold clickfalse and healthy clicktrue cases. Final WS request/restore/flush counts and error checks must also complete. Installed Foldkit restore skips init at `node_modules/foldkit/dist/runtime/runtime.js:113-119` and flushes on the genuine reload event at 132-147; ordinary re-embedding does not exercise that path.

No new production/test-only accessor, global reset, timeout, tolerance, dependency change or weakened assertion is needed. Preserve fault, multiple-owner and teardown tests. Retain all 086 gates, including focused scope, full, packed consumer, ordinary HMR and release dry run, with independent final reproduction and frozen installed archive evidence. A workspace stylesheet pass alone cannot establish exported-package acceptance.

## Evidence limits

Only this review file was written. I ran read-only source searches, line reads, status reads, hashes and a plan diff. I did not edit source, build, run gates, install dependencies, start or transfer servers, acquire ports, commit or change the index. I did not perform an assembly manifest audit, inspect every inherited candidate change, reproduce the failed browser execution or inspect a new packed archive. Those remain final acceptance work under 086. The candidate CSS at the reviewed receipt still lacks the proposed declaration.

## Conformity and deviations

Conforming design: the package node's CSS width and height will describe the same border box that its observer measures. This agrees with the pinned upstream rule at `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/system/src/styles/init.css:204` and keeps framework lifecycle in the adapter. The implementation and repeated packed runtime output remain unverified.

Intentionally different proof boundary: this amendment tests Flow's own exported CSS and public measurement protocol without an application reset. It retains Flow's existing DOM observer and core-issued generation model rather than copying upstream implementation structure. The test boundary is the actual installed packed browser consumer, including real restoration and native pointer behavior.

Unverified: implementation success, final 086 acceptance, full resize or Vue sizing behavior, broader library/member parity, CI, devices and collector-side telemetry delivery. This design approval closes none of those claims.

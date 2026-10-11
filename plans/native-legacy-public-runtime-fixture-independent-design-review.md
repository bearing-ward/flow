# Independent review of the legacy Runtime fixture clarification

2026-10-02. Verdict: REVISE DESIGN, for one narrow archive-identity requirement. I fully read the 33-line clarification at SHA-256 `416cbdc840945246475b07c2087138ab416eab1766203188aca43b3395c19890` together with the original amendment and previous review. The clarification resolves both previous findings. Its requirement that all old/current archive hashes differ must allow unchanged core bytes before the combined design is executable without a false failure.

## Scope and integrity

Main HEAD is `841be137e253cf19c665269eaaa79edc19abf3c3`. `N` means `/Users/richardmcandrews/.codex/worktrees/native-parity-acceptance/flow`. `O` means `/Users/richardmcandrews/.codex/worktrees/native-parity-acceptance/native-parity-acceptance-evidence/interim-stopped-source-freeze/source`. Candidate N remains under the separate active auto-pan lease; this review does not freeze its source or report a final candidate hash.

Before and after this followup, all 1,529 original source files matched the complete main inventory by byte count and SHA-256. All 1,529 also matched the historical `interim-stopped-source-freeze/source/` inventory entries, with no missing, extra or mismatched files. The authentic freeze manifest remained `f963abb7a37b020c5ddbb41509865de366140f6e0114774774ad023eaaa2c1c2`, and main older-source inventory remained `23fc00fb0f4009d9a60a33abff1e5a48556f22a818ecf537c1f38ce90675b9e2`.

The original amendment remained `f0c4259536beacec017974ef99fdedf69c5b33d561950742812f8253aafc1179`, and previous independent review remained `f86885e98cbcca22929b10d33cbfc0718473b211489e8d228921ac69b25bdc0c`. No existing file was edited. I ran no install, build, browser, server, shared check, verification gate, agent or resource cleanup. This new review is my only authored file in the followup.

## Finding

### [TEST-03] Allow equal archive hashes for unchanged core

- **Evidence**: `plans/native-legacy-public-runtime-fixture-clarification.md:21` says that physical archive hashes must differ across the two phases. A read-only comparison of every original `packages/core` file against N found 87 original files and 87 current source files, with zero changed, extra or missing files after excluding current ignored build/dependency artifacts. `O/packages/core/package.json:7` and `N/packages/core/package.json:7` declare the same packed files, and their build scripts at `:22` use the same core entry. `N/packages/core/tsconfig.build.json:1` has the same declaration-emission configuration as O.
- **Impact**: Genuine builds and packs of unchanged core can have equal archive hashes. The specified proof would reject valid old/current installations. Incidental archive metadata differences would satisfy the unequal-hash condition without proving different core behavior, so requiring inequality does not strengthen the intended preservation boundary.
- **Effort**: S, a sentence-level clarification and the corresponding fixture assertion.
- **Risk**: LOW. Keep all phase-resolution and archive-content checks; remove only the invalid requirement that unchanged package contents must differ.
- **Confidence**: HIGH that core source inputs are equal at review time and hash inequality is not a valid invariant. Actual builds and archive hashes remain unexecuted.
- **Fix sketch**: Record and verify each genuine archive hash independently, allowing equality for an unchanged package. Require distinct phase installation paths and browser import URLs for old/current core and adapter, require every adapter's actual core import to resolve within its own phase, and require the changed Foldkit adapter artifact to differ. Never change, salt or repackage source to manufacture hash inequality.

The combined archive receipts should report whether each corresponding old/current artifact is equal or different and explain equality by its verified source/archive contents. Disjoint archive installation ownership and the browser module-origin chain remain mandatory even when core bytes match. This correction stays within the owned fixture and records scope.

## Resolution of the previous findings

TEST-01 is resolved by clarification `:7` through `:15`. Its first checkpoint matches genuine old reload-flush to the server restore and uses external payload fields rather than fictitious snapshot revision fields. The second checkpoint creates current public clients and subscriptions, prepares every node before the observer, waits for canonical DOM and a genuine current debounced packet, and compares unchanged accepted revision and generation authority. The third starts the real required-context observer and validates legitimate register/invalidate advances and measured ACKs against actual correlated authority.

This sequence matches `N/packages/foldkit/src/graph.ts:1575`, which initializes missing metadata and removes only the uncaptured resize's measured entry, with one measurement revision increment when an entry was removed. Its prepare branch at `:2788` returns unchanged `currentGeneration`; registration at `:2814` advances it. The registration client validates successful lease generation at `N/packages/foldkit/src/node-measurement-lifecycle.ts:340`. `N/packages/foldkit/src/application.ts:1908` normalizes a genuine incoming message, `:2456` handles the public lifecycle request, and `:2678` emits the terminal cancellation. The public snapshot schemas at `:213` and `:233` do not expose accepted revision or complete generation authority. The new design uses honest external preservation evidence for those fields.

The Runtime schedules preservation when a real message changes the model at `N/node_modules/foldkit/dist/runtime/runtime.js:270`, and its actual debounced encoder is configured at `:127`. Therefore normalization can produce the required pre-observer packet without synthetic preservation, private Model access or suppression of the old observer. The current observer starts after genuine epoch commit and captures required context at `N/packages/foldkit/src/measurement-observer.ts:565`. Protocol ordering and delivery remain runtime assertions, not facts established by this design review.

TEST-02 is resolved by clarification `:19` through `:25`, apart from the new hash-inequality requirement above. The generated root peers have exact Effect/Foldkit/platform pins, and the generated config excludes both Flow packages from optimization. Installed Vite checks excludes when deciding optimization at `N/node_modules/.bun/vite@8.0.13+98abbd040cce543b/node_modules/vite/dist/node/chunks/node.js:32183`; its bare-ID reuse at `:32408` explains why this was required. The official plugin's Effect includes and shared Foldkit dedupe at `N/node_modules/.bun/@foldkit+vite-plugin@0.24.0+afe364db13f1af42/node_modules/@foldkit/vite-plugin/dist/index.js:377` remain unchanged.

Complete transformed browser responses, import URLs, raw installed/archive bytes and stylesheet origin chains provide the required browser identity evidence. The clarification correctly avoids equating transformed browser bytes with archive bytes and STOPs on optimized Flow modules, wrong-phase resolution, peer drift or a missing origin chain. It retains genuine official reload/restore and the fallback sentinel control.

## Preserved scope and admission obligations

After the narrow correction and approval, the only implementation paths remain new `N/scripts/check-native-legacy-restoration.ts` and an authored append to `N/research/traces/node-measurement.md`, with owned records and disposable fixtures. Existing consumer runner, HMR server, production source, verification config, manifests and lockfiles stay outside this amendment. O remains immutable; install/build/pack operates on a fully verified copied source and must STOP on source/lock/compiler drift.

Both actual settled and active old-to-current cases remain mandatory. The active case keeps its real old observer, actual keyboard DOM session and raw absent native/baseline fields, followed by genuine current normalization, terminal cancellation, late-key no-op, fresh 105/110 preview, cancel to 100 and one accepted 105 resize. No invented snapshot revision, private browser Model, fabricated lease/ACK or synthetic preserve/restore may satisfy a checkpoint.

Retain the separately recorded mandatory CLI gate, primary reproduction of both cases, original same-build proof and ordinary HMR, native 9+24+complete 8 suites, focused/full/release gates, teardown receipts, final freeze and independent SOURCE review. The saved focused configuration still selects its nine existing checks and 12 Vanilla, 11 Vue and 11 Foldkit browser files. No unsupported verifier name or optional waiver is introduced. This review has run none of those gates.

## Conformity and deviations

Conforming proposed behavior preserves real old accepted document, viewport, revision and generation authority through official public Runtime consumption before new registration. The three checkpoints now distinguish restoration from legitimate lifecycle advancement. Browser package origin proof uses actual archive installations and delivered imports; equal unchanged core bytes are compatible with that proof.

Intentionally different behavior cancels the uncaptured old keyboard resize because it lacks a stable baseline. Current observer registration then advances ownership generations, and fresh current resize behavior must pass the actual browser assertions. The boundary remains two public Runtime transitions with real DOM/events and passive official WS evidence.

Unverified behavior includes install/build/pack compatibility, actual optimizer exclusions and browser origins, official reload/restore execution, checkpoint packets, both browser cases, teardown, focused/full/release results and final SOURCE acceptance. No source, member, device, paired-reference, CI, collector or broader parity acceptance follows from this design review.

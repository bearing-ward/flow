# Plan 098. Implement connection drag activation on integrated main

## Goal

Callers can set a finite nonnegative `connectionDragThreshold` for pointer connection and reconnection in Vanilla, Vue and Foldkit. A positive threshold keeps the native gesture pending until client movement strictly exceeds it. Zero activates on down. Pending cancellation emits no connection lifecycle or semantic edit. Active gestures retain the current capture owner and completion contract.

This is the next bounded feature toward Flow's stated API, example and reusable UI goal. Historical Plan 093 describes a related gap in an unaccepted later candidate. Current main has the accepted core foundations and resize repairs but does not expose `connectionDragThreshold`; implementation must ground in current source.

## Current instructions

The maintainer invoked p3-mode and authorized continued implementation. Testing is limited to current feature implementation. Broad verification, whole suites, packed-consumer sweeps and calibration are deferred until final reconciliation. Historical old-worktree, frozen-HEAD and shared-lease instructions do not describe this continuation. Imported research artifacts remain immutable.

## Exit condition

All three production hosts expose and validate the threshold, preserve native pointer ownership through pending activation, promote on strict client distance, and suppress pending lifecycle and edits. Dedicated feature tests and actual browser evidence establish these behaviors. Default, zero, equality, greater-than, zoom, cancellation and invalid configuration cases are covered within this feature. Broad acceptance remains deferred.

## Designed workflow

1. Trace current browser controls, adapter state, capture, movement, terminal actions and rendering against pinned source.
2. Compare concrete pending-state designs before implementation. Reuse prior source evidence without copying an unaccepted host candidate.
3. Implement the agreed data shape with one code owner in an isolated worktree.
4. Run only feature unit and browser cases, scoped types and lint required for the implementation.
5. Review actual source, targeted outcomes and browser recording. Integrate small ordered local commits.
6. Continue dependency work with the broad testing debt recorded for final reconciliation.

## Throughput checkpoint

- [x] Blocking first steps. Current source and native Vanilla down behavior are grounded. All three designs were read and independently compared before source writes.
- [x] Independent workstreams. Read-only design candidates have separate output directories. One implementation owner handles the code-coupled feature across hosts.
- [x] Shared mutable state. The implementation owns one isolated worktree. Root owns progress, plan status and the decision trail. No concurrent writers share source files.
- [x] Smallest safe decomposition. One owner implements the shared threshold contract and each host's pending-to-active transition so lifecycle and capture semantics remain coherent.

## Evidence

The canonical continuation brief and append-only decision trail are in `/Users/richardmcandrews/.codex/recovery/flow-parity-20261011/`. Source grounding and independent design comparison are complete. Parent and cross-judge chose design 2 with synchronous Foldkit capture acquisition and Vue threshold snapshots from design 1. Shared Schema validation and arithmetic accompany adapter-owned pending variants. Implementation is active on `codex/098-connection-drag-threshold` in its isolated worktree. A native Vanilla public-mount baseline records preview and capture on down before movement. No threshold implementation or reference runtime acceptance is claimed yet.

The first candidate at `974f71a` passed 23 dedicated unit and 115 Chromium cases. Three independent source reviewers identified missed queue ordering, click completion, viewport publication, Vue cancellation, and control-stacking cases. Parent native Chrome input reproduced zero-threshold click activation failure and a successful routed edge-add reporting cancellation. Strict positive admission stayed quiet at equality and processed the crossing move. Integration is blocked pending the fresh repair owner and expanded feature proof. Reports and the repair sketch are in the canonical continuation directory. Broad tests remain deferred.

The repaired candidate at `19a3fef` passed 33 dedicated units and 138 Chromium cases. Parent native T3 recordings confirm corrected click outcomes and public fresh/reconnect completion across all hosts. The comment deletion and fixture reshape are accepted. A follow-up source reviewer found deferred crossing movement can leave native release resolving against stale pending state. The ownership census and release premise record the remaining boundary. Integration is still blocked; ordinary-path native proof does not establish queue-starvation acceptance.

At `9786bea`, native input is admitted through a lifetime queue and release targeting follows preceding movement. Parent independently passed 41 dedicated units and 143 Chromium cases; the prior queued-input blockers and comment scope are closed. Two new combinations remain. A stale node/pane guard can discard the following connection down, and disabled click initiation blocks target-click completion of an existing keyboard source. Parent native T3 input reproduced the latter. A fresh narrow owner is repairing both; integration and broad reconciliation remain open.

## Accepted integration

Plan 098 is accepted within its feature boundary and integrated at `a869252`. Reviewed source `9671109442b56d6c1461686348d87d643d44d043` was archived before combining its final red regression and narrow fix into `68e2306`. The normalized tree equals the reviewed tree. All integrated `apps/` and `packages/` files also equal that tree. Imported research artifacts are unchanged.

Parent independently passed 58 dedicated units and 151 Chromium cases with these commands:

```sh
bunx vitest run packages/core/src/domain/flow-connection-drag-threshold.schema.test.ts packages/foldkit/src/connection-threshold.test.ts
bunx playwright test -c playwright.config.ts connection-threshold.e2e.ts --workers=1
bunx playwright test -c apps/vue/playwright.config.ts connection-threshold.e2e.ts --workers=1
bunx playwright test -c apps/foldkit/playwright.config.ts connection-threshold.e2e.ts --workers=1
```

No verifier profile was invoked. Results were 40 Vanilla, 53 Vue and 58 Foldkit browser cases. Builds, scoped types, lint and format needed for the feature passed in the implementation receipts. Three independent source reviewers and the comment reviewer found no remaining findings. Parent native T3 recordings repeat fresh and reconnect completion across all hosts and the previously failing mixed keyboard completion. Ordinary native recordings do not prove naturally starved scheduling.

Evidence resolves under `/Users/richardmcandrews/.codex/recovery/flow-parity-20261011/`: `review-verdict-round4.md`, `parent-final-feature-checks.json`, its separate logs, `parent-final-native-hosts.json`, and `parent-final-native-keyboard.json`. The original reviewed history is recoverable from `threshold-reviewed-history.bundle`.

The optional threshold defaults to 1 and rejects invalid explicit values. Foldkit's `ConnectionPointerMoved` message now requires client coordinates. Its model includes pending activation and a retained click receipt. Application message lifts preserve native origin identity. `Graph.makeView` requires an owned native resource; the prior unowned fallback is removed. Existing internal callers migrated. Packed external consumer compatibility has not been rerun. Browser fixtures import built public artifacts by relative paths, so they do not establish package resolution in a packed consumer.

Remaining work includes historical eager-activation test reconciliation, broader profiles, calibration, packed consumers, other engines and touch, naturally starved scheduling, arbitrary native lease replacement, huge finite arithmetic, reference runtime comparison, and broader catalog coverage. No collector delivery claim is made.

## Conformity and deviations

Conforming within the dedicated feature tests: strict squared client distance, zero activation, pending suppression and validated public configuration. The comparison follows the pinned XYHandle contract by source inspection. Mounted reference runtime parity is unverified.

Intentionally different: framework-owned pointer sessions and host-specific click, keyboard and auto-pan policies. Deterministic queue tests control deferred reduction explicitly.

Unverified: naturally starved native scheduling and the deferred boundaries above. Full-suite acceptance and remaining API, example and UI coverage stay open.

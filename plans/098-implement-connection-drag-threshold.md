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

- [ ] Blocking first steps. Ground current public configuration and native reconnection ownership. Compare design candidates before source writes.
- [ ] Independent workstreams. Read-only design candidates have separate output directories. One implementation owner handles the code-coupled feature across hosts.
- [ ] Shared mutable state. The implementation owns one isolated worktree. Root owns progress, plan status and the decision trail. No concurrent writers share source files.
- [ ] Smallest safe decomposition. One owner implements the shared threshold contract and each host's pending-to-active transition so lifecycle and capture semantics remain coherent.

## Evidence

The canonical continuation brief and append-only decision trail are in `/Users/richardmcandrews/.codex/recovery/flow-parity-20261011/`. Current feature source inspection and design are in progress. No new runtime or reference parity is claimed yet.

## Conformity and deviations

Strict squared client distance, zero activation and pending suppression follow the pinned XYHandle contract as inspected in historical Plan 093. Current Flow production and test paths require fresh tracing and feature proof. Framework-owned pointer sessions remain an intentional adaptation. Full-suite acceptance and remaining API, example and UI coverage stay open.

# Plan 129: Foldkit controlled selection and deletion

## Problem and root cause

Plans 127 and 128 compose into a fast-input failure in UP-126-028, despite its `pass` ledger entry. The unchanged test clicks Node-1 and immediately presses `d` at `apps/shared-e2e/upstream/nodes.ts:199`. A baseline probe observed keydown reading revision 0 with no selected nodes, then selection acknowledgement, then a delete request with empty IDs and revision 0 reaching revision 1. The hypothesis is confirmed, with a second stale-revision failure.

Foldkit publishes controlled selection without changing its accepted document at `packages/foldkit/src/graph.ts:3193`. Its detached publication worker yields before delivery. The fixture synchronously sends `ReplaceDocument` from `changes` at `apps/foldkit/src/upstream-fixture.ts:183`, but inbound ports queue delivery. At baseline `08134ca`, `packages/foldkit/src/application.ts:2649` captured IDs before acknowledgement; `packages/foldkit/src/delete-approval.ts:417` counted delayed accepted-state revisions. The complete production and test trace is [controlled-select-delete.md](../research/traces/controlled-select-delete.md).

## Fix

Fix the product. A synchronous subscriber using the public action port is valid controlled usage. Publish a keyboard intent after preceding changes, then have the delete client send `HostAction.RequestKeyboardDelete` through the same FIFO action port as owner acknowledgements. Resolve accepted selection and revision together there, and carry that revision to the existing approval workflow. Host rejection still wins. Extract the shared action contract into `packages/foldkit/src/host-action.ts` to avoid a client/application import cycle. Keep the fixture, ledger, upstream assertions, and detached publication ownership unchanged.

Vanilla already acknowledges synchronously through `controller.update` at `apps/vanilla/src/upstream-fixture.ts:79`, before deletion reads its document at `apps/vanilla/src/mount-flow.ts:11788`. Vue's upstream fixture supplies `document` and `onChange` but omits `documentMode`; the default is uncontrolled at `packages/vue/src/flow-canvas.ts:763`. Explicit controlled Vue emits changes synchronously at `packages/vue/src/flow-canvas.ts:2457`; Vue flushes the owner's props before the next browser input. A separate controlled Vue regression checks this path.

## Results

The new Foldkit regression fails on baseline. Foldkit UP-126-028 and the native controlled regression each pass 20/20; Vanilla UP-126-028 and explicit controlled Vue each pass 20/20. The 11 affected Foldkit suites pass 220 cases, including the upstream runner's 36 ordinary passes and 14 retained expected failures.

Two verifier attempts hit the named `layout-recipes.e2e.ts:281` flake; its isolated rerun passed 3/5. Added the existing layout-completion counter barrier before unchanged geometry comparisons. The fixture publishes completion after fitting and rendering at `apps/foldkit/ui-recipes/layout/main.ts:197`. The corrected case passes 20/20. Upstream assertions and timing remain unchanged.

Locked `bun run verify` passes all 18 focused gates, including **97 unit files / 2,514 tests** and browser scopes of **Vanilla 690 passed / 2 existing skips**, **Vue 805 passed**, and **Foldkit 460 passed**. The saved scope contains 45 Vanilla, 37 Vue, and 52 Foldkit files. Browser commands use the owner-token wrapper and one worker. Configuration only adds five Foldkit suites and appends activeWork; prior scope remains. Research citations are remapped and checked.

## Conformity and deviations

Conforming at the unchanged upstream and real-browser regression boundaries: immediate click/delete removes the node and incident edges. Intentionally different internally: Foldkit orders acknowledgement through typed Runtime ports and retains asynchronous approval. Delayed owners remain responsible for accepting proposals; this fix does not optimistically accept selection. Live React comparison, full-profile acceptance, other engines, and OTLP collector delivery are unverified.

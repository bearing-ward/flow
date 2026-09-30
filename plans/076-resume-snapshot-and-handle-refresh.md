# Plan 076: Resume Foldkit snapshot callers and measured-handle refresh

Status: DONE for the bounded implementation and independent review. The maintainer authorized commit and merge; original semantic member reconciliation stays open.

## Authorization and baseline

The maintainer selected next-step items 1 and 2 on 2026-09-30. This authorizes implementation of the remaining Foldkit snapshot-client callers and resumption of the stopped Plan 065 candidate. Baseline: `2128b9e`. Execution checkout: `/Users/richardmcandrews/.codex/worktrees/snapshot-and-handle-refresh/flow`. Source remains isolated for independent review; no commit, merge, push, or publication is authorized.

The existing approved Plan 065 architecture and Plan 066 decomposition remain binding. The previous failed revision limit is historical; this explicit dispatch starts a new bounded execution against the accepted baseline. The lighter verification policy supersedes old requirements to run the complete suite on every iteration. Changes outside the two selected slices remain excluded.

## Step 1: Migrate remaining Foldkit snapshot callers

Read `packages/foldkit/src/snapshot-client.ts`, its tests, `apps/foldkit/e2e/test-harness.ts`, `apps/foldkit/e2e/delete-approval-harness.ts`, and `apps/foldkit/ui-recipes/placeholder/main.ts`. Inventory all `snapshots.subscribe` and `snapshotRequests.send` uses. Replace the delete-approval and Placeholder success-only snapshot maps with `createFoldkitSnapshotClient`, preserving their public success behavior. Handle failed/disposed outcomes explicitly, dispose the client before Runtime disposal, and prevent late results from writing disposed UI. Keep edit/delete correlation unchanged except where teardown is necessary for snapshot ownership.

Add meaningful real-route tests for normal reads, remount/restart owner isolation, and pending snapshot disposal. Shared client tests may use actual typed ports for failure correlation; label that boundary separately from mounted Runtime evidence. Do not invent live origin/native fields to trigger a format failure. Keep the core saved-v1 contract unchanged.

Scope: the two caller files, existing Foldkit delete-approval/Placeholder E2Es and their harness, shared snapshot-client tests only if a genuine missing invariant is found, `research/traces/public-api-completion.md`, the Placeholder trace, progress and plan evidence, and the verification config. Do not broaden unrelated delete/edit behavior.

Verify the focused baseline and the affected Foldkit browser files. Record exact commands and actual assertions; no full-suite acceptance claim.

## Step 2: Resume Plan 065

Read the full existing `plans/065-complete-measured-handle-refresh.md` and approved section 065 in `plans/057-public-contract-design.md`. Recover only measured-handle changes from archived commit `0de6de7d700a742b9bffd3a9e86bb155240d3a19` or `/Users/richardmcandrews/.codex/task-archives/flow-2026-09-30-approved-integration/remaining-actionable.patch`. Compare against `de36b4f` and current accepted files. Never copy the whole archived snapshot: it also contains unaccepted extended provider fixtures and old planning/tooling. Preserve the approved legacy guards/client, provider fixture, member accounting and new verifier.

The stopped Foldkit pointer-up handler has serialized view input, not `model`. Carry the same accepted current-generation measurement projection through typed view input, preserving one geometry authority. Do not use a live DOM lookup, fabricated coordinates, unchecked cast, alternate handle map, or changed graph authority to bypass it.

Reuse `MeasuredHandleSchema`, put handles in the existing generation-tagged node measurement samples, and derive all render/connect/reconnect/public handle geometry from that state. Filter removed/replaced/hidden handles and stale generations. Public arrays, objects and offsets are detached/frozen. DOM rectangles convert through the owning viewport once; transient measurements never persist. Batch refresh one or several IDs, deduplicate in order, preserve graph/viewport, coalesce within a frame, and settle removal/disposal safely in every host.

The entire Plan 065 behavior scope remains required: exact rendered endpoints after same-size handle relocation and handle addition/removal, connection targeting, two-node batches with duplicate/missing IDs, nested parent offsets, zoom 0.5/2, controlled stability and teardown. Add the pinned handle-refresh reference capture/harness/fixture/test proposed by that plan, using a clean full pinned checkout at `/tmp/flow-052-xyflow` after verifying SHA. Reproduce the capture and inspect the normalized comparison. Do not close semantic member cells merely because an inventory checker passes.

Scope: Plan 065's enumerated core measurement/edge/runtime/geometry consumers, Vanilla/Vue/Foldkit measurement/render/refresh/public modules and tests, three-host measured-geometry fixtures/E2Es and shared fixture, scoped packed-consumer probes, new handle-refresh reference tooling/harness/fixture/conformance test, relevant docs/trace/catalog/progress and verification config. Additional existing measurement schema tests/shared browser fixture are explicitly included. No unrelated provider, appearance, origin, typed-data or callback candidate is allowed.

## Verification and review

Install from the frozen lockfile in the isolated checkout. Use focused unit runs during implementation; run `bun run verify` with saved active scope for final review. Include the affected browser files in all three hosts, docs, contracts and traces. Run packed consumers once because geometry/public measurement exports change. Generate public API docs when required. Browser gates run sequentially on strict test ports. Tests must exercise production APIs and SVG endpoints, not internal fixture-only state. Keep native-device and broader parity boundaries explicit.

Stop and report on fundamental contract drift, unsupported schema capabilities, unsafe authority/type shortcuts, or a required check failing twice after focused repair. Preserve independent completed work. No new dependency, imported evidence edits, publication or broad full-suite run without a concrete reason. The reviewer may request at most two focused revisions. Record results and scope, and leave all source edits uncommitted. The reviewer owns the plan index and final acceptance.

## Execution checkpoint: stopped at item 1 quality gate

Source remains isolated and uncommitted. `bun install --frozen-lockfile` exited 0 without lockfile changes. The two remaining success-only callers now use `createFoldkitSnapshotClient`; Placeholder guards disposed UI and settles pending edits during pagehide. Delete harness disposes the snapshot client before Runtime teardown and creates a distinct owner on restart.

Recorded commands:

- `bun run typecheck`: exit 0; all four public package builds and root TypeScript passed.
- `bun run playwright test --config apps/foldkit/playwright.config.ts --workers=1 'delete-approval.e2e.ts' 'placeholder-recipe.e2e.ts'`: exit 0, 15 passed in 6.8 seconds. New mounted Runtime test asserts pending request returns disposed, restarted owner returns succeeded, request IDs differ, and the fresh graph has five nodes. Placeholder pagehide test passed but independent review found optional DOM lookup could skip intended activation; harden this assertion before acceptance.
- `bun run check`: exit 1; switch-case braces and readable spacing findings.
- Focused repair applied case braces and identified spacing edits, followed by formatting.
- `bun run verify`: exit 1 at quality, before architecture/build/typecheck/units/browser commands. Three new switch case boundaries still require blank lines at Placeholder main.ts:164,168,172. Log: `/tmp/flow-076-step1-verify.log`.
- `git diff --check`: exit 0.

STOP: the required quality check failed twice after focused repair. No item 2 candidate recovery or new capture was applied. The baseline pinned checkout at `/tmp/flow-052-xyflow` reports exact SHA `0a1f9575b25679f2880175de8d3eae21aedde921` and clean status; this inspection is not a reference capture. The coordinator was notified and can explicitly dispatch a bounded quality/test repair. Snapshot migration is not accepted until focused verify and non-vacuous shutdown tests pass. Full suite, upstream runtime comparison and collector delivery remain unclaimed.

## Replacement executor checkpoint, 2026-09-30

STATUS STOPPED. Source remains isolated and uncommitted at baseline `2128b9e`. The replacement executor preserved all previous work and completed one focused Vue repair. The first Vue run failed six of seven cases with recursive FlowCanvas updates. Vue reuses the same node ref callback during rendering, so registering a new generation on every callback created a reactive feedback loop. Registration now returns for the existing element. Single-node and ResizeObserver measurement publication only advance the reactive revision when the accepted measurement revision changes; the ResizeObserver also no longer accepts the same sample twice. The second run passed all seven cases.

Actual commands in this continuation:

- `bun run playwright test --config apps/vue/playwright.config.ts --workers=1 measured-geometry.e2e.ts`: first exit 1, six failed/one passed (`/tmp/flow-076-vue-browser.log`); after focused lifecycle repair exit 0, seven passed (`/tmp/flow-076-vue-browser2.log`). This passing run preceded the later shared new-handle assertion.
- `bun run playwright test --config apps/foldkit/playwright.config.ts --workers=1 measured-geometry.e2e.ts`: first exit 1, four failed/six passed (`/tmp/flow-076-foldkit-browser.log`). Dynamic refresh looked up a detached fixture owner because Runtime.embed replaces its mount element. The fixture now embeds into a child of a stable owner and resolves only actual node containers.
- Same Foldkit command after that repair: exit 1, four failed/seven passed in 2.1 minutes (`/tmp/flow-076-foldkit-browser2.log`). All four new dynamic cases time out in the initial `page.evaluate` at `apps/shared-e2e/handle-refresh-contract.ts:13`, inside `startHandleRefresh` before refresh assertions. The newly added real main-wrapper overlap test passed, observing two separate completed status writes from two immediate same-node refresh button clicks. Existing six measurement cases passed.
- `git diff --check`: exit 0.

STOP follows the required twice-after-focused-repair boundary for the Foldkit browser gate. No subsequent source repair or final verification is claimed. A bounded resume must diagnose the fixture's initial snapshot request/observer Runtime lifecycle and rerun the same gate; timeout is not successful disposal or completion evidence.

Additional unverified edits preserve reviewer requests: shared real pointer candidate/commit now occurs before graph replacement; new declared handle addition/relocation/removal assertions were added; pending refresher success/removal/disposal units were added; the reference capture now decodes a concrete typed fixture schema, and a new conformance unit compares attachment geometry against the pinned fixture. Those files still need formatting, typechecking, execution and review. Equivalent caller-layout browser comparison, packed batch consumer probes, new failure-boundary attributes, docs/traces/catalog/progress, active final verification scope, capture reproduction and final focused verification remain incomplete. The prior stable capture is evidence for the prior harness generation only; the newly typed capture script has not been rerun. Full-suite, native-device, collector delivery and semantic member closure remain unclaimed.

## Reviewer revision 2, 2026-09-30

The resumed executor observed a detached Foldkit fixture owner, repaired it by embedding in a child of a stable owner, then stopped when the same gate timed out on the fixture's initial snapshot request. Existing Foldkit geometry cases and the new overlapping main-wrapper request case passed. Vue's focused lifecycle repair passed seven measured-geometry cases. These results do not establish final acceptance.

The final bounded revision is authorized to diagnose that first-request stall with browser errors and Runtime lifecycle evidence, repair the fixture or in-scope production measurement boundary at the root cause, and finish the already authorized evidence and documentation. Use a single focused case while diagnosing, without weakening assertions or adding arbitrary waits. Preserve the shared snapshot client and one accepted measurement authority. Reconcile all new tests against actual caller layout, including the newly added handle, and finish the reference comparison and consumer probes. Routine formatting and trace citation repairs remain in scope. If a substantive required gate fails twice after this focused repair, stop and preserve the candidate. Primary performs final verification on frozen sources; no integration or commit is authorized.

## Final revision candidate, 2026-09-30

The scoped source candidate is complete and frozen for primary verification. Root cause of the Foldkit first-request stall was an unnamed child Runtime mount. A focused one-case diagnostic recorded Effect's console logger refusal: Runtime containers require an `id` for reload model preservation. Stable owner plus `mount.id = 'handle-refresh-runtime'` repairs startup without waiting or weakening requests. The shared client and single measurement authority are unchanged. Diagnostics are in `/tmp/flow-076-foldkit-diagnosis2.log`; temporary diagnostic logging was removed.

Final executor commands and evidence:

- `bun run playwright test --config apps/foldkit/playwright.config.ts --workers=1 measured-geometry.e2e.ts -g 'zoom 0.5, controlled false'`: exit0,1passed after the ID repair. Log `/tmp/flow-076-foldkit-fixed-focused2.log`. The preceding launch failed only on Node's JSON import-attribute requirement and did not run tests; the import was corrected.
- `bun run playwright test --config apps/foldkit/playwright.config.ts --workers=1 measured-geometry.e2e.ts`: exit0,12passed. Log `/tmp/flow-076-foldkit-final.log`.
- `bun run playwright test --config apps/vue/playwright.config.ts --workers=1 measured-geometry.e2e.ts`: exit0,8passed. Log `/tmp/flow-076-vue-final.log`.
- `bun run playwright test --config playwright.config.ts --workers=1 measured-geometry.e2e.ts`: exit0,8passed. Log `/tmp/flow-076-vanilla-final2.log`. A preceding incorrect Vanilla config path exited1 before running tests; the root config is authoritative.
- `bun run test -- packages/core/src/domain/flow-measurement.schema.test.ts packages/foldkit/src/update-node-internals.test.ts packages/conformance/src/handle-refresh-reference.test.ts`: exit0,25passed across3files after updating the original zero-size strict expectation to include the accepted empty handle array. Log `/tmp/flow-076-units-final2.log`.
- Primary independently ran `bun run scripts/capture-handle-refresh-reference.ts --checkout /tmp/flow-052-xyflow`: exit0, two matching typed normalized captures from the full clean pinned checkout. Log `/tmp/flow-076-review-reference.log`. Subsequent harness cleanup only formats source and replaces the promise executor/non-null DOM lookup with typed equivalents; captured geometry is unchanged.
- `bun run docs:generate-api`: exit0; generated output already matches the exported Schema inventory.
- Final scoped `bunx oxlint apps packages tests/consumer research/harnesses/handle-refresh scripts/capture-handle-refresh-reference.ts`: exit0. Log `/tmp/flow-076-lint-final5.log`.
- `bunx tsc --noEmit`: exit0. Log `/tmp/flow-076-type-preflight-final4.log`.
- `bun run check:architecture`: exit0,197productionfiles and all rule fixtures. Log `/tmp/flow-076-architecture-preflight2.log`. An initial conformance test import from app fixture was removed; the package unit now defines its own decoded contract input.
- `bun run research:check-traces`: exit0,2289citations/67traces before final citation refresh. Log `/tmp/flow-076-traces-preflight.log`.

Saved focused scope includes baseline quality/architecture/build/types/units plus docs, catalog, api-members, contracts, traces and consumer checks; Vanilla/Vue measured-geometry and Foldkit measured-geometry/delete-approval/Placeholder browser files. Primary will run `bun run verify` on the frozen sources and owns final acceptance. Packed batch probes are prepared in all three installed-consumer entry points. Their execution is part of that gate, not claimed from typechecking.

Actual browser assertions cover nested absolute geometry, native caller centers at zoom0.5/2, controlled document/viewport stability, ordered duplicate/missing batches, exact public projection→SVG endpoints, moved-handle pointer candidate/commit before graph replacement, real declared addition/relocation/removal, pending/later disposal and two settled main-wrapper overlap callers. Equivalent10pxborderless caller-layout cases compare public source/target geometry and actual SVG endpoints to the pinned fixture in all hosts; native CSS variation is separate. Public handles remain detached/frozen and current-generation/kind/side/visibility filtered; local DOM collectors preserve one handle per ID with last-marker semantics.

`requested` denotes dispatched measurement rather than universal synchronous rendering completion. Foldkit acceptance travels through typed Runtime output; SVG assertions poll rendered output. React's void-return hook and exact native scheduling remain different/unverified. Original8076semantic cells and parents057/066/075 remain open. No full-suite/native-device/CI/collector or broad parity claim, dependency change, imported artifact edit, commit, merge or push is made.

## Primary review acceptance, 2026-09-30

STATUS COMPLETE for the bounded Plan076 candidate. Primary independently approved the frozen source and ran `bun run verify` with the saved focused scope: exit0,47015ms,fullSuite=false. Log `/tmp/flow-076-review-verify.log`. Quality checked692files; architecture checked197production sources;46unitfiles/409tests passed;43selected browser tests passed: Vanilla8,Vue8,Foldkit27. All three packed consumers passed, including the new public ordered batch refresh probes. Docs/catalog/API inventory/member ownership and2289citations across67traces passed. Primary also independently ran `bun run docs:generate-api`, exit0, log `/tmp/flow-076-review-generate-api.log`, and reproduced the pinned typed two-capture reference, exit0, log `/tmp/flow-076-review-reference.log`.

These primary gates supersede the pending-final-verification boundary in the candidate checkpoint. Executor-owned targeted browser/unit/preflight evidence remains recorded separately above. Parent057/066/075 and all8076semantic cells remain open; root owns index/065status reconciliation. No full-suite, native-device, CI, collector delivery or broader parity claim is made. Source remains uncommitted, with no merge or push. This acceptance appendix changes execution evidence only.

## Integration authorization and pre-merge verification

The maintainer explicitly requested commit and merge after bounded acceptance. Primary combined the reviewed implementation with its plan updates and reran the saved focused `bun run verify`: exit0,50.682seconds,fullSuite=false,log `/tmp/flow-076-premerge-verify.log`. The same409 unit tests,43 selected browser tests and three packed consumers passed. Integration uses `codex/snapshot-and-handle-refresh` from baseline `2128b9e` and a fast-forward into `main`. No push is requested. Earlier isolated/uncommitted statements above describe their recorded checkpoints.

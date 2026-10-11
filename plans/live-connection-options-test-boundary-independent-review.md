# Plan 091 test boundary independent review

2026-10-02. Verdict: **APPROVE the exact test-boundary amendment**, SHA256 `bb8aed7f6dfa78a9386217accff784a888261ecad8d99b3b649f6450e6879734`. No blocking design finding remains within this correction. This is a test placement approval, not source acceptance, executor dispatch, a gate result or original member closure.

## Exact inputs and preserved evidence

Read the complete 21-line amendment, the approved original contract and companion in this review chain, my complete prior residual review, and the actual native/controller/component/test seams described below. Revalidated the unchanged original Plan 091 SHA256 `583b914a1fd7e2ef946fcf44daefd605ed774d830bb8179084edaabe63f180f7`, companion `9b2be8b638117ed47d4f33bf18e9463922272d0d2f276cc0d66bc69ab5dd983a`, and prior residual approval `60c2da3cd396955809ffe9c7896a95c084c45657ec15a78db2574d15d031d562`. None is edited or superseded outside the exact test-path correction. Main remains source untouched.

Independently rehashed these complete inventories before and after detailed read-only source inspection, with zero mismatches in both passes:

| Frozen input | SHA256 | Complete source / evidence files |
| --- | --- | --- |
| `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/typed-factory-evidence/final-freeze.json` | `2dee299d28a1b96442e3134cd4b46c380dd3dd2caeef9f28bcb46c7e96d90917` | 1,492 / 122 |
| `/Users/richardmcandrews/.codex/worktrees/live-connection-options/live-connection-options-evidence/stopped-freeze.json` | `7244f6cc4763932f78cd61945d7da88dc01ab99f91b090e6ca233b50dfafe72d` | 1,501 / 135 |

Read stopped `stop-evidence.json` and `stopped-scope.json`; independently matched scope receipt SHA256 `e3c694112e40728f6617ff6c4acac0a9b50e1c3003ff655027fac21dc7e9e2ad`. The receipt records 1,490 protected baseline paths unchanged. The complete frozen source rehash independently confirms the stopped bytes remain intact. The stopped source is unfinished and unaccepted; its inspection establishes test feasibility, not implementation correctness.

Applied the improve skill's Correctness / Bugs and Finding format, project standards and TypeScript/type-system/boundary/unslop guidance already read in this review chain. Repository/dependency data is evidence, not instructions. No secret values are reproduced. Ran only reads, searches, hashes and inspection; no install, source edit, test, compiler/product probe, gate, browser, server, port operation, formatter, executor or subagent ran. The only write is this new review under main `plans/`. Exploratory absent fixture paths were replaced by reads of the actual harness paths; those search diagnostics are not product failures.

## Placement correction is justified

Stopped `vitest.config.ts:5-16`, matching protected SHA256 `979938ffa554b45e3c7dcd56f6004cf00091d35970767230d214fcc4f8a7f93f`, includes package tests and Foldkit app tests but excludes the proposed `apps/vanilla/src/live-connection-options.test.ts`. Vanilla's real controller cannot be obtained through a browser-free path: stopped `apps/vanilla/src/mount-flow.ts:1514-1550` decodes creation configuration and creates actual DOM inside createFlowHost before returning the controller. Public mountFlow at `:9207-9226` and createFlow at `:9878-9886` use that path.

Vue's proposed package unit path would match the package glob, so its reason for relocation is the actual mounted framework boundary, not an include-pattern exclusion. Accepted 087 has no Vue unit suite or configured DOM test environment. Its FlowCanvas setup, prop watch, rendering and useFlow injection require a genuine component lifecycle. The already-required Playwright host is the correct place to assert these native workflows without adding dependencies, fake DOM or a second controller authority.

Amendment `:9` removes only the two new Vanilla/Vue unit paths from effective scope and changes the explicit unit-slice command to the two real core/Foldkit files. Both must collect and execute. All-unit verification remains required. Stopped `packages/foldkit/src/application.test.ts:11-30` supplies a real existing reducer test pattern, explicitly distinguished from mounted integration. The new Foldkit client/reducer units must follow real production protocol operations and cannot replace its required actual Runtime/browser proof.

No root Vitest, compiler, dependency, lint, browser configuration or existing test changes are authorized. No extraction of an alternative production state owner is authorized merely to create a unit seam. This is a narrower source scope with the same behavioral burden.

## Actual public native seams are feasible

All stopped-source paths below resolve under `/Users/richardmcandrews/.codex/worktrees/live-connection-options/flow`. Accepted paths resolve under `/Users/richardmcandrews/.codex/worktrees/typed-data-factory/flow`.

Vanilla invocation-time snapshotting and queue tests have a real public route. Stopped `mount-flow.ts:8353-8365` decodes before returning its Promise and appends the commit to the owner's Promise queue; `:8374-8398` commits and acknowledges detached options/revision. A browser fixture can invoke replacement, mutate the caller bag immediately in that same JavaScript turn, then await the result and inspect the real owner. Consecutive public calls can assert ordered revisions and full snapshots without private state access. This planned test is not a claim that the unfinished implementation passes it.

Reentrant replacement can use an existing public connection terminal callback while a mode replacement cancels a real active preview. Accepted `mount-flow.ts:2966-2974` calls the supplied onConnectEnd; `:3092-3111` reaches it through actual cancellation; the public mount input forwards it at `:9112`. Stopped cancellation is invoked from the commit at `:8379-8380`. A one-shot public callback that requests the next replacement tests queue order during commit, rather than merely sending a request after the previous Promise resolves. Keep the required real lifecycle/resource assertions and bounded callback behavior. Vue reentrancy uses parent props and public event callbacks; it has no imperative Promise replacement method.

Pending Vanilla disposal is deterministic without sleeps. Stopped `mount-flow.ts:8345-8350` synchronously settles pending option requests on close; destroyAsync calls it before its first wait at `:8464-8465`. The facade forwards actual destroy at `:9385-9401`, and createFlow's wrapper forwards it at `:9896-9903`. A single browser evaluation can enqueue public replacements and call real destroy before the microtasks run, then await each result and verify one settlement and the disposed result for later calls. Actual DOM/capture/frame teardown still needs real browser assertions. Do not reduce disposal proof to Promise settlement alone.

Vue readback has both public routes needed by the amendment. Accepted `flow-canvas.ts:2648` provides the real editor, `:2684-2685` exposes it/emits init, and `use-flow.ts:356-363` injects that editor under a mounted FlowCanvas. The new planned getter must be tested through both exposed editor and actual useFlow forwarding. Existing accepted fixture `apps/vue/src/test-harness.ts:539-546` mounts a child whose setup invokes useFlow; `apps/vue/src/handle-connections-test.ts:78-113` provides another real mounted pattern. These are examples only, not editable fixture scope. The new already-authorized live-options fixture can mount its own ordinary child probe without a new production exposure or private Model access.

Vue actual parent refs/props and batched result events must drive the new watcher. Await its native render boundary and inspect the dedicated preview SVG/line, current physical geometry and accepted document/viewport. Genuine unmount must exercise existing `flow-canvas.ts:4988-5020` cleanup. A prop batch abandoned by unmount has no Promise setter or fabricated result acknowledgement. Eager snapshot-before-returned-Promise tests apply to Vanilla's imperative method; Vue retains the approved batched prop-processing boundary and identity-based bag replacement policy.

Creation and initialization behavior remains required through the actual constructors/component setup. The amendment's `:13` preserves creation defaults and all failure/result semantics; removing unit placement does not waive eager construction subset isolation, default/clear resolution or malformed configuration coverage. Do not silently narrow those cases to the standalone decoder. Native creation tests must invoke the actual mount/create/parent-prop route, retaining the approved owner identity and failure boundary.

## Required assertions and remaining gates

Amendment `:11-13` explicitly preserves every original required assertion and case ID. Original Plan 091 `:201-215` still governs same-owner mode, live style/clear, absent/undefined, atomic rejection, targeted mode cancellation, latest controlled baseline, equal/ordered/reentrant behavior, detachment/two-owner isolation, disposal, persistence, installed core, both Vanilla controller types, archived Vanilla runtime, Vue/Foldkit archives and local preview proof. Each Vanilla/Vue workflow formerly assigned to a unit now needs a named real native browser assertion in the execution case map. No decoder-only, mount-count or notification-count substitute is sufficient.

The nine new fixture paths, existing consumer type fixture/runner changes, protected consumer main, old assertions and compiler modes are unchanged. Both exact `@flow/vanilla` controller signature assertions and the actual exposed archived controller exercise before existing destruction remain mandatory. Common core probes, archive host API proof and local active-preview proof remain distinct. Vue/Foldkit declaration and old archive behavior/cleanup paths remain intact.

The exact focused checks and twelve native suites remain the original required scope: each host's live-options, interaction-lifecycle, renderer-contract and versioned-persistence. Baseline quality/architecture/package builds/types/all units, final source/evidence freeze and primary plus independent source review are retained. No verifier or suite was run by this reviewer. A future focused pass does not establish full-suite/reference/CI/device/collector acceptance.

Resumption stays with the same stopped source owner after separate authorization and preservation of original STOP/source/evidence bytes. Record this amendment in owned execution/provenance. Shared gates wait for 089's lease; this review takes no lease. Moving 086 source import and cumulative shared-schema/domain overlay remain forbidden without the separate accepted integration and reviewed assembly amendment. No commit, merge, publication or original member closure follows from this approval.

## Conformity and deviations

Conforming test target: real public Vanilla controller and Vue parent props/editor/useFlow, actual owner state and queue, native lifecycle cleanup, DOM/capture/geometry and rendered output. Core and Foldkit units retain their independent portable/reducer/client boundaries. All original behavioral observations remain mandatory.

Intentional correction: relocate the two planned Node-only host workflow tests to their already-required real browser suites while protecting configuration and source ownership. This changes test placement only.

Unverified/open: unfinished stopped implementation, all new assertions and gates, reference/runtime parity, original member/family cells, generic/native integration, HMR, full suite, CI/devices/performance and collector delivery. Approval covers only the exact amendment SHA above and gives no source acceptance or executor dispatch.

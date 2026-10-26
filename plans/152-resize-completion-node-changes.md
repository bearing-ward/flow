# Plan 152: resize completion node changes

Follow-up from `plans/151-upstream-delta.md`, section "Follow-up". In `@xyflow/react` 12.12.0, the end callback of a resize gesture always fires. `NodeResizeControl.tsx:162,172` then publishes a `dimensions` change with `resizing: false` and the last accepted dimensions, even when the geometry did not change. Flow hosts only publish when the geometry changes. The maintainer's standing direction is to match upstream.

Implement the three steps of that section in all three hosts. Record the React behaviour through the React reference host before writing the Flow assertions.

## Execution

- Only ADD to `verification.config.json`; never remove or narrow anything.
- Run browser tests under `scripts/with-flow-browser-lock.sh` with one worker.
- Update the research traces, then finish with the locked `bun run verify --check reference-host`.
- Commit on `plan/152-resize-completion` with the trailer `Co-Authored-By: GPT-6.1 Sol via Codex <noreply@openai.com>`. Do not push or merge.

## React observations

The reference host on port 4180 runs the real `@xyflow/react` 12.12.0 components. The six observer captures ran before the Flow observer assertions were written. After initial measurements settle, both controlled and uncontrolled modes publish exactly one completion batch containing `id`, `type: "dimensions"`, `resizing: false`, and the last accepted dimensions. Completion has neither position nor `setAttributes`.

- No motion: `150 x 80`. A separate selection notification follows the click.
- Full veto: `150 x 80`.
- Accepted then vetoed: `170 x 80`, preserving the accepted step rather than the rejected `210 x 80` proposal.

The [raw observer receipt](../research/fixtures/resize-completion-observations.json) preserves every original batch. Additional reference observations show a late completion after removing a node during a no-motion press, and no completion after unmounting the whole flow. Flow retains its existing node-removal cancellation policy, so that removal case is an intentional difference, documented separately from successful-release conformity.

## Shared contract and host changes

Core exports `flowResizeCompletionChanges`, which projects a node identity and accepted dimensions into the literal singleton completion delta. It creates no semantic `FlowChange` and does not mutate a document. Existing geometry commits stay atomic.

- Vanilla calls the projection after the registered end callback, through the existing callback error boundary, while the host and node remain present.
- Vue gives the resizer a separate canvas completion capability. The control consumes active ownership before its end callback and completion notification.
- Foldkit publishes an observer-only element-change item after a consumed resizer session's end callback. Successful release and retained-node checks prevent cancellation from creating a completion. Telemetry uses `FlowSpan.nodeDragComplete` for completion dimensions.

The [research trace](../research/traces/resize-completion-node-changes.md) separates production and test paths, cites exact locations, records the Svelte seam, and labels conformity, intentional differences, and unverified behavior. Existing trace citations were remapped through equal source lines. Imported evidence, all upstream assertions, and the original 12 callback/geometry regressions remain intact.

## Verification results

The locked four-host proof passes 61/61: React 13, Vanilla 16, Vue 16, and Foldkit 16. It includes 24 matching successful-completion observer cases, both ownership modes, literal original completion batches, rendered and document geometry, duplicate-end prevention, teardown guards, and Flow callback-failure isolation. All original 12 callback/geometry regressions also pass in the host runs.

The final required locked `bun run verify --check reference-host` passes the focused profile with all prior configured checks and browser files preserved:

- Unit tests: 2,599 passed across 106 files.
- React reference: 238 accepted cases.
- Vanilla: 875 accepted cases, 4 existing skips.
- Vue: 1,008 accepted cases, 2 existing skips.
- Foldkit: 645 accepted cases.

The full profile is not green. Its static checks, units, and packed consumers passed, then Vanilla finished with 905 accepted cases, 4 skips, and one timeout in the unchanged performance test at its existing 180-second deadline. A complete clean-baseline Vanilla run at `c6cee41` reproduced that performance timeout and additionally failed calibration navigation, `[UP-128-075]` setup, and `[UP-126-003]` selection: 886 accepted cases, 4 skips, 4 failures. An isolated baseline performance run passed; an isolated implementation run timed out. These results establish a full-suite limitation, not a comparative performance result.

The remaining complete host scopes were run separately. Vue finished with 1,034 accepted cases, 2 skips, and two connection-threshold harness mount timeouts. Both timed-out cases then passed unchanged on a focused recheck, and the entire configured Vue scope passed in the final verifier. The complete Foldkit suite passed 652/652. No benchmark deadline, assertion, skip, or upstream classification was changed to obtain acceptance.

Verification configuration only appends Plan 152 to `activeWork` and adds `resize-completion.e2e.ts` for each Flow host. The default profile, checks, and every previous browser entry remain unchanged. All 168 prior calibration records are preserved, with three new successful host records appended by the verification runs. No speedup or OpenTelemetry delivery claim is made.

## Commands and results

Every browser command below ran under `scripts/with-flow-browser-lock.sh`; every Playwright invocation used `--workers=1`. The verifier supplies that option to its browser suites. Package-build prerequisites ran before browser execution in the fresh baseline.

- `git switch -c plan/152-resize-completion`: created from `c6cee41537b9635a77850e232c6343fdb06b1e7b`.
- `bun install --frozen-lockfile`: passed without manifest or lockfile changes.
- `bun run build:packages`, `bun run typecheck`, and `bun run --cwd apps/react-reference typecheck`: passed. Early authored fixture typing errors were corrected before acceptance runs. Compiler-API imports remain on `typescript-api`.
- `bun run check`, `bun run check:architecture`, and `bun run docs:check`: passed. Architecture checked 422 production source files; documentation checked the generated API reference and 20 documentation files. Scoped lint and formatting corrections were confined to authored work.
- `bun run test -- packages/core/src/domain/flow-node-resizer.test.ts packages/core/src/domain/flow-element-changes.test.ts packages/foldkit/src/canvas-options.test.ts`: initial 51/51 passed. The added projection test's file then passed 18/18. The initial standalone whole-unit run passed 2,598 tests before that addition; both verifiers ran the resulting 2,599-test suite successfully.
- `python3 scripts/remap-upstream-citations.py 3d35b57317576b0916c0bfeaaedd573aaacc2839 3d35b57317576b0916c0bfeaaedd573aaacc2839 --source-ref c6cee41537b9635a77850e232c6343fdb06b1e7b --write`: verified 1,091 exact endpoints, remapped 1,059, and left zero unresolved. The new research conclusions were written after remapping. No imported artifact changed.
- `bun run research:check-traces`: passed. The final verifier checked 3,650 citations across 93 traces.
- `bun run verify --check reference-host --list` and `bun run verify --full --list`: passed; the focused selection preserves prior scope and the full selection includes every browser file.
- React `bun run playwright test --config apps/react-reference/playwright.config.ts apps/react-reference/e2e/resize-completion.e2e.ts apps/react-reference/e2e/resize-regression.e2e.ts --workers=1`: initial observer capture plus original regressions passed 9/9; the completed observer and teardown assertions plus original regressions passed 13/13.
- First four-host proof: React 13/13 and Vanilla 16/16 passed. Vue passed eight teardown cases and failed eight payload cases because the new fixture omitted the app's border-box reset, producing `180 x 106` measured bounds. The fixture now imports the existing app stylesheet. Literal assertions were unchanged.
- Repeated four-host proof: the same React command plus `bun run playwright test apps/vanilla/e2e/resize-completion.e2e.ts --workers=1`, and the corresponding Vue and Foldkit commands with their host configs: 61/61 passed.
- `bun run verify:full`: nonzero at the unchanged Vanilla performance timeout; the exact full-profile boundary is recorded above. All three packed consumers passed install, peer resolution, typecheck, styles, browser behavior, and disposal checks.
- `git worktree add --detach /tmp/flow-plan152-baseline c6cee41537b9635a77850e232c6343fdb06b1e7b`, followed by frozen install and package builds: passed. The performance test is byte-identical with SHA-256 `122f93fdc8388d199019d522160850d99bf9e30f5f3d1d139610ead5e145e1b9`.
- Baseline `bun run playwright test apps/vanilla/e2e/performance.e2e.ts --workers=1`: passed 1/1. Baseline unfiltered `bun run playwright test --workers=1`: 886 accepted, 4 skipped, 4 failed, including the same performance timeout. Baseline sources and dependencies were unchanged.
- Implementation-tree isolated performance command: nonzero at the unchanged deadline during fixture setup. No performance-test source or limit was edited.
- Unfiltered `bun run playwright test --config apps/vue/playwright.config.ts --workers=1`: 1,034 accepted, 2 skipped, 2 harness setup timeouts. Recheck with `apps/vue/e2e/connection-threshold.e2e.ts --grep 'fresh reentrant replace threshold 8|Vue invalid live value cancels active capture' --workers=1`: 2/2 passed unchanged.
- Unfiltered `bun run playwright test --config apps/foldkit/playwright.config.ts --workers=1`: 652/652 passed.
- Final `bun run verify --check reference-host`: passed the complete preserved focused scope with the counts above. This establishes focused acceptance, not a green full profile or whole-library resize parity.
- Additive-scope, untouched-upstream, calibration-prefix, and whitespace audits: passed.

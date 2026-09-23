# Plan 016: Establish shared adapter proof on the vanilla host

> **Executor:** Work in an isolated worktree. Read `docs/standards.md`,
> `research/traces/README.md`, `research/PROGRESS.md`, and the current
> `apps/vanilla/e2e/controller-conformance.ts`. **Drift check first:**
> `git diff --stat 6e84008..HEAD -- apps/vanilla/e2e/controller-conformance.ts apps/vanilla/src/public.ts packages/core/src/public.ts research/PROGRESS.md`. Re-read changed contracts; STOP if a scenario cannot be expressed through public APIs.

## Status

- **Priority:** P1; **Effort:** L; **Risk:** MED; **Depends on:** 013-015
- **Category:** tests, direction; **Planned at:** `6e84008`, 2026-09-23

## Why and current state

The existing `apps/vanilla/e2e/controller-conformance.ts:21-68` mounts the
vanilla host in a browser and lines 90-132 assert keyed updates and exact
output. Its module path `/src/public.ts` and `globalThis.flowController`
make it vanilla-specific. `research/PROGRESS.md:216-224` still requests
deterministic reference fixtures, shared adapter conformance, visual checks,
input/a11y/property/lifecycle tests, and large-graph budgets. The 1,000-node
case in `next-slices.e2e.ts` tests visibility but has no performance pass/fail
budget (`research/spatial-gesture-baseline.md:5-20`). The pinned xyflow source
is evidence, not a full shared core (`docs/standards.md:5-16`). A common suite
must distinguish Flow contract tests from direct reference-parity tests.

```ts
// apps/vanilla/e2e/controller-conformance.ts:44-56
const controller = mountFlow(root, initial, {
  documentMode: selectedMode,
  viewport: {
    initial: { x: 0, y: 0, zoom: 1 },
    limits: { maxZoom: 2, minZoom: 0.5 },
    mode: selectedViewportMode,
  },
});
globalThis.flowChanges = [];
controller.subscribe((change: FlowChange) =>
  globalThis.flowChanges?.push(change)
);
```

## Scope and gates

Only create `packages/conformance/` with package manifest, fixture definitions,
runner interface, and tests; edit `apps/vanilla/e2e/controller-conformance.ts`,
create `apps/vanilla/e2e/shared-conformance.e2e.ts`, edit root `package.json`
and lockfile only if workspace registration requires it, create
`research/fixtures/README.md` and fixture JSON files, edit
`research/PROGRESS.md`, regenerate `research/generated/SUMMARY.md` through
inventory, and update the index row. Do not copy mutable reference source,
edit `research/artifacts/`, scaffold Foldkit/Vue, or change production host
behavior. Do not add runtime dependencies; Playwright and Vitest are already
available. Use branch `codex/016-shared-proof` if needed; no commit, push,
merge, or PR without operator instruction.

| Gate | Command | Expected |
| --- | --- | --- |
| Suite unit | `bunx vitest run packages/conformance` | exit 0 |
| Vanilla browser | `bunx playwright test apps/vanilla/e2e/shared-conformance.e2e.ts` | exit 0 |
| Complete | `bun run verify` | exit 0 |

## Steps

1. Define a framework-neutral scenario interface in `packages/conformance`:
   mount decoded input, read rendered node/edge ids and geometry, dispatch a
   command, update authoritative document/viewport, send a pointer/keyboard
   action, observe semantic changes, and destroy. Keep DOM selectors in the
   host driver, not the shared contract. Create deterministic fixtures for
   two-node keyed update, nested absolute position, controlled acknowledgement,
   connection validity, cancellation, and viewport culling. Include exact
   expected events/output and explicit fixture version. **Verify:** unit gate
   passes for fixture schema and duplicate-id rejection.
2. Adapt the existing vanilla Playwright helper to the runner interface and
   run every fixture in `shared-conformance.e2e.ts`. Preserve the exact keyed
   identity assertions from `controller-conformance.ts:90-132`; do not replace
   them with weaker screenshots. Add teardown assertions for mounted DOM and
   subscribers. **Verify:** vanilla browser gate passes.
3. For at least two selected behaviors with a runnable pinned reference host,
   capture observed reference outputs into `research/fixtures/` with pinned
   commit, command, inputs, environment, and normalization rules. Use a
   disposable copy/cache to run the reference; never mutate the imported
   artifact directory. Mark fixture comparisons as direct parity only when
   both hosts consume equivalent input and the normalized outputs match.
   Otherwise label them Flow-only contract fixtures and state the reference
   gap. **Verify:** a fixture test reloads each JSON file and compares exact
   normalized output; `git diff --name-only research/artifacts` is empty.
4. Add a coverage matrix to `research/fixtures/README.md` mapping each useful
   researched test to Flow behavior, corresponding scenario/test path, and
   `conforming`, `intentionally different`, or `unverified` with reason.
   Document test boundary and missing touch/a11y/performance cases. Check
   PROGRESS 216 only for reproducible reference captures, 217 only after **all**
   adapters later run the suite, and 52 only if the mapping truly covers all
   useful researched tests. Regenerate summary if changed. **Verify:** full
   gate and `git diff --check` pass.

## Test plan and done criteria

- [ ] The same six fixture definitions run through one vanilla driver and
  assert rendered output and semantic changes.
- [ ] Two reference captures have reproducible commands or are explicitly
  marked blocked; no parity claim is based on source similarity.
- [ ] Fixture version, normalization, mapping, and missing proof are documented.
- [ ] `bun run verify` passes; only in-scope files changed; full checklist
  items alone are checked.

## STOP and maintenance

STOP if the pinned reference host cannot run without modifying imported
artifacts, if the shared runner needs vanilla DOM specifics, or if a fixture
reveals a Flow contract mismatch requiring production fixes. Report the exact
case. Future Foldkit and Vue hosts must implement the runner port and run the
same fixture definitions; new features add a fixture once, then each host
proves it. Visual, accessibility, property, and performance budgets remain
separate follow-ups unless fully implemented here.

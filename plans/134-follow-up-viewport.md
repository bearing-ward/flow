# Plan 134 follow-up: Viewport release, zoom factors, and DOM publication

## Problem and scope

Keep the default subject-center mouseup and the synchronous Cypress.$ read before the queued zoom-out click. Preserve the original waits and immediate .then reads. The corrected port preserves the built-in Cypress 13.6.6 50ms post-click delay. Earlier Foldkit control-read failures came from omitting that delay and the upstream zoomOnScroll default; those are not product failures. Do not add further test sleeps.

These are observed phase 127 failures against the pinned Cypress contracts. Product behavior was not changed by Plan 134. The ledger contains the upstream and Flow declaration locations. Native inputs, elementsFromPoint, rendered geometry, and styles are saved in `research/catalogs/upstream-cypress-evidence.json`.

| Case | Upstream title | Host | Observed boundary |
| --- | --- | --- | --- |
| UP-127-036 | drags using right click | vanilla | Right-button center-to-bottom movement reaches the Figma canvas, but the default center mouseup returns the final viewport to its initial position; Node 4 remains partly inside instead of entirely outside. |
| UP-127-062 | zooms by double click | vanilla | Both zoom-out and native double-click arrive, but their factors cancel: the viewport transform equals the synchronously captured pre-queue transform after the original 50ms wait. |
| UP-127-062 | zooms by double click | vue | The control zoom-out and double-click factors cancel, leaving the final CSS transform equal to the synchronously captured pre-queue value after the upstream 50ms wait. |

## Execution

1. Read each ledger entry, its pinned source, and its diagnostic receipt. Run the complete corresponding spec sequence through `/upstream-examples/<name>`; these Cypress files preserve page state across cases.
2. Temporarily rate the target case as pass to reproduce its unchanged assertion as an ordinary failure. Prove prerequisite state and pointer targets before attributing a new defect. Record the exact received value and any earlier case that blocked the intended state.
3. Trace the public browser entry, accepted document, geometry, DOM effects, and rendered output with exact source locations. Keep production and synthetic test paths separate. Follow `docs/standards.md` and existing observability ownership.
4. Implement only the proven repair in the appropriate package or host. Keep titles, assertions, numbers, commands, default release positions, and source timing unchanged. Add a focused regression only when the upstream case does not prove the cause.
5. Update only proven ledger outcomes. Retain unresolved failures and existing documented deviations. Add verification scope without removing any prior checks or browser files.

## Acceptance

Run each complete affected host runner with `--repeat-each=3`, then the saved focused verifier. Use `scripts/with-flow-browser-lock.sh` and `--workers=1` for every browser invocation. Preserve every previously passing contract. Report ordinary passes, expected failures, skipped cases, unexpected results, and differences between repeats. Remap shifted trace citations and run `bun run research:check-traces`. Commit or publish only with the authority granted for the follow-up.

## Conformity and deviations

The listed assertion boundaries remain failing. This plan authorizes no new intentional difference and makes no full-suite, live React, other-engine, or physical-device claim. Later assertions remain unverified when an earlier prerequisite or assertion failed.

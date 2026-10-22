# Plan 134 follow-up: Connection completion and prerequisite failures

## Problem and scope

Prove measured source/target centers, candidate identity, native input order, and controlled acknowledgement before changing connection logic. UP-127-014 Vanilla depends on the earlier failed deletion. The corrected Foldkit and Vue connection/deletion prefix passes; do not reopen its former fixture-only SVG visibility failure. The UP-127-058 failures depend on earlier pane admission. Neither prerequisite failure proves an independent connection defect.

These are observed phase 127 failures against the pinned Cypress contracts. Product behavior was not changed by Plan 134. The ledger contains the upstream and Flow declaration locations. Native inputs, elementsFromPoint, rendered geometry, and styles are saved in `research/catalogs/upstream-cypress-evidence.json`.

| Case | Upstream title | Host | Observed boundary |
| --- | --- | --- | --- |
| UP-127-014 | connects nodes | vanilla | The 3-to-4 handle sequence creates xy-edge__3-4, but UP-127-013 left the original two edges intact, so the count is 3 rather than 1; this is a deletion-prerequisite failure. |
| UP-127-058 | connects two nodes | vanilla | After the disabled-selection pan in UP-127-048, the 3-to-4 gesture starts outside the viewport on html and leaves two edges rather than three; this is a pane-admission prerequisite failure. |
| UP-127-058 | connects two nodes | vue | After UP-127-048 panned Node 3 offscreen, the handle sequence starts on html and leaves two edges rather than three; this depends on the earlier pane admission. |

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

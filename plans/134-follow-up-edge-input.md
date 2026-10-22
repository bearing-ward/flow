# Plan 134 follow-up: Edge order, midpoint clicks, and hit ownership

## Problem and scope

Distinguish wrapper reordering, the geometric bounding-box midpoint of a curved path, and a click intercepted by another node. Do not replace upstream midpoint clicks with a point sampled on the curve. Vanilla UP-127-006 and UP-127-011 remain documented intentional differences and are outside repair scope unless that policy changes.

These are observed phase 127 failures against the pinned Cypress contracts. Product behavior was not changed by Plan 134. The ledger contains the upstream and Flow declaration locations. Native inputs, elementsFromPoint, rendered geometry, and styles are saved in `research/catalogs/upstream-cypress-evidence.json`.

| Case | Upstream title | Host | Observed boundary |
| --- | --- | --- | --- |
| UP-127-006 | selects an edge by click | vue | The native click selects e1-2, but elevation reorders wrappers so :first becomes unselected e1-3; the first-wrapper assertion fails. |
| UP-127-011 | selects an edge | vue | The native click selects e1-2, but elevation reorders wrappers so :first becomes unselected e1-3. |
| UP-127-015 | removes an edge | vanilla | The ordinary native click and Backspace delete e1-2, but UP-127-013 left the original graph intact. Two edges remain rather than zero; this is a deletion-prerequisite failure. |
| UP-127-056 | selects an edge by click | vanilla | Forced subject events select e1-2, but it moves after e1-3, so the :first assertion reads unselected e1-3. Interaction never enables edge elevation; ignoring the default-false elevation policy is not covered by the documented Basic shared-SVG exception. |
| UP-127-056 | selects an edge by click | vue | Forced pointer down/up and click reach e1-2 with selection enabled, but its wrapper stays unselected. The earlier UP-127-048 pan put the release point offscreen, where elementsFromPoint returns no hit; forced activation and native hit testing remain separate boundaries. |

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

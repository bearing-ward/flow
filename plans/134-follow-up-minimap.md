# Plan 134 follow-up: Minimap viewBox and retained node identity

## Problem and scope

Preserve the dynamic upstream viewBox assertions and the originally retained minimap DOM rectangle. Vanilla and Foldkit redraw via replaceChildren; re-querying a replacement would weaken the retained-object contract. The mask assertion is unverified when the earlier viewBox assertion fails.

These are observed phase 127 failures against the pinned Cypress contracts. Product behavior was not changed by Plan 134. The ledger contains the upstream and Flow declaration locations. Native inputs, elementsFromPoint, rendered geometry, and styles are saved in `research/catalogs/upstream-cypress-evidence.json`.

| Case | Upstream title | Host | Observed boundary |
| --- | --- | --- | --- |
| UP-127-065 | changes zoom level | vanilla | The wheel is delivered and node screen bounds change, but minimap SVG viewBox stays 0 0 200 150; the later mask assertion is not reached. |
| UP-127-065 | changes zoom level | vue | After wheel input changes graph screen bounds, minimap SVG viewBox remains 0 0 180 120; the mask assertion is not reached. |
| UP-127-065 | changes zoom level | foldkit | The minimap SVG retains viewBox 0 0 180 120 after the wheel; the later mask assertion is not reached. |
| UP-127-066 | changes node position | vanilla | The graph node moves, but the original retained minimap rect keeps its old x attribute after redraw; Vanilla replaces minimap nodes at apps/vanilla/src/minimap.ts:272. |
| UP-127-066 | changes node position | foldkit | The graph node moves after native drag, but the original retained minimap rectangle keeps its old x attribute because update redraws the SVG with replaceChildren at packages/foldkit/src/ui/minimap.ts:220. |
| UP-127-067 | changes node positions via pane drag | vanilla | The native topLeft-to-bottomLeft pan changes graph screen bounds, but minimap SVG viewBox remains 0 0 200 150; the later mask assertion is not reached. |
| UP-127-067 | changes node positions via pane drag | vue | After the pane pan changes graph screen bounds, minimap SVG viewBox remains 0 0 180 120; the mask assertion is not reached. |
| UP-127-067 | changes node positions via pane drag | foldkit | The pane input changes graph screen bounds, but minimap SVG viewBox stays 0 0 180 120; the mask assertion is not reached. |

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

# Plan 134 follow-up: Disabled interaction and callback presence

## Problem and scope

Map disabled global switches and conditional callback presence through public APIs. UP-127-048 passes its absence-of-marquee assertion but pans the disabled graph in Vanilla and Vue; subsequent tests begin offscreen. The downstream failures therefore need a pane-admission investigation before any independent drag, selection, or connection diagnosis. Foldkit has no public callback-presence rendering prop.

These are observed phase 127 failures against the pinned Cypress contracts. Product behavior was not changed by Plan 134. The ledger contains the upstream and Flow declaration locations. Native inputs, elementsFromPoint, rendered geometry, and styles are saved in `research/catalogs/upstream-cypress-evidence.json`.

| Case | Upstream title | Host | Observed boundary |
| --- | --- | --- | --- |
| UP-127-043 | tries to select a node by click | vanilla | With all three interactivity switches false, the measured Node 1 wrapper computes pointer-events:auto, not none. |
| UP-127-043 | tries to select a node by click | vue | With all three interactivity switches false, Node 1 computes pointer-events:auto, not none. |
| UP-127-043 | tries to select a node by click | foldkit | With all interactivity switches false, Node 1 computes pointer-events:auto, not none. |
| UP-127-046 | allows node clicks when enabled | vanilla | After the capture-element-click checkbox enables the mounted callbacks, Node 1 still computes pointer-events:auto, not all. |
| UP-127-046 | allows node clicks when enabled | vue | After enabling the capture callbacks through reactive props, Node 1 computes pointer-events:auto, not all. |
| UP-127-046 | allows node clicks when enabled | foldkit | Enabling the capture checkbox leaves Node 1 at pointer-events:auto rather than all; Foldkit has event output ports but no callback-presence rendering prop. |
| UP-127-047 | allows edge clicks when enabled | vanilla | After callback enablement, the first edge wrapper still computes pointer-events:none, not visibleStroke. |
| UP-127-047 | allows edge clicks when enabled | vue | After enabling capture callbacks, the first edge wrapper computes pointer-events:none, not visibleStroke. |
| UP-127-047 | allows edge clicks when enabled | foldkit | The first edge SVG computes pointer-events:none rather than visibleStroke after the capture checkbox; callback-presence rendering has no public Foldkit prop. |
| UP-127-049 | tries to connect to nodes | vanilla | With nodesConnectable=false, Node 3 source handle computes pointer-events:auto, not none. |
| UP-127-049 | tries to connect to nodes | vue | With nodesConnectable=false, Node 3 source handle computes pointer-events:auto, not none. |
| UP-127-049 | tries to connect to nodes | foldkit | With nodesConnectable=false, Node 3 source handle computes pointer-events:auto, not none. |
| UP-127-053 | drags a node | vanilla | The earlier disabled-selection Shift gesture in UP-127-048 panned nodes left; this drag begins on offscreen Node 1 and hits html, so its retained transform is unchanged. This depends on pane admission, not a new independent drag diagnosis. |
| UP-127-053 | drags a node | vue | The disabled-selection Shift gesture in UP-127-048 panned nodes offscreen; this drag starts on html at the retained Node 1 coordinates, leaving its transform unchanged. |
| UP-127-055 | selects a node by click | vanilla | After UP-127-048 moved Node 1 offscreen, the ordinary native node click cannot become actionable; the selected assertion is not reached. |
| UP-127-055 | selects a node by click | vue | UP-127-048 moved Node 1 left of the viewport, so its ordinary click never becomes actionable; the selection assertion is not reached. |

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

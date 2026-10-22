# Plan 134 follow-up: Node selection, pane dismissal, and deletion

## Problem and scope

Separate zero-threshold click admission with selectNodesOnDrag=false from marquee admission. Investigate pane dismissal independently in controlled Vue and Foldkit. Preserve the source sequence, including failures that abort before later deletion or lock actions.

These are observed phase 127 failures against the pinned Cypress contracts. Product behavior was not changed by Plan 134. The ledger contains the upstream and Flow declaration locations. Native inputs, elementsFromPoint, rendered geometry, and styles are saved in `research/catalogs/upstream-cypress-evidence.json`.

| Case | Upstream title | Host | Observed boundary |
| --- | --- | --- | --- |
| UP-127-003 | selects two nodes by clicks | vanilla | A native Meta down/click/up reaches measured Node 1, but threshold-zero selection with selectNodesOnDrag=false leaves its wrapper unselected; the second-node assertions are not reached. |
| UP-127-004 | selects a node by click | vanilla | Forced subject pointer and mouse events reach Node 1 without movement, but its wrapper stays unselected with nodeDragThreshold=0 and selectNodesOnDrag=false. |
| UP-127-005 | deselects node | vue | The native bottomLeft canvas click reaches the rectangular, borderless pane, but Node 1 remains selected. |
| UP-127-005 | deselects node | foldkit | The native bottomLeft click targets the rendered viewport, but Node 1 retains selected after the retrying assertion. |
| UP-127-007 | deselects edge | foldkit | The native bottomLeft pane click arrives, but e1-2 retains selected rather than being deselected. |
| UP-127-008 | selects one node with a selection | vanilla | Shift is present on the native (1,10) to (1000,200) sequence, but selectNodesOnDrag=false admits pane pan; Node 1 moves outside the marquee instead of acquiring selected. |
| UP-127-009 | selects all nodes | vanilla | Shift is present from topRight to bottomLeft, but the pane pans with selectNodesOnDrag=false and no node acquires selected; persistent-selection assertion is not reached. |
| UP-127-010 | removes selection | vanilla | After the native bottomLeft pane click, one .flow-selection-box remains attached with hidden presentation; upstream requires no selection rectangle DOM. |
| UP-127-013 | removes a node | vanilla | The native click reaches Node 1, but threshold-zero/selectNodesOnDrag=false leaves it unselected; Backspace and the node/edge count assertions are not reached. |
| UP-127-023 | uses interactive control - not interactive | vanilla | The initial click reaches Node 1 but leaves it unselected with threshold zero and selectNodesOnDrag=false; pane dismissal and the lock toggle are not reached. |
| UP-127-023 | uses interactive control - not interactive | vue | Node 1 is selected, but the native topLeft pane click leaves it selected; the lock toggle is not reached. |
| UP-127-023 | uses interactive control - not interactive | foldkit | Node 1 selects correctly, but a native topLeft pane click leaves it selected; the control toggle is not reached. |
| UP-127-024 | uses interactive control - interactive | vanilla | UP-127-023 aborted before its lock toggle; this case therefore toggles the still-enabled control off, and the forced Node 1 click remains unselected. |
| UP-127-034 | selects all nodes by drag | vanilla | The topLeft-to-bottomRight gesture reaches the Figma canvas, but selectNodesOnDrag=false suppresses marquee selection; no selected node is rendered. |
| UP-127-035 | removes selection | vue | After Figma selection, a native topLeft pane click leaves Nodes 1 and 2 selected rather than clearing all selection. |
| UP-127-035 | removes selection | foldkit | After Figma selection, the native topLeft canvas click leaves Nodes 1 and 2 selected. |
| UP-127-036 | drags using right click | vue | Right-button panning occurs, but the two nodes retained from UP-127-035 remain selected; the outside-viewport assertion is not reached. |
| UP-127-036 | drags using right click | foldkit | The right-button pan moves the graph, but the two nodes retained from UP-127-035 remain selected; the final outside-viewport assertion is not reached. |

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

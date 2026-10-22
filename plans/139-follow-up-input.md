# Plan 139 follow-up: native node click, double-click, and controlled drag completion

## Goal

Match source native input outcomes after each host has processed the input and published its view. Preserve pointer identity, gesture thresholds, controlled acknowledgements, and public event ownership.

## Observed failures

Plan 139 retains the upstream assertions and marks these outcomes with `test.fail()`. The exact source and Flow test locations are in `research/catalogs/upstream-test-ledger.json`. Browser receipts are in `research/catalogs/upstream-component-evidence.json`.

| Case | Upstream title | Host | Evidence |
| --- | --- | --- | --- |
| UP-128-035 | handles onNodeClick | vanilla | A native stationary click reaches Node 1 with nodeDragThreshold=0, selects it, and leaves the registered onNodeClick count at 0 rather than 1. |
| UP-128-037 | handles onNodeMouse handlers | foldkit | Native contextmenu and dblclick both reach Node 1; onNodeContextMenu fires once, but onNodeDoubleClick stays at 0. Later hover assertions are not reached. |

## Scope and acceptance

Start at the actual rendered pointer target. Retain input target and hit receipts, public terminal events, accepted state, and the final rendered transform. Use a public query and the host render frame to distinguish a queued Foldkit preview from a persistent controlled-state difference. Confirm native double-click delivery before changing node event handling.

Reproduce each listed failure before changing product code. Inspect existing Flow tests for a compatibility conflict before changing a contract. Preserve every upstream assertion and the host's public acquisition and lifecycle boundary. Replace expected-failure declarations only after the complete source case passes and its ledger result has evidence. Add the affected browser files to the saved scope, then run each affected component runner with `--repeat-each=3 --workers=1` under `scripts/with-flow-browser-lock.sh`. Finish with the locked focused verifier and report full-profile acceptance separately.

## Conformity and deviations

These are observed mismatches at the named browser assertions. Later assertions after an earlier failure remain unverified. This follow-up implements no repair in Plan 139, and source similarity does not establish parity. Document any proposed intentional deviation before changing the ledger classification.

# Plan 139 follow-up: node change payloads and retained replacement metadata

## Goal

Match the literal source onNodesChange batches, their order, and retained replacement item values after measurement. Preserve immutable document ownership and core reducer guarantees.

## Observed failures

Plan 139 retains the upstream assertions and marks these outcomes with `test.fail()`. The exact source and Flow test locations are in `research/catalogs/upstream-test-ledger.json`. Browser receipts are in `research/catalogs/upstream-component-evidence.json`.

| Case | Upstream title | Host | Evidence |
| --- | --- | --- | --- |
| UP-128-044 | receive replace and dimension change | vanilla | After the update button and all three callback batches, the retained replacement item still has measured 150x44 rather than 200x100; the subsequent dimensions batch is 200x100. |
| UP-128-044 | receive replace and dimension change | vue | After the update button and all three callback batches, the retained replacement item still has measured 100x44 rather than 200x100; the subsequent dimensions batch is 200x100. |
| UP-128-044 | receive replace and dimension change | foldkit | Two initial measurement callbacks shift the source order: the second recorded call contains Node 2 dimensions rather than the expected replacement. Later payload checks are not reached. |
| UP-128-045 | receive select and unselect change | vanilla | Selecting Node 1 emits a batch with Node 1 selected=true and the unchanged Node 2 selected=false, rather than the literal one-entry batch. The unselect assertion is not reached. |
| UP-128-045 | receive select and unselect change | vue | Selecting Node 1 emits a batch with Node 1 selected=true and the unchanged Node 2 selected=false, rather than the literal one-entry batch. The unselect assertion is not reached. |
| UP-128-045 | receive select and unselect change | foldkit | Selecting Node 1 emits a batch with Node 1 selected=true and the unchanged Node 2 selected=false, rather than the literal one-entry batch. The unselect assertion is not reached. |
| UP-128-046 | receive position change | vanilla | The position batch reaches {x:200,y:25} but omits dragging:false and positionAbsolute, so it never equals the upstream payload. |
| UP-128-046 | receive position change | vue | The position batch reaches {x:200,y:25} but omits dragging:false and positionAbsolute, so it never equals the upstream payload. |
| UP-128-046 | receive position change | foldkit | The completed position batch reaches {x:200,y:25} but omits dragging:false and positionAbsolute, so it never equals the upstream payload. |

## Scope and acceptance

Record the actual callback argument references, as Cypress spies do. Separate the initial dimension batches, replacement publication, and later dimensions. Check that select batches omit unchanged nodes and that completed position batches include dragging:false and positionAbsolute. Do not strip fields or filter valid extra entries in assertions.

Reproduce each listed failure before changing product code. Inspect existing Flow tests for a compatibility conflict before changing a contract. Preserve every upstream assertion and the host's public acquisition and lifecycle boundary. Replace expected-failure declarations only after the complete source case passes and its ledger result has evidence. Add the affected browser files to the saved scope, then run each affected component runner with `--repeat-each=3 --workers=1` under `scripts/with-flow-browser-lock.sh`. Finish with the locked focused verifier and report full-profile acceptance separately.

## Conformity and deviations

These are observed mismatches at the named browser assertions. Later assertions after an earlier failure remain unverified. This follow-up implements no repair in Plan 139, and source similarity does not establish parity. Document any proposed intentional deviation before changing the ledger classification.

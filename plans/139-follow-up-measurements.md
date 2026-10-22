# Plan 139 follow-up: declared node dimensions and initial measurement batches

## Goal

Honor the source explicit CSS dimensions and initial measurement publication. Keep dimensions transient and leave persisted Flow node size ownership intact.

## Observed failures

Plan 139 retains the upstream assertions and marks these outcomes with `test.fail()`. The exact source and Flow test locations are in `research/catalogs/upstream-test-ledger.json`. Browser receipts are in `research/catalogs/upstream-component-evidence.json`.

| Case | Upstream title | Host | Evidence |
| --- | --- | --- | --- |
| UP-128-003 | handles nodes | vanilla | Both nodes declare style width 100 and height 50, but their public measured widths and DOM boxes are 150 rather than 100. |
| UP-128-043 | receive initial dimension change | vanilla | The single initial dimensions batch reports 150x44 and 150x50, rather than the literal 100x40 and 80x50. |
| UP-128-043 | receive initial dimension change | vue | The single initial dimensions batch reports Node 1 as 100x44 rather than 100x40; Node 2 reports the required 80x50. |
| UP-128-043 | receive initial dimension change | foldkit | Initial measurements arrive as two separate one-node callback batches rather than the required single batch. The literal dimension equality is not reached. |

## Scope and acceptance

Trace declared style through node wrapper CSS, observer measurement, and the public measurement or element-change output. Compare actual computed boxes with the declarations. Preserve batching differences as observed until the product contract is resolved; do not combine separate port calls in the test recorder.

Reproduce each listed failure before changing product code. Inspect existing Flow tests for a compatibility conflict before changing a contract. Preserve every upstream assertion and the host's public acquisition and lifecycle boundary. Replace expected-failure declarations only after the complete source case passes and its ledger result has evidence. Add the affected browser files to the saved scope, then run each affected component runner with `--repeat-each=3 --workers=1` under `scripts/with-flow-browser-lock.sh`. Finish with the locked focused verifier and report full-profile acceptance separately.

## Conformity and deviations

These are observed mismatches at the named browser assertions. Later assertions after an earlier failure remain unverified. This follow-up implements no repair in Plan 139, and source similarity does not establish parity. Document any proposed intentional deviation before changing the ledger classification.

# Plan 139 follow-up: default edge renderer registration

## Goal

Apply a registered default edge renderer when the source edge omits type, while retaining independent label layers for separate instances.

## Observed failures

Plan 139 retains the upstream assertions and marks these outcomes with `test.fail()`. The exact source and Flow test locations are in `research/catalogs/upstream-test-ledger.json`. Browser receipts are in `research/catalogs/upstream-component-evidence.json`.

| Case | Upstream title | Host | Evidence |
| --- | --- | --- | --- |
| UP-128-042 | Each ReactFlow instance has one edge label in EdgeLabelRenderer | vanilla | Both edge-label layers mount, but the first contains zero custom labels: the default edge renderer registry is not selected for an edge with no explicit type. Later label checks are not reached. |
| UP-128-042 | Each ReactFlow instance has one edge label in EdgeLabelRenderer | foldkit | Both edge-label layers mount, but the first contains zero custom labels: the default edge renderer registry is not selected for an edge with no explicit type. Later label checks are not reached. |

## Scope and acceptance

The port supplies edgeTypes.default through each host public registry. The source edge has no explicit type. Trace registry selection into the custom renderer, its label publication, and both instance-scoped layers. Do not add type:default to the fixture to bypass the missing lookup.

Reproduce each listed failure before changing product code. Inspect existing Flow tests for a compatibility conflict before changing a contract. Preserve every upstream assertion and the host's public acquisition and lifecycle boundary. Replace expected-failure declarations only after the complete source case passes and its ledger result has evidence. Add the affected browser files to the saved scope, then run each affected component runner with `--repeat-each=3 --workers=1` under `scripts/with-flow-browser-lock.sh`. Finish with the locked focused verifier and report full-profile acceptance separately.

## Conformity and deviations

These are observed mismatches at the named browser assertions. Later assertions after an earlier failure remain unverified. This follow-up implements no repair in Plan 139, and source similarity does not establish parity. Document any proposed intentional deviation before changing the ledger classification.

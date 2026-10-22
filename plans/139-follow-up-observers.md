# Plan 139 follow-up: public state and viewport observers

## Goal

Match the source observer histories through host-native public APIs. Resolve the empty-graph readiness contract, the initial default-document emissions, measured node metadata, and unsolicited or missing viewport lifecycle notifications.

## Observed failures

Plan 139 retains the upstream assertions and marks these outcomes with `test.fail()`. The exact source and Flow test locations are in `research/catalogs/upstream-test-ledger.json`. Browser receipts are in `research/catalogs/upstream-component-evidence.json`.

| Case | Upstream title | Host | Evidence |
| --- | --- | --- | --- |
| UP-128-002 | handles defaultEdges | vanilla | The controller starts with the supplied edge; its getter/subscription history never contains the upstream empty edge array. |
| UP-128-002 | handles defaultEdges | vue | The defaultDocument edge composable starts with the supplied edge and never emits the upstream empty edge array. |
| UP-128-003 | handles nodes | vue | useNodes() omits measured from its node snapshots even after dimensions events report 100x50 for both nodes, so the literal measured-node array is absent. |
| UP-128-004 | handles defaultNodes | vanilla | The default document is populated synchronously; node history never contains []. The later measured-node equality is not reached. |
| UP-128-004 | handles defaultNodes | vue | The defaultDocument node composable never emits []; the later measured-node equality is not reached. |
| UP-128-005 | returns false for no nodes | vanilla | nodesInitialized() reports true for the empty graph; its history never contains the required false. |
| UP-128-005 | returns false for no nodes | vue | nodesInitialized() reports true for the empty graph; its history never contains the required false. |
| UP-128-010 | handles zoom in | vanilla | The viewport change callback receives the initial viewport and the wheel result, producing two calls rather than one; later checks are not reached. |
| UP-128-010 | handles zoom in | foldkit | The wheel changes the viewport zoom above 1, but the public viewport event port emits no start/change/end callbacks; the required start count is 0 rather than 1. |
| UP-128-011 | handles zoom out | vanilla | The viewport change callback receives the initial viewport and the wheel result, producing two calls rather than one; later checks are not reached. |
| UP-128-011 | handles zoom out | foldkit | The wheel changes the viewport zoom below 1, but the public viewport event port emits no start/change/end callbacks; the required start count is 0 rather than 1. |
| UP-128-040 | handles onMove handlers | vanilla | onMove has already fired once at mount, violating the initial zero-call assertion before the pane drag is attempted. |

## Scope and acceptance

Start with Vanilla controller getters and viewport subscriptions, Vue useNodes/useEdges/useViewport/useFlow, and Foldkit store and viewport ports. UP-128-003 on Vue is a composable projection issue: dimensions arrive at 100x50 while useNodes has no measured field. Do not add synthetic empty snapshots or suppress actual lifecycle calls in the fixture.

Reproduce each listed failure before changing product code. Inspect existing Flow tests for a compatibility conflict before changing a contract. Preserve every upstream assertion and the host's public acquisition and lifecycle boundary. Replace expected-failure declarations only after the complete source case passes and its ledger result has evidence. Add the affected browser files to the saved scope, then run each affected component runner with `--repeat-each=3 --workers=1` under `scripts/with-flow-browser-lock.sh`. Finish with the locked focused verifier and report full-profile acceptance separately.

## Conformity and deviations

These are observed mismatches at the named browser assertions. Later assertions after an earlier failure remain unverified. This follow-up implements no repair in Plan 139, and source similarity does not establish parity. Document any proposed intentional deviation before changing the ledger classification.

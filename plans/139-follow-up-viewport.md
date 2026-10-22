# Plan 139 follow-up: fit padding, initial viewport clamping, and initial node extents

## Goal

Match the literal source padding and initial clamp outcomes through public host APIs. Preserve each existing translation-extent, movement, and geometry contract until compatibility is decided.

## Observed failures

Plan 139 retains the upstream assertions and marks these outcomes with `test.fail()`. The exact source and Flow test locations are in `research/catalogs/upstream-test-ledger.json`. Browser receipts are in `research/catalogs/upstream-component-evidence.json`.

| Case | Upstream title | Host | Evidence |
| --- | --- | --- | --- |
| UP-128-056 | uses fitViewOptions | vanilla | fitView rejects padding=0.5 with the less-than-0.5 schema error; Node 1 remains outside the viewport with its right edge at -350. |
| UP-128-056 | uses fitViewOptions | vue | fitView rejects padding=0.5 with the less-than-0.5 schema error; Node 1 remains outside the viewport with its right edge at -350. |
| UP-128-056 | uses fitViewOptions | foldkit | fitView rejects padding=0.5 with the less-than-0.5 schema error; Node 1 remains outside the viewport with its right edge at -350. |
| UP-128-066 | defaultViewport: invalid { x: 0, y: 0, zoom: -1 } | vanilla | The public mount rejects default zoom -1 with a positive-zoom schema error, so no viewport is rendered at the required clamped zoom 0.5. |
| UP-128-066 | defaultViewport: invalid { x: 0, y: 0, zoom: -1 } | vue | The rendered viewport and useViewport() retain default zoom -1 rather than clamping it to 0.5. |
| UP-128-066 | defaultViewport: invalid { x: 0, y: 0, zoom: -1 } | foldkit | The public Runtime mount with default zoom -1 terminates in Application Crash, leaving no rendered viewport at the required clamped zoom 0.5. |
| UP-128-067 | defaultViewport: invalid { x: 0, y: 0, zoom: 100 } | vue | useViewport() retains default zoom 100 rather than clamping it to the default maximum 2. |
| UP-128-067 | defaultViewport: invalid { x: 0, y: 0, zoom: 100 } | foldkit | The public store and rendered viewport retain default zoom 100 rather than clamping it to the default maximum 2. |
| UP-128-072 | uses nodeExtent | vanilla | The initial node transform has x=-50 rather than x=50 after applying the extent to its 150-pixel width; the y assertion is not reached. |
| UP-128-072 | uses nodeExtent | vue | The initial node remains at x=200 rather than being adopted at x=50 inside nodeExtent; the y assertion is not reached. |
| UP-128-072 | uses nodeExtent | foldkit | The initial node remains at x=200 rather than being adopted at x=50 inside nodeExtent; the y assertion is not reached. |

## Scope and acceptance

The source accepts padding 0.5, clamps default zoom -1 to 0.5 and 100 to 2, and adopts the initial node at x=50 and y=50 under nodeExtent. Separate schema rejection, public port availability, Runtime crash output, rendered transforms, and later wheel-driven clamping. A successful later operation does not establish initialization parity.

Reproduce each listed failure before changing product code. Inspect existing Flow tests for a compatibility conflict before changing a contract. Preserve every upstream assertion and the host's public acquisition and lifecycle boundary. Replace expected-failure declarations only after the complete source case passes and its ledger result has evidence. Add the affected browser files to the saved scope, then run each affected component runner with `--repeat-each=3 --workers=1` under `scripts/with-flow-browser-lock.sh`. Finish with the locked focused verifier and report full-profile acceptance separately.

## Conformity and deviations

These are observed mismatches at the named browser assertions. Later assertions after an earlier failure remain unverified. This follow-up implements no repair in Plan 139, and source similarity does not establish parity. Document any proposed intentional deviation before changing the ledger classification.

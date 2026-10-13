# Vanilla reconnect terminal expectation approval

Reviewed 2026-10-02 against the isolated native-parity-acceptance candidate. This is a correction to a newly added test expectation, not a production behavior change or a SOURCE review revision.

The actual public completion path in `apps/vanilla/src/mount-flow.ts:7496-7550` publishes the successful `edge-reconnect` change, calls the reconnection proposal observer, and reports `onReconnectEnd` with outcome `proposed`. The new matrix in `apps/vanilla/e2e/interaction-lifecycle.e2e.ts:1738-1775` independently checks the full accepted edge with preserved metadata and opposite endpoint, unchanged viewport, cleared preview, released physical capture, one change and complete callback ordering.

Authorize replacing only the newly added expected callback string `onReconnectEnd:accepted` with `onReconnectEnd:proposed`. Keep every accepted graph, metadata, geometry, capture, pending-frame, preview and order assertion. Do not change production classification, old tests, callback timing, or reference expectations. Preserve the first eight failures and artifact directories before editing. Re-run the same eight actual native cases after the edit.

The first raw log is `resume-093-vanilla-threshold-first.log`, SHA256 e00ab9da5abb76a30610c3e2a0a590a040456a843033ad7988ff10100e8829f0. The original added-test file hash is 8dca7051c7ce4fa37b8d571935a20ad9198c49b01d77bec43ec32fa16b653065. The production mount file hash is 5b922093439676d50866064969150d39dcc23e823776ebb5148bb30efc8fec8d.

Add complete raw public callback payload histories alongside the names, plus per-frame public/DOM snapshots, trusted pointer coordinates and actual capture owner. These strengthen evidence and must not replace current assertions. Preserve each host's actual pointer coordinate units. All other plan093 cancellation, zero/diagonal thresholds, owner/participant replacement and release matrices remain required. No acceptance or member closure follows from this bounded correction.

# Native Vanilla fixture input approval

Primary review, 2026-10-02, main commit `841be137e253cf19c665269eaaa79edc19abf3c3`.

This is a bounded test-input repair in the existing Plan086 isolated candidate at `/Users/richardmcandrews/.codex/worktrees/native-parity-acceptance/flow`. Preserve the failed focused run and pre-review source bytes before editing. It does not approve production changes or the reconnect threshold expectation.

## Evidence reviewed

- `resume-focused-verify-first.log`, SHA256 `18f009070cc5c37dc2ac2f8c53fc392f0672832715d611ee155d55fb3e758836`, records225 Vanilla passes and3 failures.
- `apps/vanilla/e2e/canvas.e2e.ts`, held SHA256 `5447ce9b2cefbd4edafe65389044ab95aa14424e84b3e3b8b1a70c847eafd44b`.
- `apps/vanilla/e2e/interaction-lifecycle.e2e.ts`, held SHA256 `3927b8be44fc58437bfa198bc0e655d99e745fc6112a678543b12fef99695083`.
- `apps/vanilla/src/mount-flow.ts`, held SHA256 `17bf3a5b5fa4d464766bd6c80ea5cce22a3ed100408838af1816d431403604a3`.
- Complete capture diagnostic JSON, SHA256 `ef603a83b5b4fd33ea2d2bcac1e8c70e761b1205ba305025825b8abdfd2d3d8c`. Primary review read the full baseline and every phase field, collapsing only repeated identical values. The fake canvas event leaves the public snapshot and preview unchanged. The real BUTTON source/out owner releases pointer1, followed by a trusted lostpointercapture event on that exact owner. Preview becomes null, document and viewport remain exact, changes remain empty, and exactly one cancelled/lost-pointer-capture terminal occurs. Late release changes none of those fields. A fresh gesture adds exactly edge-1 source/out to target/in. Disposal leaves zero canvases and errors are empty.

## Authorized changes

Only the two held test files may change under this approval.

1. In `canvas.e2e.ts`, test `removing the source cancels an active connection`, add a real `page.mouse.move` beyond the configured fresh-connection threshold after pointerdown and before the existing visible-preview assertion. Retain all source-removal, preview teardown, release, and zero-change assertions. Do not change the reconnection pointer-cancellation test or its correct no-preview-before-threshold expectation.
2. In `interaction-lifecycle.e2e.ts`, for the connection/capture-loss row only, locate the actual element that owns capture for the already recorded active pointer ID. Require exactly one owner, release that owner's actual capture, and flush the native loss event with ordinary mouse movement if the browser requires it. Do not dispatch a counterfeit lostpointercapture event at the canvas or manually notify the host. Preserve the other matrix rows, all cancellation/release/zero-change assertions, and the fresh accepted retry. Derive the browser input from the real capture owner, with no new global casts, fake acknowledgements, timer-based acceptance, or private Model access.

## Verification and boundaries

Run the two named repaired tests against the actual native host. Record commands, exit status, test counts, artifacts, and exact before/after hashes. If either changes the production file, fails to produce real capture loss, requires assertion removal, or needs a wider fixture policy, STOP with the actual evidence. Keep the first failed focused run and diagnostic attempts immutable.

Do not rerun the known-failing complete focused/full suites until the independently reviewed all-host reconnect threshold source fix is ready. Other approved independent work in086 can continue. These input repairs do not consume a formal final SOURCE revision round.

## Conformity and deviations

The source-removal test must enter an active connection before testing active cancellation. The capture-loss test must exercise the actual capture owner and native event; its prior synthetic canvas event was intentionally ignored by the fresh-connection ownership guard. Actual diagnostic cancellation/retry evidence is bounded to this Vanilla path. Reconnect threshold conformity remains OPEN because all three current hosts activate reconnect before the pin's strict threshold. No API/member, full-suite, parent-plan, native-device, or reference runtime parity claim follows from this approval.

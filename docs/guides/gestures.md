# Gestures and input

Flow stores gesture meaning in core schemas and transitions. The browser host owns pointer capture, DOM events, frame scheduling, and resource cleanup.

Supported interactions in the current vanilla host include primary-pointer node movement, group movement, pane panning, touch panning and pinch zoom, wheel zoom, handle connections, connection validation, selection, keyboard movement, and cancellation on lifecycle loss. See the [gesture trace](../../research/traces/node-dragging.md), the [advanced gesture tests](../../apps/vanilla/e2e/advanced-gestures.e2e.ts), and the [gesture option tests](../../apps/vanilla/e2e/gesture-options.e2e.ts).

Pointer ownership is explicit. A pinch session owns two pointer ids. A pointer cannot be claimed by two sessions at once. Escape, blur, unmount, and removal paths are covered separately in [lifecycle tests](../../apps/vanilla/e2e/advanced-gestures.e2e.ts).

Two native pointer scenarios remain unverified in Playwright: simultaneous connection plus node drag, and two-contact pinch cancellation. The tests are marked `test.fixme` because their proof requires native pointer capture behavior. Do not treat those cases as verified until a browser/device test covers them.

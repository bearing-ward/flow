# Plan 120: Foldkit closing gaps

Status: implemented and verified, 2026-10-14. Three-run checks passed 108 browser cases and 15 unit cases. Focused verification passed; the complete Foldkit suite passed 355 cases excluding calibration.

Close the nine remaining Foldkit parity entries from the independent re-audit. Work only on `wave/120-foldkit-closing`; leave core and the audit catalog unchanged.

1. Decode canvas options for initial fitting, viewport culling, renderer refresh, keyboard accessibility, key codes, auto-pan, click distances, reconnect radius, custom interaction classes and connection-line styling.
2. Render node accessibility attributes and edge roles; honor per-edge endpoint reconnectability. Keep aria-live callbacks outside the serializable model. Route keyboard deletion through the composed approval client, including rejection.
3. Complete Delete Edge on Drop, HTML5 Drag and Drop, Turbo Flow and Download Image pages using public APIs. Keep html-to-image in the demo app and document its removal boundary.
4. Keep the fixture measurement observer on the surviving parent of Foldkit's mount element. Exclude stale resize measurements and keep accepted parent geometry separate from live drag measurements. Keep native press coordinates immutable during auto-pan. Resolve focus auto-pan from measured graph coordinates and require focus-visible.
5. Run each new browser case three consecutive times and the new unit file three times. Run focused verification with main's scope plus the new Foldkit files, then the complete Foldkit suite excluding calibration. Commit without pushing or merging.

## Conformity and deviations

Conforming outcomes are bounded by `apps/foldkit/e2e/closing-gaps.e2e.ts`, `closing-recipes.e2e.ts`, `delete-edge-on-drop-recipe.e2e.ts`, `drag-and-drop-recipe.e2e.ts`, `node-resizer.e2e.ts`, existing drag/conformance cases and `packages/foldkit/src/closing-options.test.ts`. Pinned reference boundaries are `NodeWrapper/index.tsx:128`, `A11yDescriptions/index.tsx:43`, `EdgeWrapper/index.tsx:43` and `NodeResizeControl.tsx:200` under `research/artifacts/xyflow/0a1f9575b25679f2880175de8d3eae21aedde921/packages/react/src/`.

Intentionally different: Foldkit uses Runtime ports and Html children instead of React props and JSX. Registry changes use a public refresh action. The application composes the delete approval client. Gestures retain release-time proposals and publication ownership. Cancelled reconnect gestures preserve their edge. Zero node click distance retains pending captured clicks under the existing threshold contract; positive distances filter travel. Initial fit runs once after visible-node measurements; its duration/easing options do not animate initialization, while the viewport client supports animated fitting. Existing controlled viewport ownership suppresses native auto-pan. Attribution, proOptions and debug remain unmapped as React branding and diagnostics.

Unverified: no live React comparison, collector delivery, full cross-host parity or release acceptance is claimed. Production uses public programs and clients; new fixtures mount that Runtime inside `#app` on `/test.html`. Existing conformance fixtures explicitly select culling; the ordinary program defaults to rendering all elements.

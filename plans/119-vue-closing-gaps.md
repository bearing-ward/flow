# Plan 119: Vue closing gaps

Status: complete, 2026-10-14.

## Scope and delivery

1. Close Vue canvas auto-pan, click distances, connection container style, reconnect radius, document delete keys and keyboard/ARIA gaps. Preserve core and public signatures.
2. Add six public-API recipe pages: Delete Edge on Drop, Contextual Zoom, Drag and Drop, Preventing Cycles, Turbo Flow and Download Image. Keep `html-to-image` in the demo app and document it.
3. Run each new test three times, focused `bun run verify` with the unchanged main scope plus new Vue files, and the complete Vue suite excluding calibration. Use the owner-token lock for each browser command.
4. Commit on `wave/119-vue-closing`; report counts and limitations. Do not push or merge.

## Implementation and evidence

- Production canvas path: native pointer movement (`packages/vue/src/flow-canvas.ts:10313`) schedules the gesture frame (`:10071`), writes the constrained viewport (`:3574`), compensates node movement (`:6128`) and commits (`:5961`). Pointer-only click travel (`:2723`, `:7620`) preserves fractional clicks. Focus (`:3586`), keyboard moves (`:6018`), document keys (`:7830`) and rendered ARIA (`:8872`, `:9085`, `:10737`, `:10758`) use the adapter lifecycle.
- Production recipe path: `apps/vue/ui-recipes/closing-gaps/index.html` loads `apps/vue/src/closing-recipes.ts`. Public store zoom (`:98`), SVG gradients (`:143`), cycle validation (`:197`), fitted PNG export (`:236`), reconnect lifecycle (`:383`) and native drop conversion (`:410`) produce the six outcomes.
- Test path: `apps/vue/e2e/closing-gaps.e2e.ts:6` mounts a dedicated public-package fixture; `apps/vue/e2e/closing-recipes.e2e.ts:14` opens the actual recipe pages. All 24 new tests passed three runs, 72/72; 11 affected existing tests passed three runs, 33/33. Fractional clicks were reproduced failing before the fix.
- Focused verification passed: 2,484 unit tests; Vanilla 422 passed/2 skipped, Vue 691 passed, Foldkit 238 passed. Complete Vue suite excluding calibration: 780 passed.

## Conformity and deviations

- Conforming within the listed tests: pinned React `NodeWrapper` focus/keyboard behavior and roles, `EdgeAnchor` radius, `A11yDescriptions` configuration, canvas click thresholds, document deletion, and six recipe outcomes, including PNG pixels and dimensions.
- Intentionally different: Vue keeps drop-time graph commits and payload-first lifecycle events. Gesture auto-pan uses Flow's existing edge-zone delta. Node `ariaDescription` replaces the shared description with `aria-description`, beyond the pinned NodeWrapper. A delete key targeted inside a different Flow canvas stays with that canvas. PNG export clones Vue's separate render layers to include edges alongside nodes without changing the live viewport.
- `nodeOrigin` stays on the document. Canvas dimensions use Vue style bindings; attribution and `proOptions` have no licensed banner to configure. `debug` is replaced by structured Effect telemetry. Existing aliases and delete lifecycle options are documented in Plan 116.
- Unverified: no live React runtime or collector delivery test; focused verification and the Vue suite do not establish full multi-host release acceptance.
- Test boundary: `apps/vue/e2e/closing-gaps.e2e.ts` and `apps/vue/e2e/closing-recipes.e2e.ts`, plus the existing focused checks and complete Vue suite.

# Plan 125: Schema Studio menu dismissal

## Implementation

Both application entry points listen for primary-button `pointerdown` on `window` in capture phase. They close an open menu only when its element is absent from the event's composed path. They do not prevent the event or stop propagation. Context menus and cardinality popovers share this behavior. Right-click replacement and menu-item actions retain their existing handlers.

- Vanilla: `apps/vanilla/schema-studio/main.ts:1484` hides the menu directly. Registration and cleanup use the existing `mountedDisposers` list at `:1494`.
- Foldkit: `apps/foldkit/schema-studio/main.ts:782` sends `Msg.CloseMenu`; `apps/foldkit/schema-studio/model.ts:620` updates menu state, and the hidden attribute at `apps/foldkit/schema-studio/model.ts:1126` renders it. The existing pagehide disposal removes the listener at `apps/foldkit/schema-studio/main.ts:854`.
- Escape already closes both menus in this checkout. Vanilla handles it at `apps/vanilla/schema-studio/main.ts:1512`. Foldkit sends `Msg.Escape` at `apps/foldkit/schema-studio/main.ts:807`, and `apps/foldkit/schema-studio/model.ts:791` closes the menu and cancels floating relationships.

No changes to `packages/`, `apps/vanilla/src`, or imported research evidence.

## Browser evidence

Real Playwright mouse input covers pane dismissal with continued panning, table selection, table-menu dismissal through the side list, one-menu replacement at the new point, cardinality opening and dismissal, Escape for both menu types, note and area selection, toolbar zoom, and edge-label pointerdown followed by popover opening on click. Existing S14 and cardinality-choice tests cover actions inside the menu. Tests begin at `apps/vanilla/e2e/schema-studio.e2e.ts:849` and `apps/foldkit/e2e/schema-studio.e2e.ts:867`.

Before the fix, the six required new tests produced **4 failures and 2 passes per host**. The four failures were outside dismissal on the pane, table, side list, and cardinality popover. Replacement and Escape passed. The first Foldkit attempt used a point covered by its taller minimap; the corrected baseline uses bare pane at the same coordinates in both hosts.

Schema Studio suites: Vanilla **40 passed**, Foldkit **41 passed**. Both had **0 failed and 0 skipped**. The saved focused verifier passed all **16 gates**, including **96 unit files / 2,510 unit tests**, and browser scopes of **Vanilla 508 passed / 2 skipped**, **Vue 721 passed / 0 skipped**, and **Foldkit 335 passed / 0 skipped**. No failures remained. The known `next-slices.e2e.ts:364` flake did not occur; no flake rerun was needed.

Foldkit queries the persistent app root because `Runtime.embed` replaces its supplied mount element. The regression tests rejected the detached-element implementation with 33 passes and 8 dismissal failures before the corrected complete suite passed.

Each browser invocation and the verifier use the requested owner-token `/tmp/flow-browser.lock` wrapper, with `OTEL_SDK_DISABLED=true`. Targeted suite commands:

```sh
bunx playwright test apps/vanilla/e2e/schema-studio.e2e.ts --workers=1
bunx playwright test -c apps/foldkit/playwright.config.ts apps/foldkit/e2e/schema-studio.e2e.ts --workers=1
bun run verify
```

`verification.config.json` changes only `activeWork` to Plan 125. All prior checks and browser files remain selected. The profile remains focused; its broad saved scope is not full-profile or release acceptance.

## Conformity and deviations

Conforming to the requested application contract: capture-phase outside dismissal without consuming the input, one shared menu element per host, retained menu-item actions, Escape, and cardinality opening after pointerdown. Browser tests are the acceptance boundary. Reference-library parity is unverified because this change does not run a reference comparison. No intentional behavior deviations are introduced.

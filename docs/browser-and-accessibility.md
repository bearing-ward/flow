# Browser support and accessibility checks

The checked-in Playwright suite currently runs in Chromium. It verifies DOM output, pointer workflows, keyboard actions, accessible roles and names for nodes and controls, focus behavior, `aria-pressed` state, and teardown. The [canvas UI tests](../apps/vanilla/e2e/canvas-ui.e2e.ts), [gesture option tests](../apps/vanilla/e2e/gesture-options.e2e.ts), and [shared adapter conformance tests](../packages/conformance/src/index.test.ts) are the evidence for those claims.

The repository does not currently run a Safari or Firefox matrix, a screen-reader test, or a mobile-device touch suite. Touch and pinch behavior has browser coverage, but the native two-contact pinch cancellation case remains marked `test.fixme`. These limits are not evidence of support or failure in other browsers.

The current accessibility boundary is automated role/name/focus and keyboard behavior in Chromium. It is not a complete WCAG audit. Before a public release, add manual keyboard-only and screen-reader review, plus browser coverage for the browser versions the project chooses to support.

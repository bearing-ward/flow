# Plan 126: Upstream test suite port and ledger

## Why

Functional parity (185/185, 2026-10-14) is measured by our audit rubric and Flow-authored browser tests. The pinned xyflow source ships its own suite, and none of it runs against Flow. Upstream specs are cited in research traces, and several are never referenced (`background.spec.ts`, `props.spec.ts`, most Cypress e2e files and all hook specs). This plan adds an upstream-defined score next to the rubric. It does not replace the rubric.

Pinned suite (`research/artifacts/xyflow/0a1f9575…/`), counted by `test(`/`it(` calls:

| Source | Files | Cases | Phase |
| --- | --- | --- | --- |
| `tests/playwright/e2e/*.spec.ts` (framework-independent; driven by `examples/react/src/generic-tests/**` flow configs) | 6 specs | 53 | **126 (this plan)** |
| `examples/react/cypress/e2e/*.cy.ts` | 8 | 67 | 127 |
| `examples/react/cypress/components/**` (hooks, utils, ReactFlow props/handlers) | 18 | 107 | 128 |

## Deliverables

1. **Case ledger** `research/catalogs/upstream-test-ledger.json`. It lists one entry per upstream case in all three phases, 227 in total. Each entry has:
   - `id`, the upstream `path:line` and the full describe/test title;
   - `phase`;
   - per-host `vanilla`/`vue`/`foldkit` status, one of `pass` | `intentional-difference` | `fail` | `not-applicable` | `not-ported`;
   - `reason` (required unless `pass` or `not-ported`);
   - `flowTest`, the path:line of the ported test.

   A new check, `scripts/check-upstream-test-ledger.ts`, is added to the `verify` checks list. It re-enumerates upstream cases from the artifacts and fails when the ledger has a missing or extra case. It also validates the status/reason rules and that each `flowTest` path exists. It prints a per-host and per-phase summary table. Phase 127/128 entries start as `not-ported`.

2. **Generic flow configs, host-neutral.** Port each `generic-tests/**/*.ts` config (pane general / non-defaults / activation-keys, nodes general, edges general, node-toolbar general) into `packages/conformance/src/upstream-generic/`. Each port is a schema-decoded Flow document plus mount options. Upstream React-only props map through `docs/react-flow-api-correspondence.md`. Record any unmappable prop in the ledger rather than dropping it.
3. **Host routes.** Each host app adds a test-only route, `/upstream/<config-path>`, that mounts the config with that host's **public** API only: Vanilla `apps/vanilla`, Vue `apps/vue`, Foldkit `apps/foldkit`. Follow the shape of the upstream `generic-tests/Flow.tsx` (custom `DragHandleNode`, `ToolbarNode`).
4. **Shared specs.** Port each spec into `apps/shared-e2e/upstream/<name>.ts` as a contract function. It takes a host adapter: base URL plus a selector map from upstream `.react-flow__*` classes to Flow's (`.flow-node`, …) and a `getTransform` equivalent. Keep upstream test titles verbatim, prefixed with the ledger id. Keep each assertion's intent and numbers. Add a comment citing upstream `path:line`. Each host gets one runner, `apps/<host>/e2e/upstream-playwright.e2e.ts`, which is added to `verification.config.json` (add only, never remove).
5. **Failures stay visible.** A case that fails in a host is marked `test.fail()` with its ledger id, and the ledger records `fail` with the observed difference. Fixing behavior is out of scope for this plan; each failure cluster becomes a follow-up plan. A difference becomes `intentional-difference` only when an existing documented deviation explains it, cited by `path:line`. Otherwise it is `fail`. Never weaken an assertion to make a case pass.

## Out of scope

Behavior fixes; Cypress phases (127, 128); Svelte config; live React comparison.

## Verification

- Every browser command runs under the `/tmp/flow-browser.lock` owner-token wrapper with `OTEL_SDK_DISABLED=true` and `--workers=1`.
- The three new runners pass, with `test.fail()` cases counted separately.
- `bun run verify` (focused) passes with the broad saved scope intact.
- The report includes the ledger summary table: per host, counts of pass / intentional-difference / fail / not-applicable for the 53 Playwright cases.

## Conformity and deviations

The ledger is the conformity record for this plan. `pass` means the same test intent and thresholds pass in that host, which is conforming within the pinned revision. `intentional-difference` needs a cited documented reason. `fail` and `not-ported` remain unverified. Passing ported upstream tests is still not live React comparison, and current-website behavior (upstream is now @xyflow/react 12.12.0, pin is 12.11.6) is unverified.

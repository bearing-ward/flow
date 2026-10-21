# Plan 126 follow-up: Node selection and deletion

## Problem and scope

Prove threshold-zero click selection and deletion, selected-node markup, persistent multi-selection bounds, and middle-button pan from those bounds. Retain the React-guarded case as an executed host test.

These are observed failures from the pinned upstream port, not source-similarity or live-reference parity claims. Plan 126 leaves product behavior unchanged. The ledger contains the host-specific observed differences and exact upstream and Flow test locations.

| Case | Upstream title | Failing hosts |
| --- | --- | --- |
| UP-126-021 | selecting a node by click | vanilla, foldkit |
| UP-126-022 | selecting multiple nodes with shift drag | vanilla, vue, foldkit |
| UP-126-023 | panning from a multi-selection rectangle with the middle mouse button | vanilla, vue, foldkit |
| UP-126-028 | deleting a node and its edges | vanilla, foldkit |

## Execution

1. Read the relevant entries in `research/catalogs/upstream-test-ledger.json` and their upstream sources. Use the public `/upstream/<config-path>` host routes.
2. Reproduce each host failure with its ledger status temporarily set to `pass`, so the unchanged assertion fails normally. Record the failing browser action or exact received value. Trace browser entry, state, geometry, DOM effects, and output before changing behavior.
3. Keep graph meaning and Effect workflows in `packages/`. Keep host DOM and framework lifecycle in their existing owners. Add a focused regression only where the upstream case does not prove the identified cause.
4. Implement the bounded fix. Keep upstream titles, assertions, numbers, and thresholds unchanged. Set only proven ledger outcomes to `pass`; retain unresolved failures and their reasons.
5. Serialize every browser invocation with `scripts/with-flow-browser-lock.sh`, `OTEL_SDK_DISABLED=true`, and `--workers=1`. Run the affected complete host runners and `bun run verify` with the saved scope intact. Recheck research citations after edits to cited files.

## Acceptance

Every listed host case passes its unchanged upstream contract. All previously passing cases remain passing. Record exact per-host counts, expected failures, focused verification scope, and any remaining boundary. Commit, push, or merge only with the authority granted for that follow-up task.

## Conformity and deviations

The listed failures remain unverified until their public browser paths pass. Any intentional difference requires an existing documented reason with an exact citation; a failing test alone is not such a reason. Live React comparison, other browser engines, and Cypress phases 127 and 128 remain separate work.

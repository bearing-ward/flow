# Plan 126 follow-up: Pane input and zoom limits

## Problem and scope

Address wheel limits, touch pan and selection, primary-button selection with button arrays, and the Control pan override. Preserve passing immediate pan and node autopan cases. Add missing Foldkit public options without silently substituting booleans.

These are observed failures from the pinned upstream port, not source-similarity or live-reference parity claims. Plan 126 leaves product behavior unchanged. The ledger contains the host-specific observed differences and exact upstream and Flow test locations.

| Case | Upstream title | Failing hosts |
| --- | --- | --- |
| UP-126-039 | minZoom | foldkit |
| UP-126-040 | maxZoom | foldkit |
| UP-126-045 | touch drag pans when primary mouse drag is reserved for selection | vanilla, vue, foldkit |
| UP-126-046 | selection key keeps touch drag in selection mode | vanilla, vue, foldkit |
| UP-126-047 | primary mouse drag still creates a selection marquee | vanilla |
| UP-126-048 | Control and primary-button drag pans the pane | vanilla, vue, foldkit |

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

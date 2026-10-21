# Plan 126 follow-up: Edge SVG stacking

## Problem and scope

Reconcile the per-edge z-index contract with each host SVG layer. Prove normal, explicit, normal-to-child, and child-to-child stacking against the unchanged CSS assertions.

These are observed failures from the pinned upstream port, not source-similarity or live-reference parity claims. Plan 126 leaves product behavior unchanged. The ledger contains the host-specific observed differences and exact upstream and Flow test locations.

| Case       | Upstream title                               | Failing hosts |
| ---------- | -------------------------------------------- | ------------- |
| UP-126-012 | zIndex sets z-index of edge svgs             | vanilla       |
| UP-126-016 | z-index                                      | vanilla, vue  |
| UP-126-017 | sub flow: normal node to child node, z-index | vanilla       |
| UP-126-018 | sub flow: child node to child node, z-index  | vanilla       |

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

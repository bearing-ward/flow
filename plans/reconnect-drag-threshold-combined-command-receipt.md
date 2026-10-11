# Reconnect threshold combined command receipt

2026-10-02. Additive DESIGN clarification to Plan093 SHA256 `43dab406aa2d973058f6f1067f4072bc5d13db9b6b3b444a9cee23432005f0eb` and final-gate clarification SHA256 `ddfd4cb28ea7e32d0a5daa4389ad36deaf1daefdc744e14c741bce32dced569e`. Preserve both earlier raw files. No source scope or behavior expansion.

Primary actual numbered source read corrects the previous union attribution. N `packages/foldkit/src/graph.ts:137` declares `PointerSessionSchema`; the reconnect Struct opens:167, discriminator:168, final scalar field:175 and closes:176. Previous:142 and illustrative:180 labels were inaccurate. The reproduced fields, pending gate:1881 and all-host source finding remain unchanged.

The original combined acceptance contract is main `plans/086-complete-native-parity-acceptance.md`, SHA256 `2e1c527c93dc787e8f8520666f52c6aa09932792e80be821de0739be4497b27f`, its Required commands and acceptance section at:80-84. Full-read and copy it along with093 and the legacy packet. It is not replaced by the new threshold commands. Run inside N, `/Users/richardmcandrews/.codex/worktrees/native-parity-acceptance/flow`:

```sh
bun install --frozen-lockfile
bun run check
bun run check:architecture
bun run typecheck
bun run test
bun run test:consumer
bun run test:foldkit:hmr
bun run docs:generate-api
bun run docs:check
bun run research:check-traces
bun run scripts/check-api-members.ts
bun run scripts/check-api-member-contracts.ts
bun run plans/check-065-reconciliation.mjs --require-closed
bun run verify --list
bun run verify
bun run verify:full
bun run release:dry-run
git diff --check
```

Each required command exits0. Install is the frozen dependency gate in the isolated candidate, with protected manifests/lock unchanged. `verify --list` must record the actual final configured086+093 profile, checks and native files before executing it. Final native, actual archives, same-build settled/active preservation, unchanged ordinary HMR, new pinned reference and genuine older-build public Runtime proof remain distinct mandatory evidence. The exact new legacy CLI/input/output and its eight approved raw input identities remain in the prior final-gate clarification. New reference CLI and all three native file commands remain in093. All gates run serially under the same086 lease and against final source. No repeated earlier result substitutes for final combined acceptance.

## Conformity and deviations

This document fixes source attribution and makes the existing combined command/receipt boundary self-contained. It grants no implementation permission, claims no actual acceptance, closes no semantic member cell, and retains all intentional native/keyboard/auto-pan/constructor policy differences stated in093.

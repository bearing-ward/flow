# Plan 148: React reference host for the ported upstream suite

Starting point: main after Plans 145 and 146. All 224 pinned upstream tests are ported, and they run against Vanilla, Vue and Foldkit through `upstreamHostAdapter` (`apps/shared-e2e/upstream/adapter.ts`). No test has run against real React Flow, so we don't know if the ports themselves are faithful. Open question: does pinned React really render UP-128-072 at (50,50)? See `research/traces/node-extents.md`.

## Scope and acceptance

- Add `react` as a fourth adapter host. It is built from the pinned `@xyflow/react` source, or from the published version that matches the pin in `research/UPSTREAM.json`, which is 12.11.6. Pin it exactly.
- The React fixtures mount the pinned upstream example and component-test fixtures as directly as possible:
  - `examples/react/src/generic-tests`;
  - the example pages;
  - the Cypress component mounts.
- Follow the existing pattern in `research/harnesses/*` (Vite and `main.tsx`), and put the host under a new `apps/react-reference/`.
- Run the Playwright, Cypress-e2e and component runners against React with the same shared test bodies, unchanged. Record each case's React result in a new `reference` field on each ledger case, with status pass, fail or not-run and a reason. Extend `scripts/check-upstream-test-ledger.ts` to validate that field.
- Any case that fails on React means the port is unfaithful, or the upstream test is itself flaky or broken. Write each one up in `plans/148-react-reference-results.md`.
  - **Port bug:** fix the shared test or fixture so that React passes. Then rerun the Flow hosts. Any Flow status that changes is reported, not hidden.
  - **Broken upstream test:** mark the case `reference: fail`, cite why, and leave the assertion unchanged.
- Report UP-128-072 and UP-128-044 explicitly.
- Add the React host to verify as a new opt-in check (`reference-host`). Leave the focused default unchanged.

## Execution

- Use `scripts/with-flow-browser-lock.sh` with one worker, and don't use any of ports 4173–4178 for the new host.
- Remap trace citations if any shift. Then run `bun run research:check-traces`, the ledger check and `docs:check`, and finish with the locked `bun run verify`.
- Commit on `plan/148-react-reference` with the trailer `Co-Authored-By: GPT-6.1 Sol via Codex <noreply@openai.com>`. Do not push or merge.

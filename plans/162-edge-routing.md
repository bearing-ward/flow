# Plan 162: obstacle-aware edge routing

This plan implements unit "10. Obstacle-aware routing" of `plans/149-pro-delivery.md` in full: its "Shared core", "Per host" and "Acceptance" bullets. It covers the catalog entry "Edge Routing · Pro". It builds on the route contract from Plan 156 (`docs/editable-edges.md`). Manual points are always kept, and routing only derives the automatic routes.

## Decision D10, made 2026-10-26

Use libavoid-js through a new optional package, `packages/routing-libavoid`, published separately.

- **Packaging:**
  - Pin the exact version and record it in `docs/dependencies.md`, with its owner, licence, size, maturity and removal boundary.
  - Core, Vanilla, Vue and Foldkit must not depend on it. Add an architecture rule that enforces this.
  - Use the library unmodified. Load its WASM lazily and asynchronously.
- **Licence:** document what LGPL-2.1-or-later requires of applications that bundle the adapter, including the user's right to replace the library, in `docs/dependencies.md` and in the adapter's README. Don't give legal advice.
- **Router capability:**
  - Core defines it as a typed Effect service. It takes obstacle rectangles, ports and constraints, and returns revision-keyed paths with typed failure and cancellation.
  - The adapter implements it.
  - Write a small contract test suite that any router must pass, so that ELK or a Flow-written router can be swapped in later.
- **Pre-flight check:** before building on libavoid-js, prove that it loads and routes in Chromium under Vite in all three hosts. If its beta status blocks the work, for example through broken WASM loading or a missing API, stop and report with evidence. Don't switch engines silently.

When every acceptance test passes in Vanilla, Vue and Foldkit, set "Edge Routing · Pro" to C. Add a `reaudit` record that cites the evidence, and recompute the summary counts from the entries.

## Execution

- Only ADD to `verification.config.json`; never remove or narrow anything.
- Take the browser lock separately for each browser command, and never wrap an interactive shell in it.
- Compiler-API code must import `typescript-api`.
- Tests use `it` inside `describe`.
- Write a research trace that ends with a Conformity and deviations section, then run `research:check-traces` and `docs:check`.
- Finish with the locked `bun run verify --check reference-host`.
- Commit on `plan/162-edge-routing` with the trailer `Co-Authored-By: GPT-6.1 Sol via Codex <noreply@openai.com>`. Do not push or merge.

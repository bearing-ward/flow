# Plan 017: Settle the JavaScript facade and prove a packed consumer

> **Executor:** Use an isolated worktree. Read `docs/standards.md`,
> `docs/dependencies.md`, `docs/architecture.md`, `research/PROGRESS.md`, and
> package manifests. **Drift check first:** `git diff --stat 6e84008..HEAD -- apps/vanilla/src/mount-flow.ts apps/vanilla/src/public.ts packages/core/src/public.ts packages/core/package.json apps/vanilla/package.json package.json research/PROGRESS.md`. STOP if public ownership or exports have already changed substantially.

## Status

- **Priority:** P1; **Effort:** L; **Risk:** MED; **Depends on:** 014-016
- **Category:** API, DX; **Planned at:** `6e84008`, 2026-09-23

## Why and current state

`apps/vanilla/src/mount-flow.ts:190-219` exposes a typed controller with
`fitView`, `update`, `updateViewport`, `dispatch`, `subscribe`, and `destroy`.
The JavaScript `mountFlow` at lines 3658-3702 decodes inputs with Effect and
`runSync`, then returns the controller; validation failures throw. It is a
useful facade, but `research/PROGRESS.md:177` asks for a settled Promise and
callback API. Both package manifests currently point `exports["."]` at
`./src/public.ts` and are `private: true` (`packages/core/package.json`,
`apps/vanilla/package.json`). That does not prove installation from packed
packages (`PROGRESS.md:188,225`). `docs/architecture.md:65-73` puts DOM
lifetime in the host and `:83-91` keeps saved documents free of session state.
The facade must preserve those ownership boundaries.

```ts
// apps/vanilla/src/mount-flow.ts:3658-3667
export const mountFlow = (
  root: HTMLElement,
  input: FlowDocumentInput,
  inputOptions: FlowMountOptionsInput
): JavaScriptFlowController => {
  const options = Effect.runSync(
    S.decodeUnknownEffect(FlowMountOptionsSchema)(inputOptions)
  );

  const document = Effect.runSync(decodeFlowDocument(input));
```

## Scope and gates

Only edit `apps/vanilla/src/mount-flow.ts`, `apps/vanilla/src/public.ts`,
`packages/core/src/public.ts` if exports require it, package manifests,
root `package.json` and lockfile, `scripts/verify.ts`, `.gitignore`, create package build configuration under
`packages/core/` and `apps/vanilla/`, create `scripts/check-packed-consumer.ts`
and a disposable consumer fixture under `tests/consumer/`, edit
`apps/vanilla/e2e/canvas.e2e.ts`, create `docs/public-api.md`, edit
`docs/dependencies.md`, `research/PROGRESS.md`, generated
summary via inventory, and index row. Do not publish, change saved document
version, add a framework adapter, or remove the Effect-native API. Use
`codex/017-public-api` if needed; no commit/push/merge/PR without instruction.

| Gate | Command | Expected |
| --- | --- | --- |
| Package build | `bun run build:packages` | exit 0; JS and declarations in ignored dist dirs |
| Consumer | `bun run test:consumer` | exit 0 from a clean temp install |
| Browser | `bunx playwright test apps/vanilla/e2e/canvas.e2e.ts` | exit 0; controller cases pass |
| Complete | `bun run verify` | exit 0, including consumer gate after it is wired |

## Steps

1. Write `docs/public-api.md`:
   list the existing Effect-native host acquisition, synchronous `mountFlow`,
   controller lifetime, error behavior, controlled update acknowledgement,
   and callbacks. Choose one small async entry, e.g. `createFlow(root,
   unknownInput, options): Promise<JavaScriptFlowController>`, and one
   `onChange` subscription option. Do not duplicate every method with Promise
   wrappers. The async entry must reject with a documented validation or
   capability error and clean partially acquired resources. **Verify:**
   browser tests exercise successful creation, rejected invalid document,
   callback unsubscribe, and destroy twice without leaked DOM/listeners.
2. Implement the chosen facade in `mount-flow.ts`/`public.ts`; keep the
   Effect-native `createFlowHost` and `acquireFlowHost`. Add exact tests for
   controlled and uncontrolled modes and one renderer mount failure. Do not
   let a Promise hide a synchronous throw after it resolves. **Verify:**
   `bun run typecheck` and relevant Playwright specs pass.
3. Build both packages to JS and `.d.ts` outputs and point exports at those
   files. Keep the same exact Effect RC across workspace manifests. Add
   `build:packages` and a clean consumer script that packs both packages,
   installs them in a temporary directory without workspace resolution,
   imports `@flow/core` and `@flow/vanilla`, decodes a document, and checks
   typed declarations plus one browser mount through a minimal page. `dist`
   and temp install outputs must be ignored. Add build/consumer to `verify`
   only after their order is correct. **Verify:** package build and consumer
   gates pass from a clean temp directory.
4. Check PROGRESS 177, 188, and 225 only when the corresponding API and clean
   install tests pass. Regenerate summary through inventory. **Verify:** full
   gate, `git diff --check`, and `git status --short` show no generated dist
   files tracked.

## Test plan and done criteria

- [ ] Async facade rejects invalid input and cleans failure, callback stops
  after unsubscribe/destroy, sync facade remains behaviorally compatible.
- [ ] Packed core and vanilla packages import without `src/` paths or workspace
  aliases; declarations resolve in a clean consumer.
- [ ] Package build, consumer, and `bun run verify` pass; only scoped files
  change. No package was published.

## STOP and maintenance

STOP if packed output cannot load in the browser without a new bundler/runtime
dependency, if a typed facade requires inventing a second domain state, or if
the consumer succeeds only via source/workspace aliases. Report exact import
and export errors. Future adapters should depend on built core exports, and
release automation must reuse the same consumer check.

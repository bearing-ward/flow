# Plan 013: Model pointer gesture states and finish cancellation boundaries

> **Executor:** Work in an isolated checkout. Read `docs/standards.md`,
> `docs/architecture.md`, `research/traces/gesture-resize-lifecycle.md`, and
> `research/PROGRESS.md`. Run the gates below. **Drift check first:**
> `git diff --stat 6e84008..HEAD -- packages/core/src/domain/flow-runtime.schema.ts apps/vanilla/src/mount-flow.ts apps/vanilla/src/flow-browser.ts apps/vanilla/e2e/advanced-gestures.e2e.ts research/PROGRESS.md`. STOP if gesture ownership or cancellation entry points have materially changed.

## Status

- **Priority:** P1; **Effort:** L; **Risk:** HIGH; **Depends on:** 011
- **Category:** correctness, architecture; **Planned at:** `e709097`, refreshed 2026-09-23 after execution found concurrent pointer sessions

## Why and current state

The host has separate mutable fields for node drag, connection, reconnection,
pane pan, pinch, rectangle selection, and click connection. That lets it work
today but makes new resize and auto-pan cancellation hard to reason about.
`packages/core/src/domain/flow-runtime.schema.ts:47-90` already defines
schema-derived active drag, pan, pinch, and selection records, for example:

```ts
export const ActiveNodeDragSchema = S.Struct({
  nodeId: NodeIdSchema, pointerId: S.Number,
  pointerOffset: XYPositionSchema,
});
```

In `apps/vanilla/src/mount-flow.ts:483`, `activeDrag` is a separate nullable
field. Node press starts at lines 1872-1907, movement previews at 1920-1960,
completion at 1963-2005, and pointer cancellation at 2075-2081. The central
`cancelActiveGestures` at lines 2539-2643 handles Escape, blur, capture loss,
and pointer cancel; node removal and destroy have other paths. Existing browser
tests at `advanced-gestures.e2e.ts:418-506` cover part of cancellation.
`research/PROGRESS.md:72,133` remain open because the full state and composite
cancel contract are unproved. `research/traces/gesture-resize-lifecycle.md:9-21`
traces the current and reference boundaries. Keyboard arrows at
`mount-flow.ts:3124-3205` are immediate commands, not a persistent pointer
gesture. Preserve that separation.

Execution surfaced a valid concurrent state: `startConnection` captures one
pointer and sets `activeConnection` at `apps/vanilla/src/mount-flow.ts:1099-1105`,
while a later plain-node pointerdown checks `activeDrag` and
`activeReconnection` but not `activeConnection` at lines 1864-1886. Therefore a
connection and node drag can coexist on different pointers. The runtime model
must represent multiple active interaction sessions and their pointer
ownership, rather than one global active-mode value. A pinch session owns two
pointer ids; no pointer id may belong to two sessions. Keep click-to-connect,
which persists after pointer release, as its own separately named state.

## Scope, conventions, and commands

Only edit `packages/core/src/domain/flow-runtime.schema.ts`, its `.test.ts`,
`packages/core/src/public.ts`, `apps/vanilla/src/mount-flow.ts`,
`apps/vanilla/src/flow-browser.ts`,
`apps/vanilla/e2e/advanced-gestures.e2e.ts`,
`apps/vanilla/e2e/gesture-options.e2e.ts`, `research/PROGRESS.md`, generated
`research/generated/SUMMARY.md` via inventory, and the Plan 013 index row.
Do not add resize, auto-pan, document fields, dependencies, or framework
adapters. Preserve Effect v4 RC.117, `Scope`-owned browser resources, and
`FlowSpan`/`FlowAttribute` telemetry names (`docs/observability.md:5-62`).
No pointer-move logs. Use branch `codex/013-gesture-lifecycle` if needed; do
not commit, push, merge, or open a PR without operator instruction.

| Gate | Command | Expected |
| --- | --- | --- |
| Core | `bunx vitest run packages/core/src/domain/flow-runtime.schema.test.ts` | exit 0 |
| Browser | `bunx playwright test apps/vanilla/e2e/advanced-gestures.e2e.ts apps/vanilla/e2e/gesture-options.e2e.ts` | exit 0 |
| Complete | `bun run verify` | exit 0 |

## Steps

1. Inventory all existing active gesture fields and start/move/end/cancel
   handlers in `mount-flow.ts`; put a transition table in a comment beside the
   new type, covering idle, pressed-before-threshold, active node/group drag,
   connection, reconnection, pane pan, pinch, selection, completed, and
   cancelled. Treat click-to-connect as a separately named session if it must
   persist after pointer release. Use a discriminated Schema union for each
   active interaction session plus a collection/transition model that permits
   disjoint pointer sessions to coexist. A pinch owns both pointer ids as one
   session; validate that pointer ownership is unique across sessions. Do not
   encode mutually exclusive fields as optionals. **Verify:** `bun run typecheck`
   exits 0 after core tests cover each variant and reject duplicate
   pointer ownership.
2. Add pure transition functions for start, activate threshold, finish, and
   cancel; return a tagged outcome that tells the host which preview, pointer
   capture, frame, and semantic event to release or publish. Do not store DOM
   objects in core. Move existing host paths to these transitions without
   changing public event payloads. Scope acquired frames/capture/listeners in
   `FlowBrowser` or host scopes so one cancel closes them once. **Verify:** core
   Vitest and browser gate exit 0.
3. Add one browser table of cancellation cases: each active mode crossed with
   Escape, blur, pointercancel, capture loss, active-node/edge removal, and
   destroy where applicable. Assert no final semantic change after cancel,
   preview DOM is cleared, capture/frame work stops, and a new gesture can
   start. Test a threshold-only press separately, plus pinch multi-contact.
   At accepted start, completion, cancellation, and invalid-input boundaries,
   emit bounded structured diagnostics with existing `FlowSpan`/`FlowAttribute`
   names; keep pointer movement and document payloads out of logs.
   Avoid synthetic proof for interactions Playwright cannot generate; document
   any unverified cell. **Verify:** browser gate exits 0.
4. Check `research/PROGRESS.md:72,133` only if **all** named modes and cancel
   edges are covered and keyboard command ownership is explicitly documented;
   check `:175` only if invalid-input diagnostics are also fully covered.
   Regenerate summary through `bun run research:inventory`
   if changed. **Verify:** full gate exits 0 and `git diff --check` exits 0.

## Test plan and done criteria

- [ ] Core transition tests cover valid/invalid variants and idempotent cancel.
- [ ] Existing controlled/uncontrolled drag, connection, pan, pinch, and
  selection browser tests still pass; new cancellation table passes.
- [ ] No final change appears after cancellation, and subsequent gestures work.
- [ ] `bun run verify` passes. Only in-scope files changed; checklist boxes are
  checked only for the complete contract.

## STOP and maintenance

STOP if the session collection cannot represent an observed pointer sequence,
if two sessions claim one pointer, if a change requires altering public event
meaning, if a scoped resource leaks in the new test, or if a gate fails after a
focused fix. Future resize and auto-pan plans must add explicit session
variants/transitions and extend the same cancellation table; do not restore
parallel nullable gesture flags.

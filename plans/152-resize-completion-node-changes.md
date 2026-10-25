# Plan 152: resize completion node changes

Follow-up from `plans/151-upstream-delta.md`, section "Follow-up". In `@xyflow/react` 12.12.0, the end callback of a resize gesture always fires. `NodeResizeControl.tsx:162,172` then publishes a `dimensions` change with `resizing: false` and the last accepted dimensions, even when the geometry did not change. Flow hosts only publish when the geometry changes. The maintainer's standing direction is to match upstream.

Implement the three steps of that section in all three hosts. Record the React behaviour through the React reference host before writing the Flow assertions.

## Execution

- Only ADD to `verification.config.json`; never remove or narrow anything.
- Run browser tests under `scripts/with-flow-browser-lock.sh` with one worker.
- Update the research traces, then finish with the locked `bun run verify --check reference-host`.
- Commit on `plan/152-resize-completion` with the trailer `Co-Authored-By: GPT-6.1 Sol via Codex <noreply@openai.com>`. Do not push or merge.

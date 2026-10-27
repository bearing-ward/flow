# Plan 166: shape-node border in the Vue image export

Plan 165's Vue sample (`/tmp/plan165/vue.png`) shows the hexagon shape node drawn inside a visible rectangular node border. Vanilla and Foldkit don't draw one. Plan 158 (`docs/shape-nodes.md`) defined shape nodes as SVG geometry scaled to the node's bounds, with no rectangular chrome.

## Scope and acceptance

1. Find where the border comes from: the Vue `FlowFigureNode` renderer, Vue's default node class and styles, or the image-service composition.
2. Fix it so shape nodes in all three hosts, both live and in exported images, show only the shape outline and fill. Keep focus and selection indicators accessible: for example, follow the shape or use an outline drawn only while the node is focused or selected.
3. Add a browser assertion in each host that a shape node's wrapper has no visible border in its unselected state.
4. Regenerate the three image-service samples into `/tmp/plan166/`.

## Execution

- Only ADD to `verification.config.json`; never remove or narrow anything.
- Take the browser lock separately for each browser command, and never leave servers running.
- Finish with the locked `bun run verify --check reference-host`.
- Commit on `plan/166-shape-border` with the trailer `Co-Authored-By: GPT-6.1 Sol via Codex <noreply@openai.com>`. Do not push or merge.

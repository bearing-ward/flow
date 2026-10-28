# Reference captures

Run these scripts from the repository root under `scripts/with-flow-browser-lock.sh`. Scripts with `--checkout` require a clean disposable xyflow checkout at their pinned revision. They regenerate Flow-authored fixtures, never `research/artifacts/`.

| Script | Regenerated evidence |
| --- | --- |
| `capture-api-utility-reference.ts` | `research/fixtures/api-utility-reference.json` |
| `capture-graph-edit-reference.ts` | `research/fixtures/graph-edit-reference.json` and `graph-edit-selected-reference.json` |
| `capture-handle-refresh-reference.ts` | `research/fixtures/handle-refresh-reference.json` |
| `capture-interaction-lifecycle-reference.ts` | `research/fixtures/interaction-lifecycle-reference.json` |
| `capture-measured-geometry-reference.ts` | `research/fixtures/measured-geometry-reference.json` |
| `capture-origin-connection-reference.ts` | `research/fixtures/origin-connection-reference.json` |
| `capture-path-helper-reference.ts` | `research/fixtures/path-helper-reference.json` |
| `capture-provider-session-reference.ts` | `research/fixtures/provider-session-reference.json` |
| `capture-renderer-contract-reference.ts` | `research/fixtures/renderer-contract-reference.json` |
| `capture-rotatable-node-reference.ts` | Prints live rotatable-node DOM observations for `research/fixtures/rotatable-node-reference.json` |
| `capture-viewport-contract-reference.ts` | `research/fixtures/viewport-contract-reference.json` and its environment record |

For example:

```sh
scripts/with-flow-browser-lock.sh bun run scripts/capture/capture-graph-edit-reference.ts --checkout /absolute/path/to/xyflow
```

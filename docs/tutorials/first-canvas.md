# Build the first canvas

This tutorial runs the Flow workspace example. It uses the `@flow/core` document schema and the vanilla browser host. The graph model stays framework-independent; the host creates and removes browser resources.

## Start the example

From the repository root, install the lockfile dependencies and start the vanilla app:

```sh
bun install --frozen-lockfile
bun run dev
```

Open `http://127.0.0.1:4173/`. The runnable entry point is [`apps/vanilla/src/main.ts`](../../apps/vanilla/src/main.ts), and the page is exercised by the [canvas browser tests](../../apps/vanilla/e2e/canvas.e2e.ts).

## Define a document

A node needs a unique id, a label, and a position. An edge connects node ids. `decodeFlowDocument` checks the input against the Effect Schema and checks cross-record rules such as unique identifiers and valid edge endpoints. See the [generated schema reference](../api-reference.md#document).

The checked example below imports the public Core and Vanilla entry points and the Vanilla stylesheet. `test:consumer` typechecks this file against the packed archives; its browser fixture also loads the stylesheet and mounts the packed Vanilla package.

```ts file=../../tests/consumer/tutorial-first-canvas.ts#L1-L29
import { decodeFlowDocument } from '@flow/core'
import { createFlow } from '@flow/vanilla'
import { Effect } from 'effect'

import '@flow/vanilla/style.css'

export const createFirstCanvasDocument = () =>
  Effect.runSync(
    decodeFlowDocument({
      nodes: [
        { id: 'source', label: 'Source', position: { x: 80, y: 120 } },
        { id: 'target', label: 'Target', position: { x: 360, y: 220 } },
      ],
      edges: [{ id: 'source-target', source: 'source', target: 'target' }],
    })
  )

export const mountFirstCanvas = (
  root: HTMLElement,
  document: ReturnType<typeof createFirstCanvasDocument>
) =>
  createFlow(root, document, {
    documentMode: 'uncontrolled',
    viewport: {
      mode: 'uncontrolled',
      initial: { x: 0, y: 0, zoom: 1 },
      limits: { minZoom: 0.5, maxZoom: 2 },
    },
  })
```

The example's actual document data and custom renderers live in [`main.ts`](../../apps/vanilla/src/main.ts). Its browser checks cover rendered nodes, edge paths, selection, and connection input.

## Choose document ownership

Use `documentMode: "controlled"` when your application owns each accepted graph update and sends the replacement document back through `controller.update`. Use `"uncontrolled"` when the host should adopt valid changes locally. The [public API guide](../public-api.md#ownership-and-acknowledgement) describes acknowledgement and teardown.

The [packed consumer fixture](../../tests/consumer/main.ts) shows the smallest package-level mounting path. The clean consumer gate installs the built tarballs, typechecks the fixture, mounts it in Chromium, and confirms that `destroy()` removes the canvas.

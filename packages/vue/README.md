# @flow/vue

Vue 3 adapter for Flow. The package owns the Vue component, composable, injection key, framework lifecycle, and component stylesheet. It depends on `@flow/core` for graph behavior and treats Vue as a peer dependency.

```ts
import { FlowCanvas, useFlow } from '@flow/vue'
import '@flow/vue/style.css'
```

Use `FlowCanvas` to render a controlled Flow document. Descendant Vue components can call `useFlow()` to access the editor provided by that canvas. See the [Vue demo](../../apps/vue) for application composition and the [adapter guide](../../docs/guides/adapters.md) for the framework contract.

When `edgeComponent` is omitted, `FlowCanvas` renders a default SVG path for each connection. The path honors the edge's configured geometry, stroke color, and stroke width.

import { defineConfig } from 'vite'

import { upstreamFixtureRoute } from '../shared/upstream/vite.ts'

export default defineConfig({
  plugins: [upstreamFixtureRoute()],
  // Example layout libraries are only reached from recipe pages, after Vite's
  // initial dependency scan; pre-bundle them so first loads do not reload.
  optimizeDeps: {
    include: [
      '@dagrejs/dagre',
      'd3-force',
      'html-to-image',
      'elkjs/lib/elk-api',
      'elkjs/lib/elk.bundled.js',
    ],
  },
  root: import.meta.dirname,
  define: {
    __VUE_OPTIONS_API__: true,
    __VUE_PROD_DEVTOOLS__: false,
    __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: false,
  },
  server: { host: '127.0.0.1', port: 4174, strictPort: true },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        imageService: `${import.meta.dirname}/image-service/index.html`,
        collaborative: `${import.meta.dirname}/collaborative/index.html`,
        wireTies: `${import.meta.dirname}/wire-ties/index.html`,
        edgeRouting: `${import.meta.dirname}/edge-routing/index.html`,
        expandCollapse: `${import.meta.dirname}/expand-collapse/index.html`,
        dynamicLayouting: `${import.meta.dirname}/dynamic-layouting/index.html`,
        nodeAnimation: `${import.meta.dirname}/node-animation/index.html`,
        main: `${import.meta.dirname}/index.html`,
        rotatableNode: `${import.meta.dirname}/rotatable-node/index.html`,
        figures: `${import.meta.dirname}/shapes/index.html`,
        clipboard: `${import.meta.dirname}/clipboard/index.html`,
        helperLines: `${import.meta.dirname}/helper-lines/index.html`,
        history: `${import.meta.dirname}/history/index.html`,
        editableEdges: `${import.meta.dirname}/editable-edges/index.html`,
      },
    },
  },
})

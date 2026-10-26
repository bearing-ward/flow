import { foldkit } from '@foldkit/vite-plugin'
import { defineConfig } from 'vite'

import { upstreamFixtureRoute } from '../shared/upstream/vite.ts'

export default defineConfig({
  plugins: [foldkit(), upstreamFixtureRoute()],
  // The plugin injects this import after Vite's dependency scan.
  // Example layout libraries are only reached from recipe pages, after Vite's
  // initial dependency scan; pre-bundle them so first loads do not reload.
  optimizeDeps: {
    include: [
      'foldkit/brand',
      'html-to-image',
      '@dagrejs/dagre',
      'd3-force',
      'elkjs/lib/elk-api',
      'elkjs/lib/elk.bundled.js',
    ],
  },
  root: import.meta.dirname,
  server: { host: '127.0.0.1', port: 4175, strictPort: true },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        expandCollapse: `${import.meta.dirname}/expand-collapse/index.html`,
        dynamicLayouting: `${import.meta.dirname}/dynamic-layouting/index.html`,
        nodeAnimation: `${import.meta.dirname}/node-animation/index.html`,
        main: `${import.meta.dirname}/index.html`,
        editableEdges: `${import.meta.dirname}/editable-edges/index.html`,
        figures: `${import.meta.dirname}/shapes/index.html`,
        clipboard: `${import.meta.dirname}/clipboard/index.html`,
        helperLines: `${import.meta.dirname}/helper-lines/index.html`,
        history: `${import.meta.dirname}/history/index.html`,
        schemaStudio: `${import.meta.dirname}/schema-studio/index.html`,
      },
    },
  },
})

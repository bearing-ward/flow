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
        main: `${import.meta.dirname}/index.html`,
        history: `${import.meta.dirname}/history/index.html`,
      },
    },
  },
})

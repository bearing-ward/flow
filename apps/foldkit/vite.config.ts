import { foldkit } from '@foldkit/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [foldkit()],
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
  build: { outDir: 'dist', emptyOutDir: true },
})

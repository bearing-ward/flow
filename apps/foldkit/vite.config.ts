import { foldkit } from '@foldkit/vite-plugin'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [foldkit()],
  // The plugin injects this import after Vite's dependency scan.
  optimizeDeps: { include: ['foldkit/brand'] },
  root: import.meta.dirname,
  server: { host: '127.0.0.1', port: 4175, strictPort: true },
  build: { outDir: 'dist', emptyOutDir: true },
})

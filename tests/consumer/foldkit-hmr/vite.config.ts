import { foldkit } from '@foldkit/vite-plugin'

export default {
  plugins: [foldkit()],
  optimizeDeps: { include: ['foldkit/brand'] },
}

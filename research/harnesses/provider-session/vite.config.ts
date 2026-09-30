import { defineConfig } from 'vite'

const checkout = process.env.XYFLOW_CHECKOUT

if (checkout === undefined) {
  throw new Error('XYFLOW_CHECKOUT is required')
}

export default defineConfig({
  resolve: {
    alias: {
      '@xyflow/react': `${checkout}/packages/react/dist/esm/index.js`,
      'react/jsx-runtime': `${checkout}/node_modules/react/jsx-runtime.js`,
      'react/jsx-dev-runtime': `${checkout}/node_modules/react/jsx-dev-runtime.js`,
      react: `${checkout}/node_modules/react/index.js`,
      'react-dom/client': `${checkout}/node_modules/react-dom/client.js`,
    },
  },
  server: { fs: { allow: [checkout, import.meta.dirname] } },
})

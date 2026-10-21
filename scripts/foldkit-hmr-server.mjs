import { rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const [consumerRoot, configFile, cacheDir, readyFile] = process.argv.slice(2)

if (
  consumerRoot === undefined ||
  configFile === undefined ||
  cacheDir === undefined ||
  readyFile === undefined
) {
  throw new Error(
    'Expected consumer root, Vite config, cache path, and ready file'
  )
}

const viteEntry = path.join(
  consumerRoot,
  'node_modules/vite/dist/node/index.js'
)

const { createServer } = await import(pathToFileURL(viteEntry).href)

const server = await createServer({
  cacheDir,
  configFile,
  logLevel: 'error',
  root: consumerRoot,
  server: {
    host: '127.0.0.1',
    port: 0,
    strictPort: false,
    fs: { strict: true, allow: [consumerRoot] },
  },
})

await server.listen()

const address = server.httpServer?.address()

if (address?.port === undefined) {
  await server.close()
  throw new Error('Foldkit HMR consumer server did not expose a TCP port')
}

const pendingReadyFile = `${readyFile}.tmp`

await writeFile(pendingReadyFile, JSON.stringify({ port: address.port }))

await rename(pendingReadyFile, readyFile)

process.once('SIGTERM', async () => {
  await server.close()
  process.exit(0)
})

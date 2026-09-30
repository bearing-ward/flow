import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createServer } from 'vite'

const readyFile = process.argv.at(2)

if (readyFile === undefined) {
  throw new Error('Missing private collector harness readiness file')
}

const root = fileURLToPath(new URL('../', import.meta.url))

const server = await createServer({
  configFile: false,
  root: path.join(root, 'research/harnesses/telemetry'),
  server: { host: '127.0.0.1', port: 0, fs: { allow: [root] } },
  logLevel: 'error',
})

await server.listen()

const url = server.resolvedUrls?.local[0]

if (url === undefined) {
  throw new Error('Vite did not report a loopback URL')
}

await Bun.write(readyFile, JSON.stringify({ url }))

process.once('SIGTERM', () => {
  void (async () => {
    try {
      await server.close()
    } finally {
      process.exit(0)
    }
  })()
})

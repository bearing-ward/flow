import { readdirSync } from 'node:fs'
import path from 'node:path'

import type { Plugin } from 'vite'

export const siteBase = process.env.FLOW_SITE_BASE ?? '/'

export const isSiteBuild = process.env.FLOW_SITE_BASE !== undefined

const harnesses = new Set([
  'upstream.html',
  'test.html',
  'connection-threshold.html',
  'routing-preflight',
  'workflow-contracts',
  'workflow-ai-capability',
  'live-internal-node',
])

export const siteInputs = (root: string): string[] =>
  readdirSync(root, { recursive: true, withFileTypes: true }).flatMap(
    (entry) => {
      const file = path.join(entry.parentPath, entry.name)
      const parts = path.relative(root, file).split('/')

      return entry.isFile() &&
        entry.name.endsWith('.html') &&
        !entry.name.endsWith('-test.html') &&
        !parts.some((part) =>
          ['dist', 'node_modules', 'e2e', ...harnesses].includes(part)
        )
        ? [file]
        : []
    }
  )

export const staticServiceNotices = (): Plugin => ({
  name: 'flow-static-service-notices',
  transformIndexHtml: {
    order: 'pre',
    handler(html, context) {
      const route = context.path.split('/').at(-2)

      if (route !== 'collaborative' && route !== 'image-service') {
        return html
      }

      const title =
        route === 'collaborative' ? 'Collaboration' : 'Server image export'

      const doc =
        route === 'collaborative'
          ? 'packages/collaboration-yjs/README.md'
          : 'docs/server-image-service.md'

      return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${title} | Flow</title>
<style>:root{color-scheme:light dark}body{font:1.1rem/1.6 system-ui;max-width:48rem;margin:10vh auto;padding:1.5rem}a{color:light-dark(#1749a1,#9dc4ff)}</style></head>
<body><main><h1>${title}</h1><p>This demo requires a local server. See the docs for setup instructions.</p>
<p><a href="https://github.com/bearing-ward/flow/blob/main/${doc}">Read the ${title.toLowerCase()} docs</a></p>
<p><a href="../">Host playground</a> · <a href="../../">Flow home</a></p></main></body></html>`
    },
  },
})

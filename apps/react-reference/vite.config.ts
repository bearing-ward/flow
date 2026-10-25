import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { defineConfig } from 'vite'

import ledger from '../../research/catalogs/upstream-test-ledger.json' with { type: 'json' }
import { componentFixtureSource } from './fixture-source.ts'

const root = path.resolve(import.meta.dirname, '../..')

const evidence = `${root}/research/artifacts/xyflow/${ledger.revision}`

export default defineConfig({
  resolve: {
    alias: {
      '@xyflow/react': path.resolve(
        import.meta.dirname,
        'node_modules/@xyflow/react'
      ),
      '@xyflow/system': path.resolve(
        import.meta.dirname,
        'node_modules/@xyflow/system'
      ),
      chai: path.resolve(import.meta.dirname, 'node_modules/chai'),
    },
    dedupe: ['react', 'react-dom', '@xyflow/react'],
  },
  plugins: [
    {
      name: 'pinned-component-mounts',
      resolveId(id) {
        if (
          id.startsWith('reference-component:') ||
          id.startsWith('reference-utility:')
        ) {
          return `\0${id}`
        }
      },
      async load(id) {
        if (
          !id.startsWith('\0reference-component:') &&
          !id.startsWith('\0reference-utility:')
        ) {
          return
        }

        const entry = ledger.cases.find(
          (candidate) => candidate.id === id.split(':').at(-1)
        )

        if (
          !entry ||
          entry.phase !== 128 ||
          entry.upstream.includes('/utils/') !==
            id.startsWith('\0reference-utility:')
        ) {
          throw new Error(`Unknown reference component ${id}`)
        }

        const [file, line] = entry.upstream.split(':')

        if (!file || !line) {
          throw new Error(`Invalid source ${entry.upstream}`)
        }

        const filePath = `${evidence}/${file}`

        const text = componentFixtureSource(
          await readFile(filePath, 'utf-8'),
          Number(line),
          entry.upstream.includes('/utils/')
        )

        // Preserve original relative imports while the virtual module has no directory.
        return text.replaceAll(
          /(?<start>from\s+['"])(?<specifier>\.[^'"]+)(?<end>['"])/gu,
          (_match, start: string, specifier: string, end: string) =>
            `${start}${path.resolve(filePath, '..', specifier)}${end}`
        )
      },
    },
  ],
  server: { fs: { allow: [root] } },
})

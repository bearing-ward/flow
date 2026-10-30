import { spawnSync } from 'node:child_process'
import { mkdtempSync, writeFileSync, rmSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

import { checkPackageArchive } from '../../scripts/package-archive.ts'

const root = path.resolve(import.meta.dirname, '../..')

const run = (cwd: string, command: string, args: readonly string[]) => {
  const result = spawnSync(command, args, { cwd, encoding: 'utf-8' })
  expect(
    result.status,
    `${command} ${args.join(' ')}\n${result.stdout}\n${result.stderr}`
  ).toBe(0)

  return result.stdout
}

describe('separately packed routing adapter', () => {
  it('installs without workspace aliases, typechecks and routes with its own WASM', () => {
    const temporary = mkdtempSync(path.join(tmpdir(), 'flow-routing-consumer-'))

    try {
      for (const owner of ['core', 'routing-libavoid']) {
        run(path.join(root, 'packages', owner), 'bun', [
          'pm',
          'pack',
          '--destination',
          temporary,
        ])
        checkPackageArchive(
          path.join(temporary, `flow-${owner}-0.0.0.tgz`),
          `@flow/${owner}`
        )
      }

      writeFileSync(
        path.join(temporary, 'package.json'),
        JSON.stringify({
          name: 'isolated-routing-consumer',
          private: true,
          type: 'module',
          overrides: {
            '@flow/core': `file:${path.join(temporary, 'flow-core-0.0.0.tgz')}`,
          },
          dependencies: {
            '@flow/core': 'file:./flow-core-0.0.0.tgz',
            '@flow/routing-libavoid': 'file:./flow-routing-libavoid-0.0.0.tgz',
            effect: '4.0.0',
          },
        })
      )
      run(temporary, 'bun', ['install', '--offline', '--ignore-scripts'])

      const wasm = path.join(
        temporary,
        'node_modules/@flow/routing-libavoid/dist/libavoid.wasm'
      )

      expect(readFileSync(wasm)).toStrictEqual(
        readFileSync(
          path.join(
            root,
            'packages/routing-libavoid/node_modules/libavoid-js/dist/libavoid.wasm'
          )
        )
      )
      writeFileSync(
        path.join(temporary, 'proof.ts'),
        `import { FlowRouter, routeFlowEdges, type FlowRouterService } from '@flow/core'
import { createLibavoidRouter } from '@flow/routing-libavoid'
import { Effect } from 'effect'
const router: FlowRouterService = createLibavoidRouter({ wasmUrl: ${JSON.stringify(wasm)} })
const result = await Effect.runPromise(routeFlowEdges({ revision: 'packed', constraints: { clearance: 8, portOffset: 20 }, obstacles: [{ id: 'block', x: 100, y: 50, width: 100, height: 100 }], connections: [{ id: 'ab', source: { nodeId: 'a', point: { x: 0, y: 100 }, side: 'right' }, target: { nodeId: 'b', point: { x: 300, y: 100 }, side: 'left' } }] }).pipe(Effect.provideService(FlowRouter, router)))
if (result.revision !== 'packed' || result.paths[0]?.kind !== 'routed') throw new Error('Packed router did not route')
`
      )
      writeFileSync(
        path.join(temporary, 'tsconfig.json'),
        JSON.stringify({
          compilerOptions: {
            strict: true,
            skipLibCheck: false,
            noEmit: true,
            module: 'preserve',
            moduleResolution: 'bundler',
            target: 'esnext',
            lib: ['esnext', 'dom'],
          },
          include: ['proof.ts'],
        })
      )
      run(temporary, 'bun', [
        'run',
        path.join(root, 'node_modules/typescript/bin/tsc'),
        '--project',
        'tsconfig.json',
      ])
      run(temporary, 'bun', ['proof.ts'])
    } finally {
      rmSync(temporary, { recursive: true, force: true })
    }
  }, 30_000)
})

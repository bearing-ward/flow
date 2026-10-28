/* eslint-disable no-await-in-loop -- Real pointer scenarios must run serially against the single owned pinned server. */
import assert from 'node:assert/strict'
import { unlink } from 'node:fs/promises'
import path from 'node:path'

import { chromium } from '@playwright/test'
import type { Page } from '@playwright/test'
import { Schema as S } from 'effect'

import {
  CaptureSchema,
  FixtureSchema,
  ObservationSchema,
} from '../../research/harnesses/origin-connection/fixture-schema.ts'
import type {
  ProbeRequest,
  Sample,
} from '../../research/harnesses/origin-connection/fixture-schema.ts'

declare global {
  interface Window {
    __originConnectionReady?: boolean
    __originConnectionSnapshot?: () => string
    __originConnectionAddNull?: () => void
  }
}

const settle = async (page: Page): Promise<void> => {
  const frame = () =>
    page.evaluate(() => {
      const { promise, resolve } = Promise.withResolvers<undefined>()
      requestAnimationFrame(() => resolve())

      return promise
    })

  await frame()
  await frame()
}

const center = async (page: Page, id: string, kind: 'source' | 'target') => {
  const box = await page
    .locator(`.react-flow__node[data-id="${id}"] .react-flow__handle.${kind}`)
    .boundingBox()

  if (box === null) {
    throw new Error(`Missing physical handle ${id}/${kind}`)
  }

  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

const expectedSha = '0a1f9575b25679f2880175de8d3eae21aedde921'

const root = path.resolve(import.meta.dir, '../..')

const port = 4196

const harness = path.resolve(root, 'research/harnesses/origin-connection')

const fixturePath = path.resolve(
  root,
  'research/fixtures/origin-connection-reference.json'
)

const argument = process.argv.find((value) => value.startsWith('--checkout='))

const checkoutIndex = process.argv.indexOf('--checkout')

const checkoutArgument =
  argument?.slice('--checkout='.length) ??
  (checkoutIndex === -1 ? undefined : process.argv[checkoutIndex + 1])

if (checkoutArgument === undefined || !path.isAbsolute(checkoutArgument)) {
  throw new Error(
    'Usage: bun run scripts/capture/capture-origin-connection-reference.ts --checkout /absolute/disposable/pinned/checkout'
  )
}

const checkout = path.resolve(checkoutArgument)

const output = (command: string[]): string => {
  const result = Bun.spawnSync(command, {
    cwd: checkout,
    stdout: 'pipe',
    stderr: 'pipe',
  })

  if (result.exitCode !== 0) {
    throw new Error(
      `Command failed: ${command.join(' ')}\n${new TextDecoder().decode(result.stderr)}`
    )
  }

  return new TextDecoder().decode(result.stdout).trim()
}

const run = (command: string[]): void => {
  const result = Bun.spawnSync(command, {
    cwd: root,
    stdout: 'inherit',
    stderr: 'inherit',
  })

  if (result.exitCode !== 0) {
    throw new Error(`Command failed: ${command.join(' ')}`)
  }
}

assert.equal(output(['git', 'rev-parse', 'HEAD']), expectedSha)

assert.equal(
  output(['git', 'status', '--porcelain', '--untracked-files=all']),
  ''
)

run([
  'corepack',
  'pnpm@10.33.4',
  '--dir',
  checkout,
  'install',
  '--frozen-lockfile',
])

for (const name of ['@xyflow/system', '@xyflow/react']) {
  run([
    'corepack',
    'pnpm@10.33.4',
    '--dir',
    checkout,
    '--filter',
    name,
    'build',
  ])
}

// Workspace TS excludes evidence TSX. Check the actual public producer against pinned declarations.
const compilerConfigPath = path.resolve(
  '/tmp',
  `flow-origin-capture-${process.pid}.json`
)

try {
  await Bun.write(
    compilerConfigPath,
    JSON.stringify({
      compilerOptions: {
        lib: ['ESNext', 'DOM', 'DOM.Iterable'],
        target: 'ESNext',
        module: 'Preserve',
        moduleResolution: 'bundler',
        jsx: 'react-jsx',
        noEmit: true,
        strict: true,
        skipLibCheck: true,
        allowImportingTsExtensions: true,
        verbatimModuleSyntax: true,
        exactOptionalPropertyTypes: true,
        noUncheckedIndexedAccess: true,
        baseUrl: root,
        paths: {
          '@xyflow/react': [
            path.resolve(checkout, 'packages/react/dist/esm/index.d.ts'),
          ],
          react: [
            path.resolve(
              checkout,
              'packages/react/node_modules/@types/react/index.d.ts'
            ),
          ],
          'react/jsx-runtime': [
            path.resolve(
              checkout,
              'packages/react/node_modules/@types/react/jsx-runtime.d.ts'
            ),
          ],
          'react-dom/client': [
            path.resolve(
              checkout,
              'packages/react/node_modules/@types/react-dom/client.d.ts'
            ),
          ],
        },
      },
      files: [path.resolve(harness, 'main.tsx')],
    })
  )
  run([
    path.resolve(root, 'node_modules/.bin/tsc'),
    '--project',
    compilerConfigPath,
  ])
} finally {
  await unlink(compilerConfigPath)
}

const request = (
  name: string,
  overrides: Partial<ProbeRequest> = {}
): ProbeRequest => ({
  name,
  geometry: false,
  origin: [0, 0],
  mode: 'strict',
  threshold: 1,
  zoom: 1,
  lineType: null,
  custom: false,
  styled: false,
  unnamed: false,
  reject: false,
  ...overrides,
})

const server = Bun.spawn(
  [
    path.resolve(root, 'node_modules/.bin/vite'),
    '--config',
    path.resolve(harness, 'vite.config.ts'),
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
    '--strictPort',
    harness,
  ],
  {
    cwd: root,
    env: { ...process.env, XYFLOW_CHECKOUT: checkout },
    stdout: 'inherit',
    stderr: 'inherit',
  }
)

const browser = await chromium
  .launch({ headless: true })
  .catch(async (error) => {
    server.kill()
    await server.exited
    throw error
  })

try {
  const deadline = Date.now() + 30_000

  const waitForServer = async (): Promise<void> => {
    if (server.exitCode !== null) {
      throw new Error(`Capture server exited ${server.exitCode}`)
    }

    try {
      const response = await fetch(`http://127.0.0.1:${port}`)

      if (response.ok) {
        return
      }
    } catch {
      /* Strict server has not opened its port yet. */
    }

    if (Date.now() >= deadline) {
      throw new Error('Capture server readiness timeout')
    }

    await Bun.sleep(100)

    return waitForServer()
  }

  await waitForServer()

  const read = async (page: Page) => {
    await settle(page)

    const text = await page.evaluate(() =>
      window.__originConnectionSnapshot?.()
    )

    if (text === undefined) {
      throw new Error('Missing public probe snapshot')
    }

    return S.decodeUnknownSync(ObservationSchema)(JSON.parse(text))
  }

  const capture = async (): Promise<typeof CaptureSchema.Type> => {
    const samples: Sample[] = []

    const scenario = async (
      configuration: ProbeRequest,
      act?: (
        page: Page,
        sample: {
          phases: { name: string; observation: typeof ObservationSchema.Type }[]
        }
      ) => Promise<void>
    ) => {
      const page = await browser.newPage({
        viewport: { width: 1600, height: 1000 },
      })

      const diagnostics: string[] = []
      page.on('pageerror', (error) => diagnostics.push(error.message))
      page.on('console', (event) => {
        if (event.type() === 'error') {
          diagnostics.push(event.text())
        }
      })

      try {
        await page.goto(
          `http://127.0.0.1:${port}/?request=${encodeURIComponent(JSON.stringify(configuration))}`,
          { waitUntil: 'domcontentloaded' }
        )
        await page.waitForFunction(
          () =>
            window.__originConnectionReady === true &&
            window.__originConnectionSnapshot !== undefined
        )

        const sample = {
          request: configuration,
          phases: [{ name: 'idle', observation: await read(page) }],
        }

        if (act !== undefined) {
          await act(page, sample)
        }

        assert.deepEqual(
          diagnostics,
          [],
          `Unexpected runtime errors in ${configuration.name}`
        )
        samples.push(sample)
      } finally {
        await page.close()
      }
    }

    for (const origin of [
      [0, 0],
      [0.5, 0.5],
      [1, 1],
      [-0.5, 1.5],
    ] satisfies ProbeRequest['origin'][]) {
      await scenario(
        request(`origin-${origin.join(',')}`, { geometry: true, origin })
      )
    }

    const gesture = async (
      configuration: ProbeRequest,
      fromKind: 'source' | 'target',
      toKind: 'source' | 'target',
      same = false
    ) => {
      await scenario(configuration, async (page, sample) => {
        const from = await center(page, 'a', fromKind)
        const to = await center(page, same ? 'a' : 'b', toKind)
        await page.mouse.move(from.x, from.y)
        await page.mouse.down()
        await page.mouse.move(from.x + 70, from.y + 35)
        sample.phases.push({ name: 'free', observation: await read(page) })
        await page.mouse.move(
          to.x + (configuration.custom ? 12 * configuration.zoom : 0),
          to.y
        )
        sample.phases.push({ name: 'hover', observation: await read(page) })
        await page.mouse.up()
        sample.phases.push({ name: 'released', observation: await read(page) })
      })
    }

    for (const mode of ['strict', 'loose'] as const) {
      for (const from of ['source', 'target'] as const) {
        for (const to of ['source', 'target'] as const) {
          await gesture(request(`${mode}-${from}-${to}`, { mode }), from, to)
        }
      }

      await gesture(
        request(`${mode}-same-physical`, { mode }),
        'source',
        'source',
        true
      )
    }

    await gesture(
      request('unnamed-physical', { unnamed: true }),
      'source',
      'target'
    )
    await scenario(
      request('null-request-named-physical'),
      async (page, sample) => {
        await page.evaluate(() => window.__originConnectionAddNull?.())
        await page.waitForFunction(
          () =>
            JSON.parse(window.__originConnectionSnapshot?.() ?? '{}').edges
              ?.length === 1
        )
        sample.phases.push({ name: 'added', observation: await read(page) })
      }
    )

    for (const threshold of [0, 1]) {
      await scenario(
        request(`threshold-${threshold}`, { threshold }),
        async (page, sample) => {
          const from = await center(page, 'a', 'source')
          await page.mouse.move(from.x, from.y)
          await page.mouse.down()
          sample.phases.push({ name: 'pressed', observation: await read(page) })
          await page.mouse.move(from.x + 1, from.y)
          sample.phases.push({
            name: 'exact-one',
            observation: await read(page),
          })
          await page.mouse.move(from.x + 2, from.y)
          sample.phases.push({
            name: 'above-one',
            observation: await read(page),
          })
          await page.mouse.up()
          sample.phases.push({
            name: 'released',
            observation: await read(page),
          })
        }
      )
    }

    for (const zoom of [0.5, 2]) {
      for (const distance of [19, 20, 22]) {
        await scenario(
          request(`radius-${zoom}-${distance}`, { zoom }),
          async (page, sample) => {
            const from = await center(page, 'a', 'source')
            const to = await center(page, 'b', 'target')
            await page.mouse.move(from.x, from.y)
            await page.mouse.down()
            await page.mouse.move(to.x, to.y + distance * zoom)
            sample.phases.push({
              name: 'radius-hover',
              observation: await read(page),
            })
            await page.mouse.up()
            sample.phases.push({
              name: 'released',
              observation: await read(page),
            })
          }
        )
      }
    }

    for (const lineType of [
      null,
      'default',
      'straight',
      'step',
      'smoothstep',
      'simplebezier',
    ] as const) {
      await scenario(
        request(`line-${lineType ?? 'absent'}`, { lineType }),
        async (page, sample) => {
          const from = await center(page, 'a', 'source')
          await page.mouse.move(from.x, from.y)
          await page.mouse.down()
          await page.mouse.move(from.x + 100, from.y + 60)
          sample.phases.push({ name: 'free', observation: await read(page) })
          await page.mouse.move(from.x - 100, from.y + 60)
          sample.phases.push({
            name: 'backward',
            observation: await read(page),
          })
          await page.mouse.up()
          sample.phases.push({
            name: 'cancelled-release',
            observation: await read(page),
          })
        }
      )
    }

    for (const reject of [false, true]) {
      await gesture(
        request(`custom-${reject ? 'invalid' : 'valid'}`, {
          custom: true,
          styled: true,
          reject,
          zoom: 2,
          lineType: 'smoothstep',
        }),
        'source',
        'target'
      )
    }

    await gesture(
      request('custom-absent-style', { custom: true, zoom: 2 }),
      'source',
      'target'
    )

    return S.decodeUnknownSync(CaptureSchema)(samples)
  }

  const first = await capture()
  const second = await capture()
  assert.deepEqual(
    first,
    second,
    'Two independent normalized public captures must match'
  )

  const { version } = S.decodeUnknownSync(S.Struct({ version: S.String }))(
    JSON.parse(
      await Bun.file(
        path.resolve(checkout, 'packages/react/package.json')
      ).text()
    )
  )

  assert.equal(version, '12.11.6')

  const fixture = S.decodeUnknownSync(FixtureSchema)({
    metadata: {
      upstreamSha: expectedSha,
      version,
      captureRuns: 2,
      browser: `Chromium ${browser.version()}`,
      capturedAt: new Date().toISOString(),
      normalization:
        'Graph and DOM coordinates rounded to0.001; timestamps excluded from samples; two fresh ReactFlow mounts per scenario; public toObject own handle/origin keys retained separately; 10px borderless caller handles',
    },
    samples: first,
    repeatedCaptureMatches: true,
    unverified: [
      'Generic/class payloads and complete nested Node/InternalNode fields require069/074; Flow all-host behavior and original member closure are outside upstream-only capture',
      'Pointer cancellation beyond release without eligible target, touch/multipointer and trusted native device input remain unverified',
    ],
  })

  await Bun.write(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`)
  run(['bunx', 'oxfmt', fixturePath])
  assert.equal(
    output(['git', 'status', '--porcelain', '--untracked-files=all']),
    ''
  )
  process.stdout.write(
    `Captured ${first.length} scenarios twice at ${expectedSha}; ${fixturePath}\n`
  )
} finally {
  await browser.close()
  server.kill()
  await server.exited
}

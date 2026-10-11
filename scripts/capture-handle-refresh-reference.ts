import assert from 'node:assert/strict'
import path from 'node:path'

import { chromium } from '@playwright/test'
import { Schema as S } from 'effect'

import {
  HandleRefreshCasesSchema,
  HandleRefreshFixtureSchema,
} from '../research/harnesses/handle-refresh/fixture-schema.ts'

declare global {
  interface Window {
    __handleRefreshCapture?: string
    __handleRefreshProbeDebug?: string
  }
}

const expectedSha = '0a1f9575b25679f2880175de8d3eae21aedde921'

const root = path.resolve(import.meta.dir, '..')

const fixturePath = path.resolve(
  root,
  'research/fixtures/handle-refresh-reference.json'
)

const harnessRoot = path.resolve(root, 'research/harnesses/handle-refresh')

const port = 4193

const CaptureSchema = HandleRefreshCasesSchema

const arg = process.argv.find((value) => value.startsWith('--checkout='))

const checkoutArg =
  arg?.slice('--checkout='.length) ??
  process.argv[process.argv.indexOf('--checkout') + 1]

if (checkoutArg === undefined || !path.isAbsolute(checkoutArg)) {
  throw new Error(
    'Usage: bun run scripts/capture-handle-refresh-reference.ts --checkout /absolute/path/to/disposable-xyflow-checkout'
  )
}

const checkout = path.resolve(checkoutArg)

const output = (command: string[], cwd: string): string => {
  const result = Bun.spawnSync(command, { cwd, stdout: 'pipe', stderr: 'pipe' })

  if (result.exitCode !== 0) {
    throw new Error(
      `Command failed (${result.exitCode}): ${command.join(' ')}\n${new TextDecoder().decode(result.stderr)}`
    )
  }

  return new TextDecoder().decode(result.stdout).trim()
}

const run = (command: string[], cwd: string): void => {
  const result = Bun.spawnSync(command, {
    cwd,
    stdout: 'inherit',
    stderr: 'inherit',
  })

  if (result.exitCode !== 0) {
    throw new Error(`Command failed (${result.exitCode}): ${command.join(' ')}`)
  }
}

assert.equal(output(['git', 'rev-parse', 'HEAD'], checkout), expectedSha)

assert.equal(
  output(['git', 'status', '--porcelain', '--untracked-files=all'], checkout),
  ''
)

run(
  [
    'corepack',
    'pnpm@10.33.4',
    '--dir',
    checkout,
    'install',
    '--frozen-lockfile',
  ],
  root
)

run(
  [
    'corepack',
    'pnpm@10.33.4',
    '--dir',
    checkout,
    '--filter',
    '@xyflow/system',
    'build',
  ],
  root
)

run(
  [
    'corepack',
    'pnpm@10.33.4',
    '--dir',
    checkout,
    '--filter',
    '@xyflow/react',
    'build',
  ],
  root
)

const server = Bun.spawn(
  [
    path.resolve(root, 'node_modules/.bin/vite'),
    '--config',
    path.resolve(harnessRoot, 'vite.config.ts'),
    '--host',
    '127.0.0.1',
    '--port',
    String(port),
    '--strictPort',
    harnessRoot,
  ],
  {
    cwd: root,
    env: { ...process.env, XYFLOW_CHECKOUT: checkout },
    stdout: 'inherit',
    stderr: 'inherit',
  }
)

const browser = await chromium.launch({ headless: true })

try {
  const deadline = Date.now() + 15_000

  const waitForServer = async (): Promise<void> => {
    if (server.exitCode !== null) {
      throw new Error(
        `Reference server exited before readiness: ${server.exitCode}`
      )
    }

    try {
      const response = await fetch(`http://127.0.0.1:${port}`)

      if (response.ok) {
        return
      }
    } catch {
      // The strict-port Vite process has not bound its listener yet.
    }

    if (Date.now() >= deadline) {
      throw new Error('Reference server did not become ready within 15 seconds')
    }

    await Bun.sleep(100)

    return waitForServer()
  }

  await waitForServer()

  const captureOnce = async (): Promise<typeof CaptureSchema.Type> => {
    const page = await browser.newPage()
    const diagnostics: string[] = []
    page.on('pageerror', (error) =>
      diagnostics.push(`pageerror: ${error.message}`)
    )
    page.on('console', (message) => {
      if (message.type() === 'error') {
        diagnostics.push(`console: ${message.text()}`)
      }
    })
    page.on('requestfailed', (request) => {
      diagnostics.push(
        `requestfailed: ${request.url()} ${request.failure()?.errorText ?? ''}`
      )
    })

    try {
      await page.goto(`http://127.0.0.1:${port}`, {
        waitUntil: 'domcontentloaded',
      })

      try {
        await page.waitForFunction(
          () => window.__handleRefreshCapture !== undefined,
          undefined,
          { timeout: 15_000 }
        )
      } catch (error) {
        const state = await page.evaluate(() => ({
          url: location.href,
          readyState: document.readyState,
          title: document.title,
          probeDebug: window.__handleRefreshProbeDebug ?? null,
          bodyText: document.body.textContent?.slice(0, 2048),
          nodes: [...document.querySelectorAll('.react-flow__node')].map(
            (node) => {
              // SAFETY: the selected React Flow node elements are HTML elements.
              const htmlNode = node as HTMLElement

              return {
                id: htmlNode.dataset.id,
                markup: htmlNode.outerHTML.slice(0, 4096),
                bounds: (() => {
                  const { x, y, width, height } = node.getBoundingClientRect()

                  return { x, y, width, height }
                })(),
              }
            }
          ),
        }))

        throw new Error(
          `Upstream geometry capture timed out. State: ${JSON.stringify(state)}. Diagnostics: ${diagnostics.join(' | ') || 'none'}. Cause: ${String(error)}`,
          { cause: error }
        )
      }

      const capture = await page.evaluate(() => window.__handleRefreshCapture)

      if (capture === undefined) {
        throw new Error(
          'The upstream measurement probe did not publish a capture'
        )
      }

      return S.decodeUnknownSync(CaptureSchema)(JSON.parse(capture))
    } finally {
      await page.close()
    }
  }

  const first = S.decodeUnknownSync(CaptureSchema)(await captureOnce())
  const second = S.decodeUnknownSync(CaptureSchema)(await captureOnce())
  assert.deepEqual(first, second, 'normalized upstream captures must match')

  const reactPackage = S.decodeUnknownSync(S.Struct({ version: S.String }))(
    JSON.parse(
      await Bun.file(
        path.resolve(checkout, 'packages/react/package.json')
      ).text()
    )
  )

  const fixture = S.decodeUnknownSync(HandleRefreshFixtureSchema)({
    metadata: {
      framework: 'React',
      package: '@xyflow/react',
      version: reactPackage.version,
      upstreamSha: expectedSha,
      browser: `Chromium ${browser.version()}`,
      normalization:
        'captured node-local handleBounds top-left to center; accepted parent-local positions and SVG graph coordinates; caller-specified 10px borderless handles; timestamps excluded',
      capturedAt: new Date().toISOString(),
      captureRuns: 2,
    },
    cases: first,
    repeatedCaptureMatches: true,
  })

  await Bun.write(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`)
  run(['bunx', 'oxfmt', fixturePath], root)
  process.stdout.write(await Bun.file(fixturePath).text())
} finally {
  await browser.close()
  server.kill()
  await server.exited
}

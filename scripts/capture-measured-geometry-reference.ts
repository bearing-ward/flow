import assert from 'node:assert/strict'
import path from 'node:path'

import { chromium } from '@playwright/test'
import { Schema as S } from 'effect'

declare global {
  interface Window {
    __measuredGeometryCapture?: string
    __measurementProbeDebug?: string
  }
}

const expectedSha = '0a1f9575b25679f2880175de8d3eae21aedde921'

const root = path.resolve(import.meta.dir, '..')

const fixturePath = path.resolve(
  root,
  'research/fixtures/measured-geometry-reference.json'
)

const harnessRoot = path.resolve(root, 'research/harnesses/measured-geometry')

const port = 4191

const CaptureSchema = S.Struct({
  initial: S.NullOr(S.Json),
  readiness: S.Struct({ visibleOnly: S.Boolean, includingHidden: S.Boolean }),
  hiddenInternal: S.NullOr(S.Json),
  missingInternal: S.NullOr(S.Json),
  refreshed: S.NullOr(S.Json),
})

const arg = process.argv.find((value) => value.startsWith('--checkout='))

const checkoutArg =
  arg?.slice('--checkout='.length) ??
  process.argv[process.argv.indexOf('--checkout') + 1]

if (checkoutArg === undefined || !path.isAbsolute(checkoutArg)) {
  throw new Error(
    'Usage: bun run scripts/capture-measured-geometry-reference.ts --checkout /absolute/path/to/disposable-xyflow-checkout'
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
  const captureOnce = async (): Promise<typeof S.Json.Type> => {
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
          () => window.__measuredGeometryCapture !== undefined,
          undefined,
          { timeout: 15_000 }
        )
      } catch (error) {
        const state = await page.evaluate(() => ({
          url: location.href,
          readyState: document.readyState,
          title: document.title,
          probeDebug: window.__measurementProbeDebug ?? null,
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

      const capture = await page.evaluate(
        () => window.__measuredGeometryCapture
      )

      if (capture === undefined) {
        throw new Error(
          'The upstream measurement probe did not publish a capture'
        )
      }

      return S.decodeUnknownSync(S.Json)(JSON.parse(capture))
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

  const fixture = {
    metadata: {
      framework: 'React',
      package: '@xyflow/react',
      version: reactPackage.version,
      upstreamSha: expectedSha,
      browser: `Chromium ${browser.version()}`,
      normalization:
        'captured normalized node dimensions, parent-local geometry, handle bounds, readiness, and missing-node result; timestamps excluded from equality',
      capturedAt: new Date().toISOString(),
    },
    cases: first,
    repeatedCaptureMatches: true,
  }

  await Bun.write(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`)
  run(['bunx', 'oxfmt', fixturePath], root)
  process.stdout.write(await Bun.file(fixturePath).text())
} finally {
  await browser.close()
  server.kill()
  await server.exited
}

import assert from 'node:assert/strict'
import path from 'node:path'

import { chromium } from '@playwright/test'
import { Schema as S } from 'effect'

declare global {
  interface Window {
    __viewportContractCapture?: string
  }
}

const expectedSha = '0a1f9575b25679f2880175de8d3eae21aedde921'

const root = path.resolve(import.meta.dir, '..')

const fixturePath = path.resolve(
  root,
  'research/fixtures/viewport-contract-reference.json'
)

const environmentPath = path.resolve(
  root,
  'research/harnesses/viewport-contract/environment.json'
)

const harnessRoot = path.resolve(root, 'research/harnesses/viewport-contract')

const port = 4194

const decode = (value: string): typeof S.Json.Type =>
  S.decodeUnknownSync(S.Json)(JSON.parse(value))

const ViewportProbeErrorSchema = S.Struct({ error: S.String })

const arg = process.argv.find((value) => value.startsWith('--checkout='))

const checkoutArg =
  arg?.slice('--checkout='.length) ??
  process.argv[process.argv.indexOf('--checkout') + 1]

if (checkoutArg === undefined || !path.isAbsolute(checkoutArg)) {
  throw new Error(
    'Usage: bun run scripts/capture-viewport-contract-reference.ts --checkout /absolute/path/to/disposable-xyflow-checkout'
  )
}

const checkout = path.resolve(checkoutArg)

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

const output = (command: string[], cwd: string): string => {
  const result = Bun.spawnSync(command, { cwd, stdout: 'pipe', stderr: 'pipe' })

  if (result.exitCode !== 0) {
    throw new Error(`Command failed (${result.exitCode}): ${command.join(' ')}`)
  }

  return new TextDecoder().decode(result.stdout).trim()
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
    const page = await browser.newPage({
      viewport: { width: 800, height: 600 },
      deviceScaleFactor: 1,
    })

    try {
      await page.goto(`http://127.0.0.1:${port}`, {
        waitUntil: 'domcontentloaded',
      })
      await page.waitForFunction(
        () => window.__viewportContractCapture !== undefined,
        { timeout: 30_000 }
      )

      const serialized = await page.evaluate(
        () => window.__viewportContractCapture
      )

      if (serialized === undefined) {
        throw new TypeError(
          'The React viewport probe did not publish a capture'
        )
      }

      const decoded = decode(serialized)

      if (S.is(ViewportProbeErrorSchema)(decoded)) {
        throw new Error(`The React viewport probe failed: ${decoded.error}`)
      }

      return decoded
    } finally {
      await page.close()
    }
  }

  const first = await captureOnce()
  const second = await captureOnce()
  assert.deepEqual(first, second, 'normalized viewport captures must be stable')

  const firstFit = S.decodeUnknownSync(S.Struct({ asymmetricFit: S.Unknown }))(
    first
  )

  assert.deepEqual(
    firstFit.asymmetricFit,
    { x: -260, y: -40, zoom: 3.4 },
    'pinned asymmetric side-padding output must match the documented contract'
  )

  const packageInfo = S.decodeUnknownSync(
    S.Struct({ version: S.optional(S.String) })
  )(
    JSON.parse(
      await Bun.file(
        path.resolve(checkout, 'packages/react/package.json')
      ).text()
    )
  )

  if (packageInfo.version === undefined) {
    throw new TypeError(
      'Could not read @xyflow/react version from package.json'
    )
  }

  const fixture = {
    metadata: {
      framework: 'React',
      package: '@xyflow/react',
      version: packageInfo.version,
      upstreamSha: expectedSha,
      normalization:
        'fixed 800x600 browser viewport; retain public API values, final viewports, boolean results, and deduplicated lifecycle event order; exclude timestamps and intermediate animation frames',
    },
    cases: first,
  }

  await Bun.write(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`)
  run(['bunx', 'oxfmt', fixturePath], root)

  const environment = {
    capturedAt: new Date().toISOString(),
    upstreamSha: expectedSha,
    checkout,
    gitStatus: 'clean before dependency install and build',
    bunVersion: Bun.version,
    platform: process.platform,
    architecture: process.arch,
    browser: 'Chromium',
    browserVersion: browser.version(),
    viewport: { width: 800, height: 600, deviceScaleFactor: 1 },
    captureRuns: 2,
    normalizedRunsEqual: true,
  }

  await Bun.write(environmentPath, `${JSON.stringify(environment, null, 2)}\n`)
  run(['bunx', 'oxfmt', environmentPath], root)
  process.stdout.write(await Bun.file(fixturePath).text())
} finally {
  await browser.close()
  server.kill()
  await server.exited
}

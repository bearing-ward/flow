import assert from 'node:assert/strict'
import path from 'node:path'

import { chromium } from '@playwright/test'
import { Schema as S } from 'effect'

declare global {
  interface Window {
    __rendererContractCapture?: string
  }
}

const expectedSha = '0a1f9575b25679f2880175de8d3eae21aedde921'

const root = path.resolve(import.meta.dir, '../..')

const fixturePath = path.resolve(
  root,
  'research/fixtures/renderer-contract-reference.json'
)

const harnessRoot = path.resolve(root, 'research/harnesses/renderer-contract')

const port = 4193

const RendererCaptureSchema = S.Struct({
  initial: S.Struct({
    nodes: S.Array(
      S.Struct({
        id: S.String,
        measured: S.Unknown,
        handles: S.Struct({
          source: S.Array(S.Unknown),
          target: S.Array(S.Unknown),
        }),
      })
    ),
    paths: S.Array(S.Struct({ kind: S.String, path: S.NullOr(S.String) })),
    customLabel: S.Boolean,
    markers: S.Array(S.Unknown),
    unknownFallback: S.Boolean,
  }),
  refreshed: S.Struct({
    measured: S.Unknown,
    output: S.Unknown,
    paths: S.Array(S.Struct({ kind: S.String, path: S.NullOr(S.String) })),
  }),
  pathKinds: S.Array(S.String),
})

const arg = process.argv.find((value) => value.startsWith('--checkout='))

const checkoutArg =
  arg?.slice('--checkout='.length) ??
  process.argv[process.argv.indexOf('--checkout') + 1]

if (checkoutArg === undefined || !path.isAbsolute(checkoutArg)) {
  throw new Error(
    'Usage: bun run scripts/capture/capture-renderer-contract-reference.ts --checkout /absolute/path/to/disposable-xyflow-checkout'
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
  const captureOnce = async (): Promise<typeof RendererCaptureSchema.Type> => {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 720 },
    })

    try {
      await page.goto(`http://127.0.0.1:${port}`, {
        waitUntil: 'domcontentloaded',
      })
      await page.waitForFunction(
        () => window.__rendererContractCapture !== undefined,
        { timeout: 30_000 }
      )

      const serialized = await page.evaluate(
        () => window.__rendererContractCapture
      )

      if (serialized === undefined) {
        throw new TypeError(
          'The React renderer probe did not publish a capture'
        )
      }

      return S.decodeUnknownSync(RendererCaptureSchema)(JSON.parse(serialized))
    } finally {
      await page.close()
    }
  }

  const first = await captureOnce()
  const second = await captureOnce()
  assert.deepEqual(first, second, 'normalized renderer captures must be stable')

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
        'fixed 1280x720 browser viewport; retain measured node/handle geometry and rendered path strings; omit generated marker ids and elapsed time',
      capturedAt: new Date().toISOString(),
    },
    cases: first,
  }

  await Bun.write(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`)
  run(['bunx', 'oxfmt', fixturePath], root)
  process.stdout.write(await Bun.file(fixturePath).text())
} finally {
  await browser.close()
  server.kill()
  await server.exited
}

import assert from 'node:assert/strict'
import path from 'node:path'

import { chromium } from '@playwright/test'
import { Schema as S } from 'effect'

declare global {
  interface Window {
    __graphEditCapture?: string
  }
}

const expectedSha = '0a1f9575b25679f2880175de8d3eae21aedde921'

const root = path.resolve(import.meta.dir, '..')

const fixturePath = path.resolve(
  root,
  'research/fixtures/graph-edit-reference.json'
)

const harnessRoot = path.resolve(root, 'research/harnesses/graph-edits')

const port = 4190

const ReferenceCaptureSchema = S.Struct({
  initial: S.String,
  add: S.String,
  setters: S.String,
  merge: S.String,
  replace: S.String,
  missing: S.String,
  delete: S.String,
})

const decodeCase = (serialized: string): typeof S.Json.Type =>
  S.decodeUnknownSync(S.Json)(JSON.parse(serialized))

const arg = process.argv.find((value) => value.startsWith('--checkout='))

const checkoutArg =
  arg?.slice('--checkout='.length) ??
  process.argv[process.argv.indexOf('--checkout') + 1]

if (checkoutArg === undefined || !path.isAbsolute(checkoutArg)) {
  throw new Error(
    'Usage: bun run scripts/capture-graph-edit-reference.ts --checkout /absolute/path/to/disposable-xyflow-checkout'
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
    const page = await browser.newPage()

    try {
      await page.goto(`http://127.0.0.1:${port}`, {
        waitUntil: 'domcontentloaded',
      })
      await page.waitForFunction(
        () => window.__graphEditCapture !== undefined,
        {
          timeout: 30_000,
        }
      )

      const capture = await page.evaluate(() => window.__graphEditCapture)

      if (capture === undefined) {
        throw new Error('The React reference probe did not publish a capture')
      }

      const decoded = S.decodeUnknownSync(ReferenceCaptureSchema)(
        JSON.parse(capture)
      )

      return {
        initial: decodeCase(decoded.initial),
        add: decodeCase(decoded.add),
        setters: decodeCase(decoded.setters),
        merge: decodeCase(decoded.merge),
        replace: decodeCase(decoded.replace),
        missing: decodeCase(decoded.missing),
        delete: decodeCase(decoded.delete),
      }
    } finally {
      await page.close()
    }
  }

  const first = await captureOnce()
  const second = await captureOnce()

  assert.deepEqual(
    first,
    second,
    'normalized pinned reference captures must be stable'
  )

  const packageInfoText = await Bun.file(
    path.resolve(checkout, 'packages/react/package.json')
  ).text()

  const packageVersion = packageInfoText.match(
    /"version":\s*"(?<version>[^"]+)"/u
  )?.groups?.version

  if (packageVersion === undefined) {
    throw new Error(
      'Could not read @xyflow/react version from its package manifest'
    )
  }

  const fixture = {
    metadata: {
      framework: 'React',
      package: '@xyflow/react',
      version: packageVersion,
      upstreamSha: expectedSha,
      normalization:
        'timestamps and renderer-measured node geometry excluded; API outputs retain array order',
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

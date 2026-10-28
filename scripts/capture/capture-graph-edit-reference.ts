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

const root = path.resolve(import.meta.dir, '../..')

const fixturePath = path.resolve(
  root,
  'research/fixtures/graph-edit-reference.json'
)

const selectedFixturePath = path.resolve(
  root,
  'research/fixtures/graph-edit-selected-reference.json'
)

const harnessRoot = path.resolve(root, 'research/harnesses/graph-edits')

const port = 4190

const ReferenceCaptureSchema = S.Struct({
  utilities: S.String,
  controlledDeletion: S.String,
  initial: S.String,
  add: S.String,
  setters: S.String,
  merge: S.String,
  replace: S.String,
  missing: S.String,
  delete: S.String,
})

const UtilityCaptureSchema = S.Struct({
  applyNodeChanges: S.Array(S.Json),
  addEdgeDuplicate: S.Array(S.Json),
  reconnectEdge: S.Array(S.Json),
})

const ControlledDeletionSchema = S.Struct({
  events: S.Array(S.String),
  result: S.Struct({ nodes: S.Array(S.String), edges: S.Array(S.String) }),
  owner: S.Struct({ nodes: S.Array(S.String), edges: S.Array(S.String) }),
})

const NormalizedCaptureSchema = S.Struct({
  utilities: UtilityCaptureSchema,
  initial: S.Json,
  add: S.Json,
  setters: S.Json,
  merge: S.Json,
  replace: S.Json,
  missing: S.Json,
  delete: S.Json,
})

const arg = process.argv.find((value) => value.startsWith('--checkout='))

const checkoutArg =
  arg?.slice('--checkout='.length) ??
  process.argv[process.argv.indexOf('--checkout') + 1]

if (checkoutArg === undefined || !path.isAbsolute(checkoutArg)) {
  throw new Error(
    'Usage: bun run scripts/capture/capture-graph-edit-reference.ts --checkout /absolute/path/to/disposable-xyflow-checkout'
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
  const captureOnce = async (): Promise<
    typeof NormalizedCaptureSchema.Type
  > => {
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

      return S.decodeUnknownSync(NormalizedCaptureSchema)({
        utilities: JSON.parse(decoded.utilities),
        initial: JSON.parse(decoded.initial),
        add: JSON.parse(decoded.add),
        setters: JSON.parse(decoded.setters),
        merge: JSON.parse(decoded.merge),
        replace: JSON.parse(decoded.replace),
        missing: JSON.parse(decoded.missing),
        delete: JSON.parse(decoded.delete),
      })
    } finally {
      await page.close()
    }
  }

  const captureControlledDeletionOnce = async (): Promise<
    typeof ControlledDeletionSchema.Type
  > => {
    const page = await browser.newPage()

    try {
      await page.goto(`http://127.0.0.1:${port}/?case=delete-controlled`, {
        waitUntil: 'domcontentloaded',
      })
      await page.waitForFunction(
        () => window.__graphEditCapture !== undefined,
        { timeout: 30_000 }
      )
      const capture = await page.evaluate(() => window.__graphEditCapture)

      if (capture === undefined) {
        throw new Error(
          'The controlled deletion probe did not publish a capture'
        )
      }

      return S.decodeUnknownSync(ControlledDeletionSchema)(JSON.parse(capture))
    } finally {
      await page.close()
    }
  }

  const first = await captureOnce()
  const second = await captureOnce()
  const firstControlledDeletion = await captureControlledDeletionOnce()
  const secondControlledDeletion = await captureControlledDeletionOnce()

  assert.deepEqual(
    first,
    second,
    'normalized pinned reference captures must be stable'
  )
  assert.deepEqual(
    firstControlledDeletion,
    secondControlledDeletion,
    'normalized controlled deletion captures must be stable'
  )

  const selectedCases = {
    applyNodeChanges: first.utilities.applyNodeChanges,
    addEdgeDuplicate: first.utilities.addEdgeDuplicate,
    reconnectEdge: first.utilities.reconnectEdge,
    controlledDeletion: firstControlledDeletion,
  }

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
        'timestamps and renderer-measured node geometry excluded; API outputs retain array order; callback and change event order retained',
      capturedAt: new Date().toISOString(),
    },
    cases: {
      ...first,
      controlledDeletion: firstControlledDeletion,
    },
  }

  await Bun.write(fixturePath, `${JSON.stringify(fixture, null, 2)}\n`)
  await Bun.write(
    selectedFixturePath,
    `${JSON.stringify(
      {
        metadata: fixture.metadata,
        cases: selectedCases,
      },
      null,
      2
    )}\n`
  )
  run(['bunx', 'oxfmt', fixturePath], root)
  run(['bunx', 'oxfmt', selectedFixturePath], root)
  process.stdout.write(await Bun.file(fixturePath).text())
} finally {
  await browser.close()
  server.kill()
  await server.exited
}

import assert from 'node:assert/strict'
import path from 'node:path'

import { chromium } from '@playwright/test'
import { Schema as S } from 'effect'

import {
  ApiUtilityReferenceCasesSchema,
  ApiUtilityReferenceFixtureSchema,
  pinnedApiUtilityReferenceSha,
} from '../api-utility-reference-schema.ts'

declare global {
  interface Window {
    __apiUtilityCapture?: string
  }
}

const expectedSha = pinnedApiUtilityReferenceSha

const root = path.resolve(import.meta.dir, '../..')

const checkoutArg =
  process.argv
    .find((value) => value.startsWith('--checkout='))
    ?.slice('--checkout='.length) ??
  process.argv[process.argv.indexOf('--checkout') + 1]

if (checkoutArg === undefined || !path.isAbsolute(checkoutArg)) {
  throw new Error(
    'Usage: bun run scripts/capture/capture-api-utility-reference.ts --checkout /absolute/path/to/disposable-xyflow-checkout'
  )
}

const checkout = path.resolve(checkoutArg)

const fixturePath = path.resolve(
  root,
  'research/fixtures/api-utility-reference.json'
)

const harnessRoot = path.resolve(root, 'research/harnesses/api-utilities')

const port = 4194

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
  const url = `http://127.0.0.1:${port}/`

  const waitForServer = async (attempt = 0): Promise<void> => {
    if (server.exitCode !== null) {
      throw new Error(
        `Vite exited before capture with status ${server.exitCode}`
      )
    }

    try {
      const response = await fetch(url)

      if (response.ok) {
        return
      }
    } catch {
      // The strict-port server is still starting.
    }

    if (attempt >= 100) {
      throw new Error(`Vite did not become ready at ${url}`)
    }

    await Bun.sleep(100)

    return waitForServer(attempt + 1)
  }

  await waitForServer()

  const captureOnce = async (): Promise<typeof S.Json.Type> => {
    const page = await browser.newPage()
    const diagnostics: string[] = []
    page.on('pageerror', (error) => diagnostics.push(error.message))
    page.on('console', (message) => {
      if (message.type() === 'error') {
        diagnostics.push(message.text())
      }
    })

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded' })
      await page.waitForFunction(
        () => window.__apiUtilityCapture !== undefined,
        undefined,
        { timeout: 30_000 }
      )
      const serialized = await page.evaluate(() => window.__apiUtilityCapture)

      if (serialized === undefined) {
        throw new Error('The React API utility probe did not publish a capture')
      }

      return S.decodeUnknownSync(S.Json)(
        S.decodeUnknownSync(ApiUtilityReferenceCasesSchema)(
          JSON.parse(serialized)
        )
      )
    } catch (error) {
      throw new Error(
        `Pinned API utility capture failed. Browser diagnostics: ${diagnostics.join(' | ') || 'none'}. Cause: ${String(error)}`,
        { cause: error }
      )
    } finally {
      await page.close()
    }
  }

  const first = await captureOnce()
  const second = await captureOnce()
  assert.deepEqual(first, second, 'normalized pinned captures must be stable')

  const packageInfo = S.decodeUnknownSync(S.Struct({ version: S.String }))(
    JSON.parse(
      await Bun.file(
        path.resolve(checkout, 'packages/react/package.json')
      ).text()
    )
  )

  const fixture = S.decodeUnknownSync(ApiUtilityReferenceFixtureSchema)({
    metadata: {
      framework: 'React',
      package: '@xyflow/react',
      version: packageInfo.version,
      upstreamSha: expectedSha,
      browser: `Chromium ${browser.version()}`,
      normalization:
        'fixed utility inputs and ids; timestamps, DOM geometry, and generated data excluded; callback order and array order retained',
      capturedAt: new Date().toISOString(),
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

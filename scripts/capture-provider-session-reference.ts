import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import path from 'node:path'

import { chromium } from '@playwright/test'
import { Schema as S } from 'effect'

declare global {
  interface Window {
    __providerSessionCapture?: string
    __providerInitializationProgress?: string
  }
}

const expectedSha = '0a1f9575b25679f2880175de8d3eae21aedde921'

const root = path.resolve(import.meta.dir, '..')

const checkoutArg = process.argv.find((value) =>
  value.startsWith('--checkout=')
)

const checkout =
  checkoutArg?.slice('--checkout='.length) ??
  process.argv[process.argv.indexOf('--checkout') + 1]

if (checkout === undefined || !path.isAbsolute(checkout)) {
  throw new Error('Pass --checkout /absolute/path/to/pinned-xyflow-checkout')
}

const run = (command: string[], cwd: string) => {
  const result = Bun.spawnSync(command, {
    cwd,
    stdout: 'inherit',
    stderr: 'inherit',
  })

  if (result.exitCode !== 0) {
    throw new Error(`Command failed (${result.exitCode}): ${command.join(' ')}`)
  }
}

const output = (command: string[], cwd: string) => {
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

const harness = path.resolve(root, 'research/harnesses/provider-session')

const server = Bun.spawn(
  [
    path.resolve(root, 'node_modules/.bin/vite'),
    '--config',
    path.resolve(harness, 'vite.config.ts'),
    '--host',
    '127.0.0.1',
    '--port',
    '4191',
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

const browser = await chromium.launch({ headless: true })

try {
  const deadline = Date.now() + 30_000

  const waitForServer = async (): Promise<void> => {
    if (server.exitCode !== null) {
      throw new Error(`Provider capture server exited (${server.exitCode})`)
    }

    try {
      const response = await fetch('http://127.0.0.1:4191')

      if (response.ok) {
        return
      }
    } catch {
      // Vite has not opened its strict port yet.
    }

    if (Date.now() >= deadline) {
      throw new Error('Provider capture server readiness timed out')
    }

    await Bun.sleep(100)

    return waitForServer()
  }

  await waitForServer()

  const capture = async () => {
    const page = await browser.newPage()
    page.on('pageerror', (error) =>
      process.stderr.write(`${error.stack ?? error.message}\n`)
    )

    try {
      await page.goto('http://127.0.0.1:4191', {
        waitUntil: 'domcontentloaded',
      })

      try {
        await page.waitForFunction(
          () => window.__providerSessionCapture !== undefined,
          undefined,
          { timeout: 30_000 }
        )
      } catch (error) {
        const progress = await page.evaluate(
          () => window.__providerInitializationProgress
        )

        process.stderr.write(
          `Provider initialization progress: ${progress ?? 'not published'}\n`
        )
        throw error
      }

      const value = await page.evaluate(() => window.__providerSessionCapture)

      if (value === undefined) {
        throw new Error('Provider/session probe did not publish')
      }

      return S.decodeUnknownSync(S.Json)(JSON.parse(value))
    } finally {
      await page.close()
    }
  }

  const first = await capture()
  const second = await capture()
  assert.deepEqual(
    first,
    second,
    'normalized pinned provider/session capture must be stable'
  )

  const captureRunDigests = [first, second].map((runResult) =>
    createHash('sha256').update(JSON.stringify(runResult)).digest('hex')
  )

  assert.equal(captureRunDigests[0], captureRunDigests[1])

  const manifest = S.decodeUnknownSync(S.Struct({ version: S.String }))(
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
      version: manifest.version,
      upstreamSha: expectedSha,
      captureRuns: 2,
      captureRunDigests,
      normalizedSha256: captureRunDigests[0],
      capturedAt: new Date().toISOString(),
      normalization:
        'capturedAt excluded from repeated comparison; measured node geometry omitted; ordered node and edge projections retained; provider-only and eight-frame stable settled controlled-child observations separated',
    },
    cases: first,
  }

  const target = path.resolve(
    root,
    'research/fixtures/provider-session-reference.json'
  )

  await Bun.write(target, `${JSON.stringify(fixture, null, 2)}\n`)
  run(['bunx', 'oxfmt', target], root)
  process.stdout.write(await Bun.file(target).text())
} finally {
  await browser.close()
  server.kill()
  await server.exited
}

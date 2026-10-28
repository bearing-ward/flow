import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

import { Schema as S } from 'effect'

import {
  CaptureSchema,
  pathCases,
} from '../../research/harnesses/path-helper/cases.ts'

const expectedSha = '0a1f9575b25679f2880175de8d3eae21aedde921'

const root = path.resolve(import.meta.dir, '../..')

const arg = process.argv.find((value) => value.startsWith('--checkout='))

const checkoutArg =
  arg?.slice('--checkout='.length) ??
  process.argv[process.argv.indexOf('--checkout') + 1]

if (checkoutArg === undefined || !path.isAbsolute(checkoutArg)) {
  throw new TypeError('Expected --checkout /absolute/disposable/xyflow')
}

const checkout = path.resolve(checkoutArg)

const run = (command: string[], cwd = root): string => {
  const result = Bun.spawnSync(command, { cwd, stdout: 'pipe', stderr: 'pipe' })
  process.stderr.write(new TextDecoder().decode(result.stderr))

  if (result.exitCode !== 0) {
    throw new Error(
      `Command failed (${result.exitCode}): ${command.join(' ')}\n${new TextDecoder().decode(result.stdout)}`
    )
  }

  return new TextDecoder().decode(result.stdout)
}

assert.equal(run(['git', 'rev-parse', 'HEAD'], checkout).trim(), expectedSha)

assert.equal(
  run(
    ['git', 'status', '--porcelain', '--untracked-files=all'],
    checkout
  ).trim(),
  ''
)

const packageInfo = S.decodeUnknownSync(
  S.Struct({ name: S.String, version: S.String })
)(await Bun.file(path.join(checkout, 'packages/react/package.json')).json())

assert.equal(packageInfo.name, '@xyflow/react')

assert.equal(packageInfo.version, '12.11.6')

const trackedPaths = run(['git', 'ls-files', '-z'], checkout)
  .split('\0')
  .filter(Boolean)

const trackedHashes = () =>
  Promise.all(
    trackedPaths.map(async (file) => ({
      path: file,
      sha256: createHash('sha256')
        .update(
          new Uint8Array(
            await Bun.file(path.join(checkout, file)).arrayBuffer()
          )
        )
        .digest('hex'),
    }))
  )

const before = await trackedHashes()

for (const args of [
  ['install', '--frozen-lockfile'],
  ['--filter', '@xyflow/system', 'build'],
  ['--filter', '@xyflow/react', 'build'],
]) {
  process.stderr.write(
    run(['corepack', 'pnpm@10.33.4', '--dir', checkout, ...args])
  )
}

assert.equal(run(['git', 'diff', '--name-only'], checkout).trim(), '')

assert.deepEqual(await trackedHashes(), before)

const moduleUrl = pathToFileURL(
  path.join(checkout, 'packages/react/dist/esm/index.js')
).href

const captureOnce = () =>
  S.decodeUnknownSync(CaptureSchema)(
    JSON.parse(
      run([
        'bun',
        path.join(root, 'research/harnesses/path-helper/main.ts'),
        moduleUrl,
      ])
    )
  )

const first = captureOnce()

const second = captureOnce()

assert.deepEqual(
  first,
  second,
  'Two fresh upstream capture processes must agree'
)

const fixture = {
  metadata: {
    upstreamSha: expectedSha,
    package: packageInfo.name,
    version: packageInfo.version,
    method: 'two fresh Bun processes importing built upstream public exports',
    manifestSha256: createHash('sha256')
      .update(JSON.stringify(pathCases))
      .digest('hex'),
    twoProcessEqual: true,
    normalization:
      'finite numbers, Number.NaN, positive/negative Infinity, negative zero, undefined, null and strings tagged; exceptions retain category only; complete tuples retained',
    capturedAt: new Date().toISOString(),
  },
  cases: first,
}

const evidenceArg = process.argv
  .find((value) => value.startsWith('--evidence='))
  ?.slice('--evidence='.length)

if (evidenceArg !== undefined) {
  await Bun.write(
    path.join(evidenceArg, 'upstream-tracked-before.json'),
    `${JSON.stringify(before, null, 2)}\n`
  )
  await Bun.write(
    path.join(evidenceArg, 'upstream-capture-first.json'),
    `${JSON.stringify(first, null, 2)}\n`
  )
  await Bun.write(
    path.join(evidenceArg, 'upstream-capture-second.json'),
    `${JSON.stringify(second, null, 2)}\n`
  )
  await Bun.write(
    path.join(evidenceArg, 'upstream-tracked-after.json'),
    `${JSON.stringify(await trackedHashes(), null, 2)}\n`
  )
}

await Bun.write(
  path.join(root, 'research/fixtures/path-helper-reference.json'),
  `${JSON.stringify(fixture, null, 2)}\n`
)

process.stdout.write(
  `${JSON.stringify({ cases: first.length, ...fixture.metadata })}\n`
)

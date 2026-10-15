import { spawn } from 'node:child_process'
import { createHash } from 'node:crypto'
import { cp, mkdtemp, readFile, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { basename, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = fileURLToPath(new URL('../../../', import.meta.url))
const destination = await mkdtemp(join(tmpdir(), 'chartdb-flow-verify-'))
const originalConfig = await readFile(join(root, 'verification.config.json'))
const skipped = new Set([
  '.git',
  'node_modules',
  'dist',
  'test-results',
  'playwright-report',
])
await cp(root, destination, {
  recursive: true,
  filter: (source) => !skipped.has(basename(source)),
})
await cp(join(root, '.git'), join(destination, '.git'), { recursive: true })
const config = {
  defaultProfile: 'focused',
  activeWork: 'Plan 121 ChartDB reference capture, with no Flow browser suites',
  checks: [],
  browserTests: { vanilla: [], vue: [], foldkit: [] },
}
await writeFile(
  join(destination, 'verification.config.json'),
  `${JSON.stringify(config, null, 2)}\n`
)
const run = (command, args, cwd) =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd,
      env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
    })
    let log = ''
    child.stdout.on('data', (bytes) => {
      process.stdout.write(bytes)
      log += bytes
    })
    child.stderr.on('data', (bytes) => {
      process.stderr.write(bytes)
      log += bytes
    })
    child.on('error', reject)
    child.on('close', (code) => resolve({ code, log }))
  })
// Check the actual worktree too; the verifier checks the copied tree with explicit scope and any recorded baseline exception.
const install = await run('bun', ['install', '--frozen-lockfile'], destination)
if (install.code !== 0) process.exit(install.code ?? 1)
const quality = await run('bun', ['run', 'check'], root)
let baselineException = null
if (quality.code !== 0) {
  if (!process.argv.includes('--normalize-baseline-plan'))
    process.exit(quality.code ?? 1)
  const plan = 'plans/121-schema-studio-vanilla.md'
  const original = await readFile(join(root, plan), 'utf8')
  const expected = original.replace(
    'add:\n- a node toolbar',
    'add:\n\n- a node toolbar'
  )
  if (expected === original)
    throw new Error('The known baseline formatting exception does not match')
  const lint = await run('bun', ['run', 'lint'], root)
  const format = await run(
    'bun',
    ['run', 'oxfmt', '--check', '.', `!${plan}`],
    root
  )
  if (lint.code !== 0 || format.code !== 0)
    throw new Error('Quality failed outside the one known baseline file')
  const normalized = await run('bun', ['run', 'oxfmt', plan], destination)
  if (
    normalized.code !== 0 ||
    (await readFile(join(destination, plan), 'utf8')) !== expected
  )
    throw new Error('Normalization changed more than the known blank line')
  baselineException = {
    path: plan,
    change: 'one missing blank line before a list',
    normalizedInTemporaryCopyOnly: true,
    rootLintExitCode: lint.code,
    rootFormatExcludingThisPlanExitCode: format.code,
  }
}
const result = await run('bun', ['run', 'verify', '--focused'], destination)
const currentConfig = await readFile(join(root, 'verification.config.json'))
if (!originalConfig.equals(currentConfig))
  throw new Error('Original verification scope changed during the run')
await writeFile(
  new URL('results/verification.log', import.meta.url),
  quality.log + result.log
)
await writeFile(
  new URL('results/verification-scope.json', import.meta.url),
  `${JSON.stringify(
    {
      command: 'bun run verify --focused',
      cwd: destination,
      config,
      exitCode: result.code,
      originalConfigSha256: createHash('sha256')
        .update(originalConfig)
        .digest('hex'),
      originalWorktreeQualityExitCode: quality.code,
      baselineException,
      reason:
        'The pinned verifier merges configured browser scope and has no skip or alternate-config CLI. This copy changes verification scope and, when explicitly requested, the documented baseline formatting exception. The original verification config and plan remain unchanged.',
    },
    null,
    2
  )}\n`
)
process.exitCode = result.code ?? 1

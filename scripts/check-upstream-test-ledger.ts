import { readFile, writeFile } from 'node:fs/promises'

import { Schema as S } from 'effect'

import { enumerateUpstreamCases } from './upstream-test-cases.ts'

const resultSchema = S.Union([
  S.Struct({ status: S.Literals(['pass', 'not-ported']) }),
  S.Struct({
    status: S.Literals(['fail', 'intentional-difference', 'not-applicable']),
    reason: S.NonEmptyString,
  }),
])

const ledgerSchema = S.Struct({
  revision: S.Literal('3d35b57317576b0916c0bfeaaedd573aaacc2839'),
  unmappedProps: S.Array(
    S.Struct({
      host: S.Literals(['vanilla', 'vue', 'foldkit']),
      config: S.NonEmptyString,
      upstream: S.NonEmptyString,
      prop: S.NonEmptyString,
      reason: S.NonEmptyString,
    })
  ),
  cases: S.Array(
    S.Struct({
      id: S.NonEmptyString,
      upstream: S.NonEmptyString,
      title: S.NonEmptyString,
      phase: S.Literals([126, 127, 128]),
      guards: S.Array(
        S.Struct({
          upstream: S.NonEmptyString,
          condition: S.NonEmptyString,
          reason: S.NonEmptyString,
        })
      ),
      hosts: S.Struct({
        vanilla: resultSchema,
        vue: resultSchema,
        foldkit: resultSchema,
      }),
      reference: S.Struct({
        status: S.Literals(['pass', 'fail', 'not-run']),
        reason: S.NonEmptyString,
      }),
      flowTest: S.NullOr(S.NonEmptyString),
    })
  ),
})

const ledger = S.decodeUnknownSync(ledgerSchema)(
  JSON.parse(
    await readFile('research/catalogs/upstream-test-ledger.json', 'utf-8')
  )
)

const upstream = await enumerateUpstreamCases()

const portPaths = [
  ...new Set(
    ledger.cases.flatMap((entry) =>
      entry.flowTest === null
        ? []
        : [entry.flowTest.slice(0, entry.flowTest.lastIndexOf(':'))]
    )
  ),
]

const portSources = new Map(
  await Promise.all(
    portPaths.map(async (path) => {
      const text = await readFile(path, 'utf-8')

      return [path, text] satisfies [string, string]
    })
  )
)

// Refresh declaration lines after formatting without changing recorded outcomes.
if (process.argv.includes('--refresh-port-locations')) {
  const cases = ledger.cases.map((entry) => {
    if (entry.flowTest === null) {
      return entry
    }

    const path = entry.flowTest.slice(0, entry.flowTest.lastIndexOf(':'))
    const source = portSources.get(path)

    const line = source
      ?.split('\n')
      .findIndex((text) => text.includes(`[${entry.id}]`))

    if (line === undefined || line < 0) {
      throw new Error(`Missing declaration: ${entry.id}`)
    }

    return { ...entry, flowTest: `${path}:${line + 1}` }
  })

  await writeFile(
    'research/catalogs/upstream-test-ledger.json',
    `${JSON.stringify({ revision: ledger.revision, cases, unmappedProps: ledger.unmappedProps }, null, 2)}\n`
  )
  process.exit(0)
}

const actual = new Map(ledger.cases.map((entry) => [entry.upstream, entry]))

if (actual.size !== ledger.cases.length) {
  throw new Error('Duplicate upstream case in ledger')
}

if (actual.size !== upstream.length) {
  throw new Error(
    `Upstream ledger drift: expected ${upstream.length}, found ${actual.size}`
  )
}

for (const entry of upstream) {
  const saved = actual.get(entry.upstream)

  if (
    saved === undefined ||
    saved.id !== entry.id ||
    saved.title !== entry.title ||
    saved.phase !== entry.phase ||
    JSON.stringify(saved.guards) !== JSON.stringify(entry.guards)
  ) {
    throw new Error(`Upstream ledger drift: ${entry.upstream}`)
  }

  for (const host of ['vanilla', 'vue', 'foldkit'] as const) {
    const result = saved.hosts[host]

    if (result.status === 'not-ported') {
      throw new Error(`Required phase case is not ported: ${entry.id}`)
    }

    if (
      result.status === 'intentional-difference' &&
      !/[^\s]+:\d+/u.test(result.reason)
    ) {
      throw new Error(`Missing deviation citation: ${entry.id}/${host}`)
    }
  }

  if (saved.flowTest === null) {
    throw new Error(`Missing port: ${entry.id}`)
  }

  const match = /^(?<file>.+):(?<line>\d+)$/u.exec(saved.flowTest)

  if (match?.[1] === undefined || match[2] === undefined) {
    throw new Error(`Invalid port location: ${entry.id}`)
  }

  const text = portSources.get(match[1])

  if (text === undefined) {
    throw new Error(`Missing port file: ${match[1]}`)
  }

  const line = text.split('\n')[Number(match[2]) - 1]

  if (line === undefined || !line.includes(`[${entry.id}]`)) {
    throw new Error(`Stale port line: ${saved.flowTest}`)
  }
}

console.info(
  `Upstream ledger: ${ledger.cases.length} executable tests; inline guards are parent metadata`
)

console.info(
  'phase | host | pass | intentional-difference | fail | not-applicable | not-ported'
)

for (const phase of [126, 127, 128]) {
  for (const host of ['vanilla', 'vue', 'foldkit'] as const) {
    const entries = ledger.cases.filter((entry) => entry.phase === phase)

    const counts = [
      'pass',
      'intentional-difference',
      'fail',
      'not-applicable',
      'not-ported',
    ].map(
      (status) =>
        entries.filter((entry) => entry.hosts[host].status === status).length
    )

    console.info(`${phase} | ${host} | ${counts.join(' | ')}`)
  }
}

console.info('phase | react reference | pass | fail | not-run')

for (const phase of [126, 127, 128]) {
  const entries = ledger.cases.filter((entry) => entry.phase === phase)
  console.info(
    `${phase} | react reference | ${['pass', 'fail', 'not-run'].map((status) => entries.filter((entry) => entry.reference.status === status).length).join(' | ')}`
  )
}

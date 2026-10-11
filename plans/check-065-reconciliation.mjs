import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'

const readJson = (file) => JSON.parse(readFileSync(file, 'utf-8'))

const audit = readJson('plans/065-member-reconciliation.json')

const closure = readJson('plans/057-member-closure.json')

const groups = closure.groups.filter((group) => group.ownerPlan === '065')

const groupIds = new Set(groups.map((group) => group.id))

const cells = closure.cells.filter((cell) => groupIds.has(cell.contractId))

const key = (record) => JSON.stringify([record.page, record.member])

const original = groups.flatMap((group) =>
  group.members.map((member) => ({ page: group.page, member }))
)

assert.equal(new Set(audit.members.map(key)).size, audit.members.length)

assert.deepEqual(
  audit.members.map(key).toSorted(),
  original.map(key).toSorted()
)

assert.equal(audit.counts.groups, groups.length)

assert.equal(audit.counts.members, original.length)

assert.equal(audit.counts.hostCells, cells.length)

assert.equal(groups.length, 5)

assert.equal(original.length, 63)

assert.equal(cells.length, 189)

// Retain the exact original identities, even if audit and closure drift together.
assert.equal(
  createHash('sha256')
    .update(JSON.stringify(original.map(key).toSorted()))
    .digest('hex'),
  '0e4e71da384639b5017025ae5477b5d5f586ab46c2358d63c04309642b72c865'
)

const counts = (values) => {
  const result = {}

  for (const value of values) {
    result[value] = (result[value] ?? 0) + 1
  }

  return result
}

assert.deepEqual(audit.counts.states, counts(cells.map((cell) => cell.state)))

assert.deepEqual(
  audit.counts.families,
  counts(audit.members.map((member) => member.mapping))
)

for (const record of audit.members) {
  assert.ok(Object.hasOwn(audit.mappings, record.mapping))

  const matching = cells.filter(
    (cell) => key(cell) === key(record) && cell.contractId === record.contractId
  )

  assert.equal(matching.length, 3)

  assert.deepEqual(
    record.hostStates,
    Object.fromEntries(matching.map((cell) => [cell.host, cell.state]))
  )

  for (const cell of matching) {
    assert.equal(record.acceptance.classification, cell.state)

    if (cell.state === 'reviewed-native-difference') {
      assert.equal(
        record.acceptance.architectureReview,
        cell.review.architectureReview
      )
    }
  }
}

const citations = [
  ...Object.values(audit.mappings).flatMap((mapping) => [
    ...mapping.source,
    ...mapping.productionTest,
    ...mapping.reference,
  ]),
  ...audit.members.flatMap((member) => [
    ...member.acceptance.reference,
    ...member.acceptance.publicAssertions,
    member.acceptance.architectureReview,
    ...Object.values(member.acceptance.installedProbes),
  ]),
]

for (const citation of citations) {
  const match = /^(?<file>.*):(?<start>\d+)-(?<end>\d+)$/u.exec(citation)

  assert.ok(match?.groups, `Invalid local citation: ${citation}`)

  const { file, start, end } = match.groups

  const lines = readFileSync(file, 'utf-8').trimEnd().split('\n').length

  assert.ok(Number(start) > 0 && Number(start) <= Number(end))

  assert.ok(Number(end) <= lines, `Citation exceeds file: ${citation}`)
}

const unresolved = cells.filter((cell) =>
  ['implementation-gap', 'evidence-gap'].includes(cell.state)
).length

if (process.argv.includes('--require-closed')) {
  assert.equal(unresolved, 0, 'Plan 065 owned acceptance cells remain open')
}

process.stdout.write(
  `Plan 065: ${groups.length} groups, ${original.length} members, ${cells.length} host cells preserved; ${unresolved} unresolved owned cells. Accounting and citations only; primary semantic review remains required.\n`
)

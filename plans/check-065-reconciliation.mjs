import assert from 'node:assert/strict'
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
}

for (const mapping of Object.values(audit.mappings)) {
  for (const citation of [
    ...mapping.source,
    ...mapping.productionTest,
    ...mapping.reference,
  ]) {
    const match = /^(?<file>.*):(?<start>\d+)-(?<end>\d+)$/u.exec(citation)

    assert.ok(match?.groups, `Invalid local citation: ${citation}`)

    const { file, start, end } = match.groups

    const lines = readFileSync(file, 'utf-8').trimEnd().split('\n').length

    assert.ok(Number(start) > 0 && Number(start) <= Number(end))

    assert.ok(Number(end) <= lines, `Citation exceeds file: ${citation}`)
  }
}

process.stdout.write(
  `Plan 065: ${groups.length} groups, ${original.length} members, ${cells.length} host cells preserved. Citation ranges exist; semantic closure remains open.\n`
)

// bun plans/066-decompose-members.mjs --check | --write
// Explicit routing only. New or removed members stop; existing proof is preserved.
import { Schema as S } from 'effect'

import { MemberClosureSchema } from '../scripts/check-api-member-contracts.ts'
import { ApiMemberCatalogSchema } from '../scripts/check-api-members.ts'

const root = new URL('../', import.meta.url)

const requested = Bun.argv.slice(2)

if (requested.length !== 1 || !['--check', '--write'].includes(requested[0])) {
  throw new Error('Use exactly --check or --write')
}

const routing = S.decodeUnknownSync(MemberClosureSchema)({
  ...(await Bun.file(new URL('plans/066-member-routing.json', root)).json()),
  version: 1,
  cells: [],
})

const catalog = S.decodeUnknownSync(ApiMemberCatalogSchema)(
  await Bun.file(new URL('research/catalogs/api-members.json', root)).json()
)

const destination = Bun.file(new URL('plans/057-member-closure.json', root))

const previous = (await destination.exists())
  ? S.decodeUnknownSync(MemberClosureSchema)(await destination.json())
  : undefined

const hosts = ['vanilla', 'vue', 'foldkit']

const original = new Map(
  catalog.pages.flatMap((page) =>
    page.members.map((member) => [
      JSON.stringify([page.url, member.id]),
      member,
    ])
  )
)

const assignments = new Map()

for (const group of routing.groups) {
  for (const member of group.members) {
    const identity = JSON.stringify([group.page, member])

    if (assignments.has(identity)) {
      throw new Error(`Duplicate explicit assignment: ${identity}`)
    }

    assignments.set(identity, group)
  }
}

const sameKeys = (left, right) =>
  left.size === right.size &&
  [...left.keys()].every((identity) => right.has(identity))

if (!sameKeys(assignments, original)) {
  throw new Error(
    'Unmapped/new or dropped original requirements; review routing explicitly'
  )
}

if (
  routing.baseline.members !== original.size ||
  routing.baseline.cells !== original.size * hosts.length
) {
  throw new Error('Frozen original accounting differs')
}

if (
  routing.baseline.capturedOn !== catalog.capturedOn ||
  catalog.pages.some(
    (page) => page.pinnedSourceRevision !== routing.baseline.pinnedRevision
  )
) {
  throw new Error('Dated/pinned baseline changed; review drift separately')
}

const oldCells = new Map()

for (const cell of previous?.cells ?? []) {
  const identity = JSON.stringify([cell.page, cell.member, cell.host])

  if (oldCells.has(identity)) {
    throw new Error(`Duplicate previous proof identity: ${identity}`)
  }

  oldCells.set(identity, cell)
}

const expected = new Map(
  catalog.pages.flatMap((page) =>
    page.members.flatMap((member) =>
      hosts.map((host) => [JSON.stringify([page.url, member.id, host]), true])
    )
  )
)

if (previous !== undefined && !sameKeys(expected, oldCells)) {
  throw new Error(
    'Existing closure dropped/added a cell; repair explicitly before regeneration'
  )
}

const cells = []

for (const page of catalog.pages) {
  for (const member of page.members) {
    const group = assignments.get(JSON.stringify([page.url, member.id]))

    for (const host of hosts) {
      const identity = JSON.stringify([page.url, member.id, host])
      const old = oldCells.get(identity)

      if (old !== undefined) {
        if (old.contractId !== group.id) {
          throw new Error(`Owner/group changed for existing proof: ${identity}`)
        }

        cells.push(old)
        continue
      }

      const hasImplementation = member.hosts[host].evidence.some(
        (evidence) => evidence.kind === 'implementation'
      )

      cells.push({
        page: page.url,
        member: member.id,
        host,
        contractId: group.id,
        decision: `${member.id} requires ${group.obligation} Original ${host} inventory status is ${member.hosts[host].status}.`,
        state: hasImplementation ? 'evidence-gap' : 'implementation-gap',
      })
    }
  }
}

const result = S.decodeUnknownSync(MemberClosureSchema)({
  version: 1,
  baseline: routing.baseline,
  groups: routing.groups,
  cells,
})

if (requested[0] === '--check') {
  if (JSON.stringify(previous) !== JSON.stringify(result)) {
    throw new Error(
      'Decomposition differs from explicit routing; review drift before --write'
    )
  }

  console.log(
    `Reproducible decomposition: ${original.size} members, ${cells.length} cells, ${routing.groups.length} groups; prior proof records preserved`
  )
} else {
  await Bun.write(destination, `${JSON.stringify(result, null, 2)}\n`)

  const formatter = Bun.spawn(['bunx', 'oxfmt', destination.name], {
    stdout: 'inherit',
    stderr: 'inherit',
  })

  if ((await formatter.exited) !== 0) {
    throw new Error('Manifest formatting failed')
  }

  console.log(`Wrote ${cells.length} cells; prior proof records preserved`)
}

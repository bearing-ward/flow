import { BunRuntime, BunServices } from '@effect/platform-bun'
import { Effect, FileSystem, Path, Schema as S } from 'effect'
import ts from 'typescript-api'

import { readCatalogJson } from './catalog-json.ts'
import {
  ApiMemberCatalogSchema,
  checkEvidenceLink,
} from './check-api-members.ts'

const Host = S.Literals(['vanilla', 'vue', 'foldkit'])

const Identity = {
  page: S.NonEmptyString,
  member: S.NonEmptyString,
  host: Host,
}

const Target = S.Struct({
  publicEntry: S.NonEmptyString,
  exportName: S.NonEmptyString,
  operation: S.NonEmptyString,
  productionTest: S.NonEmptyString,
  capture: S.NonEmptyString,
})

const Group = S.Struct({
  id: S.NonEmptyString,
  page: S.NonEmptyString,
  ownerPlan: S.NonEmptyString,
  members: S.Array(S.NonEmptyString),
  requiredPlans: S.Array(S.NonEmptyString),
  obligation: S.NonEmptyString,
  targets: S.Struct({ vanilla: Target, vue: Target, foldkit: Target }),
})

const Proof = S.Struct({
  ...Identity,
  assertion: S.NonEmptyString,
  implementation: S.NonEmptyString,
  productionTest: S.NonEmptyString,
  reference: S.NonEmptyString,
  upstreamMember: S.NonEmptyString,
})

const Common = {
  ...Identity,
  contractId: S.NonEmptyString,
  decision: S.NonEmptyString,
}

const OpenCell = S.Struct({
  ...Common,
  state: S.Literals(['implementation-gap', 'evidence-gap']),
})

const ImplementedCell = S.Struct({
  ...Common,
  state: S.Literal('implemented-with-evidence'),
  proof: Proof,
})

const DifferenceCell = S.Struct({
  ...Common,
  state: S.Literal('reviewed-native-difference'),
  review: S.Struct({
    reviewer: S.NonEmptyString,
    reason: S.NonEmptyString,
    testBoundary: S.NonEmptyString,
    architectureReview: S.NonEmptyString,
    productionTest: S.NonEmptyString,
  }),
})

export const MemberClosureSchema = S.Struct({
  version: S.Literal(1),
  baseline: S.Struct({
    inventory: S.NonEmptyString,
    capturedOn: S.NonEmptyString,
    pinnedRevision: S.NonEmptyString,
    members: S.Int,
    cells: S.Int,
  }),
  groups: S.Array(Group),
  cells: S.Array(S.Union([OpenCell, ImplementedCell, DifferenceCell])),
})

type Closure = typeof MemberClosureSchema.Type

type Catalog = typeof ApiMemberCatalogSchema.Type

const hosts = ['vanilla', 'vue', 'foldkit'] as const

const publicEntries = {
  vanilla: 'apps/vanilla/src/public.ts',
  vue: 'packages/vue/src/public.ts',
  foldkit: 'packages/foldkit/src/public.ts',
} satisfies Record<(typeof hosts)[number], string>

const key = (
  cell: Pick<typeof Proof.Type, 'page' | 'member' | 'host'>
): string => JSON.stringify([cell.page, cell.member, cell.host])

const placeholder =
  /\b(?:TODO|TBD|placeholder|verify member semantics|member-specific Flow implementation evidence and production tests are still open|not been reviewed)\b/iu

const exportsName = (contents: string, name: string): boolean =>
  ts
    .createSourceFile('public.ts', contents, ts.ScriptTarget.Latest)
    .statements.some(
      (statement) =>
        ts.isExportDeclaration(statement) &&
        statement.exportClause !== undefined &&
        ts.isNamedExports(statement.exportClause) &&
        statement.exportClause.elements.some(
          (element) => element.name.text === name
        )
    )

const safePath = (value: string): boolean =>
  !value.startsWith('/') && !value.split('/').includes('..')

type OriginalCells = ReadonlyMap<string, { reference: string }>

const purePathTargets = [
  {
    page: 'https://reactflow.dev/api-reference/utils/get-bezier-path',
    helper: 'getBezierPath',
    members: [
      '0curvature',
      '0sourceposition',
      '0sourcex',
      '0sourcey',
      '0targetposition',
      '0targetx',
      '0targety',
      'getBezierPath',
    ],
  },
  {
    page: 'https://reactflow.dev/api-reference/utils/get-simple-bezier-path',
    helper: 'getSimpleBezierPath',
    members: [
      '0sourceposition',
      '0sourcex',
      '0sourcey',
      '0targetposition',
      '0targetx',
      '0targety',
      'getSimpleBezierPath',
    ],
  },
  {
    page: 'https://reactflow.dev/api-reference/utils/get-smooth-step-path',
    helper: 'getSmoothStepPath',
    members: [
      '0borderradius',
      '0centerx',
      '0centery',
      '0offset',
      '0sourceposition',
      '0sourcex',
      '0sourcey',
      '0stepposition',
      '0targetposition',
      '0targetx',
      '0targety',
      'getSmoothStepPath',
    ],
  },
  {
    page: 'https://reactflow.dev/api-reference/utils/get-straight-path',
    helper: 'getStraightPath',
    members: [
      '0sourcex',
      '0sourcey',
      '0targetx',
      '0targety',
      'getStraightPath',
    ],
  },
]

const purePathTarget = (group: typeof Group.Type) => {
  const [member] = group.members

  if (
    group.ownerPlan !== '072' ||
    group.members.length !== 1 ||
    member === undefined
  ) {
    return
  }

  return purePathTargets.find(
    (target) =>
      target.page === group.page &&
      target.members.includes(member) &&
      group.id === `utils/${target.page.split('/').at(-1)}::072::${member}`
  )
}

const matchesPurePathTarget = (
  target: typeof Target.Type,
  helper: string,
  member: string | undefined
): boolean =>
  target.exportName === helper &&
  target.operation === member &&
  target.productionTest === 'packages/core/src/domain/flow-edge-path.test.ts' &&
  target.capture === 'scripts/capture/capture-path-helper-reference.ts'

const checkTargets = (
  group: typeof Group.Type,
  plan: string | undefined,
  files: ReadonlyMap<string, string>,
  failures: string[]
): void => {
  const pureTarget = purePathTarget(group)
  const [member] = group.members

  for (const host of hosts) {
    const target = group.targets[host]
    const entry = files.get(target.publicEntry)

    if (
      !safePath(target.publicEntry) ||
      target.publicEntry !==
        (pureTarget === undefined
          ? publicEntries[host]
          : 'packages/core/src/public.ts') ||
      (pureTarget !== undefined &&
        !matchesPurePathTarget(target, pureTarget.helper, member)) ||
      entry === undefined ||
      !exportsName(entry, target.exportName) ||
      placeholder.test(target.operation)
    ) {
      failures.push(`Invalid public target: ${group.id} (${host})`)
    }

    for (const targetPath of [target.productionTest, target.capture]) {
      if (
        !safePath(targetPath) ||
        (!files.has(targetPath) &&
          !plan?.includes(targetPath) &&
          !(
            targetPath === target.productionTest &&
            targetPath.startsWith(`apps/${host}/e2e/`) &&
            plan?.includes(targetPath.split('/').at(-1) ?? targetPath)
          ))
      ) {
        failures.push(`Unowned test/capture target: ${group.id}: ${targetPath}`)
      }
    }
  }
}

const checkGroups = (
  closure: Closure,
  plans: ReadonlyMap<string, string>,
  files: ReadonlyMap<string, string>,
  original: OriginalCells,
  failures: string[]
): Map<string, typeof Group.Type> => {
  const groups = new Map<string, typeof Group.Type>()
  const grouped = new Set<string>()

  for (const group of closure.groups) {
    if (groups.has(group.id)) {
      failures.push(`Duplicate contract group: ${group.id}`)
    }

    groups.set(group.id, group)
    const plan = plans.get(group.ownerPlan)

    if (
      !/^0\d{2}$/u.test(group.ownerPlan) ||
      ['057', '066'].includes(group.ownerPlan) ||
      plan === undefined ||
      !/## (?:Ordered steps|Steps|Ordered work packages)/u.test(plan) ||
      !/## (?:.*done criteria|Done criteria|Common completion gate)/iu.test(
        plan
      )
    ) {
      failures.push(`Missing executable child owner: ${group.id}`)
    }

    for (const dependency of group.requiredPlans) {
      if (!plans.has(dependency) || dependency === group.ownerPlan) {
        failures.push(
          `Missing or circular child prerequisite: ${group.id}: ${dependency}`
        )
      }
    }

    if (group.members.length === 0 || placeholder.test(group.obligation)) {
      failures.push(`Empty or placeholder contract group: ${group.id}`)
    }

    for (const member of group.members) {
      const identity = JSON.stringify([group.page, member])

      if (grouped.has(identity)) {
        failures.push(`Duplicate grouped member: ${identity}`)
      }

      grouped.add(identity)

      if (!original.has(key({ page: group.page, member, host: 'vanilla' }))) {
        failures.push(`Orphan grouped member: ${identity}`)
      }
    }

    checkTargets(group, plan, files, failures)
  }

  return groups
}

const checkProof = (
  cell: typeof ImplementedCell.Type,
  source: { reference: string } | undefined,
  files: ReadonlyMap<string, string>,
  failures: string[]
): void => {
  const identity = key(cell)

  const { proof } = cell

  if (
    key(proof) !== identity ||
    !proof.assertion.includes(cell.member) ||
    placeholder.test(proof.assertion) ||
    proof.upstreamMember !== source?.reference
  ) {
    failures.push(`Missing member-specific proof: ${identity}`)
  }

  if (
    !/^(?:packages|apps)\/.*\.ts:\d/u.test(proof.implementation) ||
    !/(?:\.test|\.e2e)\.ts:\d/u.test(proof.productionTest) ||
    !/^packages\/conformance\/src\/.+\.test\.ts:\d/u.test(proof.reference)
  ) {
    failures.push(`Unsupported complete proof: ${identity}`)
  }

  for (const link of [
    proof.implementation,
    proof.productionTest,
    proof.reference,
  ]) {
    checkEvidenceLink(identity, link, files, failures)
  }
}

const checkCell = (
  cell: Closure['cells'][number],
  group: typeof Group.Type | undefined,
  source: { reference: string } | undefined,
  files: ReadonlyMap<string, string>,
  requireClosed: boolean,
  failures: string[]
): void => {
  const identity = key(cell)

  if (source === undefined) {
    failures.push(`Orphan cell: ${identity}`)
  }

  if (group?.page !== cell.page || !group.members.includes(cell.member)) {
    failures.push(`Wrong contract group membership: ${identity}`)
  }

  if (placeholder.test(cell.decision) || !cell.decision.includes(cell.member)) {
    failures.push(`Placeholder or non-specific decision: ${identity}`)
  }

  if (cell.state === 'implementation-gap' || cell.state === 'evidence-gap') {
    if (requireClosed) {
      failures.push(`Required unresolved ${cell.state}: ${identity}`)
    }

    return
  }

  if (cell.state === 'reviewed-native-difference') {
    if (
      placeholder.test(cell.review.reason) ||
      !cell.review.reason.includes(cell.member) ||
      !/(?:\.e2e|\.test)\.ts:\d/u.test(cell.review.productionTest)
    ) {
      failures.push(`Unsupported native difference: ${identity}`)
    }

    checkEvidenceLink(identity, cell.review.architectureReview, files, failures)
    checkEvidenceLink(identity, cell.review.productionTest, files, failures)

    return
  }

  if (cell.state !== 'implemented-with-evidence') {
    return
  }

  checkProof(cell, source, files, failures)
}

/** Structural accounting only. A reviewer must inspect the cited assertions. */
export const checkApiMemberContracts = (
  catalog: Catalog,
  closure: Closure,
  plans: ReadonlyMap<string, string>,
  files: ReadonlyMap<string, string>,
  requireClosed = false
): string[] => {
  const failures: string[] = []
  const original = new Map<string, { reference: string }>()

  for (const page of catalog.pages) {
    if (page.pinnedSourceRevision !== closure.baseline.pinnedRevision) {
      failures.push(`Pinned revision differs: ${page.url}`)
    }

    for (const member of page.members) {
      for (const host of hosts) {
        original.set(key({ page: page.url, member: member.id, host }), {
          reference: `${page.url}${member.upstreamAnchor}`,
        })
      }
    }
  }

  if (
    closure.baseline.inventory !== 'research/catalogs/api-members.json' ||
    closure.baseline.capturedOn !== catalog.capturedOn ||
    closure.baseline.cells !== original.size ||
    closure.baseline.members * hosts.length !== original.size
  ) {
    failures.push('Original inventory accounting differs from baseline')
  }

  const groups = checkGroups(closure, plans, files, original, failures)
  const seen = new Set<string>()

  for (const cell of closure.cells) {
    const identity = key(cell)

    if (seen.has(identity)) {
      failures.push(`Duplicate cell: ${identity}`)
    }

    seen.add(identity)
    checkCell(
      cell,
      groups.get(cell.contractId),
      original.get(identity),
      files,
      requireClosed,
      failures
    )
  }

  const grouped = new Set(
    closure.groups.flatMap((group) =>
      group.members.map((member) => JSON.stringify([group.page, member]))
    )
  )

  for (const page of catalog.pages) {
    for (const member of page.members) {
      if (!grouped.has(JSON.stringify([page.url, member.id]))) {
        failures.push(
          `Missing original group membership: ${page.url} ${member.id}`
        )
      }
    }
  }

  for (const identity of original.keys()) {
    if (!seen.has(identity)) {
      failures.push(`Missing original cell: ${identity}`)
    }
  }

  return failures
}

export const memberContracts = Effect.gen(function* checkMemberContracts() {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const root = yield* path.fromFileUrl(new URL('..', import.meta.url))

  const catalog = yield* S.decodeUnknownEffect(ApiMemberCatalogSchema)(
    yield* readCatalogJson(
      path.join(root, 'research/catalogs/api-members.json')
    )
  )

  const closure = yield* S.decodeUnknownEffect(MemberClosureSchema)(
    yield* readCatalogJson(
      path.join(root, 'research/catalogs/057-member-closure.json')
    )
  )

  const plans = new Map<string, string>()

  for (const name of yield* fs.readDirectory(path.join(root, 'plans'))) {
    const id = name.match(/^(?<id>0\d{2})-.+\.md$/u)?.groups?.id

    if (id !== undefined) {
      plans.set(id, yield* fs.readFileString(path.join(root, 'plans', name)))
    }
  }

  const files = new Map<string, string>()
  const paths = new Set<string>()

  for (const group of closure.groups) {
    for (const host of hosts) {
      const target = group.targets[host]
      paths.add(target.publicEntry)
      paths.add(target.productionTest)
      paths.add(target.capture)
    }
  }

  for (const cell of closure.cells) {
    if (cell.state === 'implemented-with-evidence') {
      paths.add(cell.proof.implementation.split(':')[0] ?? '')
      paths.add(cell.proof.productionTest.split(':')[0] ?? '')
      paths.add(cell.proof.reference.split(':')[0] ?? '')
    } else if (cell.state === 'reviewed-native-difference') {
      paths.add(cell.review.architectureReview.split(':')[0] ?? '')
      paths.add(cell.review.productionTest.split(':')[0] ?? '')
    }
  }

  for (const file of paths) {
    if (safePath(file) && (yield* fs.exists(path.join(root, file)))) {
      files.set(file, yield* fs.readFileString(path.join(root, file)))
    }
  }

  const failures = checkApiMemberContracts(
    catalog,
    closure,
    plans,
    files,
    Bun.argv.includes('--require-closed')
  )

  if (failures.length > 0) {
    return yield* Effect.die(
      new Error(
        `${failures.length} contract failures\n${failures.slice(0, 30).join('\n')}`
      )
    )
  }

  yield* Effect.log(
    `Validated ${closure.baseline.members} original members / ${closure.cells.length} host cells / ${closure.groups.length} owned groups; ${closure.cells.filter((cell) => cell.state.endsWith('-gap')).length} required open cells. Structural ownership is not semantic closure.`
  )
})

if (import.meta.main) {
  BunRuntime.runMain(memberContracts.pipe(Effect.provide(BunServices.layer)))
}

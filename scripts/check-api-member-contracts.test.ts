import { readFileSync } from 'node:fs'

import { Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  checkApiMemberContracts,
  MemberClosureSchema,
} from './check-api-member-contracts.ts'
import { ApiMemberCatalogSchema } from './check-api-members.ts'

const page = 'https://reactflow.dev/api-reference/react-flow'

const mapping = {
  status: 'gap',
  equivalent: 'No native nodes contract proof.',
  evidence: [],
}

const catalog = S.decodeUnknownSync(ApiMemberCatalogSchema)({
  capturedOn: '2026-09-28',
  baselineCatalog: 'dated.json',
  captureCounts: {
    apiCapabilityPages: 1,
    officialDocsTableRows: 1,
    componentMemberRows: 0,
    pinnedDeclarationRecords: 0,
  },
  normalizedMemberCounts: {
    existingCorrespondence: 0,
    officialDocsTable: 1,
    pinnedDeclaration: 0,
    currentSiteMember: 0,
  },
  pages: [
    {
      url: page,
      title: 'ReactFlow',
      sourceCheckedOn: '2026-09-28',
      upstreamUpdatedOn: '2026-08-31',
      pinnedSourceRevision: 'pinned',
      currentSiteEvidence: ['nodes'],
      upstreamAnchors: ['#nodes'],
      members: [
        {
          id: 'nodes',
          kind: 'prop',
          inventorySource: 'official-docs-table',
          description: 'Controlled nodes.',
          remainingDecision: 'nodes owner acknowledgment remains open.',
          ownerPlan: '057',
          upstreamAnchor: '#nodes',
          hosts: { vanilla: mapping, vue: mapping, foldkit: mapping },
        },
      ],
    },
  ],
})

const target = {
  publicEntry: 'apps/vanilla/src/public.ts',
  exportName: 'mountFlow',
  operation: 'nodes',
  productionTest: 'apps/vanilla/e2e/nodes.e2e.ts',
  capture: 'scripts/capture-nodes-reference.ts',
}

const targets = {
  vanilla: target,
  vue: { ...target, publicEntry: 'packages/vue/src/public.ts' },
  foldkit: { ...target, publicEntry: 'packages/foldkit/src/public.ts' },
}

const firstCell = {
  page,
  member: 'nodes',
  host: 'vanilla',
  contractId: 'controlled-nodes',
  decision: 'nodes require acknowledgement before accepted notification.',
  state: 'implementation-gap',
}

const source = {
  version: 1,
  baseline: {
    inventory: 'research/catalogs/api-members.json',
    capturedOn: '2026-09-28',
    pinnedRevision: 'pinned',
    members: 1,
    cells: 3,
  },
  groups: [
    {
      id: 'controlled-nodes',
      page,
      ownerPlan: '063',
      requiredPlans: [],
      members: ['nodes'],
      obligation: 'nodes require controlled owner acknowledgement.',
      targets,
    },
  ],
  cells: ['vanilla', 'vue', 'foldkit'].map((host) => ({
    page,
    member: 'nodes',
    host,
    contractId: 'controlled-nodes',
    decision: 'nodes require acknowledgement before accepted notification.',
    state: 'implementation-gap',
  })),
}

const [firstGroup] = source.groups

if (firstGroup === undefined) {
  throw new Error('Test fixture requires one contract group')
}

const plans = new Map([
  [
    '063',
    '## Ordered steps\nImplement nodes.\n## Done criteria\nAll gates pass.',
  ],
])

const files = new Map([
  [targets.vue.publicEntry, 'export { mountFlow } from "./mount-flow.ts";'],
  [targets.foldkit.publicEntry, 'export { mountFlow } from "./mount-flow.ts";'],
  [target.publicEntry, 'export { mountFlow } from "./mount-flow.ts";'],
  [target.productionTest, 'test("nodes", () => {})'],
  [target.capture, 'capture nodes'],
  [
    'packages/conformance/src/nodes-reference.test.ts',
    'test("nodes", () => {})',
  ],
  ['apps/vanilla/src/mount-flow.ts', 'export const mountFlow = () => {}'],
  ['plans/architecture.md', 'nodes native ownership reviewed'],
])

const check = (value: typeof S.JsonObject.Type, closed = false) =>
  checkApiMemberContracts(
    catalog,
    S.decodeUnknownSync(MemberClosureSchema)(value),
    plans,
    files,
    closed
  )

const proof = {
  page,
  member: 'nodes',
  host: 'vanilla',
  assertion: 'nodes controlled action notifies only after acknowledgement.',
  implementation: 'apps/vanilla/src/mount-flow.ts:1',
  productionTest: `${target.productionTest}:1`,
  reference: 'packages/conformance/src/nodes-reference.test.ts:1',
  upstreamMember: `${page}#nodes`,
}

describe('member contract accounting', () => {
  it('accepts exhaustive owned open cells without calling them closed', () => {
    expect(check(source)).toStrictEqual([])
    expect(
      check(source, true).filter((failure) =>
        failure.startsWith('Required unresolved')
      )
    ).toHaveLength(3)
  })

  it('rejects removed cells and changed baseline counts', () => {
    expect(check({ ...source, cells: source.cells.slice(1) })).toContain(
      `Missing original cell: ${JSON.stringify([page, 'nodes', 'vanilla'])}`
    )
    expect(
      check({ ...source, baseline: { ...source.baseline, cells: 2 } })
    ).toContain('Original inventory accounting differs from baseline')
  })

  it('rejects orphan and duplicate host cells', () => {
    expect(
      check({ ...source, cells: [...source.cells, firstCell] }).some(
        (failure) => failure.startsWith('Duplicate cell')
      )
    ).toBeTruthy()
    expect(
      check({
        ...source,
        cells: [
          ...source.cells,
          {
            ...firstCell,
            member: 'edges',
            decision: 'edges must be accepted.',
          },
        ],
      }).some((failure) => failure.startsWith('Orphan cell'))
    ).toBeTruthy()
  })

  it('rejects gaps whose owner is missing or only the umbrella plan', () => {
    for (const ownerPlan of ['099', '057', '066']) {
      expect(
        check({
          ...source,
          groups: source.groups.map((group) => ({ ...group, ownerPlan })),
        }).some((failure) =>
          failure.startsWith('Missing executable child owner')
        )
      ).toBeTruthy()
    }
  })

  it('rejects nonexistent or self-referential prerequisites', () => {
    for (const requiredPlans of [['099'], ['063']]) {
      expect(
        check({
          ...source,
          groups: source.groups.map((group) => ({ ...group, requiredPlans })),
        }).some((failure) =>
          failure.startsWith('Missing or circular child prerequisite')
        )
      ).toBeTruthy()
    }
  })

  it('rejects generic decisions and obligations', () => {
    expect(
      check({
        ...source,
        cells: source.cells.map((cell) => ({
          ...cell,
          decision: 'Verify member semantics per host.',
        })),
      }).some((failure) => failure.startsWith('Placeholder'))
    ).toBeTruthy()
    expect(
      check({
        ...source,
        groups: source.groups.map((group) => ({
          ...group,
          obligation: 'TODO',
        })),
      }).some((failure) => failure.startsWith('Empty or placeholder'))
    ).toBeTruthy()
  })

  it('rejects wrong, duplicate and orphan group membership', () => {
    expect(
      check({
        ...source,
        cells: source.cells.map((cell) => ({
          ...cell,
          contractId: 'other-group',
        })),
      }).some((failure) => failure.startsWith('Wrong contract'))
    ).toBeTruthy()
    expect(
      check({ ...source, groups: [...source.groups, firstGroup] }).some(
        (failure) => failure.startsWith('Duplicate grouped member')
      )
    ).toBeTruthy()
    expect(
      check({
        ...source,
        groups: source.groups.map((group) => ({
          ...group,
          members: ['edges'],
        })),
      }).some((failure) => failure.startsWith('Orphan grouped member'))
    ).toBeTruthy()
  })

  it('rejects host-misattributed entries and missing original group membership', () => {
    expect(
      check({
        ...source,
        groups: source.groups.map((group) => ({
          ...group,
          targets: { ...group.targets, vue: target },
        })),
      }).some((failure) => failure.startsWith('Invalid public target'))
    ).toBeTruthy()
    expect(
      check({ ...source, groups: [] }).some((failure) =>
        failure.startsWith('Missing original group membership')
      )
    ).toBeTruthy()
  })

  it('rejects nonexistent public exports and unowned proposed tests', () => {
    const badTarget = {
      ...target,
      exportName: 'privateSetState',
      capture: 'scripts/missing.ts',
    }

    expect(
      check({
        ...source,
        groups: source.groups.map((group) => ({
          ...group,
          targets: { ...group.targets, vanilla: badTarget },
        })),
      }).some((failure) => failure.startsWith('Invalid public target'))
    ).toBeTruthy()
    expect(
      check({
        ...source,
        groups: source.groups.map((group) => ({
          ...group,
          targets: { ...group.targets, vanilla: badTarget },
        })),
      }).some((failure) => failure.startsWith('Unowned test/capture'))
    ).toBeTruthy()
  })

  it('requires a schema-valid member-specific proof for completed claims', () => {
    expect(() =>
      check({
        ...source,
        cells: [
          { ...firstCell, state: 'implemented-with-evidence' },
          ...source.cells.slice(1),
        ],
      })
    ).toThrow(/proof/u)

    const complete = {
      ...firstCell,
      state: 'implemented-with-evidence',
      proof,
    }

    expect(
      check({ ...source, cells: [complete, ...source.cells.slice(1)] })
    ).toStrictEqual([])
    expect(
      check({
        ...source,
        cells: [
          { ...complete, proof: { ...proof, member: 'edges' } },
          ...source.cells.slice(1),
        ],
      }).some((failure) => failure.startsWith('Missing member-specific'))
    ).toBeTruthy()
    expect(
      check({
        ...source,
        cells: [
          { ...complete, proof: { ...proof, upstreamMember: page } },
          ...source.cells.slice(1),
        ],
      }).some((failure) => failure.startsWith('Missing member-specific'))
    ).toBeTruthy()
  })

  it('rejects a fixture README as executable reference proof', () => {
    const completed = {
      ...firstCell,
      state: 'implemented-with-evidence',
      proof: { ...proof, reference: 'research/fixtures/README.md:1' },
    }

    expect(
      check({ ...source, cells: [completed, ...source.cells.slice(1)] }).some(
        (failure) => failure.startsWith('Unsupported complete')
      )
    ).toBeTruthy()
  })

  it('does not accept a documentation URL as executable reference proof', () => {
    expect(
      check({
        ...source,
        cells: [
          {
            ...firstCell,
            state: 'implemented-with-evidence',
            proof: { ...proof, reference: page },
          },
          ...source.cells.slice(1),
        ],
      }).some((failure) => failure.startsWith('Unsupported complete'))
    ).toBeTruthy()
  })

  it('requires native differences to have an architecture review and an actual test', () => {
    const difference = {
      ...firstCell,
      state: 'reviewed-native-difference',
      review: {
        reviewer: 'independent-review',
        reason: 'nodes use accepted owner state.',
        testBoundary: 'Public mounted nodes owner test.',
        architectureReview: 'plans/architecture.md:1',
        productionTest: `${target.productionTest}:1`,
      },
    }

    expect(
      check({ ...source, cells: [difference, ...source.cells.slice(1)] })
    ).toStrictEqual([])
    expect(
      check({
        ...source,
        cells: [
          {
            ...difference,
            review: {
              ...difference.review,
              architectureReview: 'plans/missing.md:1',
            },
          },
          ...source.cells.slice(1),
        ],
      }).some((failure) => failure.startsWith('Missing evidence file'))
    ).toBeTruthy()
  })
})

const purePages = new Set([
  'https://reactflow.dev/api-reference/utils/get-bezier-path',
  'https://reactflow.dev/api-reference/utils/get-simple-bezier-path',
  'https://reactflow.dev/api-reference/utils/get-smooth-step-path',
  'https://reactflow.dev/api-reference/utils/get-straight-path',
])

const fullCatalog = S.decodeUnknownSync(ApiMemberCatalogSchema)(
  JSON.parse(readFileSync('research/catalogs/api-members.json', 'utf-8'))
)

const fullClosure = S.decodeUnknownSync(MemberClosureSchema)(
  JSON.parse(readFileSync('plans/057-member-closure.json', 'utf-8'))
)

const pureCatalog = {
  ...fullCatalog,
  pages: fullCatalog.pages.filter(({ url }) => purePages.has(url)),
}

const pureClosure = {
  ...fullClosure,
  baseline: { ...fullClosure.baseline, members: 32, cells: 96 },
  groups: fullClosure.groups.filter(({ page: groupPage }) =>
    purePages.has(groupPage)
  ),
  cells: fullClosure.cells.filter(({ page: cellPage }) =>
    purePages.has(cellPage)
  ),
}

const purePlans = new Map([
  [
    '072',
    readFileSync('plans/072-close-instance-utility-contracts.md', 'utf-8'),
  ],
])

const pureFiles = new Map(
  [
    'packages/core/src/public.ts',
    'packages/core/src/domain/flow-edge-path.ts',
    'packages/core/src/domain/flow-edge-path.test.ts',
    'packages/conformance/src/path-helper-reference.test.ts',
    'scripts/capture-path-helper-reference.ts',
  ].map((file) => [file, readFileSync(file, 'utf-8')])
)

type PureGroup = (typeof pureClosure.groups)[number]

type PureTarget = PureGroup['targets']['vanilla']

const checkPure = (groups: typeof pureClosure.groups) =>
  checkApiMemberContracts(
    pureCatalog,
    { ...pureClosure, groups },
    purePlans,
    pureFiles,
    false
  )

const alterPureTarget = (
  group: PureGroup,
  mutation: Partial<PureTarget>
): PureGroup => ({
  ...group,
  targets: {
    ...group.targets,
    vanilla: { ...group.targets.vanilla, ...mutation },
  },
})

const targetMutations: readonly [string, (group: PureGroup) => PureGroup][] = [
  ['wrong owner074', (group) => ({ ...group, ownerPlan: '074' })],
  ['wrong owner088', (group) => ({ ...group, ownerPlan: '088' })],
  [
    'unrelated page',
    (group) => ({
      ...group,
      page: 'https://reactflow.dev/api-reference/react-flow',
    }),
  ],
  [
    'page-like suffix',
    (group) => ({ ...group, page: 'https://other.example/get-bezier-path' }),
  ],
  ['group ID mismatch', (group) => ({ ...group, id: `${group.id}-other` })],
  [
    'invented center member',
    (group) => ({ ...group, members: ['getEdgeCenter'] }),
  ],
  ['invented step member', (group) => ({ ...group, members: ['getStepPath'] })],
  [
    'mixed members',
    (group) => ({ ...group, members: [...group.members, 'unauthorized'] }),
  ],
  ['empty members', (group) => ({ ...group, members: [] })],
  [
    'wrong page helper export',
    (group) => alterPureTarget(group, { exportName: 'getStraightPath' }),
  ],
  [
    'absent export',
    (group) => alterPureTarget(group, { exportName: 'getStepPath' }),
  ],
  [
    'alternate module',
    (group) =>
      alterPureTarget(group, {
        publicEntry: 'packages/core/src/domain/flow-edge-path.ts',
      }),
  ],
  [
    'native host entry',
    (group) =>
      alterPureTarget(group, { publicEntry: 'apps/vanilla/src/public.ts' }),
  ],
  [
    'misattributed host',
    (group) =>
      alterPureTarget(group, { publicEntry: 'packages/vue/src/public.ts' }),
  ],
  [
    'wrong operation',
    (group) => alterPureTarget(group, { operation: 'getBezierPath' }),
  ],
  [
    'wrong production test',
    (group) =>
      alterPureTarget(group, {
        productionTest:
          'packages/conformance/src/path-helper-reference.test.ts',
      }),
  ],
  [
    'wrong capture',
    (group) =>
      alterPureTarget(group, {
        capture: 'scripts/capture-renderer-contract-reference.ts',
      }),
  ],
  [
    'unsafe test',
    (group) => alterPureTarget(group, { productionTest: '../outside.test.ts' }),
  ],
  [
    'unsafe capture',
    (group) => alterPureTarget(group, { capture: '/tmp/capture.ts' }),
  ],
  [
    'unowned test',
    (group) =>
      alterPureTarget(group, {
        productionTest: 'packages/core/src/domain/unowned.test.ts',
      }),
  ],
  [
    'unowned capture',
    (group) =>
      alterPureTarget(group, { capture: 'scripts/unowned-capture.ts' }),
  ],
]

describe('fixed pure path-helper target exception', () => {
  it('accepts precisely32 original singleton owner072 groups and96 core context targets', () => {
    expect(pureClosure.groups).toHaveLength(32)
    expect(pureClosure.cells).toHaveLength(96)
    expect(checkPure(pureClosure.groups)).toStrictEqual([])
  })

  it.each(pureClosure.groups)(
    'accepts every three-context target in $id',
    (group) => {
      const targetFailures = checkPure([group]).filter(
        (failure) =>
          failure.startsWith('Invalid public target') ||
          failure.startsWith('Unowned test/capture')
      )

      expect(targetFailures).toStrictEqual([])
    }
  )

  it.each(targetMutations)(
    'rejects %s specifically as an invalid target',
    (_name, mutation) => {
      const changed = pureClosure.groups.map((group, index) =>
        index === 0 ? mutation(group) : group
      )

      expect(
        checkPure(changed).some((failure) =>
          failure.startsWith('Invalid public target')
        )
      ).toBeTruthy()
    }
  )

  it('keeps unrelated native-host rules strict even with a real core export', () => {
    const unrelated = {
      ...source,
      groups: source.groups.map((group) => ({
        ...group,
        targets: {
          ...group.targets,
          vanilla: {
            ...group.targets.vanilla,
            publicEntry: 'packages/core/src/public.ts',
            exportName: 'getBezierPath',
          },
        },
      })),
    }

    expect(
      checkApiMemberContracts(
        catalog,
        S.decodeUnknownSync(MemberClosureSchema)(unrelated),
        plans,
        new Map([...files, ...pureFiles]),
        false
      ).some((failure) => failure.startsWith('Invalid public target'))
    ).toBeTruthy()
  })
})

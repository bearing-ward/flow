import { describe, expect, it } from 'vitest'

import { checkApiMembers } from './check-api-members.ts'

const pageUrl = 'https://reactflow.dev/api-reference/react-flow'

const knownPlanIds = new Set(['057'])

const mapping = {
  status: 'unassessed' as const,
  equivalent: 'Member-level correspondence has not been reviewed.',
  evidence: [],
}

const member = {
  id: 'nodes',
  kind: 'prop' as const,
  inventorySource: 'official-docs-table' as const,
  description: 'The controlled node collection.',
  remainingDecision: 'Verify member semantics per host.',
  ownerPlan: '057',
  upstreamAnchor: '#nodes',
  hosts: { vanilla: mapping, vue: mapping, foldkit: mapping },
}

const page = {
  url: pageUrl,
  title: '<ReactFlow />',
  sourceCheckedOn: '2026-09-28',
  upstreamUpdatedOn: '2026-08-31',
  pinnedSourceRevision: '0a1f9575b25679f2880175de8d3eae21aedde921',
  currentSiteEvidence: ['nodes prop row'],
  upstreamAnchors: ['#nodes'],
  members: [member],
}

describe('API member validation', () => {
  it('accepts a fully owned page and explicit per-host mappings', () => {
    expect(
      checkApiMembers([page], [pageUrl], knownPlanIds, new Map())
    ).toStrictEqual([])
  })

  it('rejects a missing API page', () => {
    expect(checkApiMembers([], [pageUrl], knownPlanIds, new Map())).toContain(
      `Missing API page inventory: ${pageUrl}`
    )
  })

  it('rejects a duplicate API page', () => {
    expect(
      checkApiMembers([page, page], [pageUrl], knownPlanIds, new Map())
    ).toContain(`Duplicate API page: ${pageUrl}`)
  })

  it('rejects a duplicate member', () => {
    const duplicated = { ...page, members: [member, member] }
    expect(
      checkApiMembers([duplicated], [pageUrl], knownPlanIds, new Map())
    ).toContain(`Duplicate member nodes: ${pageUrl}`)
  })

  it('rejects an unowned API page', () => {
    const otherPage = {
      ...page,
      url: 'https://reactflow.dev/api-reference/unknown',
    }

    expect(
      checkApiMembers([otherPage], [pageUrl], knownPlanIds, new Map())
    ).toContain(`Unowned API page: ${otherPage.url}`)
  })

  it('rejects an unowned member', () => {
    const unowned = {
      ...page,
      members: [{ ...member, ownerPlan: '057-WP99' }],
    }

    expect(
      checkApiMembers([unowned], [pageUrl], knownPlanIds, new Map()).some(
        (failure) => failure.includes('Invalid or missing owner plan')
      )
    ).toBeTruthy()
  })

  it('rejects member anchors absent from the captured upstream page', () => {
    const badAnchor = {
      ...page,
      members: [{ ...member, upstreamAnchor: '#missing' }],
    }

    expect(
      checkApiMembers([badAnchor], [pageUrl], knownPlanIds, new Map()).some(
        (failure) => failure.startsWith('Invalid upstream member anchor')
      )
    ).toBeTruthy()
  })

  it('requires flattened type prose to be labeled and preserved as raw source', () => {
    const malformed = {
      ...page,
      members: [{ ...member, description: 'nodesNode[]An array of nodes.[]' }],
    }

    expect(
      checkApiMembers([malformed], [pageUrl], knownPlanIds, new Map()).some(
        (failure) => failure.includes('lacks rawSourceRow')
      )
    ).toBeTruthy()

    const missingRawSource = {
      ...page,
      members: [
        { ...member, description: 'Unparsed captured row: see rawSourceRow.' },
      ],
    }

    expect(
      checkApiMembers(
        [missingRawSource],
        [pageUrl],
        knownPlanIds,
        new Map()
      ).some((failure) => failure.includes('missing rawSourceRow'))
    ).toBeTruthy()

    const labeled = {
      ...page,
      members: [
        {
          ...member,
          description: 'Unparsed captured row: see rawSourceRow.',
          rawSourceRow: 'nodesNode[]An array of nodes.[]',
        },
      ],
    }

    expect(
      checkApiMembers([labeled], [pageUrl], knownPlanIds, new Map())
    ).toStrictEqual([])
  })

  it('rejects unsupported complete claims', () => {
    const complete = {
      ...member,
      hosts: {
        vanilla: {
          status: 'complete' as const,
          equivalent: 'claimed complete',
          evidence: [],
        },
        vue: mapping,
        foldkit: mapping,
      },
    }

    const candidate = { ...page, members: [complete] }
    expect(
      checkApiMembers([candidate], [pageUrl], knownPlanIds, new Map()).filter(
        (failure) => failure.startsWith('Unsupported complete claim')
      )
    ).toHaveLength(6)
  })

  it('requires complete evidence to cite that member and actual local tests', () => {
    const complete = {
      ...member,
      hosts: {
        vanilla: {
          status: 'complete' as const,
          equivalent: 'claimed complete',
          evidence: [
            { kind: 'implementation' as const, link: pageUrl },
            {
              kind: 'production-test' as const,
              link: 'apps/vanilla/e2e/sample.e2e.ts:2',
            },
            {
              kind: 'reference' as const,
              link: 'https://reactflow.dev/api-reference',
            },
          ],
        },
        vue: mapping,
        foldkit: mapping,
      },
    }

    const candidate = { ...page, members: [complete] }

    const failures = checkApiMembers(
      [candidate],
      [pageUrl],
      knownPlanIds,
      new Map([['apps/vanilla/e2e/sample.e2e.ts', 'one\ntwo\n']])
    )

    expect(failures).toContain(
      'Unsupported complete claim for nodes (vanilla): implementation evidence must cite a repository file'
    )
    expect(failures).toContain(
      'Unsupported complete claim for nodes (vanilla): reference evidence must cite its upstream member'
    )
  })

  it('rejects a page-only reference when the member has a captured anchor', () => {
    const complete = {
      ...member,
      hosts: {
        vanilla: {
          status: 'complete' as const,
          equivalent: 'claimed complete',
          evidence: [
            {
              kind: 'implementation' as const,
              link: 'apps/vanilla/src/main.ts:1',
            },
            {
              kind: 'production-test' as const,
              link: 'apps/vanilla/e2e/sample.e2e.ts:2',
            },
            { kind: 'reference' as const, link: pageUrl },
          ],
        },
        vue: mapping,
        foldkit: mapping,
      },
    }

    const candidate = { ...page, members: [complete] }

    const failures = checkApiMembers(
      [candidate],
      [pageUrl],
      knownPlanIds,
      new Map([
        ['apps/vanilla/src/main.ts', 'implementation\n'],
        ['apps/vanilla/e2e/sample.e2e.ts', 'one\ntwo\n'],
      ])
    )

    expect(failures).toContain(
      'Unsupported complete claim for nodes (vanilla): reference evidence must cite its upstream member'
    )
  })

  it('rejects invalid links and out-of-range source lines', () => {
    const withBadLink = {
      ...member,
      hosts: {
        vanilla: {
          ...mapping,
          evidence: [
            { kind: 'implementation' as const, link: 'src/main.ts:5' },
            { kind: 'reference' as const, link: 'http://insecure.example' },
          ],
        },
        vue: mapping,
        foldkit: mapping,
      },
    }

    const candidate = { ...page, members: [withBadLink] }

    const failures = checkApiMembers(
      [candidate],
      [pageUrl],
      knownPlanIds,
      new Map()
    )

    expect(failures).toContain('Missing evidence file for nodes: src/main.ts')
    expect(failures).toContain(
      'Invalid evidence link for nodes: http://insecure.example'
    )

    const withBadLine = {
      ...member,
      hosts: {
        vanilla: {
          ...mapping,
          evidence: [
            { kind: 'implementation' as const, link: 'src/main.ts:2-9' },
          ],
        },
        vue: mapping,
        foldkit: mapping,
      },
    }

    expect(
      checkApiMembers(
        [{ ...page, members: [withBadLine] }],
        [pageUrl],
        knownPlanIds,
        new Map([['src/main.ts', 'line one\nline two\n']])
      )
    ).toContain('Invalid evidence line for nodes: src/main.ts:2-9')
  })
})

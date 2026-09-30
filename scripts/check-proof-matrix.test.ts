import { describe, expect, it } from 'vitest'

import { checkProofMatrix, decodeProofMatrix } from './check-proof-matrix.ts'

const artifact = 'evidence.test.ts'

const revision = '0a1f9575b25679f2880175de8d3eae21aedde921'

const subjectId = 'https://reactflow.dev/examples/interaction/connection-events'

const validProof = {
  id: 'drag-observation',
  subject: { kind: 'example' as const, id: subjectId },
  claim: 'observation' as const,
  inputKind: 'pointer-drag',
  browser: {
    name: 'chromium',
    version: '1.62.1',
    device: 'desktop automation',
  },
  upstream: { revision, test: artifact },
  hosts: {
    vanilla: {
      result: 'observed' as const,
      evidence: [{ kind: 'behavior' as const, artifact }],
    },
    vue: {
      result: 'observed' as const,
      evidence: [{ kind: 'behavior' as const, artifact }],
    },
    foldkit: {
      result: 'observed' as const,
      evidence: [{ kind: 'behavior' as const, artifact }],
    },
  },
}

const matrix = {
  schemaVersion: 1 as const,
  capturedOn: '2026-09-28',
  baselineCatalog: 'react-flow-2026-09-26.json',
  baselineCatalogCapturedOn: '2026-09-26',
  apiMemberCatalog: 'api-members.json',
  apiMemberCatalogCapturedOn: '2026-09-28',
  pinnedReferenceRevision: revision,
  flowSourceRevision: 'working-tree@ce9210e61a7dcb370a45b91632c19d7e017e4898',
  flowSourceRevisionScope:
    'pre-commit-working-tree-based-on-recorded-commit' as const,
  proofs: [validProof],
}

const catalog = [
  {
    kind: 'capability',
    section: 'examples',
    url: subjectId,
  },
]

const catalogMetadata = { capturedOn: '2026-09-26', entries: catalog }

const files = new Map([[artifact, 'line one\nline two\n']])

const realPaths = new Map([[artifact, `/repo/${artifact}`]])

interface ApiMemberFixture {
  id: string
  hosts: Record<
    'vanilla' | 'vue' | 'foldkit',
    { status: string; evidence: { kind: string }[] }
  >
}

interface ApiCatalogFixture {
  capturedOn: string
  baselineCatalog: string
  pages: {
    url: string
    pinnedSourceRevision: string
    members: ApiMemberFixture[]
  }[]
}

const apiCatalog: ApiCatalogFixture = {
  capturedOn: '2026-09-28',
  baselineCatalog: 'react-flow-2026-09-26.json',
  pages: [],
}

const makeApiMember = (status: string): ApiMemberFixture => ({
  id: 'nodes',
  hosts: {
    vanilla: { status, evidence: [] },
    vue: { status: 'complete', evidence: [] },
    foldkit: { status: 'complete', evidence: [] },
  },
})

const completeProof = {
  ...validProof,
  subject: {
    kind: 'api-member' as const,
    id: 'https://reactflow.dev/api-reference/react-flow#nodes',
  },
  claim: 'complete' as const,
}

const apiCatalogWithMember = (
  member: ReturnType<typeof makeApiMember>
): ApiCatalogFixture => ({
  capturedOn: '2026-09-28',
  baselineCatalog: 'react-flow-2026-09-26.json',
  pages: [
    {
      url: 'https://reactflow.dev/api-reference/react-flow',
      pinnedSourceRevision: revision,
      members: [member],
    },
  ],
})

const check = (
  proofs: readonly (typeof validProof)[] | readonly unknown[],
  api: ApiCatalogFixture = apiCatalog,
  filesOverride = files,
  realPathsOverride = realPaths,
  metadata = catalogMetadata,
  sourceCommitExists = true
) =>
  checkProofMatrix(
    decodeProofMatrix({ ...matrix, proofs }),
    catalog,
    metadata,
    api,
    filesOverride,
    realPathsOverride,
    '/repo',
    sourceCommitExists
  )

describe('proof matrix validation', () => {
  it('accepts scoped observations with evidence for all hosts', () => {
    expect(check([validProof])).toStrictEqual([])
  })

  it('rejects evidence-free observed results', () => {
    const invalid = {
      ...validProof,
      hosts: {
        ...validProof.hosts,
        vanilla: { result: 'observed' as const, evidence: [] },
      },
    }

    expect(check([invalid])).toContain(
      'Absent evidence for drag-observation (vanilla)'
    )
  })

  it('rejects stale artifact paths', () => {
    const invalid = {
      ...validProof,
      hosts: {
        ...validProof.hosts,
        vue: {
          result: 'observed' as const,
          evidence: [
            { kind: 'behavior' as const, artifact: 'missing.test.ts' },
          ],
        },
      },
    }

    expect(check([invalid])).toContain(
      'Missing evidence artifact for drag-observation (vue): missing.test.ts'
    )
  })

  it('rejects stale authoritative catalog capture metadata', () => {
    expect(
      check([validProof], apiCatalog, files, realPaths, {
        ...catalogMetadata,
        capturedOn: '2026-09-25',
      })
    ).toContain('Stale baseline catalog capture date: expected 2026-09-25')
    expect(
      check([validProof], { ...apiCatalog, capturedOn: '2026-09-27' })
    ).toContain('Stale API member catalog capture date: expected 2026-09-27')
    expect(
      check([validProof], { ...apiCatalog, baselineCatalog: 'other.json' })
    ).toContain(
      'API member catalog baseline mismatch: expected react-flow-2026-09-26.json'
    )
  })

  it('rejects upstream revision drift in the loaded API member registry', () => {
    const api = apiCatalogWithMember(makeApiMember('partial'))
    const page = api.pages.at(0)

    if (page === undefined) {
      throw new Error('Expected API page fixture')
    }

    page.pinnedSourceRevision = 'f'.repeat(40)
    expect(check([validProof], api)).toContain(
      `Stale API page reference revision: ${page.url}`
    )
  })

  it('rejects Flow source revisions that are not existing commits', () => {
    expect(
      check([validProof], apiCatalog, files, realPaths, catalogMetadata, false)
    ).toContain(
      'Unknown Flow source commit: ce9210e61a7dcb370a45b91632c19d7e017e4898'
    )
  })

  it('rejects evidence paths containing backslashes', () => {
    const invalid = {
      ...validProof,
      hosts: {
        ...validProof.hosts,
        vanilla: {
          result: 'observed' as const,
          evidence: [
            { kind: 'behavior' as const, artifact: 'nested\\evidence.test.ts' },
          ],
        },
      },
    }

    expect(check([invalid])).toContain(
      'Invalid local evidence artifact for drag-observation (vanilla): backslash path'
    )
  })

  it('rejects artifacts whose resolved symlink target escapes the repository', () => {
    expect(
      check(
        [validProof],
        apiCatalog,
        files,
        new Map([[artifact, '/outside/evidence.test.ts']])
      )
    ).toContain(
      'Evidence artifact resolves outside repository for drag-observation: evidence.test.ts'
    )
  })

  it('rejects references to a trailing empty-line index', () => {
    const invalid = {
      ...validProof,
      upstream: { ...validProof.upstream, test: `${artifact}:3` },
    }

    expect(check([invalid])).toContain(
      'Invalid evidence line for drag-observation: evidence.test.ts:3'
    )
  })

  it('rejects reference claims without subject-bound reference evidence', () => {
    const invalid = { ...validProof, claim: 'reference-comparison' as const }
    expect(check([invalid])).toContain(
      'Unsupported reference claim for drag-observation (vanilla): requires observed host result and same-subject pinned reference evidence'
    )
  })

  it('rejects reference evidence for a different subject or revision', () => {
    const reference = {
      kind: 'reference' as const,
      artifact,
      subjectId: 'https://reactflow.dev/examples/other',
      revision: 'f'.repeat(40),
    }

    const invalid = {
      ...validProof,
      claim: 'reference-comparison' as const,
      hosts: Object.fromEntries(
        Object.entries(validProof.hosts).map(([host, result]) => [
          host,
          { ...result, evidence: [reference] },
        ])
      ),
    }

    expect(check([invalid])).toContain(
      'Unsupported reference claim for drag-observation (vanilla): requires observed host result and same-subject pinned reference evidence'
    )
  })

  it('accepts reference evidence bound to the subject and pinned revision for each host', () => {
    const reference = {
      kind: 'reference' as const,
      artifact,
      subjectId,
      revision,
    }

    const proof = {
      ...validProof,
      claim: 'reference-comparison' as const,
      hosts: Object.fromEntries(
        Object.entries(validProof.hosts).map(([host, result]) => [
          host,
          { ...result, evidence: [reference] },
        ])
      ),
    }

    expect(check([proof])).toStrictEqual([])
  })

  it('rejects reference claims when a host result is blocked', () => {
    const reference = {
      kind: 'reference' as const,
      artifact,
      subjectId,
      revision,
    }

    const invalid = {
      ...validProof,
      claim: 'reference-comparison' as const,
      hosts: {
        ...validProof.hosts,
        vue: { result: 'blocked' as const, evidence: [reference] },
      },
    }

    expect(check([invalid])).toContain(
      'Unsupported reference claim for drag-observation (vue): requires observed host result and same-subject pinned reference evidence'
    )
  })

  it('rejects unsupported complete claims for non-member subjects', () => {
    expect(check([{ ...validProof, claim: 'complete' as const }])).toContain(
      'Unsupported complete claim outside API member registry: drag-observation'
    )
  })

  it('rejects complete claims when authoritative API host status is partial', () => {
    const proof = completeProof
    expect(
      check([proof], apiCatalogWithMember(makeApiMember('partial')))
    ).toContain(
      'Unsupported complete claim for drag-observation (vanilla): API registry is partial'
    )
  })

  it('rejects complete claims without production-test and bound reference evidence', () => {
    expect(
      check([completeProof], apiCatalogWithMember(makeApiMember('complete')))
    ).toContain(
      'Unsupported complete claim for drag-observation (vanilla): missing host observation or reference evidence'
    )
  })

  it('rejects fabricated parity claims at schema decode', () => {
    expect(() =>
      decodeProofMatrix({
        ...matrix,
        proofs: [{ ...validProof, claim: 'parity' }],
      })
    ).toThrow('Expected "observation"')
  })

  it('rejects a missing supported-host result', () => {
    const { foldkit: _omitted, ...hosts } = validProof.hosts
    expect(check([{ ...validProof, hosts }])).toContain(
      'Missing host result for drag-observation (foldkit)'
    )
  })

  it('rejects duplicate API page and member subject keys', () => {
    const member = makeApiMember('partial')

    const page = {
      url: 'https://reactflow.dev/api-reference/react-flow',
      pinnedSourceRevision: revision,
      members: [member],
    }

    expect(
      check([validProof], { ...apiCatalog, pages: [page, page] })
    ).toContain(`Duplicate API page key: ${page.url}`)
    expect(
      check([validProof], {
        ...apiCatalog,
        pages: [{ ...page, members: [member, member] }],
      })
    ).toContain(`Duplicate API member subject key: ${page.url}#nodes`)
  })
})

import path from 'node:path'

import { BunRuntime, BunServices } from '@effect/platform-bun'
import { Effect, FileSystem, Path, Schema as S } from 'effect'

const Hosts = ['vanilla', 'vue', 'foldkit'] as const

const ProofEvidence = S.Struct({
  kind: S.Literals([
    'behavior',
    'visual',
    'accessibility',
    'performance',
    'production-test',
    'reference',
    'device',
    'collector',
  ]),
  artifact: S.NonEmptyString,
  subjectId: S.optional(S.NonEmptyString),
  revision: S.optional(S.NonEmptyString),
})

const HostResult = S.Struct({
  result: S.Literals(['observed', 'unverified', 'blocked']),
  evidence: S.Array(ProofEvidence),
})

const Proof = S.Struct({
  id: S.NonEmptyString,
  subject: S.Struct({
    kind: S.Literals(['api-member', 'example', 'ui']),
    id: S.NonEmptyString,
  }),
  claim: S.Literals(['observation', 'reference-comparison', 'complete']),
  inputKind: S.NonEmptyString,
  browser: S.Struct({
    name: S.NonEmptyString,
    version: S.NonEmptyString,
    device: S.NonEmptyString,
  }),
  upstream: S.Struct({
    revision: S.NonEmptyString,
    test: S.NonEmptyString,
  }),
  hosts: S.Record(S.String, HostResult),
})

const Matrix = S.Struct({
  schemaVersion: S.Literal(1),
  capturedOn: S.NonEmptyString,
  baselineCatalog: S.NonEmptyString,
  baselineCatalogCapturedOn: S.NonEmptyString,
  apiMemberCatalog: S.NonEmptyString,
  apiMemberCatalogCapturedOn: S.NonEmptyString,
  pinnedReferenceRevision: S.NonEmptyString,
  flowSourceRevision: S.NonEmptyString,
  flowSourceRevisionScope: S.Literal(
    'pre-commit-working-tree-based-on-recorded-commit'
  ),
  proofs: S.Array(Proof),
})

type ProofMatrix = typeof Matrix.Type

export const decodeProofMatrix = S.decodeUnknownSync(Matrix)

const DatedEntrySchema = S.Struct({
  kind: S.NonEmptyString,
  section: S.NonEmptyString,
  url: S.NonEmptyString,
})

const DatedCatalogSchema = S.Struct({
  capturedOn: S.NonEmptyString,
  entries: S.Array(DatedEntrySchema),
})

const ApiCatalogSchema = S.Struct({
  capturedOn: S.NonEmptyString,
  baselineCatalog: S.NonEmptyString,
  pages: S.Array(
    S.Struct({
      url: S.NonEmptyString,
      pinnedSourceRevision: S.NonEmptyString,
      members: S.Array(
        S.Struct({
          id: S.NonEmptyString,
          hosts: S.Record(
            S.Literals(Hosts),
            S.Struct({
              status: S.NonEmptyString,
              evidence: S.Array(S.Struct({ kind: S.NonEmptyString })),
            })
          ),
        })
      ),
    })
  ),
})

type DatedEntry = typeof DatedEntrySchema.Type

type CatalogMetadata = typeof DatedCatalogSchema.Type

type ApiCatalog = typeof ApiCatalogSchema.Type

const localArtifactPattern =
  /^(?<file>(?!\/)(?!\.\.\/)[^:#][^:]*\.[a-z0-9]+)(?::(?<lines>\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*))?$/u

const isWithinRepository = (
  repositoryRoot: string,
  candidate: string
): boolean => {
  if (repositoryRoot.length === 0) {
    return false
  }

  const relativePath = path.relative(repositoryRoot, candidate)

  return (
    relativePath !== '..' &&
    !relativePath.startsWith(
      `..${process.platform === 'win32' ? '\\' : '/'}`
    ) &&
    !path.isAbsolute(relativePath)
  )
}

const validateArtifact = (
  link: string,
  owner: string,
  files: ReadonlyMap<string, string>,
  realPaths: ReadonlyMap<string, string>,
  repositoryRoot: string,
  failures: string[]
): void => {
  if (link.includes('\\')) {
    failures.push(
      `Invalid local evidence artifact for ${owner}: backslash path`
    )

    return
  }

  const local = link.match(localArtifactPattern)

  if (local === null) {
    failures.push(`Invalid local evidence artifact for ${owner}: ${link}`)

    return
  }

  const file = local.groups?.file ?? ''

  if (file.split('/').includes('..')) {
    failures.push(`Evidence artifact escapes repository for ${owner}: ${link}`)

    return
  }

  const realPath = realPaths.get(file)

  if (realPath === undefined) {
    failures.push(`Missing evidence artifact for ${owner}: ${file}`)

    return
  }

  if (!isWithinRepository(repositoryRoot, realPath)) {
    failures.push(
      `Evidence artifact resolves outside repository for ${owner}: ${file}`
    )

    return
  }

  const contents = files.get(file)

  if (contents === undefined) {
    failures.push(`Missing evidence artifact for ${owner}: ${file}`)

    return
  }

  const lineCount =
    contents.split('\n').length - Number(contents.endsWith('\n'))

  for (const range of (local.groups?.lines ?? '')
    .split(',')
    .flatMap((item) => (item ? [item] : []))) {
    const [startText, endText] = range.split('-')
    const start = Number(startText)
    const end = Number(endText ?? startText)

    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 1 ||
      end < start ||
      end > lineCount
    ) {
      failures.push(`Invalid evidence line for ${owner}: ${link}`)

      return
    }
  }
}

interface ProofCheckContext {
  readonly files: ReadonlyMap<string, string>
  readonly realPaths: ReadonlyMap<string, string>
  readonly repositoryRoot: string
  readonly failures: string[]
}

type ApiMember = ApiCatalog['pages'][number]['members'][number]

const indexApiMembers = (
  catalog: ApiCatalog,
  pinnedRevision: string,
  failures: string[]
): Map<string, ApiMember> => {
  const members = new Map<string, ApiMember>()
  const pages = new Set<string>()

  for (const page of catalog.pages) {
    if (pages.has(page.url)) {
      failures.push(`Duplicate API page key: ${page.url}`)
    }

    pages.add(page.url)

    if (page.pinnedSourceRevision !== pinnedRevision) {
      failures.push(`Stale API page reference revision: ${page.url}`)
    }

    for (const member of page.members) {
      const key = `${page.url}#${member.id}`

      if (members.has(key)) {
        failures.push(`Duplicate API member subject key: ${key}`)
      }

      members.set(key, member)
    }
  }

  return members
}

const validateMetadata = (
  matrix: ProofMatrix,
  catalogMetadata: CatalogMetadata,
  apiCatalog: ApiCatalog,
  sourceCommitExists: boolean,
  failures: string[]
): void => {
  const expected = [
    ['baseline catalog', matrix.baselineCatalog, 'react-flow-2026-09-26.json'],
    ['API member registry', matrix.apiMemberCatalog, 'api-members.json'],
  ] as const

  for (const [label, actual, supported] of expected) {
    if (actual !== supported) {
      failures.push(`Unsupported ${label}: ${actual}`)
    }
  }

  if (matrix.baselineCatalogCapturedOn !== catalogMetadata.capturedOn) {
    failures.push(
      `Stale baseline catalog capture date: expected ${catalogMetadata.capturedOn}`
    )
  }

  if (matrix.apiMemberCatalogCapturedOn !== apiCatalog.capturedOn) {
    failures.push(
      `Stale API member catalog capture date: expected ${apiCatalog.capturedOn}`
    )
  }

  if (apiCatalog.baselineCatalog !== matrix.baselineCatalog) {
    failures.push(
      `API member catalog baseline mismatch: expected ${matrix.baselineCatalog}`
    )
  }

  if (!/^\d{4}-\d{2}-\d{2}$/u.test(matrix.capturedOn)) {
    failures.push(`Invalid proof matrix capture date: ${matrix.capturedOn}`)
  }

  if (!/^[0-9a-f]{40}$/u.test(matrix.pinnedReferenceRevision)) {
    failures.push(
      `Invalid pinned reference revision: ${matrix.pinnedReferenceRevision}`
    )
  }

  if (
    !/^(?:[0-9a-f]{40}|working-tree@[0-9a-f]{40})$/u.test(
      matrix.flowSourceRevision
    )
  ) {
    failures.push(`Invalid Flow source revision: ${matrix.flowSourceRevision}`)
  }

  if (!sourceCommitExists) {
    failures.push(
      `Unknown Flow source commit: ${matrix.flowSourceRevision.replace(/^working-tree@/u, '')}`
    )
  }
}

const validateSubject = (
  proof: ProofMatrix['proofs'][number],
  catalogEntries: readonly DatedEntry[],
  capabilityUrls: ReadonlySet<string>,
  apiMembers: ReadonlyMap<string, ApiMember>,
  failures: string[]
): void => {
  if (proof.subject.kind === 'api-member') {
    if (!apiMembers.has(proof.subject.id)) {
      failures.push(`Unknown API member subject: ${proof.subject.id}`)
    }

    return
  }

  if (!capabilityUrls.has(proof.subject.id)) {
    failures.push(`Unknown catalog subject: ${proof.subject.id}`)

    return
  }

  const expectedSection = proof.subject.kind === 'example' ? 'examples' : 'ui'

  const correctKind = catalogEntries.some(
    ({ kind, section, url }) =>
      kind === 'capability' &&
      url === proof.subject.id &&
      section === expectedSection
  )

  if (!correctKind) {
    failures.push(`Catalog subject has wrong kind: ${proof.subject.id}`)
  }
}

const hasReferenceEvidence = (
  proof: ProofMatrix['proofs'][number],
  evidence: readonly (typeof ProofEvidence.Type)[]
): boolean =>
  evidence.some(
    ({ kind, subjectId, revision }) =>
      kind === 'reference' &&
      subjectId === proof.subject.id &&
      revision === proof.upstream.revision
  )

const validateHostResults = (
  proof: ProofMatrix['proofs'][number],
  context: ProofCheckContext
): void => {
  for (const host of Hosts) {
    const result = proof.hosts[host]

    if (result === undefined) {
      context.failures.push(`Missing host result for ${proof.id} (${host})`)
      continue
    }

    if (result.evidence.length === 0) {
      context.failures.push(`Absent evidence for ${proof.id} (${host})`)
    }

    if (
      proof.claim === 'reference-comparison' &&
      (result.result !== 'observed' ||
        !hasReferenceEvidence(proof, result.evidence))
    ) {
      context.failures.push(
        `Unsupported reference claim for ${proof.id} (${host}): requires observed host result and same-subject pinned reference evidence`
      )
    }

    for (const item of result.evidence) {
      if (item.kind === 'reference' && (!item.subjectId || !item.revision)) {
        context.failures.push(
          `Unbound reference evidence for ${proof.id} (${host})`
        )
      }

      validateArtifact(
        item.artifact,
        `${proof.id} (${host})`,
        context.files,
        context.realPaths,
        context.repositoryRoot,
        context.failures
      )
    }
  }

  for (const key of Object.keys(proof.hosts)) {
    if (!Hosts.some((host) => host === key)) {
      context.failures.push(`Unknown host result for ${proof.id}: ${key}`)
    }
  }
}

const validateCompleteClaim = (
  proof: ProofMatrix['proofs'][number],
  apiMembers: ReadonlyMap<string, ApiMember>,
  failures: string[]
): void => {
  if (proof.claim !== 'complete') {
    return
  }

  const member =
    proof.subject.kind === 'api-member'
      ? apiMembers.get(proof.subject.id)
      : undefined

  if (member === undefined) {
    failures.push(
      `Unsupported complete claim outside API member registry: ${proof.id}`
    )

    return
  }

  for (const host of Hosts) {
    const result = proof.hosts[host]
    const authoritative = member.hosts[host]

    if (authoritative.status !== 'complete') {
      failures.push(
        `Unsupported complete claim for ${proof.id} (${host}): API registry is ${authoritative.status}`
      )
    }

    if (
      result?.result !== 'observed' ||
      !result.evidence.some(({ kind }) => kind === 'production-test') ||
      !hasReferenceEvidence(proof, result.evidence)
    ) {
      failures.push(
        `Unsupported complete claim for ${proof.id} (${host}): missing host observation or reference evidence`
      )
    }
  }
}

const validateProof = (
  proof: ProofMatrix['proofs'][number],
  context: ProofCheckContext,
  catalogEntries: readonly DatedEntry[],
  capabilityUrls: ReadonlySet<string>,
  apiMembers: ReadonlyMap<string, ApiMember>,
  pinnedRevision: string
): void => {
  validateSubject(
    proof,
    catalogEntries,
    capabilityUrls,
    apiMembers,
    context.failures
  )

  if (proof.upstream.revision !== pinnedRevision) {
    context.failures.push(`Upstream revision mismatch for ${proof.id}`)
  }

  validateArtifact(
    proof.upstream.test,
    proof.id,
    context.files,
    context.realPaths,
    context.repositoryRoot,
    context.failures
  )
  validateHostResults(proof, context)
  validateCompleteClaim(proof, apiMembers, context.failures)
}

export const checkProofMatrix = (
  matrix: ProofMatrix,
  catalogEntries: readonly DatedEntry[],
  catalogMetadata: CatalogMetadata,
  apiCatalog: ApiCatalog,
  files: ReadonlyMap<string, string>,
  realPaths: ReadonlyMap<string, string> = new Map(),
  repositoryRoot = 'repository-root',
  sourceCommitExists = false
): string[] => {
  const failures: string[] = []

  const apiMembers = indexApiMembers(
    apiCatalog,
    matrix.pinnedReferenceRevision,
    failures
  )

  validateMetadata(
    matrix,
    catalogMetadata,
    apiCatalog,
    sourceCommitExists,
    failures
  )
  const context = { files, realPaths, repositoryRoot, failures }

  const capabilityUrls = new Set(
    catalogEntries.flatMap(({ kind, url }) =>
      kind === 'capability' ? [url] : []
    )
  )

  const seen = new Set<string>()

  for (const proof of matrix.proofs) {
    if (seen.has(proof.id)) {
      failures.push(`Duplicate proof id: ${proof.id}`)
    }

    seen.add(proof.id)
    validateProof(
      proof,
      context,
      catalogEntries,
      capabilityUrls,
      apiMembers,
      matrix.pinnedReferenceRevision
    )
  }

  return failures
}

const program = Effect.gen(function* checkProofMatrixEffect() {
  const fileSystem = yield* FileSystem.FileSystem
  const filePath = yield* Path.Path
  const root = yield* filePath.fromFileUrl(new URL('..', import.meta.url))

  const matrix = yield* S.decodeUnknownEffect(Matrix)(
    JSON.parse(
      yield* fileSystem.readFileString(
        filePath.join(root, 'research/catalogs/proof-matrix.json')
      )
    )
  )

  const datedCatalog = yield* S.decodeUnknownEffect(DatedCatalogSchema)(
    JSON.parse(
      yield* fileSystem.readFileString(
        filePath.join(root, `research/catalogs/${matrix.baselineCatalog}`)
      )
    )
  )

  const apiCatalog = yield* S.decodeUnknownEffect(ApiCatalogSchema)(
    JSON.parse(
      yield* fileSystem.readFileString(
        filePath.join(root, `research/catalogs/${matrix.apiMemberCatalog}`)
      )
    )
  )

  const files = new Map<string, string>()
  const realPaths = new Map<string, string>()
  const rootRealPath = yield* fileSystem.realPath(root)

  const flowBaseRevision = matrix.flowSourceRevision.replace(
    /^working-tree@/u,
    ''
  )

  const gitCommit = Bun.spawnSync(
    ['git', 'cat-file', '-e', `${flowBaseRevision}^{commit}`],
    { cwd: root }
  )

  const sourceCommitExists = gitCommit.exitCode === 0

  for (const proof of matrix.proofs) {
    const links = [
      proof.upstream.test,
      ...Hosts.flatMap(
        (host) =>
          proof.hosts[host]?.evidence.map(({ artifact }) => artifact) ?? []
      ),
    ]

    for (const link of links) {
      const local = link.match(localArtifactPattern)
      const file = local?.groups?.file

      if (file === undefined || files.has(file)) {
        continue
      }

      const resolved = filePath.resolve(root, file)

      if (yield* fileSystem.exists(resolved)) {
        const realPath = yield* fileSystem.realPath(resolved)
        realPaths.set(file, realPath)
        const realRelativePath = filePath.relative(rootRealPath, realPath)

        if (
          realRelativePath !== '..' &&
          !realRelativePath.startsWith(
            `..${process.platform === 'win32' ? '\\' : '/'}`
          ) &&
          !filePath.isAbsolute(realRelativePath)
        ) {
          files.set(file, yield* fileSystem.readFileString(resolved))
        }
      }
    }
  }

  const failures = checkProofMatrix(
    matrix,
    datedCatalog.entries,
    datedCatalog,
    apiCatalog,
    files,
    realPaths,
    rootRealPath,
    sourceCommitExists
  )

  if (failures.length > 0) {
    return yield* Effect.die(new Error(failures.join('\n')))
  }

  yield* Effect.log(`Validated ${matrix.proofs.length} scoped proof records`)
})

if (import.meta.main) {
  BunRuntime.runMain(program.pipe(Effect.provide(BunServices.layer)))
}

import { BunRuntime, BunServices } from '@effect/platform-bun'
import { Effect, FileSystem, Path, Schema as S } from 'effect'

const Evidence = S.Struct({
  kind: S.Literals([
    'implementation',
    'production-test',
    'reference',
    'correspondence',
  ]),
  link: S.NonEmptyString,
})

const HostMapping = S.Struct({
  status: S.Literals(['complete', 'partial', 'gap', 'unassessed']),
  equivalent: S.NonEmptyString,
  evidence: S.Array(Evidence),
})

const Member = S.Struct({
  id: S.NonEmptyString,
  kind: S.Literals([
    'prop',
    'method',
    'type-variant',
    'hook-behavior',
    'component-contract',
  ]),
  inventorySource: S.Literals([
    'official-docs-table',
    'current-site-member',
    'pinned-declaration',
    'existing-correspondence',
  ]),
  description: S.NonEmptyString,
  rawSourceRow: S.optional(S.NonEmptyString),
  remainingDecision: S.NonEmptyString,
  ownerPlan: S.NonEmptyString,
  upstreamAnchor: S.String,
  hosts: S.Struct({
    vanilla: HostMapping,
    vue: HostMapping,
    foldkit: HostMapping,
  }),
})

const Page = S.Struct({
  url: S.NonEmptyString,
  title: S.NonEmptyString,
  sourceCheckedOn: S.NonEmptyString,
  upstreamUpdatedOn: S.NonEmptyString,
  pinnedSourceRevision: S.NonEmptyString,
  currentSiteEvidence: S.Array(S.NonEmptyString),
  upstreamAnchors: S.Array(S.NonEmptyString),
  members: S.Array(Member),
})

export const ApiMemberCatalogSchema = S.Struct({
  capturedOn: S.NonEmptyString,
  baselineCatalog: S.NonEmptyString,
  captureCounts: S.Struct({
    apiCapabilityPages: S.Number,
    officialDocsTableRows: S.Number,
    componentMemberRows: S.Number,
    pinnedDeclarationRecords: S.Number,
  }),
  normalizedMemberCounts: S.Struct({
    existingCorrespondence: S.Number,
    officialDocsTable: S.Number,
    pinnedDeclaration: S.Number,
    currentSiteMember: S.Number,
  }),
  pages: S.Array(Page),
})

const DatedCatalog = S.Struct({
  entries: S.Array(
    S.Struct({
      kind: S.String,
      section: S.String,
      url: S.String,
    })
  ),
})

type ApiMember = typeof Member.Type

type ApiPage = typeof Page.Type

type MemberCountKeys =
  | 'existingCorrespondence'
  | 'officialDocsTable'
  | 'pinnedDeclaration'
  | 'currentSiteMember'

const memberSourceCountKey: Record<
  ApiMember['inventorySource'],
  MemberCountKeys
> = {
  'existing-correspondence': 'existingCorrespondence',
  'official-docs-table': 'officialDocsTable',
  'pinned-declaration': 'pinnedDeclaration',
  'current-site-member': 'currentSiteMember',
}

const localEvidencePattern =
  /^(?<file>(?!\.\.\/)[^:#][^:]*\.[a-z0-9]+)(?::(?<lines>\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*))?$/u

const hostNames = ['vanilla', 'vue', 'foldkit'] as const

export const checkEvidenceLink = (
  memberId: string,
  link: string,
  files: ReadonlyMap<string, string>,
  failures: string[]
): void => {
  const local = link.match(localEvidencePattern)

  if (local === null) {
    let validHttps = false

    try {
      const url = new URL(link)
      validHttps =
        url.protocol === 'https:' &&
        ['reactflow.dev', 'github.com'].includes(url.hostname)
    } catch {
      validHttps = false
    }

    if (!validHttps) {
      failures.push(`Invalid evidence link for ${memberId}: ${link}`)
    }

    return
  }

  const file = local.groups?.file ?? ''

  if (file.startsWith('/') || file.split('/').includes('..')) {
    failures.push(`Evidence link escapes repository for ${memberId}: ${link}`)

    return
  }

  const contents = files.get(file)

  if (contents === undefined) {
    failures.push(`Missing evidence file for ${memberId}: ${file}`)

    return
  }

  const lineCount = contents.split('\n').length
  const lineRefs = (local.groups?.lines ?? '').split(',').filter(Boolean)

  for (const lineRef of lineRefs) {
    const [startText, endText] = lineRef.split('-')
    const start = Number(startText)
    const end = Number(endText ?? startText)

    if (
      !Number.isInteger(start) ||
      !Number.isInteger(end) ||
      start < 1 ||
      end < start ||
      end > lineCount
    ) {
      failures.push(`Invalid evidence line for ${memberId}: ${link}`)

      return
    }
  }
}

const checkHost = (
  page: ApiPage,
  member: ApiMember,
  hostName: (typeof hostNames)[number],
  files: ReadonlyMap<string, string>,
  failures: string[]
): void => {
  const host = member.hosts[hostName]
  const evidenceKinds = new Set(host.evidence.map(({ kind }) => kind))

  if (host.status === 'complete') {
    for (const required of [
      'implementation',
      'production-test',
      'reference',
    ] as const) {
      if (!evidenceKinds.has(required)) {
        failures.push(
          `Unsupported complete claim for ${member.id} (${hostName}): missing ${required} evidence`
        )
      }
    }

    const implementation = host.evidence.find(
      ({ kind }) => kind === 'implementation'
    )

    if (
      implementation === undefined ||
      localEvidencePattern.test(implementation.link) === false
    ) {
      failures.push(
        `Unsupported complete claim for ${member.id} (${hostName}): implementation evidence must cite a repository file`
      )
    }

    const productionTest = host.evidence.find(
      ({ kind }) => kind === 'production-test'
    )

    if (
      productionTest === undefined ||
      localEvidencePattern.test(productionTest.link) === false ||
      !/(?:\.test|\.e2e)\./u.test(productionTest.link)
    ) {
      failures.push(
        `Unsupported complete claim for ${member.id} (${hostName}): production-test evidence must cite a test file`
      )
    }

    const expectedReference = `${page.url}${member.upstreamAnchor}`

    if (
      !host.evidence.some(
        ({ kind, link }) =>
          kind === 'reference' &&
          (link === expectedReference ||
            (member.upstreamAnchor === '' && link === page.url))
      )
    ) {
      failures.push(
        `Unsupported complete claim for ${member.id} (${hostName}): reference evidence must cite its upstream member`
      )
    }
  }

  for (const evidence of host.evidence) {
    checkEvidenceLink(member.id, evidence.link, files, failures)
  }
}

const checkMember = (
  page: ApiPage,
  member: ApiMember,
  knownPlanIds: ReadonlySet<string>,
  files: ReadonlyMap<string, string>,
  failures: string[]
): void => {
  const rowTypePrefix = member.description
    .slice(member.id.length)
    .match(
      /^(?:boolean|number|string|unknown|any|void|ReactNode|Node(?:Type)?(?:\[|\b)|Edge(?:Type)?(?:\[|\b)|[A-Z][A-Za-z0-9_]*(?:\[|<))/u
    )

  const appearsConcatenated =
    member.description.startsWith(member.id) &&
    rowTypePrefix !== null &&
    !member.description.startsWith('Unparsed captured row:')

  if (appearsConcatenated && member.rawSourceRow === undefined) {
    failures.push(
      `Obviously concatenated member description lacks rawSourceRow: ${member.id} (${page.url})`
    )
  }

  if (
    member.rawSourceRow !== undefined &&
    !member.description.startsWith('Unparsed captured row:')
  ) {
    failures.push(
      `Unparsed row must use an explicit label: ${member.id} (${page.url})`
    )
  }

  if (
    member.description.startsWith('Unparsed captured row:') &&
    member.rawSourceRow === undefined
  ) {
    failures.push(
      `Unparsed row is missing rawSourceRow: ${member.id} (${page.url})`
    )
  }

  const ownerPlanId = member.ownerPlan.match(/^(?<plan>0\d{2})$/u)?.groups?.plan

  if (ownerPlanId === undefined || !knownPlanIds.has(ownerPlanId)) {
    failures.push(`Invalid or missing owner plan for ${member.id}: ${page.url}`)
  }

  if (
    member.upstreamAnchor !== '' &&
    (!/^#[a-z0-9_][a-z0-9_-]*$/u.test(member.upstreamAnchor) ||
      !page.upstreamAnchors.includes(member.upstreamAnchor))
  ) {
    failures.push(
      `Invalid upstream member anchor for ${member.id}: ${page.url}`
    )
  }

  for (const hostName of hostNames) {
    checkHost(page, member, hostName, files, failures)
  }
}

export const checkApiMembers = (
  pages: readonly ApiPage[],
  expectedUrls: readonly string[],
  knownPlanIds: ReadonlySet<string>,
  files: ReadonlyMap<string, string>
): string[] => {
  const failures: string[] = []
  const expected = new Set(expectedUrls)
  const seenPages = new Set<string>()

  if (expected.size !== expectedUrls.length) {
    failures.push('Duplicate API capability URL in dated catalog')
  }

  for (const page of pages) {
    if (seenPages.has(page.url)) {
      failures.push(`Duplicate API page: ${page.url}`)
    }

    seenPages.add(page.url)

    if (!expected.has(page.url)) {
      failures.push(`Unowned API page: ${page.url}`)
    }

    if (page.members.length === 0) {
      failures.push(`API page has no member inventory: ${page.url}`)
    }

    const memberIds = new Set<string>()

    for (const member of page.members) {
      const key = member.id.toLocaleLowerCase('en-US')

      if (memberIds.has(key)) {
        failures.push(`Duplicate member ${member.id}: ${page.url}`)
      }

      memberIds.add(key)
      checkMember(page, member, knownPlanIds, files, failures)
    }
  }

  for (const url of expected) {
    if (!seenPages.has(url)) {
      failures.push(`Missing API page inventory: ${url}`)
    }
  }

  return failures
}

const program = Effect.gen(function* checkApiMembersEffect() {
  const fileSystem = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const root = yield* path.fromFileUrl(new URL('..', import.meta.url))

  const catalog = yield* S.decodeUnknownEffect(ApiMemberCatalogSchema)(
    JSON.parse(
      yield* fileSystem.readFileString(
        path.join(root, 'research/catalogs/api-members.json')
      )
    )
  )

  const datedCatalog = yield* S.decodeUnknownEffect(DatedCatalog)(
    JSON.parse(
      yield* fileSystem.readFileString(
        path.join(root, 'research/catalogs/react-flow-2026-09-26.json')
      )
    )
  )

  const expectedUrls = datedCatalog.entries
    .filter(
      ({ kind, section }) =>
        kind === 'capability' && section === 'api-reference'
    )
    .map(({ url }) => url)

  const files = new Map<string, string>()
  const planFiles = yield* fileSystem.readDirectory(path.join(root, 'plans'))

  const knownPlanIds = new Set(
    planFiles
      .map((name) => name.match(/^(?<plan>0\d{2})-.+\.md$/u)?.groups?.plan)
      .filter((plan): plan is string => plan !== undefined)
  )

  for (const page of catalog.pages) {
    for (const member of page.members) {
      for (const hostName of hostNames) {
        for (const evidence of member.hosts[hostName].evidence) {
          const file = evidence.link.match(localEvidencePattern)?.groups?.file

          if (file === undefined || files.has(file)) {
            continue
          }

          const resolved = path.resolve(root, file)

          if (yield* fileSystem.exists(resolved)) {
            files.set(file, yield* fileSystem.readFileString(resolved))
          }
        }
      }
    }
  }

  const failures = checkApiMembers(
    catalog.pages,
    expectedUrls,
    knownPlanIds,
    files
  )

  const normalizedCounts = {
    existingCorrespondence: 0,
    officialDocsTable: 0,
    pinnedDeclaration: 0,
    currentSiteMember: 0,
  }

  for (const page of catalog.pages) {
    for (const member of page.members) {
      const key = memberSourceCountKey[member.inventorySource]
      normalizedCounts[key] += 1
    }
  }

  const countEntries = [
    ['existingCorrespondence', normalizedCounts.existingCorrespondence],
    ['officialDocsTable', normalizedCounts.officialDocsTable],
    ['pinnedDeclaration', normalizedCounts.pinnedDeclaration],
    ['currentSiteMember', normalizedCounts.currentSiteMember],
  ] as const

  for (const [source, count] of countEntries) {
    if (catalog.normalizedMemberCounts[source] !== count) {
      failures.push(`Inventory source count mismatch for ${source}`)
    }
  }

  if (failures.length > 0) {
    return yield* Effect.die(new Error(failures.join('\n')))
  }

  let memberCount = 0

  for (const page of catalog.pages) {
    memberCount += page.members.length
  }

  yield* Effect.log(
    `Validated ${catalog.pages.length} API pages and ${memberCount} members`
  )
})

if (import.meta.main) {
  BunRuntime.runMain(program.pipe(Effect.provide(BunServices.layer)))
}

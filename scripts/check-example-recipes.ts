import { readFileSync, realpathSync, statSync } from 'node:fs'
import { readFile } from 'node:fs/promises'
import pathModule from 'node:path'

import { Schema as S } from 'effect'

const baselinePath = 'research/catalogs/react-flow-2026-09-26.json'

const registryPath = 'research/catalogs/example-recipes.json'

const hosts = ['vanilla', 'vue', 'foldkit'] as const

const Host = S.Literals(hosts)

const HostRoute = S.Struct({
  path: S.NonEmptyString,
  status: S.Literals(['planned', 'runnable']),
  sourcePath: S.optional(S.NonEmptyString),
})

const TestResult = S.Struct({
  status: S.Literals(['not-tested', 'partial', 'tested']),
  path: S.NullOr(S.String),
})

const HostRoutes = S.Struct({
  vanilla: HostRoute,
  vue: HostRoute,
  foldkit: HostRoute,
})

const HostResults = S.Struct({
  vanilla: TestResult,
  vue: TestResult,
  foldkit: TestResult,
})

const ReferenceEvidence = S.Struct({
  type: S.Literals(['artifact', 'trace']),
  path: S.NonEmptyString,
})

const ApiEvidence = S.Struct({
  api: S.NonEmptyString,
  path: S.NonEmptyString,
})

const Recipe = S.Struct({
  url: S.NonEmptyString,
  title: S.NonEmptyString,
  listedPro: S.Boolean,
  family: S.NonEmptyString,
  journey: S.NonEmptyString,
  observableResult: S.NonEmptyString,
  publicApis: S.Array(S.NonEmptyString),
  apiEvidence: S.optional(S.Array(ApiEvidence)),
  apiValidation: S.Literals(['pending', 'validated']),
  dependencyDecision: S.Literals(['none-identified', 'pending', 'approved']),
  testBoundary: S.Struct({
    automated: S.NonEmptyString,
    manual: S.NonEmptyString,
  }),
  hostRoutes: HostRoutes,
  resetBehavior: S.NonEmptyString,
  optionalDependencies: S.NonEmptyString,
  reference: S.Struct({
    availability: S.NonEmptyString,
    licenseReview: S.NonEmptyString,
    comparison: S.Literals(['unverified', 'compared', 'different']),
    evidence: S.optional(ReferenceEvidence),
  }),
  implementedRecipe: S.Literals(['none', 'partial', 'complete']),
  testedResult: HostResults,
  acceptanceClaim: S.Literals(['planned', 'implemented', 'complete']),
})

const Registry = S.Struct({
  version: S.Number,
  baseline: S.NonEmptyString,
  hosts: S.Array(Host),
  entries: S.Array(Recipe),
})

const Baseline = S.Struct({
  entries: S.Array(
    S.Struct({
      section: S.String,
      kind: S.String,
      url: S.NonEmptyString,
      title: S.NonEmptyString,
      listedPro: S.Boolean,
    })
  ),
})

const Allocation = S.Struct({
  entries: S.Array(
    S.Struct({
      section: S.String,
      kind: S.String,
      url: S.NonEmptyString,
      family: S.NonEmptyString,
      ownerPlan: S.String,
    })
  ),
})

export type ExampleRecipeRegistry = typeof Registry.Type

type BaselineEntry = (typeof Baseline.Type.entries)[number]

type ExampleRecipe = typeof Recipe.Type

type AllocationEntry = (typeof Allocation.Type.entries)[number]

const repositoryRoot = process.cwd()

const isRealFileWithin = (path: string, root: string): boolean => {
  if (
    pathModule.isAbsolute(path) ||
    path.includes('\\') ||
    path.includes('%')
  ) {
    return false
  }

  const segments = path.split('/')

  if (
    !path.startsWith(`${root}/`) ||
    segments.some(
      (segment) => segment === '' || segment === '.' || segment === '..'
    )
  ) {
    return false
  }

  try {
    const rootPath = realpathSync(pathModule.resolve(repositoryRoot, root))
    const filePath = realpathSync(pathModule.resolve(repositoryRoot, path))
    const fromRoot = pathModule.relative(rootPath, filePath)
    const parentPrefix = `..${process.platform === 'win32' ? '\\' : '/'}`

    return (
      fromRoot !== '' &&
      fromRoot !== '..' &&
      !fromRoot.startsWith(parentPrefix) &&
      !pathModule.isAbsolute(fromRoot) &&
      statSync(filePath).isFile()
    )
  } catch {
    return false
  }
}

const isRepositoryFile = (path: string): boolean => {
  if (
    path.length === 0 ||
    pathModule.isAbsolute(path) ||
    path.includes('\\') ||
    path.includes('%') ||
    path
      .split('/')
      .some((segment) => segment === '' || segment === '.' || segment === '..')
  ) {
    return false
  }

  try {
    const rootPath = realpathSync(repositoryRoot)
    const filePath = realpathSync(pathModule.resolve(repositoryRoot, path))
    const fromRoot = pathModule.relative(rootPath, filePath)
    const parentPrefix = `..${process.platform === 'win32' ? '\\' : '/'}`

    return (
      fromRoot !== '' &&
      fromRoot !== '..' &&
      !fromRoot.startsWith(parentPrefix) &&
      !pathModule.isAbsolute(fromRoot) &&
      statSync(filePath).isFile()
    )
  } catch {
    return false
  }
}

const containsApiIdentifier = (contents: string, api: string): boolean => {
  const escaped = api.replaceAll(/[.*+?^${}()|[\]\\]/gu, '\\$&')

  return new RegExp(
    `(?:^|[^\\p{L}\\p{N}_$])${escaped}(?:$|[^\\p{L}\\p{N}_$])`,
    'u'
  ).test(contents)
}

const validateApiEvidence = (entry: ExampleRecipe): readonly string[] => {
  const failures: string[] = []
  const label = entry.url
  const evidence = entry.apiEvidence ?? []
  const byApi = new Map(evidence.map((item) => [item.api, item]))

  if (byApi.size !== evidence.length) {
    failures.push(`Duplicate API evidence records: ${label}`)
  }

  for (const api of entry.publicApis) {
    const item = byApi.get(api)

    if (!item) {
      failures.push(`Missing API evidence for ${api}: ${label}`)
      continue
    }

    if (!isRepositoryFile(item.path)) {
      failures.push(`Invalid API evidence file for ${api}: ${label}`)
      continue
    }

    if (
      !containsApiIdentifier(
        readFileSync(pathModule.resolve(repositoryRoot, item.path), 'utf-8'),
        api
      )
    ) {
      failures.push(`API evidence file does not reference ${api}: ${label}`)
    }
  }

  for (const api of byApi.keys()) {
    if (!entry.publicApis.includes(api)) {
      failures.push(
        `API evidence is not listed in publicApis (${api}): ${label}`
      )
    }
  }

  return failures
}

const isHostTestPath = (host: (typeof hosts)[number], path: string | null) => {
  if (!path || path.includes('\\') || path.includes('%')) {
    return false
  }

  const prefix = `apps/${host}/e2e/`
  const file = path.slice(prefix.length)
  const segments = path.split('/')

  return (
    path.startsWith(prefix) &&
    file.length > 0 &&
    file.endsWith('.e2e.ts') &&
    segments.every(
      (segment) => segment !== '' && segment !== '.' && segment !== '..'
    )
  )
}

const allHostsRouted = (entry: ExampleRecipe): boolean =>
  hosts.every((host) => {
    const route = entry.hostRoutes[host]

    return (
      route?.status === 'runnable' &&
      route.sourcePath !== undefined &&
      isRealFileWithin(route.sourcePath, `apps/${host}/src`)
    )
  })

const allHostsTested = (entry: ExampleRecipe): boolean =>
  hosts.every((host) => {
    const result = entry.testedResult[host]

    return (
      result?.status === 'tested' &&
      result.path !== null &&
      isHostTestPath(host, result.path) &&
      isRealFileWithin(result.path, `apps/${host}/e2e`)
    )
  })

const isResearchEvidencePath = (
  type: 'artifact' | 'trace',
  path: string
): boolean => {
  const root = type === 'artifact' ? 'research/artifacts/' : 'research/traces/'
  const segments = path.split('/')

  return (
    path.startsWith(root) &&
    !path.startsWith('/') &&
    !path.includes('\\') &&
    !path.includes('%') &&
    segments.every(
      (segment) => segment !== '' && segment !== '.' && segment !== '..'
    ) &&
    isRealFileWithin(path, root.slice(0, -1))
  )
}

const isLocalRoutePath = (path: string): boolean => {
  if (
    !path.startsWith('/') ||
    path.startsWith('//') ||
    path.includes('\\') ||
    path.includes('%')
  ) {
    return false
  }

  const [pathOnly = ''] = path.split(/[?#]/u, 1)
  const segments = pathOnly.slice(1).split('/')

  return segments.every((segment) => segment !== '.' && segment !== '..')
}

const validateAcceptanceClaim = (entry: ExampleRecipe): readonly string[] => {
  const failures: string[] = []
  const label = entry.url

  if (entry.acceptanceClaim === 'complete' && !allHostsRouted(entry)) {
    failures.push(
      `Complete claim missing runnable route for a supported host: ${label}`
    )
  }

  if (entry.acceptanceClaim === 'complete' && !allHostsTested(entry)) {
    failures.push(
      `Complete claim missing test evidence for a supported host: ${label}`
    )
  }

  if (
    entry.acceptanceClaim === 'complete' &&
    entry.implementedRecipe !== 'complete'
  ) {
    failures.push(
      `Complete acceptance claim requires a complete implemented recipe: ${label}`
    )
  }

  if (
    entry.acceptanceClaim === 'implemented' &&
    entry.implementedRecipe === 'none'
  ) {
    failures.push(
      `Implemented acceptance claim requires an implemented recipe: ${label}`
    )
  }

  if (
    entry.acceptanceClaim === 'complete' &&
    entry.apiValidation !== 'validated'
  ) {
    failures.push(
      `Complete acceptance claim requires validated public APIs: ${label}`
    )
  }

  if (entry.acceptanceClaim === 'complete') {
    failures.push(...validateApiEvidence(entry))
  }

  if (
    entry.implementedRecipe === 'complete' &&
    entry.acceptanceClaim !== 'complete'
  ) {
    failures.push(
      `Complete implementation requires a complete acceptance claim: ${label}`
    )
  }

  return failures
}

const validateReferenceClaim = (entry: ExampleRecipe): readonly string[] => {
  if (
    entry.reference.comparison === 'unverified' ||
    (entry.reference.evidence &&
      isResearchEvidencePath(
        entry.reference.evidence.type,
        entry.reference.evidence.path
      ))
  ) {
    return []
  }

  return [
    `Reference proof claim requires a research artifact or trace path: ${entry.url}`,
  ]
}

const validateHostResults = (entry: ExampleRecipe): readonly string[] => {
  const failures: string[] = []
  const label = entry.url

  for (const host of hosts) {
    const route = entry.hostRoutes[host]
    const result = entry.testedResult[host]

    if (!route) {
      failures.push(`Missing ${host} route record: ${label}`)
    } else if (!isLocalRoutePath(route.path)) {
      failures.push(`Invalid ${host} route: ${label}`)
    }

    if (
      route?.status === 'runnable' &&
      (!route.sourcePath ||
        !isRealFileWithin(route.sourcePath, `apps/${host}/src`))
    ) {
      failures.push(
        `Runnable ${host} route requires an existing in-scope source file: ${label}`
      )
    }

    if (!result) {
      failures.push(`Missing ${host} test-boundary record: ${label}`)
      continue
    }

    if (result.status === 'not-tested' && result.path !== null) {
      failures.push(
        `Not-tested ${host} result must have a null test path: ${label}`
      )
    }

    if (result.status !== 'not-tested') {
      if (!isHostTestPath(host, result.path)) {
        failures.push(
          `${result.status === 'tested' ? 'Tested' : 'Partial'} ${host} result requires a host-scoped E2E test path: ${label}`
        )
      } else if (
        result.path &&
        !isRealFileWithin(result.path, `apps/${host}/e2e`)
      ) {
        failures.push(`Missing in-scope ${host} E2E file: ${label}`)
      }
    }
  }

  return failures
}

const validateClaim = (entry: ExampleRecipe): readonly string[] => [
  ...validateAcceptanceClaim(entry),
  ...validateReferenceClaim(entry),
  ...validateHostResults(entry),
]

const validateInventoryDecision = (entry: ExampleRecipe): readonly string[] => {
  const failures: string[] = []

  const dependencyIsPending = /decision pending/iu.test(
    entry.optionalDependencies
  )

  if (dependencyIsPending !== (entry.dependencyDecision === 'pending')) {
    failures.push(
      `Dependency decision does not match its recorded rationale: ${entry.url}`
    )
  }

  if (entry.testBoundary.automated.length < 20) {
    failures.push(`Automated test boundary is underspecified: ${entry.url}`)
  }

  if (entry.testBoundary.manual.length < 20) {
    failures.push(`Manual test boundary is underspecified: ${entry.url}`)
  }

  return failures
}

const genericDescriptionPatterns = [
  /^Exercise the .+ behavior through its visible controls or public host API\./u,
  /^The rendered .+ outcome matches the accepted graph and interaction state/u,
  /^Use the .+ controls to change graph grouping or layout/u,
  /^Accepted parent-relative positions and edge endpoints remain valid;/u,
  /^The visible selection or drawing matches the gesture/u,
]

const validateDescriptionSpecificity = (
  entries: readonly ExampleRecipe[]
): readonly string[] => {
  const failures: string[] = []
  const journeys = new Set(entries.map((entry) => entry.journey))
  const results = new Set(entries.map((entry) => entry.observableResult))

  if (journeys.size !== entries.length) {
    failures.push('Example journeys must be specific to each catalog entry')
  }

  if (results.size !== entries.length) {
    failures.push('Observable results must be specific to each catalog entry')
  }

  for (const entry of entries) {
    if (
      genericDescriptionPatterns.some((pattern) => pattern.test(entry.journey))
    ) {
      failures.push(`Generic journey template: ${entry.url}`)
    }

    if (
      genericDescriptionPatterns.some((pattern) =>
        pattern.test(entry.observableResult)
      )
    ) {
      failures.push(`Generic result template: ${entry.url}`)
    }
  }

  return failures
}

export const checkExampleRecipes = (
  baseline: readonly BaselineEntry[],
  registry: ExampleRecipeRegistry,
  allocation: readonly AllocationEntry[]
): readonly string[] => {
  const failures: string[] = []

  const expected = baseline.filter(
    (entry) => entry.section === 'examples' && entry.kind === 'capability'
  )

  const expectedByUrl = new Map(expected.map((entry) => [entry.url, entry]))

  const plannedEntries = allocation.filter(
    (entry) =>
      entry.section === 'examples' &&
      entry.kind === 'capability' &&
      entry.ownerPlan === '059'
  )

  const allocationByUrl = new Map(
    plannedEntries.map((entry) => [entry.url, entry])
  )

  const seen = new Set<string>()

  if (expectedByUrl.size !== expected.length) {
    failures.push('Dated example catalog contains duplicate URLs')
  }

  if (allocationByUrl.size !== plannedEntries.length) {
    failures.push('Plan 059 allocation contains duplicate example URLs')
  }

  if (allocationByUrl.size !== expectedByUrl.size) {
    failures.push(
      'Plan 059 allocation must cover each dated example exactly once'
    )
  }

  if (registry.baseline !== baselinePath) {
    failures.push(`Registry baseline must be ${baselinePath}`)
  }

  if (
    registry.hosts.length !== hosts.length ||
    hosts.some(
      (host) => registry.hosts.filter((item) => item === host).length !== 1
    )
  ) {
    failures.push('Registry must list vanilla, vue, and foldkit exactly once')
  }

  for (const entry of registry.entries) {
    const source = expectedByUrl.get(entry.url)

    if (seen.has(entry.url)) {
      failures.push(`Duplicate recipe URL: ${entry.url}`)
    }

    seen.add(entry.url)

    if (!source) {
      failures.push(`Unknown recipe URL: ${entry.url}`)
    } else if (
      source.title !== entry.title ||
      source.listedPro !== entry.listedPro
    ) {
      failures.push(`Dated title or Pro flag changed: ${entry.url}`)
    }

    const planned = allocationByUrl.get(entry.url)

    if (!planned) {
      failures.push(`Missing Plan 059 family allocation: ${entry.url}`)
    } else if (planned.family !== entry.family) {
      failures.push(
        `Recipe family differs from Plan 059 allocation: ${entry.url}`
      )
    }

    if (entry.publicApis.length === 0) {
      failures.push(`Missing public API allocation: ${entry.url}`)
    }

    failures.push(...validateClaim(entry), ...validateInventoryDecision(entry))
  }

  failures.push(...validateDescriptionSpecificity(registry.entries))

  for (const url of expectedByUrl.keys()) {
    if (!seen.has(url)) {
      failures.push(`Missing dated example recipe: ${url}`)
    }
  }

  return failures
}

const run = async (): Promise<void> => {
  const baseline = S.decodeUnknownSync(Baseline)(
    JSON.parse(await readFile(baselinePath, 'utf-8'))
  )

  const registry = S.decodeUnknownSync(Registry)(
    JSON.parse(await readFile(registryPath, 'utf-8'))
  )

  const allocation = S.decodeUnknownSync(Allocation)(
    JSON.parse(await readFile('plans/next-chunks-coverage.json', 'utf-8'))
  )

  const failures = checkExampleRecipes(
    baseline.entries,
    registry,
    allocation.entries
  )

  if (failures.length > 0) {
    throw new Error(
      `Example recipe registry failed:\n${failures.map((failure) => `- ${failure}`).join('\n')}`
    )
  }

  console.log(
    `Example recipe registry covers ${registry.entries.length} dated examples across ${hosts.join(', ')}.`
  )
}

if (import.meta.main) {
  await run()
}

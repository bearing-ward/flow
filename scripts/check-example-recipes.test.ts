import {
  mkdtempSync,
  rmSync,
  symlinkSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import { tmpdir } from 'node:os'
import pathModule from 'node:path'

import { describe, expect, it } from 'vitest'

import type { ExampleRecipeRegistry } from './check-example-recipes.ts'
import { checkExampleRecipes } from './check-example-recipes.ts'

type Mutable<T> = T extends readonly (infer Item)[]
  ? Mutable<Item>[]
  : T extends object
    ? { -readonly [Key in keyof T]: Mutable<T[Key]> }
    : T

const hosts = ['vanilla', 'vue', 'foldkit'] as const

const baseline = hosts.map((host) => ({
  section: 'examples',
  kind: 'capability',
  url: `https://reactflow.dev/examples/${host}`,
  title: host,
  listedPro: false,
}))

const allocation = baseline.map((entry) => ({
  ...entry,
  family: 'test-family',
  ownerPlan: '059',
}))

const route = (host: (typeof hosts)[number]) => ({
  path: '/examples/example',
  status: 'runnable' as const,
  sourcePath: `apps/${host}/src/main.ts`,
})

const result = (host: (typeof hosts)[number]) => ({
  status: 'tested' as const,
  path: `apps/${host}/e2e/graph-editing-examples.e2e.ts`,
})

const recipe = (host: (typeof hosts)[number]) => ({
  url: `https://reactflow.dev/examples/${host}`,
  title: host,
  listedPro: false,
  family: 'test-family',
  journey: `Use the ${host} host example and inspect its changed graph.`,
  observableResult: `The ${host} host renders the accepted test graph state.`,
  publicApis: ['FlowDocument'],
  apiEvidence: [{ api: 'FlowDocument', path: 'docs/api-reference.md' }],
  apiValidation: 'validated' as const,
  dependencyDecision: 'none-identified' as const,
  testBoundary: {
    automated: `Automate the ${host} host journey and assert its accepted document result, visible output, and reset behavior.`,
    manual: `Review the public reference separately when accessible; host tests do not establish reference parity for ${host}.`,
  },
  hostRoutes: {
    vanilla: route('vanilla'),
    vue: route('vue'),
    foldkit: route('foldkit'),
  },
  resetBehavior: 'Reset to the deterministic fixture.',
  optionalDependencies: 'None identified.',
  reference: {
    availability: 'public-page-listed',
    licenseReview: 'review-required',
    comparison: 'unverified' as const,
  },
  implementedRecipe: 'complete' as const,
  testedResult: {
    vanilla: result('vanilla'),
    vue: result('vue'),
    foldkit: result('foldkit'),
  },
  acceptanceClaim: 'complete' as const,
})

const registry: Mutable<ExampleRecipeRegistry> = {
  version: 1,
  baseline: 'research/catalogs/react-flow-2026-09-26.json',
  hosts: [...hosts],
  entries: [recipe('vanilla'), recipe('vue'), recipe('foldkit')],
}

const entryAt = (value: typeof registry, index: number) => {
  const entry = value.entries.at(index)

  if (!entry) {
    throw new Error(`Expected entry at index ${index}`)
  }

  return entry
}

const check = (value: typeof registry, planned = allocation) =>
  checkExampleRecipes(baseline, value, planned)

describe('example recipe registry checker', () => {
  it('accepts a complete row with route and test evidence in every host', () => {
    expect(check(registry)).toStrictEqual([])
  })

  it('rejects a missing host route record on a planned row', () => {
    const broken = structuredClone(registry)
    const entry = entryAt(broken, 0)
    entry.acceptanceClaim = 'planned'
    entry.implementedRecipe = 'none'
    Reflect.deleteProperty(entry.hostRoutes, 'vue')

    expect(check(broken).join('\n')).toContain('Missing vue route record')
  })

  it('rejects a missing host test-boundary record on a partial row', () => {
    const broken = structuredClone(registry)
    const entry = entryAt(broken, 0)
    entry.acceptanceClaim = 'implemented'
    entry.implementedRecipe = 'partial'
    Reflect.deleteProperty(entry.testedResult, 'foldkit')

    expect(check(broken).join('\n')).toContain(
      'Missing foldkit test-boundary record'
    )
  })

  it('rejects test paths that are not scoped to the tested host', () => {
    const broken = structuredClone(registry)
    entryAt(broken, 0).testedResult.vue.path = 'apps/vanilla/e2e/example.e2e.ts'

    expect(check(broken).join('\n')).toContain(
      'Tested vue result requires a host-scoped E2E test path'
    )
  })

  it.each(['apps/vue/e2e/%2e%2e/fake.e2e.ts', 'apps/vue/e2e/..\\fake.e2e.ts'])(
    'rejects unsafe host test path %s',
    (path) => {
      const broken = structuredClone(registry)
      entryAt(broken, 0).testedResult.vue.path = path

      expect(check(broken).join('\n')).toContain(
        'Tested vue result requires a host-scoped E2E test path'
      )
    }
  )

  it('rejects duplicate URLs', () => {
    const broken = structuredClone(registry)
    entryAt(broken, 1).url = entryAt(broken, 0).url

    expect(check(broken).join('\n')).toContain('Duplicate recipe URL')
  })

  it('rejects missing host coverage', () => {
    const broken = structuredClone(registry)
    broken.hosts.splice(2)

    expect(check(broken).join('\n')).toContain(
      'Registry must list vanilla, vue, and foldkit exactly once'
    )
  })

  it('requires separate automated and manual test boundaries', () => {
    const broken = structuredClone(registry)
    entryAt(broken, 0).testBoundary.manual = ''

    expect(check(broken).join('\n')).toContain(
      'Manual test boundary is underspecified'
    )
  })

  it('rejects a dependency decision that conflicts with its rationale', () => {
    const broken = structuredClone(registry)
    const entry = entryAt(broken, 0)
    entry.optionalDependencies = 'dagre candidate; dependency decision pending'

    expect(check(broken).join('\n')).toContain(
      'Dependency decision does not match its recorded rationale'
    )
  })

  it('rejects duplicate host records', () => {
    const broken = structuredClone(registry)
    broken.hosts[2] = 'vue'

    expect(check(broken).join('\n')).toContain(
      'Registry must list vanilla, vue, and foldkit exactly once'
    )
  })

  it('rejects unsupported reference proof without structured evidence', () => {
    const broken = structuredClone(registry)
    entryAt(broken, 0).reference = {
      ...entryAt(broken, 0).reference,
      comparison: 'compared',
      evidence: { type: 'trace', path: 'not-a-research-trace.md' },
    }

    expect(check(broken).join('\n')).toContain(
      'Reference proof claim requires a research artifact or trace path'
    )
  })

  it.each(['research/traces/%2e%2e/fake.md', 'research/traces/..\\fake.md'])(
    'rejects unsafe reference evidence path %s',
    (path) => {
      const broken = structuredClone(registry)
      entryAt(broken, 0).reference = {
        ...entryAt(broken, 0).reference,
        comparison: 'compared',
        evidence: { type: 'trace', path },
      }

      expect(check(broken).join('\n')).toContain(
        'Reference proof claim requires a research artifact or trace path'
      )
    }
  )

  it.each(['//example.invalid/path', '/\\\\example.invalid/path'])(
    'rejects non-local route path %s',
    (path) => {
      const broken = structuredClone(registry)
      entryAt(broken, 0).hostRoutes.vue.path = path

      expect(check(broken).join('\n')).toContain('Invalid vue route')
    }
  )

  it('rejects an implemented claim without an implemented recipe', () => {
    const broken = structuredClone(registry)
    entryAt(broken, 0).acceptanceClaim = 'implemented'
    entryAt(broken, 0).implementedRecipe = 'none'

    expect(check(broken).join('\n')).toContain(
      'Implemented acceptance claim requires an implemented recipe'
    )
  })

  it('rejects complete claims with unvalidated API mappings', () => {
    const broken = structuredClone(registry)
    entryAt(broken, 0).apiValidation = 'pending'

    expect(check(broken).join('\n')).toContain(
      'Complete acceptance claim requires validated public APIs'
    )
  })

  it('rejects complete claims without evidence for each listed API', () => {
    const broken = structuredClone(registry)
    entryAt(broken, 0).apiEvidence = []

    expect(check(broken).join('\n')).toContain(
      'Missing API evidence for FlowDocument'
    )
  })

  it('rejects duplicate API-evidence records', () => {
    const broken = structuredClone(registry)
    entryAt(broken, 0).apiEvidence = [
      { api: 'FlowDocument', path: 'docs/api-reference.md' },
      { api: 'FlowDocument', path: 'docs/api-reference.md' },
    ]

    expect(check(broken).join('\n')).toContain('Duplicate API evidence records')
  })

  it('rejects API evidence files that do not contain the listed API', () => {
    const broken = structuredClone(registry)
    entryAt(broken, 0).apiEvidence = [
      { api: 'FlowDocument', path: 'docs/public-api.md' },
    ]

    expect(check(broken).join('\n')).toContain(
      'API evidence file does not reference FlowDocument'
    )
  })

  it('rejects API evidence paths outside the repository', () => {
    const broken = structuredClone(registry)
    entryAt(broken, 0).apiEvidence = [
      { api: 'FlowDocument', path: '../flow/docs/api-reference.md' },
    ]

    expect(check(broken).join('\n')).toContain(
      'Invalid API evidence file for FlowDocument'
    )
  })

  it('rejects generic journey and outcome boilerplate', () => {
    const broken = structuredClone(registry)
    const entry = entryAt(broken, 0)
    entry.journey =
      'Exercise the feature behavior through its visible controls or public host API.'
    entry.observableResult =
      'The rendered feature outcome matches the accepted graph and interaction state.'

    const failures = check(broken).join('\n')

    expect(failures).toContain('Generic journey template')
    expect(failures).toContain('Generic result template')
  })

  it('rejects a recipe family that differs from the Plan 059 allocation', () => {
    const broken = structuredClone(registry)
    entryAt(broken, 0).family = 'wrong-family'

    expect(check(broken).join('\n')).toContain(
      'Recipe family differs from Plan 059 allocation'
    )
  })

  it('rejects duplicate Plan 059 allocation URLs', () => {
    const duplicateAllocation = [...allocation, ...allocation.slice(0, 1)]

    expect(check(registry, duplicateAllocation).join('\n')).toContain(
      'Plan 059 allocation contains duplicate example URLs'
    )
  })

  it('rejects a missing Plan 059 allocation row', () => {
    const missingAllocation = allocation.slice(1)
    const failures = check(registry, missingAllocation).join('\n')

    expect(failures).toContain(
      'Plan 059 allocation must cover each dated example exactly once'
    )
    expect(failures).toContain('Missing Plan 059 family allocation')
  })

  it('rejects complete routes and tests that do not resolve to in-scope files', () => {
    const broken = structuredClone(registry)
    const entry = entryAt(broken, 0)
    entry.hostRoutes.vue.sourcePath = 'apps/vue/src/missing-route.ts'
    entry.testedResult.foldkit.path = 'apps/foldkit/e2e/missing-example.e2e.ts'

    const failures = check(broken).join('\n')

    expect(failures).toContain(
      'Runnable vue route requires an existing in-scope source file'
    )
    expect(failures).toContain('Missing in-scope foldkit E2E file')
  })

  it('rejects reference comparisons whose evidence file does not exist', () => {
    const broken = structuredClone(registry)
    entryAt(broken, 0).reference = {
      ...entryAt(broken, 0).reference,
      comparison: 'compared',
      evidence: { type: 'trace', path: 'research/traces/missing-trace.md' },
    }

    expect(check(broken).join('\n')).toContain(
      'Reference proof claim requires a research artifact or trace path'
    )
  })

  it('rejects route, E2E, and comparison symlinks that escape their roots', () => {
    const temporaryDirectory = mkdtempSync(
      pathModule.join(tmpdir(), 'flow-example-check-')
    )

    const fixtureId = pathModule.basename(temporaryDirectory)
    const externalFile = pathModule.join(temporaryDirectory, 'external.md')
    const relativeRouteLink = `apps/vue/src/__${fixtureId}-route-escape__.ts`
    const relativeTestLink = `apps/foldkit/e2e/__${fixtureId}-test-escape__.e2e.ts`
    const relativeEvidenceLink = `research/traces/__${fixtureId}-evidence-escape__.md`
    const routeLink = pathModule.resolve(relativeRouteLink)
    const testLink = pathModule.resolve(relativeTestLink)
    const evidenceLink = pathModule.resolve(relativeEvidenceLink)
    const createdLinks: string[] = []

    try {
      writeFileSync(externalFile, 'outside the repository roots')
      symlinkSync(externalFile, routeLink)
      createdLinks.push(routeLink)
      symlinkSync(externalFile, testLink)
      createdLinks.push(testLink)
      symlinkSync(externalFile, evidenceLink)
      createdLinks.push(evidenceLink)

      const broken = structuredClone(registry)
      const entry = entryAt(broken, 0)
      entry.hostRoutes.vue.sourcePath = relativeRouteLink
      entry.testedResult.foldkit.path = relativeTestLink
      entry.reference = {
        ...entry.reference,
        comparison: 'compared',
        evidence: {
          type: 'trace',
          path: relativeEvidenceLink,
        },
      }

      const failures = check(broken).join('\n')

      expect(failures).toContain(
        'Runnable vue route requires an existing in-scope source file'
      )
      expect(failures).toContain('Missing in-scope foldkit E2E file')
      expect(failures).toContain(
        'Reference proof claim requires a research artifact or trace path'
      )
    } finally {
      for (const link of createdLinks) {
        try {
          unlinkSync(link)
        } catch {
          // The fixture may already have removed a created link.
        }
      }

      rmSync(temporaryDirectory, { recursive: true, force: true })
    }
  })
})

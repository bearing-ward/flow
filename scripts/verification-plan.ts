import { Schema as S } from 'effect'

const VerificationProfileSchema = S.Literals(['focused', 'full'])

const extraCheckNames = [
  'persistence-provenance',
  'docs',
  'catalogs',
  'calibration',
  'inventory',
  'traces',
  'consumer',
  'build',
  'vue-build',
  'foldkit-build',
  'upstream-ledger',
  'reference-host',
  'collaboration',
] as const

const ExtraCheckSchema = S.Literals(extraCheckNames)

const BrowserTestSchema = S.NonEmptyString.check(
  S.isPattern(/^(?:[\w-]+\/)*[\w-]+\.e2e\.ts$/u)
)

const BrowserTestsSchema = S.Struct({
  vanilla: S.Array(BrowserTestSchema),
  vue: S.Array(BrowserTestSchema),
  foldkit: S.Array(BrowserTestSchema),
})

export const VerificationConfigSchema = S.Struct({
  defaultProfile: VerificationProfileSchema,
  checks: S.Array(ExtraCheckSchema),
  pinned: S.optionalKey(BrowserTestsSchema),
})

export type VerificationConfig = typeof VerificationConfigSchema.Type

const VerificationRequestSchema = S.Struct({
  profile: S.NullOr(VerificationProfileSchema),
  list: S.Boolean,
  checks: S.Array(ExtraCheckSchema),
  browserTests: BrowserTestsSchema,
})

export type VerificationRequest = typeof VerificationRequestSchema.Type

const VerificationCheckSchema = S.Struct({
  name: S.NonEmptyString,
  command: S.NonEmptyString,
  arguments: S.Array(S.String),
})

export type VerificationCheck = typeof VerificationCheckSchema.Type

const bunCheck = (
  name: string,
  args: readonly string[]
): VerificationCheck => ({ name, command: 'bun', arguments: args })

const baselineChecks = [
  bunCheck('quality check', ['run', 'check']),
  bunCheck('architecture boundaries', ['run', 'check:architecture']),
  bunCheck('package builds', ['run', 'build:packages']),
  bunCheck('typecheck', ['run', 'tsc', '--noEmit']),
  bunCheck('unit tests', ['run', 'test']),
]

const extraChecks = {
  'persistence-provenance': bunCheck('persistence-provenance', [
    'run',
    'scripts/capture-legacy-v1-persistence.ts',
    '--check',
  ]),
  collaboration: bunCheck('mixed-host collaborative transport', [
    'run',
    'playwright',
    'test',
    '-c',
    'scripts/collaborative.config.ts',
    '--workers=1',
  ]),
  'reference-host': bunCheck('React reference host', [
    'run',
    'scripts/check-react-reference.ts',
  ]),
  'upstream-ledger': bunCheck('upstream test ledger', [
    'run',
    'scripts/check-upstream-test-ledger.ts',
  ]),
  docs: bunCheck('documentation', ['run', 'docs:check']),
  catalogs: bunCheck('catalogs', ['run', 'scripts/check-catalogs.ts']),
  calibration: bunCheck('benchmark calibration registry', [
    'run',
    'scripts/check-benchmark-calibration.ts',
  ]),
  inventory: bunCheck('research inventory', [
    'run',
    'research:inventory',
    '--check',
  ]),
  traces: bunCheck('research trace citations', [
    'run',
    'research:check-traces',
  ]),
  consumer: bunCheck('packed consumer', [
    'run',
    'scripts/check-unit-integrations.ts',
  ]),
  build: bunCheck('Vanilla app build', [
    'run',
    '--cwd',
    'apps/vanilla',
    'build',
  ]),
  'vue-build': bunCheck('Vue app build', ['run', '--cwd', 'apps/vue', 'build']),
  'foldkit-build': bunCheck('Foldkit app build', [
    'run',
    '--cwd',
    'apps/foldkit',
    'build',
  ]),
} satisfies Record<typeof ExtraCheckSchema.Type, VerificationCheck>

export type BrowserHost = keyof VerificationRequest['browserTests']

export type BrowserTests = VerificationRequest['browserTests']

export const emptyBrowserTests = (): Record<BrowserHost, string[]> => ({
  vanilla: [],
  vue: [],
  foldkit: [],
})

export const changedBrowserTests = (paths: readonly string[]): BrowserTests => {
  const tests = emptyBrowserTests()

  for (const path of paths) {
    const match =
      /^apps\/(?<host>vanilla|vue|foldkit)\/e2e\/(?<file>(?:[\w-]+\/)*[\w-]+\.e2e\.ts)$/u.exec(
        path
      )

    const host = match?.groups?.host
    const file = match?.groups?.file

    if (
      (host === 'vanilla' || host === 'vue' || host === 'foldkit') &&
      file !== undefined
    ) {
      tests[host].push(file)
    }
  }

  return tests
}

const browserCheck = (
  host: BrowserHost,
  files: readonly string[],
  full: boolean
): VerificationCheck => {
  if (!full && files.length === 0) {
    throw new Error('Focused browser verification requires explicit test files')
  }

  const config =
    host === 'vanilla' ? [] : ['--config', `apps/${host}/playwright.config.ts`]

  const filters = files.map(
    (file) => `apps/${host}/e2e/${file.replaceAll('.', '\\.')}$`
  )

  return bunCheck(`${host} browser tests`, [
    'run',
    'playwright',
    'test',
    ...config,
    '--workers=1',
    ...filters,
  ])
}

export const parseVerificationArguments = (
  args: readonly string[]
): VerificationRequest => {
  let profile: typeof VerificationProfileSchema.Type | null = null
  let list = false
  const checks: string[] = []

  const browserTests: Record<BrowserHost, string[]> = {
    vanilla: [],
    vue: [],
    foldkit: [],
  }

  for (let index = 0; index < args.length; index += 1) {
    const flag = args[index]

    if (flag === '--full' || flag === '--focused') {
      const selected = flag === '--full' ? 'full' : 'focused'

      if (profile !== null && profile !== selected) {
        throw new Error('Choose either --full or --focused')
      }

      profile = selected
      continue
    }

    if (flag === '--list') {
      list = true
      continue
    }

    if (
      flag !== '--check' &&
      flag !== '--vanilla' &&
      flag !== '--vue' &&
      flag !== '--foldkit'
    ) {
      throw new Error(`Unknown verification option: ${flag}`)
    }

    const value = args[index + 1]

    if (value === undefined || value.startsWith('--')) {
      throw new Error(`Missing value for ${flag}`)
    }

    index += 1

    switch (flag) {
      case '--check': {
        checks.push(value)
        break
      }

      case '--vanilla': {
        browserTests.vanilla.push(value)
        break
      }

      case '--vue': {
        browserTests.vue.push(value)
        break
      }

      case '--foldkit': {
        browserTests.foldkit.push(value)
        break
      }

      default: {
        const exhaustive: never = flag
        throw new Error(`Unsupported flag: ${exhaustive}`)
      }
    }
  }

  return S.decodeUnknownSync(VerificationRequestSchema)({
    profile,
    list,
    checks,
    browserTests,
  })
}

export const selectVerificationChecks = (
  config: VerificationConfig,
  request: VerificationRequest,
  changed: BrowserTests = emptyBrowserTests()
): readonly VerificationCheck[] => {
  const profile = request.profile ?? config.defaultProfile
  const checks = [...baselineChecks]

  const selectedExtras =
    profile === 'full'
      ? [
          ...extraCheckNames.filter((name) => name !== 'reference-host'),
          ...request.checks,
        ]
      : [...config.checks, ...request.checks]

  for (const name of new Set(selectedExtras)) {
    checks.push(extraChecks[name])
  }

  for (const host of ['vanilla', 'vue', 'foldkit'] satisfies BrowserHost[]) {
    const files = [
      ...new Set([
        ...(config.pinned?.[host] ?? []),
        ...changed[host],
        ...request.browserTests[host],
      ]),
    ]

    if (profile === 'full' || files.length > 0) {
      checks.push(
        browserCheck(host, profile === 'full' ? [] : files, profile === 'full')
      )
    }
  }

  return checks
}

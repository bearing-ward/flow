import { Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  parseVerificationArguments,
  selectVerificationChecks,
  VerificationConfigSchema,
} from './verification-plan.ts'

const config = S.decodeUnknownSync(VerificationConfigSchema)({
  defaultProfile: 'focused',
  activeWork: 'verification tooling',
  checks: [],
  browserTests: { vanilla: [], vue: [], foldkit: [] },
})

describe('verification profiles', () => {
  it('keeps the cheap baseline without browser, consumer, or research work', () => {
    const checks = selectVerificationChecks(
      config,
      parseVerificationArguments([])
    )

    expect(checks.map((check) => check.name)).toStrictEqual([
      'quality check',
      'architecture boundaries',
      'package builds',
      'typecheck',
      'unit tests',
    ])
    expect(
      checks.filter((check) => check.arguments.includes('build:packages'))
    ).toHaveLength(1)
  })

  it('merges saved scope and command-line additions without duplicate work', () => {
    const scoped = {
      ...config,
      checks: ['docs'] as const,
      browserTests: { ...config.browserTests, vue: ['public-state.e2e.ts'] },
    }

    const checks = selectVerificationChecks(
      scoped,
      parseVerificationArguments([
        '--check',
        'docs',
        '--check',
        'contracts',
        '--vue',
        'public-state.e2e.ts',
        '--vue',
        'measured-geometry.e2e.ts',
      ])
    )

    expect(
      checks.filter((check) => check.name === 'documentation')
    ).toHaveLength(1)
    expect(checks.map((check) => check.name)).toContain(
      'public member contract ownership'
    )
    expect(checks.at(-1)?.arguments).toStrictEqual([
      'run',
      'playwright',
      'test',
      '--config',
      'apps/vue/playwright.config.ts',
      '--workers=1',
      'apps/vue/e2e/public-state\\.e2e\\.ts$',
      'apps/vue/e2e/measured-geometry\\.e2e\\.ts$',
    ])
    expect(
      checks.some((check) => check.name === 'vanilla browser tests')
    ).toBeFalsy()
    expect(
      checks.some((check) => check.name === 'foldkit browser tests')
    ).toBeFalsy()
  })

  it('keeps all broad gates available and never filters a full browser run', () => {
    const request = parseVerificationArguments([
      '--full',
      '--vue',
      'public-state.e2e.ts',
    ])

    const checks = selectVerificationChecks(config, request)

    expect(checks).toHaveLength(23)
    expect(checks.map((check) => check.name)).toStrictEqual(
      expect.arrayContaining([
        'documentation',
        'React Flow catalog coverage',
        'React Flow API member inventory',
        'public member contract ownership',
        'catalog proof matrix',
        'benchmark calibration registry',
        'example recipe registry',
        'research inventory',
        'research trace citations',
        'packed consumer',
        'Vanilla app build',
        'Vue app build',
        'Foldkit app build',
        'upstream test ledger',
        'mixed-host collaborative transport',
        'vanilla browser tests',
        'vue browser tests',
        'foldkit browser tests',
      ])
    )

    for (const host of ['vanilla', 'vue', 'foldkit']) {
      const browser = checks.find(
        (check) => check.name === `${host} browser tests`
      )

      expect(browser?.arguments).toContain('--workers=1')
      expect(browser).toBeDefined()
      expect(
        browser?.arguments.some((argument) => argument.includes('.e2e'))
      ).toBeFalsy()
    }
  })

  it('restores broad verification with one config change and permits a focused override', () => {
    const fullConfig = { ...config, defaultProfile: 'full' as const }

    expect(
      selectVerificationChecks(fullConfig, parseVerificationArguments([]))
    ).toHaveLength(23)
    expect(
      selectVerificationChecks(
        fullConfig,
        parseVerificationArguments(['--focused'])
      )
    ).toHaveLength(5)
  })

  it('runs the React reference only when explicitly selected', () => {
    const request = parseVerificationArguments(['--check', 'reference-host'])
    expect(
      selectVerificationChecks(config, request).map((check) => check.name)
    ).toContain('React reference host')
    expect(
      selectVerificationChecks(
        config,
        parseVerificationArguments(['--full'])
      ).map((check) => check.name)
    ).not.toContain('React reference host')
    expect(
      selectVerificationChecks(config, parseVerificationArguments([])).map(
        (check) => check.name
      )
    ).not.toContain('React reference host')
  })

  it.each([
    ['--vue'],
    ['--vue', '--full'],
    ['--unknown'],
    ['--full', '--focused'],
    ['--check', 'arbitrary-command'],
    ['--vanilla', '*.e2e.ts'],
    ['--foldkit', '../public-state.e2e.ts'],
    ['--vue', 'public-state.e2e.ts;exit'],
  ])(
    'rejects an invalid request instead of running an unintended suite: %j',
    (...args) => {
      expect(() => parseVerificationArguments(args)).toThrow(
        /Missing value|Unknown verification option|Choose either|checks|browserTests/u
      )
    }
  )
})

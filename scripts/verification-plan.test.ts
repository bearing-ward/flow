import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import path from 'node:path'

import { Effect, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import { changedBrowserPaths } from './verification-git.ts'
import {
  changedBrowserTests,
  emptyBrowserTests,
  parseVerificationArguments,
  selectVerificationChecks,
  VerificationConfigSchema,
} from './verification-plan.ts'

const config = S.decodeUnknownSync(VerificationConfigSchema)({
  defaultProfile: 'focused',
  checks: [],
})

describe('verification profiles', () => {
  it('runs the baseline when there are no changed, pinned or requested browser files', () => {
    expect(
      selectVerificationChecks(config, parseVerificationArguments([])).map(
        (check) => check.name
      )
    ).toStrictEqual([
      'quality check',
      'architecture boundaries',
      'package builds',
      'typecheck',
      'unit tests',
    ])
  })

  it('matches only supported host e2e paths', () => {
    expect(
      changedBrowserTests([
        'apps/vanilla/e2e/public-state.e2e.ts',
        'apps/vue/e2e/measured-geometry.e2e.ts',
        'apps/foldkit/e2e/wire-ties.e2e.ts',
        'apps/vue/src/main.ts',
        'apps/shared/edge-routing/acceptance.ts',
        'apps/react-reference/e2e/upstream.e2e.ts',
      ])
    ).toStrictEqual({
      vanilla: ['public-state.e2e.ts'],
      vue: ['measured-geometry.e2e.ts'],
      foldkit: ['wire-ties.e2e.ts'],
    })
  })

  it('merges changed files, optional pins and CLI selections without duplicate work', () => {
    const scoped = {
      ...config,
      checks: ['docs'] as const,
      pinned: { ...emptyBrowserTests(), vue: ['public-state.e2e.ts'] },
    }

    const checks = selectVerificationChecks(
      scoped,
      parseVerificationArguments([
        '--check',
        'docs',
        '--check',
        'catalogs',
        '--vue',
        'public-state.e2e.ts',
        '--vue',
        'viewport-operations.e2e.ts',
      ]),
      changedBrowserTests([
        'apps/vue/e2e/measured-geometry.e2e.ts',
        'apps/vue/e2e/public-state.e2e.ts',
      ])
    )

    expect(
      checks.filter((check) => check.name === 'documentation')
    ).toHaveLength(1)
    expect(checks.map((check) => check.name)).toContain('catalogs')
    expect(checks.at(-1)?.arguments).toStrictEqual([
      'run',
      'playwright',
      'test',
      '--config',
      'apps/vue/playwright.config.ts',
      '--workers=1',
      'apps/vue/e2e/public-state\\.e2e\\.ts$',
      'apps/vue/e2e/measured-geometry\\.e2e\\.ts$',
      'apps/vue/e2e/viewport-operations\\.e2e\\.ts$',
    ])
    expect(
      checks.filter((check) => check.name.endsWith('browser tests'))
    ).toHaveLength(1)
  })

  it('keeps every full gate and ignores focused browser filters', () => {
    const checks = selectVerificationChecks(
      config,
      parseVerificationArguments(['--full', '--vue', 'public-state.e2e.ts']),
      changedBrowserTests(['apps/vanilla/e2e/wire-ties.e2e.ts'])
    )

    expect(checks.map((check) => check.name)).toStrictEqual([
      'quality check',
      'architecture boundaries',
      'package builds',
      'typecheck',
      'unit tests',
      'documentation',
      'catalogs',
      'benchmark calibration registry',
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
    expect(
      checks.find((check) => check.name === 'research inventory')?.arguments
    ).toContain('--check')

    for (const host of ['vanilla', 'vue', 'foldkit']) {
      const browser = checks.find(
        (check) => check.name === `${host} browser tests`
      )

      expect(browser?.arguments).toContain('--workers=1')
      expect(
        browser?.arguments.some((argument) => argument.includes('.e2e'))
      ).toBeFalsy()
    }
  })

  it('allows a configured full default and a focused CLI override', () => {
    const full = { ...config, defaultProfile: 'full' as const }
    expect(
      selectVerificationChecks(full, parseVerificationArguments([]))
    ).toHaveLength(19)
    expect(
      selectVerificationChecks(full, parseVerificationArguments(['--focused']))
    ).toHaveLength(5)
  })

  it('keeps the reference host opt-in', () => {
    expect(
      selectVerificationChecks(
        config,
        parseVerificationArguments(['--check', 'reference-host'])
      ).map((check) => check.name)
    ).toContain('React reference host')
    expect(
      selectVerificationChecks(
        config,
        parseVerificationArguments(['--full'])
      ).map((check) => check.name)
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
  ])('rejects invalid CLI arguments: %j', (...args) => {
    expect(() => parseVerificationArguments(args)).toThrow(
      /Missing value|Unknown verification option|Choose either|checks|browserTests/u
    )
  })
})

describe('Git browser scope', () => {
  it('includes committed, staged, unstaged, renamed and untracked files, excluding deletions', () => {
    const root = mkdtempSync(path.join(tmpdir(), 'flow-verification-git-'))

    const git = (...args: string[]) =>
      execFileSync('git', args, { cwd: root, stdio: 'pipe' })

    const file = (name: string, text: string) =>
      writeFileSync(path.join(root, 'apps/vue/e2e', name), text)

    try {
      mkdirSync(path.join(root, 'apps/vue/e2e'), { recursive: true })
      git('init', '-b', 'main')
      git('config', 'user.email', 'verification@example.invalid')
      git('config', 'user.name', 'Verification')

      for (const name of [
        'deleted',
        'renamed',
        'staged',
        'unstaged',
        'committed',
      ]) {
        file(`${name}.e2e.ts`, name)
      }

      git('add', '.')
      git('commit', '-m', 'base')
      git('checkout', '-b', 'work')
      file('committed.e2e.ts', 'changed in a commit')
      git('add', '.')
      git('commit', '-m', 'change')
      git('rm', 'apps/vue/e2e/deleted.e2e.ts')
      git(
        'mv',
        'apps/vue/e2e/renamed.e2e.ts',
        'apps/vue/e2e/renamed-target.e2e.ts'
      )
      file('staged.e2e.ts', 'staged change')
      git('add', '.')
      file('unstaged.e2e.ts', 'unstaged change')
      file('untracked.e2e.ts', 'untracked file')
      expect(
        changedBrowserTests(Effect.runSync(changedBrowserPaths(root))).vue
      ).toStrictEqual([
        'committed.e2e.ts',
        'renamed-target.e2e.ts',
        'staged.e2e.ts',
        'unstaged.e2e.ts',
        'untracked.e2e.ts',
      ])
    } finally {
      rmSync(root, { recursive: true, force: true })
    }
  })
})

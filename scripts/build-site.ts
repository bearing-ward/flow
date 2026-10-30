import { cpSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'

import { BunRuntime, BunServices } from '@effect/platform-bun'
import { Effect } from 'effect'
import { ChildProcess, ChildProcessSpawner } from 'effect/process'

import { checkSiteLinks } from './site/links.ts'

const program = Effect.gen(function* buildSite() {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner

  const run = (args: readonly string[], env = process.env) =>
    Effect.gen(function* runBuild() {
      const code = yield* spawner.exitCode(
        ChildProcess.make('bun', args, {
          env,
          stdout: 'inherit',
          stderr: 'inherit',
        })
      )

      if (code !== 0) {
        return yield* Effect.fail(
          new Error(`Site build failed: bun ${args.join(' ')}`)
        )
      }
    })

  yield* run(['run', 'build:packages'])
  yield* Effect.try(() => {
    rmSync('dist-site', { recursive: true, force: true })
    mkdirSync('dist-site')
    cpSync('site', 'dist-site', { recursive: true })
    writeFileSync('dist-site/.nojekyll', '')
  })

  for (const host of ['vanilla', 'vue', 'foldkit']) {
    yield* run(['run', '--cwd', `apps/${host}`, 'build'], {
      ...process.env,
      FLOW_PACKAGES_PREBUILT: '1',
      FLOW_SITE_BASE: `/flow/${host}/`,
      OTEL_SDK_DISABLED: 'true',
    })
    yield* Effect.try(() =>
      cpSync(
        `apps/${host}/dist${host === 'vanilla' ? '/app' : ''}`,
        `dist-site/${host}`,
        { recursive: true }
      )
    )
  }

  yield* Effect.try(() => checkSiteLinks('dist-site'))
  yield* Effect.logInfo('Product site built and local links checked').pipe(
    Effect.annotateLogs({ directory: 'dist-site', base: '/flow/' })
  )
}).pipe(Effect.withSpan('flow.site.build'))

BunRuntime.runMain(program.pipe(Effect.provide(BunServices.layer)))

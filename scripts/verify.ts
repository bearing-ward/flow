import { BunRuntime, BunServices } from '@effect/platform-bun'
import { Effect, FileSystem, Schema as S } from 'effect'
import { ChildProcess, ChildProcessSpawner } from 'effect/process'

import { changedBrowserPaths } from './verification-git.ts'
import {
  changedBrowserTests,
  emptyBrowserTests,
  parseVerificationArguments,
  selectVerificationChecks,
  VerificationConfigSchema,
} from './verification-plan.ts'

const program = Effect.gen(function* verify() {
  const fileSystem = yield* FileSystem.FileSystem
  const process = yield* ChildProcessSpawner.ChildProcessSpawner

  const configText = yield* fileSystem.readFileString(
    'verification.config.json'
  )

  const config = yield* Effect.try(() =>
    S.decodeUnknownSync(VerificationConfigSchema)(JSON.parse(configText))
  )

  const request = yield* Effect.try(() =>
    parseVerificationArguments(globalThis.process.argv.slice(2))
  )

  const profile = request.profile ?? config.defaultProfile
  const available = emptyBrowserTests()

  for (const host of ['vanilla', 'vue', 'foldkit'] as const) {
    const files = yield* Effect.tryPromise(() =>
      Array.fromAsync(
        new Bun.Glob('**/*.e2e.ts').scan({ cwd: `apps/${host}/e2e` })
      )
    )

    available[host].push(...files.toSorted())
  }

  const changed = emptyBrowserTests()

  if (profile === 'focused') {
    const selected = changedBrowserTests(
      yield* changedBrowserPaths(globalThis.process.cwd())
    )

    for (const host of ['vanilla', 'vue', 'foldkit'] as const) {
      changed[host].push(
        ...selected[host].filter((file) => available[host].includes(file))
      )
    }
  }

  const checks = selectVerificationChecks(config, request, changed)

  // Validate each focused filename before running a potentially expensive command.
  if (profile === 'focused') {
    for (const host of ['vanilla', 'vue', 'foldkit'] as const) {
      for (const file of new Set([
        ...(config.pinned?.[host] ?? []),
        ...request.browserTests[host],
      ])) {
        const path = `apps/${host}/e2e/${file}`

        if (!(yield* fileSystem.exists(path))) {
          return yield* Effect.fail(
            new Error(`Browser test does not exist: ${path}`)
          )
        }
      }
    }
  }

  yield* Effect.logInfo('Verification selection').pipe(
    Effect.annotateLogs({
      profile,
      browserTests:
        profile === 'full'
          ? available
          : Object.fromEntries(
              (['vanilla', 'vue', 'foldkit'] as const).map((host) => [
                host,
                [
                  ...new Set([
                    ...(config.pinned?.[host] ?? []),
                    ...changed[host],
                    ...request.browserTests[host],
                  ]),
                ],
              ])
            ),
      checks: checks.map((check) => check.name),
      fullSuite: profile === 'full',
    })
  )

  if (request.list) {
    for (const check of checks) {
      yield* Effect.logInfo(
        `${check.name}: ${check.command} ${check.arguments.join(' ')}`
      )
    }

    return
  }

  const started = Date.now()

  let packagesPrebuilt = false

  for (const check of checks) {
    yield* Effect.logInfo(`Starting ${check.name}`)
    const checkStarted = Date.now()

    const exitCode = yield* process.exitCode(
      ChildProcess.make(check.command, check.arguments, {
        stderr: 'inherit',
        stdout: 'inherit',
        env: {
          ...globalThis.process.env,
          FLOW_PACKAGES_PREBUILT: packagesPrebuilt ? '1' : undefined,
        },
      })
    )

    if (exitCode !== 0) {
      return yield* Effect.fail(
        new Error(`${check.name} failed with exit code ${exitCode}`)
      )
    }

    if (check.name === 'package builds') {
      packagesPrebuilt = true
    }

    yield* Effect.logInfo(`Passed ${check.name}`).pipe(
      Effect.annotateLogs({ elapsedMs: Date.now() - checkStarted })
    )
  }

  yield* Effect.logInfo('Verification passed').pipe(
    Effect.annotateLogs({
      profile,
      fullSuite: profile === 'full',
      elapsedMs: Date.now() - started,
    })
  )
})

BunRuntime.runMain(program.pipe(Effect.provide(BunServices.layer)))

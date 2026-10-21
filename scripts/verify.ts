import { BunRuntime, BunServices } from '@effect/platform-bun'
import { Effect, FileSystem, Schema as S } from 'effect'
import { ChildProcess, ChildProcessSpawner } from 'effect/process'

import {
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
  const checks = selectVerificationChecks(config, request)

  // Validate each focused filename before running a potentially expensive command.
  if (profile === 'focused') {
    for (const host of ['vanilla', 'vue', 'foldkit'] as const) {
      for (const file of new Set([
        ...config.browserTests[host],
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
      activeWork: config.activeWork,
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

  for (const check of checks) {
    yield* Effect.logInfo(`Starting ${check.name}`)
    const checkStarted = Date.now()

    const exitCode = yield* process.exitCode(
      ChildProcess.make(check.command, check.arguments, {
        stderr: 'inherit',
        stdout: 'inherit',
      })
    )

    if (exitCode !== 0) {
      return yield* Effect.fail(
        new Error(`${check.name} failed with exit code ${exitCode}`)
      )
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

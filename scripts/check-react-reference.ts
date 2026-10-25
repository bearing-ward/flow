import { BunRuntime, BunServices } from '@effect/platform-bun'
import { Effect } from 'effect'
import { ChildProcess, ChildProcessSpawner } from 'effect/process'

const commands = [
  ['run', '--cwd', 'apps/react-reference', 'typecheck'],
  ['run', '--cwd', 'apps/react-reference', 'build'],
  [
    'run',
    'playwright',
    'test',
    '--config',
    'apps/react-reference/playwright.config.ts',
    '--workers=1',
  ],
]

const program = Effect.gen(function* checkReactReference() {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
  yield* Effect.forEach(
    commands,
    (args) =>
      Effect.gen(function* runReferenceCommand() {
        const exitCode = yield* spawner.exitCode(
          ChildProcess.make('bun', args, {
            stdout: 'inherit',
            stderr: 'inherit',
          })
        )

        if (exitCode !== 0) {
          return yield* Effect.fail(
            new Error(
              `React reference command failed: bun ${args.join(' ')} (${exitCode})`
            )
          )
        }
      }),
    { concurrency: 1 }
  )
})

BunRuntime.runMain(program.pipe(Effect.provide(BunServices.layer)))

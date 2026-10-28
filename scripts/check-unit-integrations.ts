import { BunRuntime, BunServices } from '@effect/platform-bun'
import { Effect } from 'effect'
import { ChildProcess, ChildProcessSpawner } from 'effect/process'

const program = Effect.gen(function* checkConsumerIntegrations() {
  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner

  for (const args of [
    ['run', 'tsc', '--project', 'tests/consumer/tsconfig.integrations.json'],
    ['run', 'vitest', 'run', '--config', 'vitest.integration.config.ts'],
    ['run', 'scripts/check-packed-consumer.ts'],
  ]) {
    const code = yield* spawner.exitCode(
      ChildProcess.make('bun', args, { stdout: 'inherit', stderr: 'inherit' })
    )

    if (code !== 0) {
      return yield* Effect.fail(
        new Error(
          `Consumer integration failed: bun ${args.join(' ')} (${code})`
        )
      )
    }
  }
})

BunRuntime.runMain(program.pipe(Effect.provide(BunServices.layer)))

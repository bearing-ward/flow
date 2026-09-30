import { BunRuntime, BunServices } from '@effect/platform-bun'
import { Effect } from 'effect'
import { ChildProcess, ChildProcessSpawner } from 'effect/unstable/process'

const checks = [
  ['quality check', ['bun', 'run', 'check']],
  ['architecture boundaries', ['bun', 'run', 'check:architecture']],
  ['documentation', ['bun', 'run', 'docs:check']],
  [
    'React Flow catalog coverage',
    ['bun', 'run', 'scripts/check-react-flow-catalog.ts'],
  ],
  [
    'React Flow API member inventory',
    ['bun', 'run', 'scripts/check-api-members.ts'],
  ],
  ['catalog proof matrix', ['bun', 'run', 'scripts/check-proof-matrix.ts']],
  [
    'benchmark calibration registry',
    ['bun', 'run', 'scripts/check-benchmark-calibration.ts'],
  ],
  [
    'example recipe registry',
    ['bun', 'run', 'scripts/check-example-recipes.ts'],
  ],
  ['research inventory', ['bun', 'run', 'research:inventory']],
  ['research trace citations', ['bun', 'run', 'research:check-traces']],
  ['package builds', ['bun', 'run', 'build:packages']],
  ['typecheck', ['bun', 'run', 'typecheck']],
  ['tests', ['bun', 'run', 'test']],
  ['packed consumer', ['bun', 'run', 'test:consumer']],
  ['build', ['bun', 'run', 'build']],
  ['browser', ['bun', 'run', 'test:browser']],
  ['Vue build', ['bun', 'run', '--cwd', 'apps/vue', 'build']],
  ['Vue conformance', ['bun', 'run', 'test:conformance:vue']],
  ['Foldkit build', ['bun', 'run', '--cwd', 'apps/foldkit', 'build']],
  ['Foldkit conformance', ['bun', 'run', 'test:conformance:foldkit']],
] as const

const program = Effect.gen(function* program() {
  const process = yield* ChildProcessSpawner.ChildProcessSpawner

  for (const [name, [command, ...arguments_]] of checks) {
    yield* Effect.log(`Starting ${name}`)

    const exitCode = yield* process.exitCode(
      ChildProcess.make(command, arguments_, {
        stderr: 'inherit',
        stdout: 'inherit',
      })
    )

    if (exitCode !== 0) {
      return yield* Effect.die(
        new Error(`${name} failed with exit code ${exitCode}`)
      )
    }
  }
})

BunRuntime.runMain(program.pipe(Effect.provide(BunServices.layer)))

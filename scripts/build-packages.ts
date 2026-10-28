import { BunRuntime, BunServices } from '@effect/platform-bun'
import { Effect, FileSystem } from 'effect'
import { ChildProcess, ChildProcessSpawner } from 'effect/process'

const packages = [
  { name: 'core', directory: 'packages/core', script: 'build' },
  { name: 'vanilla', directory: 'apps/vanilla', script: 'build:package' },
  { name: 'vue', directory: 'packages/vue', script: 'build' },
  { name: 'foldkit', directory: 'packages/foldkit', script: 'build' },
  {
    name: 'routing-libavoid',
    directory: 'packages/routing-libavoid',
    script: 'build',
  },
  {
    name: 'image-service',
    directory: 'packages/image-service',
    script: 'build',
  },
  {
    name: 'collaboration-yjs',
    directory: 'packages/collaboration-yjs',
    script: 'build',
  },
  { name: 'workflow', directory: 'packages/workflow', script: 'build' },
]

const program = Effect.gen(function* buildPackages() {
  const requested = process.argv
    .slice(2)
    .map((name) => name.replace(/^@flow\//u, ''))

  for (const name of requested) {
    if (!packages.some((entry) => entry.name === name)) {
      return yield* Effect.fail(new Error(`Unknown package: ${name}`))
    }
  }

  if (process.env.FLOW_PACKAGES_PREBUILT === '1') {
    yield* Effect.logInfo('Reusing prebuilt packages')

    return
  }

  const spawner = yield* ChildProcessSpawner.ChildProcessSpawner
  const fs = yield* FileSystem.FileSystem

  const selected =
    requested.length === 0
      ? packages
      : packages.filter(
          (entry) => entry.name === 'core' || requested.includes(entry.name)
        )

  for (const entry of selected) {
    yield* Effect.logInfo(`Building package ${entry.name}`)

    const exitCode = yield* spawner.exitCode(
      ChildProcess.make(
        'bun',
        ['run', '--cwd', entry.directory, entry.script],
        { stdout: 'inherit', stderr: 'inherit' }
      )
    )

    if (exitCode !== 0) {
      return yield* Effect.fail(
        new Error(
          `Package ${entry.name} build failed with exit code ${exitCode}`
        )
      )
    }

    const dist = `${entry.directory}/dist`

    const declarations = yield* Effect.tryPromise(() =>
      Array.fromAsync(new Bun.Glob('**/*.d.ts').scan({ cwd: dist }))
    )

    for (const declaration of declarations) {
      const file = `${dist}/${declaration}`
      const text = yield* fs.readFileString(file)
      yield* fs.writeFileString(file, text.replaceAll(/\.ts(?=['"])/gu, '.js'))
    }
  }
})

BunRuntime.runMain(program.pipe(Effect.provide(BunServices.layer)))

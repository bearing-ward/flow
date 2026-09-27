import { BunRuntime, BunServices } from '@effect/platform-bun'
import { chromium } from '@playwright/test'
import { Effect, FileSystem, Path, Schema as S } from 'effect'
import { ChildProcess, ChildProcessSpawner } from 'effect/unstable/process'
import { createServer } from 'vite'

declare global {
  interface Window {
    __flowConsumerController?: { destroy: () => void }
    __flowConsumerResult?: {
      readonly decodedNodeId: string
      readonly canvasCount: number
      readonly initialSnapshotNodeId: string | undefined
      readonly updatedNodeId: string | undefined
      readonly stateNotificationCount: number
      readonly editResult: string
    }
  }
}

const rootUrl = new URL('../', import.meta.url)

const fixtureFiles = [
  'index.html',
  'main.ts',
  'consumer.typecheck.ts',
  'tsconfig.json',
] as const

const program = Effect.gen(function* checkPackedConsumer() {
  const fileSystem = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  const childProcess = yield* ChildProcessSpawner.ChildProcessSpawner
  const root = yield* path.fromFileUrl(rootUrl)

  const temp = yield* fileSystem.makeTempDirectory({
    prefix: 'flow-packed-consumer-',
  })

  const packagesDirectory = path.join(temp, 'tarballs')

  const run = (command: string, args: readonly string[], cwd: string) =>
    Effect.gen(function* runCommand() {
      const exitCode = yield* childProcess.exitCode(
        ChildProcess.make(command, args, {
          cwd,
          stderr: 'inherit',
          stdout: 'inherit',
        })
      )

      if (exitCode !== 0) {
        return yield* Effect.die(
          new Error(
            `${command} ${args.join(' ')} failed with exit code ${exitCode}`
          )
        )
      }
    })

  const use = Effect.gen(function* useTemporaryConsumer() {
    yield* fileSystem.makeDirectory(packagesDirectory, { recursive: true })
    yield* fileSystem.makeDirectory(path.join(temp, 'src'), { recursive: true })

    yield* run(
      'bun',
      ['pm', 'pack', '--destination', packagesDirectory],
      path.join(root, 'packages/core')
    )
    yield* run(
      'bun',
      ['pm', 'pack', '--destination', packagesDirectory],
      path.join(root, 'apps/vanilla')
    )

    const consumerPackage = {
      name: 'flow-packed-consumer',
      private: true,
      type: 'module',
      dependencies: {
        '@flow/core': 'file:./tarballs/flow-core-0.0.0.tgz',
        '@flow/vanilla': 'file:./tarballs/flow-vanilla-0.0.0.tgz',
        effect: '4.0.0-rc.116',
      },
      overrides: {
        '@flow/core': 'file:./tarballs/flow-core-0.0.0.tgz',
      },
    }

    yield* fileSystem.writeFileString(
      path.join(temp, 'package.json'),
      JSON.stringify(consumerPackage, null, 2)
    )

    for (const file of fixtureFiles) {
      const contents = yield* fileSystem.readFileString(
        path.join(root, 'tests/consumer', file)
      )

      yield* fileSystem.writeFileString(path.join(temp, file), contents)
    }

    yield* run('bun', ['install', '--no-save', '--no-progress'], temp)
    yield* run(
      'bun',
      [
        'run',
        path.join(root, 'node_modules/typescript/bin/tsc'),
        '--project',
        path.join(temp, 'tsconfig.json'),
      ],
      temp
    )

    yield* Effect.tryPromise({
      try: async () => {
        const server = await createServer({
          configFile: false,
          logLevel: 'error',
          root: temp,
          server: { host: '127.0.0.1', port: 0, strictPort: false },
        })

        let browser: Awaited<ReturnType<typeof chromium.launch>> | undefined

        try {
          await server.listen()
          const address = server.httpServer?.address()

          if (
            address === null ||
            address === undefined ||
            S.is(S.String)(address)
          ) {
            throw new Error('Vite consumer server did not expose a TCP address')
          }

          browser = await chromium.launch()
          const page = await browser.newPage()
          const pageErrors: string[] = []
          page.on('pageerror', (error) => pageErrors.push(error.message))
          await page.goto(`http://127.0.0.1:${address.port}/`)
          await page.waitForFunction(
            () => window.__flowConsumerResult !== undefined
          )

          const result = await page.evaluate(() => {
            const value = window.__flowConsumerResult

            if (value === undefined) {
              throw new Error('Missing packed consumer result')
            }

            window.__flowConsumerController?.destroy()

            return {
              ...value,
              canvasCountAfterDestroy: document.querySelectorAll(
                "[data-testid='flow-canvas']"
              ).length,
            }
          })

          if (pageErrors.length > 0) {
            throw new Error(
              `Packed browser page errors: ${pageErrors.join('; ')}`
            )
          }

          if (
            result.decodedNodeId !== 'packed-node' ||
            result.canvasCount !== 1 ||
            result.initialSnapshotNodeId !== 'packed-node' ||
            result.updatedNodeId !== 'packed-updated' ||
            result.stateNotificationCount !== 1 ||
            result.editResult !== 'A updated:3:3:2:true:edit-b:edit-edge' ||
            result.canvasCountAfterDestroy !== 0
          ) {
            throw new Error(
              `Unexpected packed browser result: ${JSON.stringify(result)}`
            )
          }

          return result
        } finally {
          await browser?.close()
          await server.close()
        }
      },
      catch: (error) => error,
    })

    yield* Effect.log(
      'Packed consumer installed, typechecked, and mounted in Chromium'
    )
  })

  yield* Effect.ensuring(
    use,
    fileSystem.remove(temp, { force: true, recursive: true }).pipe(Effect.orDie)
  )
})

BunRuntime.runMain(program.pipe(Effect.provide(BunServices.layer)))

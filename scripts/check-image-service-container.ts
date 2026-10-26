import { mkdir, writeFile } from 'node:fs/promises'

import { Effect, Schedule } from 'effect'

import { imageServiceRequest } from '../apps/shared/image-service/document.ts'

const command = async (args: readonly string[]): Promise<string> => {
  const child = Bun.spawn([...args], { stdout: 'pipe', stderr: 'pipe' })

  const [output, error, exitCode] = await Promise.all([
    new Response(child.stdout).text(),
    new Response(child.stderr).text(),
    child.exited,
  ])

  if (exitCode !== 0) {
    throw new Error(`${args.join(' ')} failed: ${error}`)
  }

  return output.trim()
}

const program = Effect.scoped(
  Effect.gen(function* containerAcceptance() {
    const name = `flow-image-plan165-${process.pid}`
    yield* Effect.acquireRelease(
      Effect.tryPromise(() =>
        command([
          'docker',
          'run',
          '--rm',
          '--init',
          '-d',
          '--name',
          name,
          '-p',
          '127.0.0.1:8080:8080',
          '-p',
          '127.0.0.1:8081:8081',
          '-p',
          '127.0.0.1:8082:8082',
          '-p',
          '127.0.0.1:8083:8083',
          'flow-image-service:plan165',
        ])
      ),
      () =>
        Effect.promise(() => command(['docker', 'stop', '--time', '10', name]))
    )
    yield* Effect.tryPromise(async () => {
      const response = await fetch('http://127.0.0.1:8080/health')

      if (!response.ok) {
        throw new Error(`Container health ${response.status}`)
      }
    }).pipe(
      Effect.retry({ schedule: Schedule.spaced('200 millis'), times: 100 })
    )

    for (const host of ['vanilla', 'vue', 'foldkit'] as const) {
      yield* Effect.tryPromise(async () => {
        const capture = async () => {
          const response = await fetch('http://127.0.0.1:8080/render', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(imageServiceRequest(host)),
          })

          if (!response.ok) {
            throw new Error(
              `${host} container capture failed: ${await response.text()}`
            )
          }

          return Buffer.from(await response.arrayBuffer())
        }

        const first = await capture()
        const second = await capture()

        if (
          first.readUInt32BE(16) !== 800 ||
          first.readUInt32BE(20) !== 500 ||
          !first.equals(second)
        ) {
          throw new Error(`${host} capture dimensions or repeatability failed`)
        }

        await mkdir('/tmp/plan165', { recursive: true })
        await writeFile(`/tmp/plan165/${host}-container.png`, first)
        process.stdout.write(
          `${host}: container PNG 800x500, repeated capture identical\n`
        )
      })
    }

    const health = yield* Effect.tryPromise(async () => {
      const response = await fetch('http://127.0.0.1:8080/health')

      return response.json()
    })

    if (health.activeContexts !== 0) {
      return yield* Effect.fail(
        new Error('Container retained capture contexts')
      )
    }

    const installed = yield* Effect.tryPromise(() =>
      command([
        'docker',
        'exec',
        name,
        'bun',
        '-e',
        "await import('playwright'); try { await import('@playwright/test'); process.exit(1) } catch { process.stdout.write('production-runtime-only') }",
      ])
    )

    if (installed !== 'production-runtime-only') {
      return yield* Effect.fail(
        new Error('Container relies on development packages')
      )
    }

    yield* Effect.logInfo(
      'Container startup, all host captures, repeatability and production dependencies passed'
    )
  })
)

await Effect.runPromise(program)

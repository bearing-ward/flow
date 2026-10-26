import path from 'node:path'

import { Effect } from 'effect'

import { serveFlowImages } from './public.ts'

const program = Effect.scoped(
  Effect.gen(function* container() {
    const origins = {
      vanilla: 'http://127.0.0.1:8081',
      vue: 'http://127.0.0.1:8082',
      foldkit: 'http://127.0.0.1:8083',
    }

    for (const [host, origin] of Object.entries(origins)) {
      const root = path.resolve(import.meta.dir, 'hosts', host)
      yield* Effect.acquireRelease(
        Effect.sync(() =>
          Bun.serve({
            hostname: '0.0.0.0',
            port: Number(new URL(origin).port),
            async fetch(request) {
              const pathname = decodeURIComponent(new URL(request.url).pathname)

              const pathnameForFile = path.resolve(
                root,
                `.${pathname.endsWith('/') ? `${pathname}index.html` : pathname}`
              )

              if (!pathnameForFile.startsWith(`${root}/`)) {
                return new Response('Not found', { status: 404 })
              }

              const file = Bun.file(pathnameForFile)

              return (await file.exists())
                ? new Response(file)
                : new Response('Not found', { status: 404 })
            },
          })
        ),
        (server) => Effect.promise(() => server.stop(true))
      )
    }

    yield* serveFlowImages({ origins, hostname: '0.0.0.0', port: 8080 })
    yield* Effect.never
  })
)

const fiber = Effect.runFork(program)

process.once('SIGINT', () => fiber.interruptUnsafe())

process.once('SIGTERM', () => fiber.interruptUnsafe())

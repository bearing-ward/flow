import {
  FlowAttribute,
  FlowSpan,
  FlowImageExportFailure,
  prepareFlowImageExport,
} from '@flow/core'
import type {
  FlowImageExportRequest,
  PreparedFlowImageExport,
} from '@flow/core'
import { Effect, Semaphore } from 'effect'
import { chromium } from 'playwright'

declare global {
  // eslint-disable-next-line anti-slop/no-unknown-parameters -- Browser RPC is decoded by the capture route.
  var flowImageHost:
    // eslint-disable-next-line anti-slop/no-unknown-parameters -- Capture RPC values are decoded by the browser route.
    { readonly render: (input: unknown) => Promise<void> } | undefined
}

export interface FlowImageServiceOptions {
  readonly origins: Readonly<Record<FlowImageExportRequest['host'], string>>
  readonly timeoutMs?: number
}

const failure = (reason: FlowImageExportFailure['reason'], cause: unknown) =>
  new FlowImageExportFailure({ reason, message: String(cause) })

const validateRenderers = (prepared: PreparedFlowImageExport) => {
  const unsupportedNode = prepared.document.nodes.find(
    (node) =>
      node.type !== undefined &&
      !['default', 'input', 'output', 'group', 'shape', 'export-card'].includes(
        node.type
      )
  )

  const unsupportedEdge = prepared.document.edges.find(
    (edge) => edge.type !== undefined && edge.type !== 'default'
  )

  return unsupportedNode !== undefined || unsupportedEdge !== undefined
    ? Effect.fail(
        failure(
          'unsupported-renderer',
          `Unsupported renderer: ${unsupportedNode?.type ?? unsupportedEdge?.type}`
        )
      )
    : Effect.void
}

/** One service browser; every render owns an isolated, scoped context. */
export const createFlowImageService = (options: FlowImageServiceOptions) =>
  Effect.gen(function* imageService() {
    const origins = yield* Effect.try({
      try: () =>
        Object.fromEntries(
          Object.entries(options.origins).map(([host, value]) => {
            const url = new URL(value)

            if (
              !['http:', 'https:'].includes(url.protocol) ||
              url.origin !== value
            ) {
              throw new Error(
                'Capture origins must be HTTP origins without a path'
              )
            }

            return [host, url.origin]
          })
        ),
      catch: (cause) => failure('unavailable', cause),
    })

    if (
      options.timeoutMs !== undefined &&
      (!Number.isInteger(options.timeoutMs) || options.timeoutMs <= 0)
    ) {
      return yield* Effect.fail(
        failure('unavailable', 'timeoutMs must be a positive integer')
      )
    }

    const browser = yield* Effect.acquireRelease(
      Effect.tryPromise({
        try: () => chromium.launch({ headless: true }),
        catch: (cause) => failure('unavailable', cause),
      }),
      (resource) =>
        Effect.promise(() => resource.close()).pipe(
          Effect.withSpan(FlowSpan.hostDestroy)
        )
    )

    const semaphore = Semaphore.makeUnsafe(2)

    let active = 0
    yield* Effect.logDebug('Acquired image service Chromium').pipe(
      Effect.withSpan(FlowSpan.hostMount)
    )

    // eslint-disable-next-line anti-slop/no-unknown-parameters -- HTTP and public service inputs pass through the shared export decoder.
    const render = (input: unknown) =>
      Effect.gen(function* renderImage() {
        const prepared = yield* prepareFlowImageExport(input)
        yield* validateRenderers(prepared)
        const { request } = prepared
        const origin = origins[request.host]

        if (origin === undefined) {
          return yield* Effect.fail(
            failure('unavailable', 'Host is not configured')
          )
        }

        const context = yield* Effect.acquireRelease(
          Effect.tryPromise({
            try: async () => {
              const resource = await browser.newContext({
                viewport: { width: request.width, height: request.height },
                deviceScaleFactor: 1,
                locale: 'en-US',
                timezoneId: 'UTC',
                colorScheme: 'light',
                reducedMotion: 'reduce',
                serviceWorkers: 'block',
              })

              active += 1

              return resource
            },
            catch: (cause) => failure('render', cause),
          }),
          (resource) =>
            Effect.promise(async () => {
              await resource.close()
              active -= 1
            }).pipe(Effect.withSpan(FlowSpan.hostDestroy))
        )

        const bytes = yield* Effect.tryPromise({
          try: async () => {
            let assetFailure: string | undefined
            await context.route('**/*', async (route) => {
              const url = new URL(route.request().url())

              if (url.origin !== origin) {
                assetFailure = `External asset blocked: ${url.origin}`
                await route.abort()

                return
              }

              await route.continue()
            })
            const page = await context.newPage()
            page.on('response', (response) => {
              if (response.status() >= 400) {
                assetFailure = `Asset returned ${response.status()}: ${response.url()}`
              }
            })
            page.on('requestfailed', (requestEvent) => {
              assetFailure = `Asset failed: ${requestEvent.url()}`
            })
            await page.goto(`${origin}/image-service/?capture=1`, {
              waitUntil: 'load',
            })
            await page.waitForFunction(
              () => globalThis.flowImageHost !== undefined
            )

            try {
              const readiness = await page.evaluate(async (scene) => {
                if (globalThis.flowImageHost === undefined) {
                  return {
                    kind: 'failed',
                    reason: 'render',
                    message: 'Capture API unavailable',
                  } as const
                }

                try {
                  await globalThis.flowImageHost.render(scene)

                  return { kind: 'ready' } as const
                } catch (error) {
                  if (
                    error instanceof Error &&
                    error.name === 'FlowImageAssetFailure'
                  ) {
                    return {
                      kind: 'failed',
                      reason: 'asset',
                      message: error.message,
                    } as const
                  }

                  return {
                    kind: 'failed',
                    reason: 'render',
                    message: String(error),
                  } as const
                }
              }, request)

              if (readiness.kind === 'failed') {
                throw failure(readiness.reason, readiness.message)
              }
            } catch (error) {
              if (assetFailure !== undefined) {
                throw failure('asset', assetFailure)
              }

              throw error
            }

            if (assetFailure !== undefined) {
              throw failure('asset', assetFailure)
            }

            const png = await page.screenshot({
              type: 'png',
              animations: 'disabled',
            })

            if (assetFailure !== undefined) {
              throw failure('asset', assetFailure)
            }

            return png
          },
          catch: (cause) =>
            cause instanceof FlowImageExportFailure
              ? cause
              : failure('render', cause),
        })

        yield* Effect.logDebug('Rendered image revision').pipe(
          Effect.annotateLogs({
            [FlowAttribute.changeKind]: 'image-export',
            [FlowAttribute.nodeCount]: prepared.document.nodes.length,
            [FlowAttribute.edgeCount]: prepared.document.edges.length,
          })
        )

        return { revision: request.revision, bytes }
      }).pipe(
        Effect.scoped,
        semaphore.withPermit,
        Effect.timeoutOrElse({
          duration: options.timeoutMs ?? 15_000,
          orElse: () =>
            Effect.fail(failure('timeout', 'Image capture deadline exceeded')),
        }),
        Effect.tapError((cause) =>
          Effect.logWarning('Image export failed').pipe(
            Effect.annotateLogs({
              [FlowAttribute.failureName]: cause.reason,
              [FlowAttribute.failureMessage]: cause.message,
            }),
            Effect.withSpan(FlowSpan.editFailure)
          )
        ),
        Effect.withSpan(FlowSpan.domReconcile)
      )

    return { render, activeContexts: () => active }
  })

export type FlowImageService = Effect.Success<
  ReturnType<typeof createFlowImageService>
>

/** Bun HTTP composition. The caller owns the scope, bind address and origins. */
export const serveFlowImages = (
  options: FlowImageServiceOptions & {
    readonly port: number
    readonly hostname?: string
  }
) =>
  Effect.gen(function* serveImages() {
    const service = yield* createFlowImageService(options)

    const server = yield* Effect.acquireRelease(
      Effect.sync(() =>
        Bun.serve({
          port: options.port,
          hostname: options.hostname ?? '127.0.0.1',
          fetch(request) {
            const origin = request.headers.get('origin')

            const allowed =
              origin !== null && Object.values(options.origins).includes(origin)

            const headers = new Headers({ 'Cache-Control': 'no-store' })

            if (allowed) {
              headers.set('Access-Control-Allow-Origin', origin)
              headers.set('Vary', 'Origin')
              headers.set('Access-Control-Expose-Headers', 'X-Flow-Revision')
            }

            const url = new URL(request.url)

            if (url.pathname === '/health' && request.method === 'GET') {
              return Response.json(
                { status: 'ready', activeContexts: service.activeContexts() },
                { headers }
              )
            }

            if (request.method === 'OPTIONS' && allowed) {
              headers.set('Access-Control-Allow-Methods', 'POST')
              headers.set('Access-Control-Allow-Headers', 'Content-Type')

              return new Response(null, { status: 204, headers })
            }

            if (url.pathname !== '/render' || request.method !== 'POST') {
              return new Response('Not found', { status: 404, headers })
            }

            const response = Effect.tryPromise({
              try: () => request.json(),
              catch: (cause) => failure('invalid-request', cause),
            }).pipe(
              Effect.flatMap(service.render),
              Effect.match({
                onSuccess: ({ bytes, revision }) => {
                  headers.set('Content-Type', 'image/png')
                  headers.set('X-Flow-Revision', revision)

                  return new Response(new Uint8Array(bytes), { headers })
                },
                onFailure: (cause) => {
                  let status = 502

                  if (cause.reason === 'timeout') {
                    status = 504
                  }

                  if (
                    cause.reason === 'invalid-request' ||
                    cause.reason === 'unsupported-renderer'
                  ) {
                    status = 400
                  }

                  return Response.json(
                    { error: cause.reason, message: cause.message },
                    {
                      status,
                      headers,
                    }
                  )
                },
              })
            )

            return Effect.runPromise(response, {
              signal: request.signal,
            }).catch(() => new Response(null, { status: 499 }))
          },
        })
      ),
      (resource) => Effect.promise(() => resource.stop(true))
    )

    return { server, service }
  })

import {
  createFlowRoutingRequest,
  createFlowRoutingSession,
  FlowRouter,
  FlowRoutingFailure,
  FlowEdgeRouteSchema,
  NodeIdSchema,
  HandleIdSchema,
  FlowAttribute,
  FlowSpan,
  decodeFlowDocument,
  decodeVersionedFlowDocument,
  encodeVersionedFlowDocument,
  flowMeasurementsFromInternalNodes,
  getEdgesGeometry,
} from '@flow/core'
import type {
  FlowRouterService,
  FlowDocument,
  FlowInternalNode,
  FlowRoutingRequest,
  FlowRoutingResult,
  Viewport,
} from '@flow/core'
import { createLibavoidRouter } from '@flow/routing-libavoid'
import wasmUrl from '@flow/routing-libavoid/libavoid.wasm?url'
import { Effect } from 'effect'

import './style.css'

export const edgeRoutingDocument = () =>
  Effect.runSync(
    decodeFlowDocument({
      nodes: [
        {
          id: 'a',
          label: 'Source',
          position: { x: 60, y: 170 },
          size: { width: 120, height: 60 },
          handles: [{ id: 'out', kind: 'source', side: 'right' }],
        },
        {
          id: 'b',
          label: 'Target',
          position: { x: 620, y: 170 },
          size: { width: 120, height: 60 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
        {
          id: 'obstacle',
          label: 'Obstacle',
          position: { x: 330, y: 130 },
          size: { width: 120, height: 140 },
        },
        {
          id: 'c',
          label: 'Reconnect here',
          position: { x: 620, y: 360 },
          size: { width: 120, height: 60 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
      ],
      edges: [
        {
          id: 'ab',
          source: 'a',
          target: 'b',
          sourceHandle: 'out',
          targetHandle: HandleIdSchema.make('in'),
          label: 'Routed edge',
          reconnectable: true,
          data: { opaque: ['keep', 162] },
        },
      ],
    })
  )

interface Host {
  readonly read: () => Promise<FlowDocument>
  readonly internals: () => Promise<readonly FlowInternalNode[]>
  readonly publish: (result: FlowRoutingResult | undefined) => void
  readonly apply: (document: FlowDocument) => Promise<void>
  readonly viewport: (viewport: Viewport) => void
  readonly dispose: () => void
}

export interface EdgeRoutingDemo {
  readonly document: () => Promise<FlowDocument>
  readonly result: () => FlowRoutingResult | undefined
  readonly request: () => FlowRoutingRequest | undefined
  readonly geometry: () => ReturnType<typeof getEdgesGeometry>
  readonly saved: () =>
    | ReturnType<typeof encodeVersionedFlowDocument>
    | undefined
  readonly delay: (milliseconds: number) => void
  readonly fail: (enabled: boolean) => void
  readonly dispose: () => void
}

declare global {
  var flowRoutingDemo: EdgeRoutingDemo | undefined
}

export const mountEdgeRoutingDemo = (host: Host) => {
  const status = document.querySelector('#routing-status')
  const controls = document.querySelector('#routing-controls')

  if (status === null || controls === null) {
    throw new Error('Missing routing controls')
  }

  const adapter = createLibavoidRouter({ wasmUrl })
  const session = createFlowRoutingSession()
  let disposed = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let abort: AbortController | undefined
  let current: FlowRoutingRequest | undefined
  let currentDocument = edgeRoutingDocument()
  let measurements = flowMeasurementsFromInternalNodes([])
  let result: FlowRoutingResult | undefined
  let saved: ReturnType<typeof encodeVersionedFlowDocument> | undefined
  let delay = 0
  let fail = false
  let force = 0
  let observed = ''
  let pending = false
  let deadline = 0

  const router: FlowRouterService = {
    route: (request) =>
      Effect.sleep(delay).pipe(
        Effect.andThen(() =>
          fail
            ? Effect.fail(
                new FlowRoutingFailure({
                  reason: 'engine',
                  message: 'Requested failure fixture',
                })
              )
            : adapter.route(request)
        )
      ),
  }

  const tick = async (): Promise<void> => {
    if (disposed) {
      return
    }

    const observation = await Effect.runPromise(
      Effect.tryPromise({
        try: () => Promise.all([host.read(), host.internals()]),
        catch: (error) => new Error(String(error)),
      }).pipe(
        Effect.match({
          onSuccess: (value) => ({ kind: 'ready', value }) as const,
          onFailure: (error) => ({ kind: 'failed', error }) as const,
        })
      )
    )

    if (observation.kind === 'failed') {
      if (!disposed) {
        status.textContent = 'Routing failed; standard path fallback'
        Effect.runSync(
          Effect.logWarning('Routing host observation failed').pipe(
            Effect.annotateLogs({
              [FlowAttribute.failureMessage]: observation.error.message,
            }),
            Effect.withSpan(FlowSpan.editFailure)
          )
        )
      }

      return
    }

    const [document, internals] = observation.value

    if (disposed) {
      return
    }

    currentDocument = document
    measurements = flowMeasurementsFromInternalNodes(internals)
    const request = createFlowRoutingRequest(document, { measurements })
    const identity = `${request.revision}/${force}`

    if (observed !== identity) {
      observed = identity
      current = request
      session.cancel()
      abort?.abort()
      result = undefined
      host.publish(undefined)
      status.textContent = 'Routing pending; standard path fallback'
      pending = true
      deadline = Date.now() + 50
    }

    if (pending && Date.now() >= deadline) {
      pending = false
      abort = new AbortController()
      const owner = abort

      const run = async (): Promise<void> => {
        try {
          const outcome = await Effect.runPromise(
            session
              .run(request, () => current?.revision ?? '')
              .pipe(Effect.provideService(FlowRouter, router)),
            { signal: owner.signal }
          )

          if (
            !disposed &&
            !owner.signal.aborted &&
            outcome.kind === 'accepted'
          ) {
            const { result: accepted } = outcome
            result = accepted
            host.publish(accepted)
            status.textContent = accepted.paths.some(
              (path) => path.kind === 'unreachable'
            )
              ? 'Unreachable; standard path fallback'
              : 'Routed'
          }
        } catch (error) {
          if (!disposed && !owner.signal.aborted) {
            result = {
              revision: request.revision,
              paths: request.connections.map(({ id }) => ({
                kind: 'unreachable',
                id,
                reason: String(error),
              })),
            }
            host.publish(result)
            status.textContent = 'Routing failed; standard path fallback'
          }
        }
      }

      void run()
    }

    timer = setTimeout(() => {
      void tick()
    }, 16)
  }

  const replace = async (change: (document: FlowDocument) => FlowDocument) => {
    const input = change(await host.read())
    await host.apply(input)
  }

  const dispose = () => {
    if (disposed) {
      return
    }

    disposed = true
    clearTimeout(timer)
    abort?.abort()
    session.dispose()
    status.textContent = 'Disposed'
    host.dispose()
  }

  const actions: readonly (readonly [string, () => void | Promise<void>])[] = [
    [
      'Move obstacle',
      () =>
        replace((document) => ({
          ...document,
          nodes: document.nodes.map((node) =>
            node.id === 'obstacle'
              ? { ...node, position: { x: 330, y: 320 } }
              : node
          ),
        })),
    ],
    [
      'Resize obstacle',
      () =>
        replace((document) => ({
          ...document,
          nodes: document.nodes.map((node) =>
            node.id === 'obstacle'
              ? {
                  ...node,
                  position: { x: 330, y: 40 },
                  size: { width: 160, height: 330 },
                }
              : node
          ),
        })),
    ],
    [
      'Vertical ports',
      () =>
        replace((document) => ({
          ...document,
          nodes: document.nodes.map((node) =>
            node.id === 'a' || node.id === 'b'
              ? {
                  ...node,
                  handles: node.handles?.map((handle): typeof handle => ({
                    ...handle,
                    side: node.id === 'a' ? 'bottom' : 'top',
                  })),
                }
              : node
          ),
        })),
    ],
    [
      'Reconnect',
      () =>
        replace((document) => ({
          ...document,
          edges: document.edges.map((edge) => ({
            ...edge,
            target: NodeIdSchema.make('c'),
            targetHandle: HandleIdSchema.make('in'),
          })),
        })),
    ],
    [
      'Block port',
      () =>
        replace((document) => ({
          ...document,
          nodes: [
            ...document.nodes,
            {
              id: NodeIdSchema.make('wall'),
              label: 'Blocked port',
              position: { x: 185, y: 175 },
              size: { width: 60, height: 50 },
            },
          ],
        })),
    ],
    [
      'Manual route',
      () =>
        replace((document) => ({
          ...document,
          edges: document.edges.map((edge) => ({
            ...edge,
            route: FlowEdgeRouteSchema.make({
              mode: 'manual',
              points: [
                { x: 270, y: 330 },
                { x: 540, y: 330 },
              ],
            }),
          })),
        })),
    ],
    ['Reset', () => host.apply(edgeRoutingDocument())],
    [
      'Save',
      async () => {
        saved = encodeVersionedFlowDocument(await host.read())
      },
    ],
    [
      'Load',
      async () => {
        await host.apply(Effect.runSync(decodeVersionedFlowDocument(saved)))
      },
    ],
    ['Transform viewport', () => host.viewport({ x: 70, y: 20, zoom: 0.8 })],
    ['Dispose', () => dispose()],
  ]

  for (const [label, action] of actions) {
    const button = document.createElement('button')
    button.textContent = label
    button.addEventListener('click', () => {
      void action()
    })
    controls.append(button)
  }

  const demo: EdgeRoutingDemo = {
    document: () => (disposed ? Promise.resolve(currentDocument) : host.read()),
    result: () => result,
    request: () => current,
    geometry: () =>
      getEdgesGeometry(currentDocument, { measurements, edgeRouting: result }),
    saved: () => saved,
    delay: (milliseconds) => {
      delay = milliseconds
      force += 1
    },
    fail: (enabled) => {
      fail = enabled
      force += 1
    },
    dispose,
  }

  globalThis.flowRoutingDemo = demo
  void tick()
  window.addEventListener('pagehide', dispose, { once: true })

  return dispose
}

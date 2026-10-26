import {
  decodeFlowDocument,
  FlowEditDisposedSchema,
  getInternalNodeBounds,
} from '@flow/core'
import type {
  FlowDocument,
  FlowTransactionContext,
  FlowInternalNode,
  FlowRect,
  Viewport,
  XYPosition,
} from '@flow/core'
import {
  createFoldkitNodeMeasurementObserver,
  createFoldkitSnapshotClient,
  createProgram,
  createViewportClient,
  defaultInteractionOptions,
  HostAction,
} from '@flow/foldkit'
import type {
  EditResponse,
  FoldkitRendererRegistry,
  FoldkitVersionedSnapshotClient,
  GraphInteractionOptions,
  ports,
  ViewportClient,
} from '@flow/foldkit'
import { Effect, Exit } from 'effect'
import { Runtime } from 'foldkit'

import '@flow/foldkit/style.css'
import './recipes.css'

type RecipeRuntime = Runtime.EmbedHandle<typeof ports>

export type EditOperations = Parameters<
  RecipeRuntime['ports']['editRequests']['send']
>[0]['transaction']['operations']

export type RecipeChange = Parameters<
  Parameters<RecipeRuntime['ports']['changes']['subscribe']>[0]
>[0]

export interface MeasuredState {
  readonly document: FlowDocument
  readonly internals: ReadonlyMap<string, FlowInternalNode>
}

export interface RecipeHostOptions {
  /** Page class, used by the recipe stylesheet. */
  readonly page: string
  readonly document: unknown
  readonly viewport?: Viewport
  readonly registry?: FoldkitRendererRegistry
  readonly allowedTargets?: readonly string[]
  readonly interaction?: Partial<GraphInteractionOptions>
}

/** The shared Foldkit wiring every recipe page needs, built on public APIs. */
export interface RecipeHost {
  readonly runtime: RecipeRuntime
  readonly root: HTMLElement
  readonly toolbar: HTMLElement
  readonly frame: HTMLElement
  readonly status: HTMLOutputElement
  readonly snapshots: FoldkitVersionedSnapshotClient
  readonly viewportClient: ViewportClient
  readonly document: () => FlowDocument
  readonly viewport: () => Viewport
  /** The rendered `.flow-foldkit-canvas` pane, once Foldkit has rendered it. */
  readonly pane: () => HTMLElement | null
  /** Send one public edit transaction and wait for its result. */
  readonly edit: (
    operations: EditOperations,
    context?: FlowTransactionContext
  ) => Promise<EditResponse>
  /** Accepted document and measured internal nodes from the public snapshot port. */
  readonly measuredState: (ids?: readonly string[]) => Promise<MeasuredState>
  /** Client point to flow point through the accepted viewport and pane rect. */
  readonly screenToFlow: (point: XYPosition) => XYPosition
  /** Re-measure every rendered node, like `updateNodeInternals`. */
  readonly remeasure: () => void
  readonly onAccepted: (
    listener: (document: FlowDocument, viewport: Viewport) => void
  ) => void
  readonly onChange: (listener: (change: RecipeChange) => void) => void
  readonly onMeasured: (listener: () => void) => void
  readonly onDispose: (listener: () => void) => void
  readonly button: (testId: string, label: string) => HTMLButtonElement
}

const send = (sent: Exit.Exit<unknown, unknown>): void => {
  if (Exit.isFailure(sent)) {
    throw new Error('Foldkit rejected a recipe message')
  }
}

export const mountRecipeHost = (options: RecipeHostOptions): RecipeHost => {
  const root = document.querySelector<HTMLElement>('#app')

  if (root === null) {
    throw new Error('Missing recipe root')
  }

  root.innerHTML = `<main class="recipe-page ${options.page}"><div class="recipe-toolbar"><output data-testid="recipe-status" aria-live="polite"></output></div><div class="recipe-frame"><div data-runtime></div></div></main>`

  const toolbar = root.querySelector<HTMLElement>('.recipe-toolbar')

  const frame = root.querySelector<HTMLElement>('.recipe-frame')

  const canvas = root.querySelector<HTMLElement>('[data-runtime]')

  const status = root.querySelector<HTMLOutputElement>('output')

  if (
    toolbar === null ||
    frame === null ||
    canvas === null ||
    status === null
  ) {
    throw new Error('Missing recipe elements')
  }

  canvas.id = `flow-foldkit-${options.page}-runtime`

  const initialDocument = Effect.runSync(decodeFlowDocument(options.document))

  const initialViewport = options.viewport ?? { x: 0, y: 0, zoom: 1 }

  const runtime = Runtime.embed<typeof ports, never, 'Element'>(
    createProgram(
      canvas,
      initialDocument,
      initialViewport,
      options.allowedTargets ?? [],
      'uncontrolled',
      'uncontrolled',
      options.registry ?? {},
      undefined,
      'full',
      { ...defaultInteractionOptions, ...options.interaction }
    )
  )

  let current = initialDocument

  let viewport = initialViewport

  let requestNumber = 0

  const pending = new Map<string, (response: EditResponse) => void>()

  const accepted: ((document: FlowDocument, viewport: Viewport) => void)[] = []

  const measured: (() => void)[] = []

  const disposers: (() => void)[] = []

  const snapshots = createFoldkitSnapshotClient(runtime.ports)

  const pane = () => root.querySelector<HTMLElement>('.flow-foldkit-canvas')

  const viewportClient = createViewportClient(
    runtime.ports,
    () => {
      const bounds = (pane() ?? canvas).getBoundingClientRect()

      return {
        width: bounds.width,
        height: bounds.height,
        originX: bounds.left,
        originY: bounds.top,
      }
    },
    initialViewport
  )

  const edit = (
    operations: EditOperations,
    context?: FlowTransactionContext
  ): Promise<EditResponse> => {
    requestNumber += 1
    const requestId = `${options.page}-${requestNumber}`
    const { promise, resolve } = Promise.withResolvers<EditResponse>()
    pending.set(requestId, (response) => {
      if ('error' in response) {
        status.dataset.error = response.error._tag
      }

      resolve(response)
    })
    send(
      runtime.ports.editRequests.send({
        requestId,
        transaction: {
          operations,
          ...(context === undefined ? undefined : { context }),
        },
      })
    )

    return promise
  }

  const measuredState = async (
    ids?: readonly string[]
  ): Promise<MeasuredState> => {
    const first = await snapshots.requestVersioned({})

    const document =
      first.status === 'succeeded' ? first.response.snapshot.document : current

    const results = await Promise.all(
      (ids ?? document.nodes.map(({ id }) => id)).map((nodeId) =>
        snapshots.requestVersioned({ nodeId })
      )
    )

    const internals = new Map<string, FlowInternalNode>()

    for (const result of results) {
      const internal =
        result.status === 'succeeded' ? result.response.internalNode : null

      if (internal !== null) {
        internals.set(internal.node.id, internal)
      }
    }

    return { document, internals }
  }

  const screenToFlow = (point: XYPosition): XYPosition => {
    const bounds = (pane() ?? canvas).getBoundingClientRect()

    return {
      x: (point.x - bounds.left - viewport.x) / viewport.zoom,
      y: (point.y - bounds.top - viewport.y) / viewport.zoom,
    }
  }

  // Report measured node and handle geometry; Foldkit renders from it.
  const measurement = createFoldkitNodeMeasurementObserver({
    owner: frame,
    zoom: () => {
      const rendered = frame.querySelector('.flow-foldkit-viewport')

      return rendered === null
        ? initialViewport.zoom
        : new DOMMatrixReadOnly(getComputedStyle(rendered).transform).a
    },
    onMeasure: (requests) =>
      send(runtime.ports.actions.send(HostAction.MeasureNodes({ requests }))),
  })

  const remeasure = (): void => {
    for (const element of frame.querySelectorAll('[data-testid="flow-node"]')) {
      measurement.measure(element)
    }
  }

  const changeListeners: ((change: RecipeChange) => void)[] = []

  const stops = [
    runtime.ports.editResults.subscribe((response) => {
      pending.get(response.requestId)?.(response)
      pending.delete(response.requestId)
    }),
    runtime.ports.acceptedStates.subscribe((change) => {
      current = Effect.runSync(decodeFlowDocument(change.current.document))
      ;({ viewport } = change.current)

      for (const listener of accepted) {
        listener(current, viewport)
      }
    }),
    runtime.ports.viewportResults.subscribe((response) => {
      ;({ viewport } = response)
    }),
    runtime.ports.changes.subscribe((change) => {
      for (const listener of changeListeners) {
        listener(change)
      }
    }),
    runtime.ports.measurementResults.subscribe(() => {
      for (const listener of measured) {
        listener()
      }
    }),
  ]

  const button = (testId: string, label: string): HTMLButtonElement => {
    const element = document.createElement('button')
    element.type = 'button'
    element.dataset.testid = testId
    element.textContent = label
    status.before(element)

    return element
  }

  globalThis.addEventListener(
    'pagehide',
    () => {
      for (const dispose of disposers) {
        dispose()
      }

      measurement.dispose()
      snapshots.dispose()
      viewportClient.dispose()

      for (const stop of stops) {
        stop()
      }

      for (const [requestId, resolve] of pending) {
        resolve({ requestId, error: FlowEditDisposedSchema.make({}) })
      }

      pending.clear()
      runtime.dispose()
    },
    { once: true }
  )

  return {
    runtime,
    root,
    toolbar,
    frame,
    status,
    snapshots,
    viewportClient,
    document: () => current,
    viewport: () => viewport,
    pane,
    edit,
    measuredState,
    screenToFlow,
    remeasure,
    onAccepted: (listener) => {
      accepted.push(listener)
    },
    onChange: (listener) => {
      changeListeners.push(listener)
    },
    onMeasured: (listener) => {
      measured.push(listener)
    },
    onDispose: (listener) => {
      disposers.push(listener)
    },
    button,
  }
}

/** Resolve after the browser has painted the next frame. */
export const nextFrame = (): Promise<undefined> => {
  const { promise, resolve } = Promise.withResolvers<undefined>()
  requestAnimationFrame(() => resolve())

  return promise
}

/** Absolute measured bounds keyed by node id, for grouping and hit tests. */
export const measuredBounds = (
  internals: ReadonlyMap<string, FlowInternalNode>
): ReadonlyMap<string, FlowRect> =>
  new Map(
    [...internals.values()].flatMap((internal) => {
      if (internal.measurementStatus !== 'measured') {
        return []
      }

      const { id, bounds } = getInternalNodeBounds(internal)

      return [[id, bounds] as const]
    })
  )

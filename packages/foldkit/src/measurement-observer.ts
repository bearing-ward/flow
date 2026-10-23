import {
  NodeIdSchema,
  HandleIdSchema,
  FlowAttribute,
  FlowSpan,
} from '@flow/core'
import type { NodeMeasurementInput } from '@flow/core'
import { Effect } from 'effect'

export interface FoldkitNodeMeasurementRequest {
  readonly requestId: string
  readonly measurement: NodeMeasurementInput
}

export interface FoldkitNodeMeasurementObserver {
  readonly count: () => number
  readonly measure: (element: Element, requestId?: string) => boolean
  readonly dispose: () => void
}

export interface FoldkitNodeMeasurementObserverOptions {
  readonly owner: HTMLElement
  readonly zoom?: () => number
  readonly onMeasure: (
    requests: readonly FoldkitNodeMeasurementRequest[]
  ) => void
  readonly onMutations?: () => void
  readonly selector?: string
  readonly onError?: (cause: Error) => void
}

/** Observe rendered Foldkit nodes and report measured geometry to the host. */
export const createFoldkitNodeMeasurementObserver = (
  options: FoldkitNodeMeasurementObserverOptions
): FoldkitNodeMeasurementObserver => {
  const { owner } = options
  const view = owner.ownerDocument.defaultView

  if (view === null) {
    throw new Error('Foldkit measurement owner has no browsing context')
  }

  let requestNumber = 0
  let generation = 0
  let observed = 0
  let disposed = false
  const observedElements = new WeakSet<Element>()
  const elementGenerations = new WeakMap<Element, number>()
  const selector = options.selector ?? '[data-testid="flow-node"]'

  const reportError = (cause: Error): void => {
    if (options.onError !== undefined) {
      options.onError(cause)

      return
    }

    Effect.runFork(
      Effect.logError('Foldkit node measurement observer failed', cause).pipe(
        Effect.annotateLogs({
          [FlowAttribute.failureName]: cause.name,
          [FlowAttribute.nodeId]: 'observer',
        }),
        Effect.withSpan(FlowSpan.geometryMeasure)
      )
    )
  }

  const read = (
    element: Element,
    requestId?: string
  ): FoldkitNodeMeasurementRequest | undefined => {
    if (
      disposed ||
      !owner.contains(element) ||
      !(element instanceof view.HTMLElement)
    ) {
      return undefined
    }

    const { nodeId } = element.dataset

    if (nodeId === undefined) {
      return undefined
    }

    requestNumber += 1

    try {
      const bounds = element.getBoundingClientRect()
      const zoom = options.zoom?.() ?? 1

      const handles = [
        ...element.querySelectorAll<HTMLElement>('[data-handle-id]'),
      ].flatMap((handleElement) => {
        const { handleId } = handleElement.dataset

        if (
          handleId === undefined ||
          handleElement.closest('[data-testid="flow-node"]') !== element ||
          handleElement.getClientRects().length === 0
        ) {
          return []
        }

        const handle = handleElement.getBoundingClientRect()

        return [
          {
            nodeId: NodeIdSchema.make(nodeId),
            handleId: HandleIdSchema.make(handleId),
            offset: {
              x: (handle.left + handle.width / 2 - bounds.left) / zoom,
              y: (handle.top + handle.height / 2 - bounds.top) / zoom,
            },
            width: handle.width / zoom,
            height: handle.height / zoom,
          },
        ]
      })

      const uniqueHandles = [
        ...new Map(handles.map((handle) => [handle.handleId, handle])).values(),
      ]

      const request = {
        requestId: requestId ?? `observer-${requestNumber}`,
        measurement: {
          nodeId: NodeIdSchema.make(nodeId),
          width: bounds.width / zoom,
          height: bounds.height / zoom,
          handles: uniqueHandles,
          generation: elementGenerations.get(element) ?? generation,
        },
      }

      return request
    } catch (error) {
      reportError(error instanceof Error ? error : new Error(String(error)))

      return undefined
    }
  }

  const publish = (
    requests: readonly FoldkitNodeMeasurementRequest[]
  ): boolean => {
    if (requests.length > 0) {
      try {
        options.onMeasure(requests)
        observed += requests.length

        return true
      } catch (error) {
        reportError(error instanceof Error ? error : new Error(String(error)))
      }
    }

    return false
  }

  const measure = (element: Element, requestId?: string): boolean => {
    const request = read(element, requestId)

    if (request === undefined) {
      return false
    }

    return publish([request])
  }

  const resizeObserver = new view.ResizeObserver((entries) => {
    publish(
      entries.flatMap((entry) => {
        const request = read(entry.target)

        return request === undefined ? [] : [request]
      })
    )
  })

  const reconcile = (): void => {
    if (disposed) {
      return
    }

    try {
      options.onMutations?.()

      const requests: FoldkitNodeMeasurementRequest[] = []

      for (const element of owner.querySelectorAll<HTMLElement>(selector)) {
        if (observedElements.has(element)) {
          continue
        }

        observedElements.add(element)
        generation += 1
        elementGenerations.set(element, generation)
        resizeObserver.observe(element)
        const request = read(element)

        if (request !== undefined) {
          requests.push(request)
        }
      }

      publish(requests)
    } catch (error) {
      reportError(error instanceof Error ? error : new Error(String(error)))
    }
  }

  const mutationObserver = new view.MutationObserver(reconcile)
  mutationObserver.observe(owner, { childList: true, subtree: true })
  reconcile()

  return {
    count: () => observed,
    measure,
    dispose: () => {
      if (disposed) {
        return
      }

      disposed = true
      mutationObserver.disconnect()
      resizeObserver.disconnect()
    },
  }
}

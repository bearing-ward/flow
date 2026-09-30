import { FlowAttribute, FlowSpan, NodeIdSchema } from '@flow/core'
import type { NodeId, NodeInternalsRefreshResult } from '@flow/core'
import { Effect, Schema } from 'effect'

export type FoldkitNodeInternalsRefreshResult = NodeInternalsRefreshResult

export interface FoldkitNodeInternalsRefresher {
  readonly refresh: (
    nodeIds: NodeId | readonly NodeId[]
  ) => Promise<readonly FoldkitNodeInternalsRefreshResult[]>
  readonly dispose: () => void
}

export interface FoldkitNodeInternalsRefresherOptions {
  /** Resolve mounted elements in the owning host; DOM lookup stays host-owned. */
  readonly resolveElement: (nodeId: NodeId) => Element | undefined
  /** Measure through the host's existing geometry path and typed Runtime action. */
  readonly measure: (element: Element, nodeId: NodeId) => boolean
  /** Native host scheduler; the release function cancels the queued frame. */
  readonly schedule?: (run: () => void) => () => void
}

const reportFailure = (cause: unknown, nodeId?: NodeId): void => {
  Effect.runFork(
    Effect.logError('Foldkit node internals refresh failed', cause).pipe(
      Effect.annotateLogs({
        [FlowAttribute.failureName]:
          cause instanceof Error ? cause.name : 'Unknown',
        [FlowAttribute.nodeId]: nodeId ?? 'batch',
      }),
      Effect.withSpan(FlowSpan.geometryMeasure)
    )
  )
}

/** Batch owner-scoped measurements in one frame without changing accepted graph state. */
export const createFoldkitNodeInternalsRefresher = (
  options: FoldkitNodeInternalsRefresherOptions
): FoldkitNodeInternalsRefresher => {
  let disposed = false
  let scheduled = false
  let cancelFrame: (() => void) | undefined

  const pending = new Map<
    NodeId,
    ((result: NodeInternalsRefreshResult) => void)[]
  >()

  const schedule =
    options.schedule ??
    ((run) => {
      const frame = requestAnimationFrame(run)

      return () => cancelAnimationFrame(frame)
    })

  const flush = (): void => {
    scheduled = false
    cancelFrame = undefined

    for (const [nodeId, waiters] of pending) {
      let status: NodeInternalsRefreshResult['status'] = 'disposed'

      if (!disposed) {
        try {
          const element = options.resolveElement(nodeId)

          if (element === undefined) {
            status = 'missing'
          } else {
            status = options.measure(element, nodeId) ? 'requested' : 'failed'
          }
        } catch (error) {
          status = 'failed'
          reportFailure(error, nodeId)
        }
      }

      for (const settle of waiters) {
        settle({ nodeId, status })
      }
    }

    pending.clear()
  }

  return {
    refresh: (requestedIds) => {
      const nodeIds = [
        ...new Set(
          Schema.decodeUnknownSync(Schema.Array(NodeIdSchema))(
            Array.isArray(requestedIds) ? requestedIds : [requestedIds]
          )
        ),
      ]

      if (disposed) {
        return Promise.resolve(
          nodeIds.map((nodeId) => ({ nodeId, status: 'disposed' }))
        )
      }

      const requests = nodeIds.map((nodeId) => {
        const { promise, resolve } =
          Promise.withResolvers<NodeInternalsRefreshResult>()

        const waiters = pending.get(nodeId) ?? []
        waiters.push(resolve)
        pending.set(nodeId, waiters)

        return promise
      })

      if (!scheduled && pending.size > 0) {
        scheduled = true

        try {
          const cancel = schedule(flush)

          if (scheduled) {
            cancelFrame = cancel
          }
        } catch (error) {
          reportFailure(error)
          scheduled = false
          cancelFrame = undefined

          for (const [nodeId, waiters] of pending) {
            for (const settle of waiters) {
              settle({ nodeId, status: 'failed' })
            }
          }

          pending.clear()
        }
      }

      return Promise.all(requests)
    },
    dispose: () => {
      if (disposed) {
        return
      }

      disposed = true

      try {
        cancelFrame?.()
      } catch (error) {
        reportFailure(error)
      }

      flush()
    },
  }
}

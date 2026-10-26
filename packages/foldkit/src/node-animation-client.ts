import type {
  FlowNodeAnimationRequest,
  FlowNodeAnimationResult,
} from '@flow/core'
import { Exit } from 'effect'
import type { Runtime } from 'foldkit'

import type { ports } from './application.ts'
import { HostAction } from './host-action.ts'

/** The Runtime owns transition state and frames; responses acknowledge painted output. */
export const createFoldkitNodeAnimationClient = (
  runtimePorts: Pick<
    Runtime.EmbedHandle<typeof ports>['ports'],
    'actions' | 'nodeAnimationResults'
  >
) => {
  let disposed = false

  const pending = new Map<
    string,
    { revision: string; resolve: (result: FlowNodeAnimationResult) => void }
  >()

  const stop = runtimePorts.nodeAnimationResults.subscribe(
    ({ requestId, result }) => {
      pending.get(requestId)?.resolve(result)
      pending.delete(requestId)
    }
  )

  return {
    animateNodePositions: (
      request: FlowNodeAnimationRequest
    ): Promise<FlowNodeAnimationResult> => {
      if (disposed) {
        return Promise.resolve({
          revision: request.result.revision,
          kind: 'disposed',
        })
      }

      const requestId = crypto.randomUUID()
      const completion = Promise.withResolvers<FlowNodeAnimationResult>()
      pending.set(requestId, {
        revision: request.result.revision,
        resolve: completion.resolve,
      })

      const sent = runtimePorts.actions.send(
        HostAction.AnimateNodePositions({
          requestId,
          request,
          reducedMotion:
            globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')
              .matches ?? false,
        })
      )

      if (Exit.isFailure(sent)) {
        pending.delete(requestId)
        completion.resolve({
          revision: request.result.revision,
          kind: 'disposed',
        })
      }

      return completion.promise
    },
    cancelNodeAnimation: () =>
      runtimePorts.actions.send(HostAction.CancelNodeAnimation()),
    dispose: () => {
      if (disposed) {
        return
      }

      disposed = true
      runtimePorts.actions.send(HostAction.CancelNodeAnimation())
      stop()

      for (const item of pending.values()) {
        item.resolve({ revision: item.revision, kind: 'disposed' })
      }

      pending.clear()
    },
  }
}

import {
  FlowEditDisposedSchema,
  getInternalNodeLayoutBounds,
  prepareFlowGrouping,
} from '@flow/core'
import type { FlowGroupingActionInput } from '@flow/core'
import { Effect, Exit } from 'effect'
import type { Runtime } from 'foldkit'

import type { EditResponse, ports } from './application.ts'
import { createFoldkitSnapshotClient } from './snapshot-client.ts'

type GroupingPorts = Pick<
  Runtime.EmbedHandle<typeof ports>['ports'],
  | 'snapshotRequests'
  | 'snapshotFailures'
  | 'snapshots'
  | 'versionedSnapshots'
  | 'versionedSnapshotRequests'
  | 'editRequests'
  | 'editResults'
>

export const createFoldkitGroupingClient = (runtimePorts: GroupingPorts) => {
  const snapshots = createFoldkitSnapshotClient(runtimePorts)
  const pending = new Map<string, (response: EditResponse) => void>()
  let disposed = false

  const stop = runtimePorts.editResults.subscribe((response) => {
    pending.get(response.requestId)?.(response)
    pending.delete(response.requestId)
  })

  return {
    execute: async (action: FlowGroupingActionInput): Promise<EditResponse> => {
      if (disposed) {
        throw new Error('FlowGroupingDisposed')
      }

      const result = await snapshots.requestVersioned({ internalNodes: true })

      if (result.status !== 'succeeded') {
        throw new Error(result.status)
      }

      const { document } = result.response.snapshot

      const bounds = new Map(
        (result.response.internalNodes ?? []).flatMap((internal) =>
          internal.measurementStatus === 'measured'
            ? [
                [
                  internal.node.id,
                  getInternalNodeLayoutBounds(internal).bounds,
                ] as const,
              ]
            : []
        )
      )

      const transaction = Effect.runSync(
        prepareFlowGrouping(document, bounds, action)
      )

      if (disposed) {
        throw new Error('FlowGroupingDisposed')
      }

      const requestId = crypto.randomUUID()
      const { promise, resolve } = Promise.withResolvers<EditResponse>()
      pending.set(requestId, resolve)
      const sent = runtimePorts.editRequests.send({ requestId, transaction })

      if (Exit.isFailure(sent)) {
        pending.delete(requestId)
        throw new Error('FlowGroupingSendFailed')
      }

      return promise
    },
    dispose: () => {
      disposed = true
      stop()
      snapshots.dispose()

      for (const [requestId, resolve] of pending) {
        resolve({ requestId, error: FlowEditDisposedSchema.make({}) })
      }

      pending.clear()
    },
  }
}

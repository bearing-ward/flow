import { FlowAttribute, FlowHistoryStatusSchema, FlowSpan } from '@flow/core'
import type { FlowHistoryStatus } from '@flow/core'
import { Effect, Exit, Schema } from 'effect'
import type { Runtime } from 'foldkit'

import { HistoryResultSchema } from './application.ts'
import type { HistoryRequestSchema, ports } from './application.ts'

type HistoryPorts = Pick<
  Runtime.EmbedHandle<typeof ports>['ports'],
  'historyRequests' | 'historyResults' | 'historyStates'
>

export interface FoldkitHistoryClient {
  readonly undo: () => Promise<FlowHistoryStatus>
  readonly redo: () => Promise<FlowHistoryStatus>
  readonly getStatus: () => Promise<FlowHistoryStatus>
  readonly rejectHistory: (transactionId: string) => Promise<FlowHistoryStatus>
  readonly subscribeHistory: (
    listener: (status: FlowHistoryStatus) => void
  ) => () => void
  readonly dispose: () => void
}

/** Requests and subscriptions only; the application model owns every snapshot. */
export const createFoldkitHistoryClient = (
  runtimePorts: HistoryPorts
): FoldkitHistoryClient => {
  const owner = crypto.randomUUID()
  let sequence = 0
  let disposed = false

  let lastStatus: FlowHistoryStatus = {
    canUndo: false,
    canRedo: false,
    pending: false,
    pastCount: 0,
    futureCount: 0,
    capacity: 100,
    disposed: false,
  }

  const pending = new Map<string, (status: FlowHistoryStatus) => void>()
  const listeners = new Set<(status: FlowHistoryStatus) => void>()

  const terminal = (): FlowHistoryStatus => ({
    ...lastStatus,
    canUndo: false,
    canRedo: false,
    pending: false,
    pastCount: 0,
    futureCount: 0,
    disposed: true,
  })

  const stops = [
    runtimePorts.historyResults.subscribe((input) => {
      const { requestId, status } =
        Schema.decodeUnknownSync(HistoryResultSchema)(input)

      pending.get(requestId)?.(status)
      pending.delete(requestId)
    }),
    runtimePorts.historyStates.subscribe((input) => {
      lastStatus = Schema.decodeUnknownSync(FlowHistoryStatusSchema)(input)

      for (const listener of listeners) {
        listener(lastStatus)
      }

      if (lastStatus.disposed) {
        for (const resolve of pending.values()) {
          resolve(lastStatus)
        }

        pending.clear()
      }
    }),
  ]

  const request = (
    action: (typeof HistoryRequestSchema.Type)['action'],
    transactionId?: string
  ): Promise<FlowHistoryStatus> => {
    if (disposed || lastStatus.disposed) {
      return Promise.resolve(terminal())
    }

    sequence += 1
    const requestId = `${owner}-${sequence}`

    const { promise, resolve, reject } =
      Promise.withResolvers<FlowHistoryStatus>()

    pending.set(requestId, resolve)

    try {
      const sent = runtimePorts.historyRequests.send({
        requestId,
        action,
        transactionId,
      })

      if (Exit.isFailure(sent)) {
        pending.delete(requestId)
        resolve(terminal())
      }
    } catch (error) {
      pending.delete(requestId)
      reject(error)
    }

    return promise
  }

  const initialize = async (): Promise<void> => {
    await Promise.resolve()

    if (disposed || sequence !== 0) {
      return
    }

    try {
      await request('status')
    } catch (error) {
      Effect.runSync(
        Effect.logError('Foldkit initial history status failed').pipe(
          Effect.annotateLogs({
            [FlowAttribute.changeKind]: 'history-status',
            [FlowAttribute.failureName]:
              error instanceof Error ? error.name : 'Unknown',
          }),
          Effect.withSpan(FlowSpan.controllerUpdate)
        )
      )
    }
  }

  void initialize()

  return {
    undo: () => request('undo'),
    redo: () => request('redo'),
    getStatus: () => request('status'),
    rejectHistory: (transactionId) => request('reject', transactionId),
    subscribeHistory: (listener) => {
      if (!disposed) {
        listeners.add(listener)
      }

      return () => {
        listeners.delete(listener)
      }
    },
    dispose: () => {
      if (disposed) {
        return
      }

      disposed = true
      lastStatus = terminal()

      for (const stop of stops) {
        stop()
      }

      for (const resolve of pending.values()) {
        resolve(lastStatus)
      }

      pending.clear()
      listeners.clear()
    },
  }
}

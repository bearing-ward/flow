import {
  FlowAttribute,
  FlowSpan,
  flowSelectionEqual,
  selectFlowSelection,
  FlowSnapshotSchema,
  diffNodeConnections,
  selectNodeConnections,
  NodeIdSchema,
  HandleIdSchema,
} from '@flow/core'
import type {
  FlowNodeConnection,
  FlowSelection,
  FlowSnapshot,
} from '@flow/core'
import { Effect, Schema } from 'effect'

import { observeKeyPress } from './key-press-observer.ts'
import type {
  FlowKeyCode,
  FlowKeyPressOptions,
  FlowKeyPressTarget,
} from './key-press-observer.ts'

const noOperation = (): boolean => false

type NodeConnectionObserverCallback = 'onConnect' | 'onDisconnect'

type NodeConnectionObserverErrorHandler = (
  error: Error,
  context: {
    readonly callback: NodeConnectionObserverCallback
    readonly nodeId: string
  }
) => void

export interface AcceptedStateSource {
  readonly subscribe: (
    listener: (change: {
      readonly current: typeof FlowSnapshotSchema.Encoded
    }) => void
  ) => () => void
}

export interface FoldkitObservers {
  readonly subscribeSelection: (
    listener: (selection: FlowSelection) => void
  ) => () => void
  readonly observeNodeConnections: (
    options: {
      readonly nodeId: string
      readonly type?: 'source' | 'target'
      readonly handleId?: string | null
    },
    callbacks: {
      readonly onConnect?: (connections: readonly FlowNodeConnection[]) => void
      readonly onDisconnect?: (
        connections: readonly FlowNodeConnection[]
      ) => void
    }
  ) => () => void
  readonly observeKeyPress: (
    keyCode: FlowKeyCode,
    options: FlowKeyPressOptions,
    listener: (pressed: boolean) => void
  ) => () => void
  readonly dispose: () => void
}

/** Bind host observers to one Runtime's accepted-state port and lifecycle. */
export const createFoldkitObservers = (
  acceptedStates: AcceptedStateSource,
  initialSnapshot: FlowSnapshot,
  defaultTarget?: FlowKeyPressTarget,
  onCallbackError?: NodeConnectionObserverErrorHandler
): FoldkitObservers => {
  const reportCallbackError: NodeConnectionObserverErrorHandler = (
    error,
    context
  ) => {
    const failure = { name: error.name, message: error.message }

    Effect.runFork(
      Effect.logError('Foldkit node connection observer callback failed').pipe(
        Effect.annotateLogs({
          [FlowAttribute.failureName]: failure.name,
          [FlowAttribute.failureMessage]: failure.message,
          [FlowAttribute.inputKind]: `node-connection-${context.callback}`,
          [FlowAttribute.nodeId]: context.nodeId,
        }),
        Effect.withSpan(FlowSpan.controllerUpdate)
      )
    )
    onCallbackError?.(error, context)
  }

  const projectConnections = (
    snapshot: FlowSnapshot,
    options: Parameters<FoldkitObservers['observeNodeConnections']>[0]
  ): readonly FlowNodeConnection[] => {
    const validated = { nodeId: NodeIdSchema.make(options.nodeId) }

    if (options.type !== undefined) {
      Object.assign(validated, { type: options.type })
    }

    if (options.handleId !== undefined) {
      Object.assign(validated, {
        handleId:
          options.handleId === null
            ? null
            : HandleIdSchema.make(options.handleId),
      })
    }

    return selectNodeConnections(snapshot.document, validated)
  }

  const selectionListeners = new Set<(selection: FlowSelection) => void>()

  const connectionObservers = new Set<{
    readonly options: Parameters<FoldkitObservers['observeNodeConnections']>[0]
    readonly callbacks: Parameters<
      FoldkitObservers['observeNodeConnections']
    >[1]
    previous: readonly FlowNodeConnection[]
  }>()

  const keyPressDisposers = new Set<() => void>()
  let currentSelection = selectFlowSelection(initialSnapshot.document)
  let currentSnapshot = initialSnapshot
  let disposed = false

  const unsubscribeState = acceptedStates.subscribe(({ current }) => {
    if (disposed) {
      return
    }

    const acceptedSnapshot =
      Schema.decodeUnknownSync(FlowSnapshotSchema)(current)

    currentSnapshot = acceptedSnapshot

    const next = selectFlowSelection(acceptedSnapshot.document)

    if (!flowSelectionEqual(currentSelection, next)) {
      currentSelection = next

      const listeners = new Set(selectionListeners)

      for (const listener of listeners) {
        if (selectionListeners.has(listener)) {
          listener(next)
        }
      }
    }

    for (const observer of connectionObservers) {
      if (!connectionObservers.has(observer)) {
        continue
      }

      const connections = projectConnections(acceptedSnapshot, observer.options)
      const delta = diffNodeConnections(observer.previous, connections)
      observer.previous = connections

      if (delta.disconnected.length > 0) {
        try {
          observer.callbacks.onDisconnect?.(delta.disconnected)
        } catch (error) {
          reportCallbackError(
            error instanceof Error ? error : new Error(String(error)),
            {
              callback: 'onDisconnect',
              nodeId: observer.options.nodeId,
            }
          )
        }
      }

      if (delta.connected.length > 0) {
        try {
          observer.callbacks.onConnect?.(delta.connected)
        } catch (error) {
          reportCallbackError(
            error instanceof Error ? error : new Error(String(error)),
            {
              callback: 'onConnect',
              nodeId: observer.options.nodeId,
            }
          )
        }
      }
    }
  })

  return {
    subscribeSelection: (listener) => {
      if (disposed) {
        return noOperation
      }

      selectionListeners.add(listener)
      listener(currentSelection)

      return () => selectionListeners.delete(listener)
    },
    observeNodeConnections: (options, callbacks) => {
      if (disposed) {
        return noOperation
      }

      const observer = {
        options,
        callbacks,
        previous: projectConnections(currentSnapshot, options),
      }

      connectionObservers.add(observer)

      return () => connectionObservers.delete(observer)
    },
    observeKeyPress: (keyCode, options, listener) => {
      if (disposed) {
        listener(false)

        return noOperation
      }

      let disposedObserver = false

      const targetOptions: FlowKeyPressOptions =
        (options.target !== null && options.target !== undefined) ||
        defaultTarget === undefined
          ? options
          : { ...options, target: defaultTarget }

      const stopObserving = observeKeyPress(keyCode, listener, targetOptions)

      const stop = (): void => {
        if (disposedObserver) {
          return
        }

        disposedObserver = true
        keyPressDisposers.delete(stop)
        stopObserving()
      }

      keyPressDisposers.add(stop)

      return stop
    },
    dispose: () => {
      if (disposed) {
        return
      }

      disposed = true
      unsubscribeState()
      selectionListeners.clear()
      connectionObservers.clear()

      for (const stop of keyPressDisposers) {
        stop()
      }

      keyPressDisposers.clear()
    },
  }
}

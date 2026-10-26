import {
  FlowAttribute,
  FlowDocumentSchema,
  validateFlowDocument,
  FlowNodeSchema,
  FlowRoomPresenceSchema,
  FlowTransactionContextSchema,
  FlowSpan,
  flowHistoryDocument,
  projectFlowRoomDocument,
} from '@flow/core'
import type {
  FlowDocument,
  FlowHistoryStatus,
  FlowRoomPresence,
  FlowRoomStatus,
  FlowTransactionContext,
} from '@flow/core'
import { Effect, Option, Schema as S } from 'effect'
import { WebsocketProvider } from 'y-websocket'
import * as Y from 'yjs'

const tagged = S.TaggedError

export class FlowRoomError extends tagged<FlowRoomError>()('FlowRoomError', {
  operation: S.String,
  message: S.String,
}) {}

const OptionsSchema = S.Struct({
  serverUrl: S.String.check(
    S.makeFilter((value) => {
      const url = URL.parse(value)

      return (
        url !== null &&
        (url.protocol === 'ws:' || url.protocol === 'wss:') &&
        url.username === '' &&
        url.password === ''
      )
    })
  ),
  room: S.NonEmptyString.check(
    S.isMaxLength(200),
    S.makeFilter((room) => room !== '.' && room !== '..')
  ),
  actorId: S.NonEmptyString,
  name: S.NonEmptyString,
})

export type FlowRoomOptions = typeof OptionsSchema.Type

const KeySchema = S.Tuple([
  S.Literals(['nodes', 'edges', 'bundles', 'meta']),
  S.String,
  S.String,
])

type Collection = (typeof KeySchema.Type)[0]

const key = (collection: Collection, id: string, field: string) =>
  JSON.stringify([collection, id, field])

const same = <Value>(a: Value, b: Value): boolean =>
  JSON.stringify(a) === JSON.stringify(b)

const diagnostic = (message: string, span: string, operation: string) =>
  Effect.logDebug(message).pipe(
    Effect.annotateLogs({ [FlowAttribute.changeKind]: operation }),
    Effect.withSpan(span)
  )

export interface FlowRoom {
  readonly document: () => FlowDocument
  readonly failure: () => FlowRoomError | undefined
  readonly status: () => FlowRoomStatus
  readonly presence: () => readonly FlowRoomPresence[]
  readonly subscribe: (listener: () => void) => () => void
  readonly commit: (
    before: FlowDocument,
    after: FlowDocument,
    context?: FlowTransactionContext
  ) => Effect.Effect<void, FlowRoomError>
  readonly beginGesture: () => void
  readonly endGesture: () => void
  readonly undo: () => void
  readonly redo: () => void
  readonly history: () => FlowHistoryStatus
  readonly setPresence: (
    presence: FlowRoomPresence
  ) => Effect.Effect<void, FlowRoomError>
  readonly disconnect: Effect.Effect<void, FlowRoomError>
  readonly reconnect: Effect.Effect<void, FlowRoomError>
  readonly dispose: () => void
}

const createRoom = (options: FlowRoomOptions): FlowRoom => {
  const doc = new Y.Doc()
  const fields = doc.getMap<unknown>('flow-v1')
  const localOrigin = { actorId: options.actorId }

  const undo = new Y.UndoManager(fields, {
    trackedOrigins: new Set([localOrigin]),
    captureTimeout: 0,
  })

  const provider = new WebsocketProvider(
    options.serverUrl,
    encodeURIComponent(options.room),
    doc,
    {
      connect: false,
      disableBc: true,
    }
  )

  const listeners = new Set<() => void>()
  let state: FlowRoomStatus = 'connecting'
  let socketOpen = false
  let current: FlowDocument = { nodes: [], edges: [] }
  let lastFailure: FlowRoomError | undefined
  let gesturing = false
  let gestureStarted = false

  const emit = () => {
    for (const listener of listeners) {
      listener()
    }
  }

  const decode = () => {
    const collections = {
      nodes: new Map<string, Record<string, typeof S.Json.Type>>(),
      edges: new Map<string, Record<string, typeof S.Json.Type>>(),
      bundles: new Map<string, Record<string, typeof S.Json.Type>>(),
      meta: new Map<string, Record<string, typeof S.Json.Type>>(),
    }

    for (const [encodedKey, value] of fields) {
      const [collection, id, field] = S.decodeUnknownSync(KeySchema)(
        JSON.parse(encodedKey)
      )

      const record = collections[collection].get(id) ?? {}
      collections[collection].set(id, {
        ...record,
        [field]: S.decodeUnknownSync(S.Json)(value),
      })
    }

    const live = (collection: Exclude<Collection, 'meta'>) =>
      [...collections[collection]].flatMap(([id, { $alive, ...record }]) => {
        const alive = S.decodeUnknownSync(S.Union([S.Boolean, S.Undefined]))(
          $alive
        )

        if (alive !== true) {
          return []
        }

        if (record.id !== id) {
          throw new FlowRoomError({
            operation: 'decode',
            message: 'Entity identity differs from its room key',
          })
        }

        return [record]
      })

    const retired = [...collections.nodes.values()]
      .filter((record) => record.$alive !== true)
      .flatMap(({ $alive: _alive, ...record }) => {
        const decoded = S.decodeUnknownOption(FlowNodeSchema)(record)

        return Option.isSome(decoded) ? [decoded.value] : []
      })

    const raw = S.decodeUnknownSync(FlowDocumentSchema)({
      nodes: live('nodes'),
      edges: live('edges'),
      bundles: live('bundles'),
      nodeOrigin: collections.meta.get('document')?.nodeOrigin,
    })

    current = projectFlowRoomDocument(raw, retired)
  }

  const changed = () => {
    try {
      Effect.runSync(
        Effect.sync(decode).pipe(Effect.withSpan(FlowSpan.documentDecode))
      )
      lastFailure = undefined
      emit()
    } catch (error) {
      lastFailure = new FlowRoomError({
        operation: 'decode',
        message: String(error),
      })
      Effect.runSync(
        Effect.logWarning('Rejected collaborative document').pipe(
          Effect.annotateLogs({
            [FlowAttribute.failureName]: 'FlowRoomError',
            [FlowAttribute.failureMessage]: String(error),
          }),
          Effect.withSpan(FlowSpan.editFailure)
        )
      )
    }
  }

  const statusChanged = () => {
    if (state === 'disposed') {
      return
    }

    if (provider.wsconnected && !socketOpen) {
      provider.awareness.setLocalState(provider.awareness.getLocalState())
    }

    socketOpen = provider.wsconnected

    if (provider.wsconnected && provider.synced) {
      state = 'connected'
    } else if (provider.shouldConnect) {
      state = 'connecting'
    } else {
      state = 'disconnected'
    }

    Effect.runSync(
      diagnostic('Changed room connection', FlowSpan.controllerUpdate, state)
    )
    emit()
  }

  fields.observe(changed)
  provider.on('status', statusChanged)
  provider.on('sync', statusChanged)
  provider.awareness.on('change', emit)
  provider.awareness.setLocalState({
    flow: { actorId: options.actorId, name: options.name, cursor: null },
  })
  provider.connect()

  const attempt = (
    operation: string,
    workflow: Effect.Effect<void, FlowRoomError>
  ) =>
    Effect.gen(function* roomAction() {
      if (state === 'disposed') {
        return yield* Effect.fail(
          new FlowRoomError({ operation, message: 'Room is disposed' })
        )
      }

      yield* workflow
    }).pipe(
      Effect.tapError((failure) =>
        Effect.logWarning('Collaborative room action failed').pipe(
          Effect.annotateLogs({
            [FlowAttribute.failureName]: failure._tag,
            [FlowAttribute.failureMessage]: failure.message,
          }),
          Effect.withSpan(FlowSpan.editFailure)
        )
      )
    )

  const patch = (
    collection: Collection,
    before: readonly { readonly id: string }[],
    after: readonly { readonly id: string }[]
  ) => {
    const previous = new Map(before.map((record) => [record.id, record]))
    const next = new Map(after.map((record) => [record.id, record]))

    for (const record of before) {
      if (!next.has(record.id)) {
        const membership = key(collection, record.id, '$alive')

        if (fields.get(membership) !== false) {
          fields.set(membership, false)
        }
      }
    }

    for (const record of after) {
      const old = previous.get(record.id)

      if (old === undefined) {
        const membership = key(collection, record.id, '$alive')

        if (fields.get(membership) !== true) {
          fields.set(membership, true)
        }
      }

      const oldFields = new Map(Object.entries(old ?? {}))
      const newFields = new Map(Object.entries(record))

      for (const field of new Set([...oldFields.keys(), ...newFields.keys()])) {
        if (!same(oldFields.get(field), newFields.get(field))) {
          const fieldKey = key(collection, record.id, field)
          const value = newFields.get(field)

          if (value === undefined) {
            fields.delete(fieldKey)
          } else if (!same(fields.get(fieldKey), value)) {
            fields.set(fieldKey, structuredClone(value))
          }
        }
      }
    }
  }

  const replay = (direction: 'undo' | 'redo') => {
    if (state === 'disposed') {
      return
    }

    const stack = direction === 'undo' ? 'undoStack' : 'redoStack'
    const earlier = undo[stack].slice(0, -1)
    undo[stack] = undo[stack].slice(-1)

    try {
      if (direction === 'undo') {
        undo.undo()
      } else {
        undo.redo()
      }
    } finally {
      undo[stack] = [...earlier, ...undo[stack]]
      emit()
    }
  }

  return {
    document: () => structuredClone(current),
    failure: () => lastFailure,
    status: () => state,
    presence: () =>
      [...provider.awareness.getStates().values()].flatMap((value) => {
        const decoded = S.decodeUnknownOption(
          S.Struct({ flow: FlowRoomPresenceSchema })
        )(value)

        return Option.isSome(decoded) &&
          decoded.value.flow.actorId !== options.actorId
          ? [decoded.value.flow]
          : []
      }),
    subscribe: (listener) => {
      listeners.add(listener)

      return () => {
        listeners.delete(listener)
      }
    },
    commit: (before, after, context) =>
      attempt(
        'commit',
        Effect.try({
          try: () => {
            const receipt =
              context === undefined
                ? undefined
                : S.decodeUnknownSync(FlowTransactionContextSchema)(context)

            if (receipt !== undefined && receipt.origin.kind !== 'local') {
              return
            }

            const previous = flowHistoryDocument(
              S.decodeUnknownSync(FlowDocumentSchema)(before)
            )

            const next = flowHistoryDocument(
              Effect.runSync(
                validateFlowDocument(
                  S.decodeUnknownSync(FlowDocumentSchema)(after)
                )
              )
            )

            if (same(previous, next)) {
              return
            }

            if (gesturing && gestureStarted) {
              undo.captureTimeout = Number.POSITIVE_INFINITY
            } else {
              undo.stopCapturing()
              undo.captureTimeout = 0
            }

            doc.transact(() => {
              patch('nodes', previous.nodes, next.nodes)
              patch('edges', previous.edges, next.edges)
              patch('bundles', previous.bundles ?? [], next.bundles ?? [])

              if (!same(previous.nodeOrigin, next.nodeOrigin)) {
                if (next.nodeOrigin === undefined) {
                  fields.delete(key('meta', 'document', 'nodeOrigin'))
                } else {
                  fields.set(
                    key('meta', 'document', 'nodeOrigin'),
                    next.nodeOrigin
                  )
                }
              }
            }, localOrigin)
            undo.undoStack.splice(0, Math.max(0, undo.undoStack.length - 100))
            emit()
            gestureStarted = gesturing

            if (!gesturing) {
              Effect.runSync(
                diagnostic(
                  'Committed collaborative edit',
                  FlowSpan.controllerUpdate,
                  'room-commit'
                ).pipe(
                  Effect.annotateLogs({
                    [FlowAttribute.nodeCount]: next.nodes.length,
                    [FlowAttribute.edgeCount]: next.edges.length,
                  })
                )
              )
            }
          },
          catch: (error) =>
            new FlowRoomError({ operation: 'commit', message: String(error) }),
        })
      ).pipe(Effect.withSpan(FlowSpan.editPrepare)),
    beginGesture: () => {
      gesturing = true
      gestureStarted = false
      undo.stopCapturing()
    },
    endGesture: () => {
      if (gestureStarted) {
        Effect.runSync(
          diagnostic(
            'Committed collaborative gesture',
            FlowSpan.controllerUpdate,
            'room-gesture'
          ).pipe(
            Effect.annotateLogs({
              [FlowAttribute.nodeCount]: current.nodes.length,
              [FlowAttribute.edgeCount]: current.edges.length,
            })
          )
        )
      }

      gesturing = false
      gestureStarted = false
      undo.stopCapturing()
    },
    undo: () => replay('undo'),
    redo: () => replay('redo'),
    history: () => ({
      canUndo: state !== 'disposed' && undo.canUndo(),
      canRedo: state !== 'disposed' && undo.canRedo(),
      pending: false,
      pastCount: undo.undoStack.length,
      futureCount: undo.redoStack.length,
      capacity: 100,
      disposed: state === 'disposed',
    }),
    setPresence: (presence) =>
      attempt(
        'presence',
        Effect.try({
          try: () => {
            provider.awareness.setLocalState({
              flow: S.decodeUnknownSync(FlowRoomPresenceSchema)(presence),
            })
          },
          catch: (error) =>
            new FlowRoomError({
              operation: 'presence',
              message: String(error),
            }),
        })
      ),
    disconnect: attempt(
      'disconnect',
      Effect.sync(() => {
        provider.disconnect()
        statusChanged()
      })
    ).pipe(Effect.withSpan(FlowSpan.hostDestroy)),
    reconnect: attempt(
      'reconnect',
      Effect.sync(() => {
        provider.connect()
        statusChanged()
      })
    ).pipe(Effect.withSpan(FlowSpan.hostMount)),
    dispose: () => {
      if (state === 'disposed') {
        return
      }

      state = 'disposed'
      provider.awareness.setLocalState(null)
      provider.destroy()
      provider.awareness.destroy()
      fields.unobserve(changed)
      undo.destroy()
      doc.destroy()
      emit()
      listeners.clear()
      Effect.runSync(
        diagnostic(
          'Released collaborative room',
          FlowSpan.hostDestroy,
          'room-release'
        )
      )
    },
  }
}

/** Each caller owns one scoped provider. No transport or CRDT dependency enters a host adapter. */
export const acquireYjsRoom = (input: FlowRoomOptions) =>
  Effect.acquireRelease(
    Effect.try({
      try: () => createRoom(S.decodeUnknownSync(OptionsSchema)(input)),
      catch: (error) =>
        new FlowRoomError({ operation: 'acquire', message: String(error) }),
    }).pipe(
      Effect.tap(() =>
        diagnostic(
          'Acquired collaborative room',
          FlowSpan.hostMount,
          'room-acquire'
        )
      ),
      Effect.withSpan(FlowSpan.hostMount)
    ),
    (room) => Effect.sync(room.dispose)
  )

import { acquireYjsRoom } from '@flow/collaboration-yjs'
import {
  FlowAttribute,
  FlowSpan,
  flowHistoryDocumentsEqual,
  restoreFlowHistoryDocument,
  projectFlowRoomPresence,
} from '@flow/core'
import type {
  FlowDocument,
  FlowEditTransactionInput,
  FlowHistoryStatus,
  FlowPasteOptions,
  FlowRoomPresence,
  FlowRoomStatus,
  FlowSnapshot,
  FlowStateChange,
  FlowTransactionContext,
  XYPosition,
} from '@flow/core'
import { Effect, Exit, Scope } from 'effect'

import './style.css'

interface RoomHost {
  readonly owner: HTMLElement
  readonly read: () => Promise<FlowSnapshot>
  readonly live: () => Promise<FlowDocument>
  readonly replace: (
    document: FlowDocument,
    context: FlowTransactionContext
  ) => Promise<void>
  readonly subscribe: (
    listener: (change: FlowStateChange) => void
  ) => () => void
  readonly apply: (transaction: FlowEditTransactionInput) => Promise<void>
  readonly screenToFlow: (position: XYPosition) => Promise<XYPosition>
  readonly copy: () => void
  readonly paste: (options: FlowPasteOptions) => void | Promise<void>
  readonly dispose: () => void
}

export interface CollaborativeDemo {
  readonly snapshot: () => Promise<FlowSnapshot>
  readonly apply: RoomHost['apply']
  readonly history: () => FlowHistoryStatus
  readonly presence: () => readonly FlowRoomPresence[]
  readonly status: () => FlowRoomStatus
  readonly disconnect: () => Promise<void>
  readonly reconnect: () => Promise<void>
  readonly dispose: () => Promise<void>
}

declare global {
  var flowCollaborativeDemo: CollaborativeDemo | undefined
}

// oxlint-disable-next-line anti-slop/no-unknown-parameters -- Promise rejection is an external failure boundary.
const report = (error: unknown) =>
  Effect.runSync(
    Effect.logWarning('Collaborative recipe failed').pipe(
      Effect.annotateLogs({ [FlowAttribute.failureMessage]: String(error) }),
      Effect.withSpan(FlowSpan.editFailure)
    )
  )

/** Browser lifecycle binding shared by Vanilla listeners, Vue scopes and Foldkit ports. */
export const mountCollaborativeDemo = async (host: RoomHost) => {
  const url = new URL(location.href)
  const roomId = url.searchParams.get('room') || crypto.randomUUID()
  url.searchParams.set('room', roomId)
  history.replaceState(null, '', url)
  const actorId = crypto.randomUUID()
  const scope = Scope.makeUnsafe()

  const room = await Effect.runPromise(
    acquireYjsRoom({
      serverUrl: url.searchParams.get('server') ?? 'ws://127.0.0.1:4193',
      room: roomId,
      actorId,
      name: `Guest ${actorId.slice(0, 4)}`,
    }).pipe(Effect.provideService(Scope.Scope, scope))
  )

  const listeners = new AbortController()
  const controls = document.querySelector('#room-controls')
  const status = document.querySelector('#room-status')
  const peers = document.querySelector('#room-peers')
  const share = document.querySelector<HTMLAnchorElement>('#room-share')

  if (
    controls === null ||
    status === null ||
    peers === null ||
    share === null
  ) {
    await Effect.runPromise(Scope.close(scope, Exit.void))
    throw new Error('Missing collaborative controls')
  }

  share.href = url.href
  share.textContent = `Share room ${roomId}`
  let disposed = false
  let renderSequence = 0
  let queue = Promise.resolve()
  let localGesture = false
  let liveFrame: number | undefined
  let sampling = false
  let sampleRevision = 0
  let cursor: XYPosition | null = null
  const pendingRemote: FlowDocument[] = []
  const overlay = document.createElement('div')
  overlay.className = 'room-presence'
  host.owner.append(overlay)

  const synchronize = () => {
    queue = queue
      .then(async () => {
        if (disposed || localGesture) {
          return
        }

        const current = await host.read()
        const target = projectFlowRoomPresence(room.document(), room.presence())

        if (flowHistoryDocumentsEqual(current.document, target)) {
          return
        }

        pendingRemote.push(target)

        return host.replace(
          restoreFlowHistoryDocument(target, current.document),
          {
            transactionId: crypto.randomUUID(),
            origin: { kind: 'remote', actorId: roomId },
          }
        )
      })
      .catch(report)
  }

  const button = (label: string, action: () => void | Promise<void>) => {
    const element = document.createElement('button')
    element.textContent = label
    element.addEventListener(
      'click',
      () => {
        void (async () => {
          await action()
        })().catch(report)
      },
      { signal: listeners.signal }
    )
    controls.append(element)

    return element
  }

  const undo = button('Undo', room.undo)
  const redo = button('Redo', room.redo)
  button('Copy', host.copy)
  const paste = () => host.paste({ idNamespace: crypto.randomUUID() })
  button('Paste', paste)
  button('Disconnect', () => Effect.runPromise(room.disconnect))
  button('Reconnect', () => Effect.runPromise(room.reconnect))

  const render = () => {
    renderSequence += 1
    const sequence = renderSequence
    status.textContent = room.status()
    peers.textContent = `${room.presence().length} peers`
    undo.disabled = !room.history().canUndo
    redo.disabled = !room.history().canRedo
    overlay.replaceChildren()
    void (async () => {
      const { viewport } = await host.read()

      if (disposed || sequence !== renderSequence) {
        return
      }

      for (const presence of room.presence()) {
        if (presence.cursor === null) {
          continue
        }

        const marker = document.createElement('span')
        marker.dataset.actorId = presence.actorId
        marker.textContent = `↖ ${presence.name}`
        marker.style.transform = `translate(${presence.cursor.x * viewport.zoom + viewport.x}px, ${presence.cursor.y * viewport.zoom + viewport.y}px)`
        overlay.append(marker)
      }
    })().catch(report)
  }

  const stopState = host.subscribe(({ previous, current }) => {
    render()

    const index = pendingRemote.findIndex((target) =>
      flowHistoryDocumentsEqual(target, current.document)
    )

    if (index !== -1) {
      pendingRemote.splice(index, 1)

      return
    }

    Effect.runSync(room.commit(previous.document, current.document))
  })

  const stopRoom = room.subscribe(() => {
    render()
    synchronize()
  })

  const addNode = async (position: XYPosition) => {
    await host.apply({
      operations: [
        {
          kind: 'add-nodes',
          nodes: [
            {
              id: crypto.randomUUID(),
              label: 'Shared node',
              position,
              size: { width: 140, height: 60 },
              handles: [
                { id: 'out', kind: 'source', side: 'right' },
                { id: 'in', kind: 'target', side: 'left' },
              ],
            },
          ],
        },
      ],
    })
  }

  host.owner.addEventListener(
    'contextmenu',
    (event) => {
      if (
        event.target instanceof Element &&
        event.target.closest('[data-node-id]') !== null
      ) {
        return
      }

      event.preventDefault()
      void host
        .screenToFlow({ x: event.clientX, y: event.clientY })
        .then(addNode)
        .catch(report)
    },
    { signal: listeners.signal }
  )

  const publishPresence = async () => {
    sampleRevision += 1
    const revision = sampleRevision
    const live = localGesture ? await host.live() : undefined

    if (disposed || revision !== sampleRevision) {
      return
    }

    const accepted = new Map(
      room.document().nodes.map((node) => [node.id, node.position])
    )

    const drag = live?.nodes.flatMap((node) => {
      const before = accepted.get(node.id)

      return before !== undefined &&
        (before.x !== node.position.x || before.y !== node.position.y)
        ? [{ nodeId: node.id, position: node.position }]
        : []
    })

    Effect.runSync(
      room.setPresence({
        actorId,
        name: `Guest ${actorId.slice(0, 4)}`,
        cursor,
        drag,
      })
    )
  }

  const sampleLive = () => {
    if (sampling || liveFrame !== undefined) {
      return
    }

    liveFrame = requestAnimationFrame(() => {
      liveFrame = undefined
      sampling = true
      void (async () => {
        try {
          await publishPresence()
        } finally {
          sampling = false

          if (localGesture && !disposed) {
            sampleLive()
          }
        }
      })().catch(report)
    })
  }

  host.owner.addEventListener(
    'pointermove',
    (event) => {
      void (async () => {
        cursor = await host.screenToFlow({ x: event.clientX, y: event.clientY })

        if (!localGesture) {
          await publishPresence()
        }
      })().catch(report)
    },
    { signal: listeners.signal }
  )
  host.owner.addEventListener(
    'pointerleave',
    () => {
      cursor = null
      void publishPresence().catch(report)
    },
    { signal: listeners.signal }
  )
  host.owner.addEventListener(
    'pointerdown',
    () => {
      localGesture = true
      room.beginGesture()

      if (liveFrame === undefined) {
        sampleLive()
      }
    },
    { capture: true, signal: listeners.signal }
  )

  const finishGesture = () => {
    localGesture = false
    sampleRevision += 1

    if (liveFrame !== undefined) {
      cancelAnimationFrame(liveFrame)
      liveFrame = undefined
    }

    room.endGesture()
    void publishPresence().catch(report)
    render()
    synchronize()
  }

  window.addEventListener('pointerup', finishGesture, {
    signal: listeners.signal,
  })
  window.addEventListener('pointercancel', finishGesture, {
    signal: listeners.signal,
  })
  window.addEventListener('blur', finishGesture, { signal: listeners.signal })
  window.addEventListener(
    'keydown',
    (event) => {
      const target = event.composedPath()[0] ?? event.target

      if (
        target instanceof Element &&
        (target.closest('input,textarea,select') !== null ||
          (target instanceof HTMLElement && target.isContentEditable))
      ) {
        return
      }

      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'v') {
        event.preventDefault()
        event.stopImmediatePropagation()
        void Promise.resolve(paste()).catch(report)

        return
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        ['z', 'y'].includes(event.key.toLowerCase())
      ) {
        event.preventDefault()
        event.stopImmediatePropagation()

        if (event.shiftKey || event.key.toLowerCase() === 'y') {
          room.redo()
        } else {
          room.undo()
        }

        render()
      }
    },
    { capture: true, signal: listeners.signal }
  )

  const dispose = async () => {
    if (disposed) {
      return
    }

    disposed = true
    sampleRevision += 1

    if (liveFrame !== undefined) {
      cancelAnimationFrame(liveFrame)
    }

    listeners.abort()
    stopState()
    stopRoom()
    overlay.remove()
    await queue
    await Effect.runPromise(Scope.close(scope, Exit.void))
    host.dispose()
  }

  window.addEventListener(
    'pagehide',
    () => {
      void dispose().catch(report)
    },
    { signal: listeners.signal }
  )
  button('Dispose', dispose)
  globalThis.flowCollaborativeDemo = {
    snapshot: host.read,
    apply: host.apply,
    history: room.history,
    presence: room.presence,
    status: room.status,
    disconnect: () => Effect.runPromise(room.disconnect),
    reconnect: () => Effect.runPromise(room.reconnect),
    dispose,
  }
  render()
  synchronize()

  return dispose
}

import { FlowCommandSchema, decodeFlowDocument } from '@flow/core'
import type {
  Viewport,
  FlowChangeSchema,
  FlowDocumentSchema,
  FlowStateChangeSchema,
} from '@flow/core'
import { Effect, Schema } from 'effect'
import { Runtime } from 'foldkit'

import type {
  ConformanceFixture,
  PublicStateRead,
} from '../../../packages/conformance/src/index.ts'
import { createProgram, HostAction } from '../src/application.ts'
import type {
  ports,
  SnapshotRequest,
  SnapshotResponseSchema,
} from '../src/application.ts'

import '../src/style.css'

interface FoldkitHarness {
  mount: (fixture: ConformanceFixture) => Promise<void>
  replaceDocument: (document: typeof FlowDocumentSchema.Encoded) => void
  replaceViewport: (viewport: Viewport) => void
  changeKinds: () => readonly string[]
  changes: () => readonly EncodedFlowChange[]
  dispose: () => void
  finishDestroy: () => Promise<{
    readonly mountedElements: number
    readonly changesAfterDestroy: number
    readonly acceptedStatesAfterDestroy: number
  }>
  destroy: () => Promise<{
    readonly mountedElements: number
    readonly changesAfterDestroy: number
    readonly acceptedStatesAfterDestroy: number
  }>
  startPublicState: () => Promise<void>
  requestSnapshot: (
    id: PublicProgramId,
    query?: Omit<SnapshotRequest, 'requestId'>
  ) => Promise<EncodedSnapshotResponse>
  replacePublicDocument: (
    id: PublicProgramId,
    document: typeof FlowDocumentSchema.Encoded
  ) => void
  replacePublicViewport: (id: PublicProgramId, viewport: Viewport) => void
  dispatchPublicCommand: (
    id: PublicProgramId,
    command: typeof FlowCommandSchema.Encoded
  ) => void
  publicChanges: (id: PublicProgramId) => readonly EncodedFlowChange[]
  publicAcceptedStates: (
    id: PublicProgramId
  ) => readonly EncodedFlowStateChange[]
  readMountedState: (
    query: Omit<SnapshotRequest, 'requestId'>
  ) => Promise<PublicStateRead>
  mountedAcceptedStates: () => readonly EncodedFlowStateChange[]
  exercisePublicReentrancy: () => Promise<readonly string[]>
  exercisePublicUnsubscribe: () => Promise<number>
  exercisePublicListenerFailure: () => Promise<number>
  settlePublicState: () => Promise<void>
  disposePublicState: () => void
  probeAfterPublicDisposal: (id: PublicProgramId) => Promise<{
    readonly acceptedCount: number
    readonly changeCount: number
    readonly mountedElements: number
  }>
}

declare global {
  interface Window {
    __flowFoldkitTest?: FoldkitHarness
  }
}

let handle: Runtime.EmbedHandle<typeof ports> | undefined

type PublicProgramId = 'uncontrolled' | 'controlled'

const nextAnimationFrame = (): Promise<void> => {
  const { promise, resolve } = Promise.withResolvers<undefined>()
  requestAnimationFrame(() => resolve())

  return promise
}

let unsubscribe: (() => void) | undefined

let changesAtDispose = 0

let acceptedStatesAtDispose = 0

type EncodedFlowChange = typeof FlowChangeSchema.Encoded

type EncodedFlowStateChange = typeof FlowStateChangeSchema.Encoded

type EncodedSnapshotResponse = typeof SnapshotResponseSchema.Encoded

const publicHandles = new Map<
  PublicProgramId,
  Runtime.EmbedHandle<typeof ports>
>()

const publicChangeEvents = new Map<PublicProgramId, EncodedFlowChange[]>()

const publicStateEvents = new Map<PublicProgramId, EncodedFlowStateChange[]>()

const pendingSnapshots = new Map<
  string,
  (response: EncodedSnapshotResponse) => void
>()

let nextSnapshotRequestId = 1

let secondPublicContainer: HTMLElement | undefined

let changes: EncodedFlowChange[] = []

let mountedAcceptedStateEvents: EncodedFlowStateChange[] = []

let nextMountedRequestId = 1

const pendingMountedSnapshots = new Map<
  string,
  (response: EncodedSnapshotResponse) => void
>()

const mount = async (fixture: ConformanceFixture): Promise<void> => {
  handle?.dispose()
  const container = document.querySelector<HTMLElement>('#app')

  if (container === null) {
    throw new Error('Missing Foldkit test host')
  }

  const decoded = Effect.runSync(decodeFlowDocument(fixture.document))

  const program = createProgram(
    container,
    decoded,
    { x: 0, y: 0, zoom: 1 },
    fixture.allowedConnectionTargets ?? [],
    fixture.documentMode,
    fixture.viewportMode
  )

  handle = Runtime.embed<typeof ports, never, 'Element'>(program)
  changes = []
  mountedAcceptedStateEvents = []
  unsubscribe = handle.ports.changes.subscribe((change) => changes.push(change))
  handle.ports.acceptedStates.subscribe((change) =>
    mountedAcceptedStateEvents.push(change)
  )
  handle.ports.snapshots.subscribe((response) => {
    pendingMountedSnapshots.get(response.requestId)?.(response)
    pendingMountedSnapshots.delete(response.requestId)
  })
  await nextAnimationFrame()
}

const replaceDocument = (input: typeof FlowDocumentSchema.Encoded): void => {
  const active = handle

  if (active === undefined) {
    throw new Error('Missing Foldkit runtime')
  }

  const document = Effect.runSync(decodeFlowDocument(input))
  active.ports.actions.send(HostAction.ReplaceDocument({ document }))
}

const replaceViewport = (viewport: Viewport): void => {
  const active = handle

  if (active === undefined) {
    throw new Error('Missing Foldkit runtime')
  }

  active.ports.actions.send(HostAction.ReplaceViewport({ viewport }))
}

const dispose = (): void => {
  changesAtDispose = changes.length
  acceptedStatesAtDispose = mountedAcceptedStateEvents.length
  handle?.dispose()
  handle = undefined
}

const finishDestroy = async () => {
  await nextAnimationFrame()
  await nextAnimationFrame()
  const changesAfterDestroy = changes.length - changesAtDispose
  unsubscribe?.()
  unsubscribe = undefined

  return {
    mountedElements: document.querySelectorAll(
      "[data-testid='flow-canvas'], [data-testid='flow-node'], [data-testid='flow-edge']"
    ).length,
    changesAfterDestroy,
    acceptedStatesAfterDestroy:
      mountedAcceptedStateEvents.length - acceptedStatesAtDispose,
  }
}

const destroy = () => {
  dispose()

  return finishDestroy()
}

const publicDocument = {
  nodes: [
    {
      id: 'visible',
      label: 'Visible',
      position: { x: 20, y: 30 },
      data: { alpha: 1, beta: 2 },
    },
    {
      id: 'hidden',
      label: 'Hidden',
      hidden: true,
      position: { x: 240, y: 30 },
    },
    { id: 'culled', label: 'Culled', position: { x: 4000, y: 4000 } },
    { id: 'parent', label: 'Parent', position: { x: 300, y: 300 } },
    {
      id: 'child',
      label: 'Child',
      parentId: 'parent',
      position: { x: 10, y: 15 },
    },
  ],
  edges: [
    { id: 'visible-edge', source: 'visible', target: 'hidden' },
    { id: 'culled-edge', source: 'parent', target: 'child' },
  ],
} satisfies typeof FlowDocumentSchema.Encoded

const publicProgram = (
  container: HTMLElement,
  id: PublicProgramId
): Runtime.EmbedHandle<typeof ports> => {
  const decoded = Effect.runSync(decodeFlowDocument(publicDocument))

  const program = createProgram(
    container,
    decoded,
    { x: 0, y: 0, zoom: 1 },
    [],
    id === 'controlled' ? 'controlled' : 'uncontrolled',
    id === 'controlled' ? 'controlled' : 'uncontrolled'
  )

  const active = Runtime.embed<typeof ports, never, 'Element'>(program)
  publicHandles.set(id, active)
  publicChangeEvents.set(id, [])
  publicStateEvents.set(id, [])
  active.ports.changes.subscribe((change) => {
    publicChangeEvents.get(id)?.push(change)
  })
  active.ports.acceptedStates.subscribe((change) => {
    publicStateEvents.get(id)?.push(change)
  })
  active.ports.snapshots.subscribe((response) => {
    pendingSnapshots.get(response.requestId)?.(response)
    pendingSnapshots.delete(response.requestId)
  })

  return active
}

const startPublicState = async (): Promise<void> => {
  for (const active of publicHandles.values()) {
    active.dispose()
  }

  publicHandles.clear()
  publicChangeEvents.clear()
  publicStateEvents.clear()
  pendingSnapshots.clear()

  const container = document.querySelector<HTMLElement>('#app')

  if (container === null) {
    throw new Error('Missing Foldkit public state host')
  }

  container.replaceChildren()
  secondPublicContainer?.remove()
  secondPublicContainer = document.createElement('div')
  secondPublicContainer.id = 'foldkit-second-public-state'
  document.body.append(secondPublicContainer)

  publicProgram(container, 'uncontrolled')
  publicProgram(secondPublicContainer, 'controlled')
  await Promise.resolve()
}

const requestSnapshot = (
  id: PublicProgramId,
  query: Omit<SnapshotRequest, 'requestId'> = {}
): Promise<EncodedSnapshotResponse> => {
  const active = publicHandles.get(id)

  if (active === undefined) {
    throw new Error(`Missing ${id} Foldkit program`)
  }

  const requestId = `snapshot-${nextSnapshotRequestId}`
  nextSnapshotRequestId += 1

  const { promise, resolve } = Promise.withResolvers<EncodedSnapshotResponse>()
  pendingSnapshots.set(requestId, resolve)
  active.ports.snapshotRequests.send({ requestId, ...query })

  return promise
}

const readMountedState = (
  query: Omit<SnapshotRequest, 'requestId'>
): Promise<PublicStateRead> => {
  if (handle === undefined) {
    throw new Error('Missing Foldkit Runtime')
  }

  const requestId = `conformance-${nextMountedRequestId}`
  nextMountedRequestId += 1
  const { promise, resolve } = Promise.withResolvers<EncodedSnapshotResponse>()
  pendingMountedSnapshots.set(requestId, resolve)
  handle.ports.snapshotRequests.send({ requestId, ...query })

  return promise.then((response) => ({
    snapshot: response.snapshot,
    node: response.node ?? null,
    edge: response.edge ?? null,
  }))
}

const replacePublicDocument = (
  id: PublicProgramId,
  input: typeof FlowDocumentSchema.Encoded
): void => {
  const active = publicHandles.get(id)

  if (active === undefined) {
    throw new Error(`Missing ${id} Foldkit program`)
  }

  const nextDocument = Effect.runSync(decodeFlowDocument(input))
  active.ports.actions.send(
    HostAction.ReplaceDocument({ document: nextDocument })
  )
}

const replacePublicViewport = (
  id: PublicProgramId,
  viewport: Viewport
): void => {
  const active = publicHandles.get(id)

  if (active === undefined) {
    throw new Error(`Missing ${id} Foldkit program`)
  }

  active.ports.actions.send(HostAction.ReplaceViewport({ viewport }))
}

const dispatchPublicCommand = (
  id: PublicProgramId,
  command: typeof FlowCommandSchema.Encoded
): void => {
  const active = publicHandles.get(id)

  if (active === undefined) {
    throw new Error(`Missing ${id} Foldkit program`)
  }

  const decodedCommand = Schema.decodeUnknownSync(FlowCommandSchema)(command)
  active.ports.actions.send(
    HostAction.DispatchCommand({ command: decodedCommand })
  )
}

const exercisePublicReentrancy = (): Promise<readonly string[]> => {
  const active = publicHandles.get('uncontrolled')

  if (active === undefined) {
    throw new Error('Missing uncontrolled Foldkit program')
  }

  const order: string[] = []

  const { promise, resolve } = Promise.withResolvers<readonly string[]>()

  const stopListening = active.ports.acceptedStates.subscribe(({ current }) => {
    order.push(String(current.viewport.x))

    if (order.length === 1) {
      replacePublicViewport('uncontrolled', { x: 77, y: 0, zoom: 1 })
    } else {
      stopListening()
      resolve(order)
    }
  })

  replacePublicViewport('uncontrolled', { x: 50, y: 0, zoom: 1 })

  return promise
}

const exercisePublicUnsubscribe = async (): Promise<number> => {
  const active = publicHandles.get('uncontrolled')

  if (active === undefined) {
    throw new Error('Missing uncontrolled Foldkit program')
  }

  let notifications = 0

  const stopListening = active.ports.acceptedStates.subscribe(() => {
    notifications += 1
  })

  stopListening()
  replacePublicViewport('uncontrolled', { x: 66, y: 0, zoom: 1 })
  await nextAnimationFrame()
  await nextAnimationFrame()

  return notifications
}

const exercisePublicListenerFailure = async (): Promise<number> => {
  const active = publicHandles.get('uncontrolled')

  if (active === undefined) {
    throw new Error('Missing uncontrolled Foldkit program')
  }

  let laterListenerCalls = 0
  active.ports.acceptedStates.subscribe(() => {
    throw new Error('expected test port listener failure')
  })
  active.ports.acceptedStates.subscribe(() => {
    laterListenerCalls += 1
  })

  replacePublicViewport('uncontrolled', { x: 88, y: 0, zoom: 1 })
  await nextAnimationFrame()
  await nextAnimationFrame()

  return laterListenerCalls
}

const settlePublicState = async (): Promise<void> => {
  await nextAnimationFrame()
  await nextAnimationFrame()
}

const disposePublicState = (): void => {
  for (const active of publicHandles.values()) {
    active.dispose()
  }
}

const probeAfterPublicDisposal = async (id: PublicProgramId) => {
  const active = publicHandles.get(id)

  if (active === undefined) {
    throw new Error(`Missing ${id} Foldkit program`)
  }

  const acceptedCount = publicStateEvents.get(id)?.length ?? 0
  const changeCount = publicChangeEvents.get(id)?.length ?? 0
  active.ports.actions.send(
    HostAction.ReplaceViewport({ viewport: { x: 500, y: 0, zoom: 1 } })
  )
  active.ports.snapshotRequests.send({ requestId: 'after-disposal' })
  await nextAnimationFrame()

  return {
    acceptedCount: (publicStateEvents.get(id)?.length ?? 0) - acceptedCount,
    changeCount: (publicChangeEvents.get(id)?.length ?? 0) - changeCount,
    mountedElements: document.querySelectorAll(
      "[data-testid='flow-canvas'], [data-testid='flow-node'], [data-testid='flow-edge']"
    ).length,
  }
}

window.__flowFoldkitTest = {
  mount,
  replaceDocument,
  replaceViewport,
  changeKinds: () => changes.map((change) => change.kind),
  changes: () => changes,
  dispose,
  finishDestroy,
  destroy,
  startPublicState,
  requestSnapshot,
  replacePublicDocument,
  replacePublicViewport,
  dispatchPublicCommand,
  publicChanges: (id) => publicChangeEvents.get(id) ?? [],
  publicAcceptedStates: (id) => publicStateEvents.get(id) ?? [],
  readMountedState,
  mountedAcceptedStates: () => mountedAcceptedStateEvents,
  exercisePublicReentrancy,
  exercisePublicUnsubscribe,
  exercisePublicListenerFailure,
  settlePublicState,
  disposePublicState,
  probeAfterPublicDisposal,
}

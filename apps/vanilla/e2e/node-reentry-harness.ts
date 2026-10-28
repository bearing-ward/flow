import type { FlowChange } from '../../../packages/core/dist/public.js'
import {
  actorInput,
  dispatchPointer,
  mountedGeometry,
  reentryDocument,
  reentryRoot,
  requiredElement,
  syntheticCaptures,
} from '../../shared-e2e/node-reentry-fixture.ts'
import type { PhysicalActor } from '../../shared-e2e/node-reentry-fixture.ts'
import { createFlow } from '../src/mount-flow.ts'

export const physicalReentry = async (
  actor: PhysicalActor,
  threshold: number,
  complete: boolean,
  mode: 'dispose' | 'mounted' | 'fresh' = 'dispose'
) => {
  const root = reentryRoot()
  const events: string[] = []
  const changes: FlowChange[] = []
  let reentered = false

  const reenter = () => {
    const replacement = actorInput(root, 'vanilla', actor)
    replacement.down()

    if (complete) {
      replacement.finish()
    }
  }

  const controller = await createFlow(root, reentryDocument(), {
    documentMode: 'uncontrolled',
    nodesResizable: true,
    nodeDragThreshold: 0,
    connectionDragThreshold: threshold,
    selectNodesOnDrag: actor === 'selection',
    panOnDrag: true,
    viewport: {
      mode: 'uncontrolled',
      initial: { x: 0, y: 0, zoom: 1 },
      limits: { minZoom: 0.25, maxZoom: 4 },
    },
    onNodeDragStart: (value) => events.push(`start:${value.nodeIds[0]}`),
    onNodeDragStop: (value) => {
      events.push(`stop:${value.nodeIds[0]}:${value.reason}`)

      if (!reentered && mode !== 'fresh') {
        reentered = true
        reenter()
      }
    },
    onConnectStart: () => events.push('connectStart'),
    onConnectEnd: () => events.push('connectEnd'),
    onReconnectStart: () => events.push('reconnectStart'),
    onReconnectEnd: () => events.push('reconnectEnd'),
    onSelectionStart: () => events.push('selectionStart'),
    onSelectionEnd: () => events.push('selectionEnd'),
    onMoveStart: () => events.push('moveStart'),
    onMoveEnd: () => events.push('moveEnd'),
  })

  controller.subscribe((change) => changes.push(change))
  await mountedGeometry()
  const capture = syntheticCaptures(root)
  const input = actorInput(root, 'vanilla', actor)
  const source = requiredElement(root, '.flow-node[data-node-id="a"]')

  try {
    if (mode === 'fresh') {
      input.down()
    } else {
      dispatchPointer(source, 'pointerdown')
      changes.length = 0

      if (mode === 'dispose') {
        const first = controller.destroyAsync()
        const second = controller.destroyAsync()

        if (first !== second) {
          throw new Error('Destroy promise identity changed')
        }

        await first
      } else {
        dispatchPointer(source, 'pointerup')
      }
    }

    const afterTrigger = {
      events: [...events],
      captures: [...capture.attempts],
      held: capture.count(),
      changes: [...changes],
    }

    if (mode !== 'dispose') {
      input.finish()
    }

    return {
      afterTrigger,
      events: [...events],
      changes: [...changes],
      captures: [...capture.attempts],
      held: capture.count(),
      positions: controller
        .getNodes()
        .map(({ id, position }) => ({ id, position })),
    }
  } finally {
    await controller.destroyAsync()
    root.remove()
  }
}

export const mountNativeCaptureProof = async (selectNodesOnDrag = false) => {
  const root = reentryRoot()
  root.id = 'vanilla-native-proof'
  const events: { name: string; payload: unknown; held: boolean }[] = []
  // eslint-disable-next-line prefer-const -- The native observer closes over the element installed after mount.
  let active: HTMLElement | undefined
  let pointerId = 0

  const record = <Payload>(name: string, payload: Payload) => {
    events.push({
      name,
      payload: structuredClone(payload),
      held: active?.hasPointerCapture(pointerId) ?? false,
    })
    root.dataset.receipt = JSON.stringify(events)
  }

  const controller = await createFlow(root, reentryDocument(), {
    documentMode: 'uncontrolled',
    nodesResizable: true,
    nodeDragThreshold: 0,
    selectNodesOnDrag,
    viewport: {
      mode: 'uncontrolled',
      initial: { x: 0, y: 0, zoom: 1 },
      limits: { minZoom: 0.25, maxZoom: 4 },
    },
    onNodeDragStart: (value) => record('nodeStart', value),
    onNodeDragStop: (value) => record('nodeStop', value),
  })

  controller.subscribe((value) => record('change', value))
  await mountedGeometry()
  const node = requiredElement(root, '.flow-node[data-node-id="a"]')

  if (!(node instanceof HTMLElement)) {
    throw new TypeError('Missing node')
  }

  active = node
  const set = node.setPointerCapture.bind(node)
  const release = node.releasePointerCapture.bind(node)
  node.setPointerCapture = (id) => {
    pointerId = id
    set(id)
    record('native:set', { id, captured: node.hasPointerCapture(id) })
  }

  node.releasePointerCapture = (id) => {
    release(id)
    record('native:release', { id, captured: node.hasPointerCapture(id) })
  }

  root.addEventListener(
    'pointerup',
    (event) =>
      record('native:up', { id: event.pointerId, trusted: event.isTrusted }),
    true
  )
  root.addEventListener(
    'lostpointercapture',
    (event) =>
      record('native:loss', { id: event.pointerId, trusted: event.isTrusted }),
    true
  )
  root.addEventListener(
    'proof-cleanup',
    () => {
      controller.destroy()
      root.remove()
    },
    { once: true }
  )
}

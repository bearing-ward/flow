import { Effect } from 'effect'
import { createApp, h, nextTick } from 'vue'

import { decodeFlowDocument } from '../../../packages/core/dist/public.js'
import type {
  FlowChange,
  FlowNode,
} from '../../../packages/core/dist/public.js'
import { FlowCanvas } from '../../../packages/vue/dist/public.js'
import type { FlowEditor } from '../../../packages/vue/dist/public.js'
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

const pointer = (element: Element, type: string, x: number) =>
  element.dispatchEvent(
    new PointerEvent(type, {
      pointerId: 7,
      clientX: x,
      clientY: 100,
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      bubbles: true,
    })
  )

export const terminalReentry = async (
  phase: 'end' | 'stop',
  unmount = false
) => {
  const documentState = Effect.runSync(
    decodeFlowDocument({
      nodes: [
        { id: 'source', label: 'Source', position: { x: 60, y: 70 } },
        { id: 'target', label: 'Target', position: { x: 290, y: 220 } },
      ],
      edges: [],
    })
  )

  const root = document.createElement('div')
  document.body.append(root)
  const events: string[] = []
  const changes: FlowChange[] = []
  const captures: string[] = []
  let reentered = false

  const terminal = (name: 'end' | 'stop', payload: { node: FlowNode }) => {
    events.push(`${name}:${payload.node.id}`)

    if (name === phase && !reentered) {
      reentered = true
      const target = root.querySelector('[data-node-id="target"]')

      if (target === null) {
        throw new Error('Missing replacement target')
      }

      pointer(target, 'pointerdown', 300)

      if (unmount) {
        pointer(target, 'pointermove', 312)
        pointer(target, 'pointerup', 312)
      }
    }
  }

  const app = createApp({
    render: () =>
      h(FlowCanvas, {
        nodesResizable: true,
        document: documentState,
        nodeDragThreshold: 0,
        selectNodesOnDrag: unmount,
        onNodeDragStart: (node: FlowNode) => events.push(`start:${node.id}`),
        onNodeDragEnd: (payload) => terminal('end', payload),
        onNodeDragStop: (payload) => terminal('stop', payload),
        onChange: (change: FlowChange) => changes.push(change),
      }),
  })

  app.mount(root)
  await nextTick()
  const wrappers = [...root.querySelectorAll<HTMLElement>('[data-node-id]')]

  for (const wrapper of wrappers) {
    const captured = new Set<number>()
    wrapper.setPointerCapture = (id) => {
      captures.push(wrapper.dataset.nodeId ?? 'missing')
      captured.add(id)
    }

    wrapper.hasPointerCapture = (id) => captured.has(id)
    wrapper.releasePointerCapture = (id) => {
      captured.delete(id)
    }
  }

  const source = root.querySelector('[data-node-id="source"]')
  const target = root.querySelector('[data-node-id="target"]')

  if (source === null || target === null) {
    throw new Error('Missing wrappers')
  }

  try {
    pointer(source, 'pointerdown', 100)

    if (unmount) {
      changes.length = 0
      app.unmount()
    } else {
      pointer(source, 'pointerup', 100)
    }

    const replacementCaptured = target.hasPointerCapture(7)
    pointer(target, 'pointermove', 312)
    pointer(target, 'pointerup', 312)

    const result = {
      events,
      replacementCaptured,
      released: !target.hasPointerCapture(7),
      proposals: changes.flatMap((change) =>
        change.kind === 'node-position'
          ? [{ nodeId: change.nodeId, position: change.position }]
          : []
      ),
    }

    return unmount
      ? {
          ...result,
          captures,
          sourceReleased: !source.hasPointerCapture(7),
          changes,
        }
      : result
  } finally {
    if (!unmount) {
      app.unmount()
    }

    root.remove()
  }
}

export const physicalReentry = async (
  phase: 'end' | 'stop' | 'connection-end',
  actor: PhysicalActor,
  threshold: number,
  complete: boolean,
  mode: 'dispose' | 'cancel' | 'fresh' = 'dispose'
) => {
  const root = reentryRoot()
  const events: string[] = []
  const changes: FlowChange[] = []
  let reentered = false

  const reenter = () => {
    const replacement = actorInput(root, 'vue', actor)
    replacement.down()

    if (complete) {
      replacement.finish()
    }
  }

  const terminal = (
    name: 'end' | 'stop',
    payload: { node: FlowNode; status: string; reason?: string }
  ) => {
    events.push(
      `${name}:${payload.node.id}:${payload.status}:${payload.reason}`
    )

    if (name === phase && !reentered && mode !== 'fresh') {
      reentered = true
      reenter()
    }
  }

  const app = createApp({
    render: () =>
      h(FlowCanvas, {
        nodesResizable: true,
        document: reentryDocument(),
        documentMode: 'uncontrolled',
        nodeDragThreshold: 0,
        connectionDragThreshold: threshold,
        panOnDrag: true,
        selectNodesOnDrag: false,
        onNodeDragStart: (node) => events.push(`start:${node.id}`),
        onNodeDragEnd: (payload) => terminal('end', payload),
        onNodeDragStop: (payload) => terminal('stop', payload),
        onConnectStart: () => events.push('connectStart'),
        onConnect: (value) =>
          events.push(`connect:${value.source}-${value.target}`),
        onConnectEnd: (value) => {
          events.push(`connectEnd:${value.status}:${value.reason}`)

          if (phase === 'connection-end' && !reentered) {
            reentered = true
            reenter()
          }
        },
        onReconnectStart: () => events.push('reconnectStart'),
        onReconnect: (value) =>
          events.push(
            `reconnect:${value.connection.source}-${value.connection.target}`
          ),
        onReconnectEnd: (value) =>
          events.push(`reconnectEnd:${value.status}:${value.reason}`),
        onSelectionStart: () => events.push('selectionStart'),
        onSelectionDragStart: () => events.push('selectionDragStart'),
        onSelectionEnd: () => events.push('selectionEnd'),
        onMoveStart: () => events.push('moveStart'),
        onMoveEnd: () => events.push('moveEnd'),
        onChange: (change) => changes.push(change),
      }),
  })

  app.mount(root)
  await nextTick()
  await mountedGeometry()
  const capture = syntheticCaptures(root)
  const input = actorInput(root, 'vue', actor)

  const source = requiredElement(
    root,
    phase === 'connection-end'
      ? '[data-node-id="a"] [data-handle-id="out"]'
      : '[data-node-id="a"]'
  )

  try {
    if (mode === 'fresh') {
      input.down()
    } else {
      dispatchPointer(source, 'pointerdown')

      if (mode === 'dispose') {
        app.unmount()
      } else {
        dispatchPointer(source, 'pointercancel')
      }
    }

    await nextTick()

    const afterTrigger = {
      events: [...events],
      captures: [...capture.attempts],
      held: capture.count(),
      changes: [...changes],
    }

    if (mode !== 'dispose') {
      input.finish()
      await nextTick()
    }

    return {
      afterTrigger,
      events: [...events],
      changes: [...changes],
      captures: [...capture.attempts],
      held: capture.count(),
    }
  } finally {
    if (mode !== 'dispose') {
      app.unmount()
    }

    root.remove()
  }
}

export const mountNativeTerminalProof = async (disposeOnLoss: boolean) => {
  const root = reentryRoot()
  root.id = 'native-terminal-proof'
  root.style.cssText =
    'width:1000px;height:600px;position:fixed;left:0;top:0;z-index:10000;background:white'
  const events: { name: string; payload: unknown; held: number }[] = []
  const receivers: { element: Element; ids: Set<number> }[] = []
  let editor: FlowEditor | undefined
  let disposed = false

  const count = () =>
    receivers.reduce(
      (total, receiver) =>
        total +
        [...receiver.ids].filter((id) => receiver.element.hasPointerCapture(id))
          .length,
      0
    )

  const save = () => {
    root.dataset.receipt = JSON.stringify({
      events,
      held: count(),
      accepted: editor?.snapshot.value,
      disposed,
    })
  }

  const record = <Payload>(name: string, payload: Payload) => {
    events.push({ name, payload, held: count() })
    save()
  }

  const app = createApp({
    render: () =>
      h(FlowCanvas, {
        nodesResizable: true,
        document: reentryDocument(),
        documentMode: 'uncontrolled',
        connectionDragThreshold: 0,
        nodeDragThreshold: 0,
        autoPanOnConnect: false,
        connectOnClick: false,
        onInit: (value) => {
          editor = value
        },
        isValidConnection: (value) => {
          record('validate', value)

          return true
        },
        onConnectStart: (value) => record('connectStart', value),
        onConnect: (value) => record('connect', value),
        onChange: (value) => record('change', value),
        onConnectEnd: (value) => record('connectEnd', value),
      }),
  })

  app.mount(root)
  await nextTick()
  await mountedGeometry()

  for (const element of root.querySelectorAll('*')) {
    if (!(element instanceof HTMLElement || element instanceof SVGElement)) {
      continue
    }

    const ids = new Set<number>()
    receivers.push({ element, ids })
    const set = element.setPointerCapture.bind(element)
    const release = element.releasePointerCapture.bind(element)
    const label = element.dataset.nodeId ?? element.dataset.endpoint ?? 'canvas'
    element.setPointerCapture = (id) => {
      set(id)
      ids.add(id)
      record('native:set', {
        target: label,
        id,
        captured: element.hasPointerCapture(id),
      })
    }

    element.releasePointerCapture = (id) => {
      release(id)
      record('native:release', {
        target: label,
        id,
        captured: element.hasPointerCapture(id),
      })
    }
  }

  root.addEventListener(
    'pointerup',
    (event) =>
      record('native:up:capture', {
        id: event.pointerId,
        trusted: event.isTrusted,
      }),
    true
  )
  root.addEventListener(
    'lostpointercapture',
    (event) => {
      record('native:loss', { id: event.pointerId, trusted: event.isTrusted })

      if (disposeOnLoss && !disposed) {
        disposed = true
        record('native:dispose:enter', null)
        app.unmount()
        record('native:dispose:return', null)
      }
    },
    true
  )
  root.addEventListener(
    'proof-cleanup',
    () => {
      if (!disposed) {
        app.unmount()
      }

      root.remove()
    },
    { once: true }
  )
  save()
}

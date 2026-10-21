import { Effect } from 'effect'
import {
  createApp,
  h,
  nextTick,
  onBeforeUnmount,
  render as renderVue,
  watch,
} from 'vue'

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

const completionReentrySend = (element: Element, type: string, id: number) => {
  const bounds = element.getBoundingClientRect()
  element.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      pointerId: id,
      clientX: bounds.x + bounds.width / 2,
      clientY: bounds.y + bounds.height / 2,
    })
  )
}

const reactiveDisposalSend = (element: Element, type: string) => {
  const bounds = element.getBoundingClientRect()
  dispatchPointer(element, type, {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  })
}

const continuationReentrySend = (
  element: Element,
  type: string,
  id: number,
  point: { x: number; y: number },
  shiftKey = false
) => {
  element.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      pointerId: id,
      clientX: point.x,
      clientY: point.y,
      shiftKey,
    })
  )
}

const continuationReentryPoint = (element: Element) => {
  const bounds = element.getBoundingClientRect()

  return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 }
}

const disposalClaimsProofSend = (
  element: Element,
  type: string,
  id: number,
  shiftKey = false
) => {
  const rect = element.getBoundingClientRect()
  element.dispatchEvent(
    new PointerEvent(type, {
      pointerId: id,
      bubbles: true,
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      clientX: rect.x + rect.width / 2,
      clientY: rect.y + rect.height / 2,
      shiftKey,
    })
  )
}

const disposalClaimsProofKey = (element: Element) =>
  element.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
  )

const reactiveCompletionProofSend = (element: Element, type: string) => {
  const bounds = element.getBoundingClientRect()
  dispatchPointer(element, type, {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  })
}

const semanticBoundaryProofSend = (
  element: Element,
  type: string,
  id: number,
  point?: { x: number; y: number },
  shiftKey = false
) => {
  const bounds = element.getBoundingClientRect()

  const position = point ?? {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  }

  element.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      pointerId: id,
      clientX: position.x,
      clientY: position.y,
      shiftKey,
    })
  )
}

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

export const completionReentry = async (
  phase:
    | 'connect'
    | 'change'
    | 'reconnect'
    | 'connectEnd'
    | 'reconnectEnd'
    | 'validation',
  dispose = false,
  controlled = false,
  reconnectB = false,
  finishMode:
    | 'mounted'
    | 'dispose'
    | 'click-mounted'
    | 'click-dispose' = 'mounted'
) => {
  // eslint-disable-next-line prefer-const -- Callback closures capture this binding before the mounted fixture supplies it.
  let app: ReturnType<typeof createApp>
  const root = reentryRoot()
  root.style.cssText =
    'width:1000px;height:600px;position:fixed;left:0;top:0;z-index:10000;background:white'

  const documentState = Effect.runSync(
    decodeFlowDocument({
      nodes: [
        {
          id: 'a',
          label: 'A',
          position: { x: 20, y: 20 },
          size: { width: 150, height: 45 },
          handles: [{ id: 'out', kind: 'source', side: 'right' }],
        },
        {
          id: 'b',
          label: 'B',
          position: { x: 220, y: 20 },
          size: { width: 150, height: 45 },
          handles: [
            { id: 'out', kind: 'source', side: 'right' },
            { id: 'in', kind: 'target', side: 'left' },
          ],
        },
        {
          id: 'c',
          label: 'C',
          position: { x: 420, y: 20 },
          size: { width: 150, height: 45 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
        {
          id: 'd',
          label: 'D',
          position: { x: 620, y: 20 },
          size: { width: 150, height: 45 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
      ],
      edges: dispose
        ? []
        : [
            {
              id: 'old',
              source: 'a',
              sourceHandle: 'out',
              target: 'b',
              targetHandle: 'in',
              selected: true,
              reconnectable: true,
            },
          ],
    })
  )

  const events: { name: string; payload: unknown; held: number }[] = []
  const changes: FlowChange[] = []
  const captures: { action: string; target: string; id: number }[] = []
  const held = new Map<Element, Set<number>>()
  const count = () => [...held.values()].reduce((sum, ids) => sum + ids.size, 0)
  let editor: FlowEditor | undefined
  let reentered = false
  let disposed = false

  const record = <Payload>(name: string, payload: Payload) =>
    events.push({ name, payload: structuredClone(payload), held: count() })

  const reenter = (at: typeof phase) => {
    if (at !== phase || reentered) {
      return
    }

    reentered = true

    if (dispose) {
      disposed = true
      record('dispose', at)
      app.unmount()
    } else {
      completionReentrySend(
        requiredElement(
          root,
          reconnectB
            ? '.flow-vue-edge-reconnect-anchor[data-endpoint="target"]'
            : '[data-node-id="b"] [data-handle-id="out"]'
        ),
        'pointerdown',
        8
      )

      if (finishMode === 'dispose' || finishMode === 'click-dispose') {
        disposed = true
        record('dispose', 'after-B')
        app.unmount()
      }
    }
  }

  app = createApp({
    render: () =>
      h(FlowCanvas, {
        nodesResizable: true,
        document: documentState,
        documentMode: controlled ? 'controlled' : 'uncontrolled',
        nodeDragThreshold: 0,
        connectionDragThreshold: 0,
        selectNodesOnDrag: false,
        autoPanOnConnect: false,
        connectOnClick: finishMode.startsWith('click'),
        onClickConnectStart: (value) => record('clickConnectStart', value),
        onClickConnectEnd: (value) => record('clickConnectEnd', value),
        onInit: (value) => {
          editor = value
        },
        isValidConnection: (value) => {
          record('validate', value)
          reenter('validation')

          return true
        },
        onConnectStart: (value) => record('connectStart', value),
        onReconnectStart: (value) => record('reconnectStart', value),
        onConnectProgress: (value) => record('connectProgress', value),
        onReconnectProgress: (value) => record('reconnectProgress', value),
        onConnect: (value) => {
          record('connect', value)
          reenter('connect')
        },
        onReconnect: (value) => {
          record('reconnect', value)
          reenter('reconnect')
        },
        onConnectEnd: (value) => {
          record('connectEnd', value)
          reenter('connectEnd')
        },
        onReconnectEnd: (value) => {
          record('reconnectEnd', value)
          reenter('reconnectEnd')
        },
        onChange: (value) => {
          changes.push(value)
          record('change', value)
          reenter('change')
        },
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
    held.set(element, ids)

    const target =
      element.dataset.nodeId ?? element.dataset.endpoint ?? 'canvas'

    element.setPointerCapture = (id) => {
      ids.add(id)
      captures.push({ action: 'set', target, id })
    }

    element.hasPointerCapture = (id) => ids.has(id)
    element.releasePointerCapture = (id) => {
      ids.delete(id)
      captures.push({ action: 'release', target, id })
    }
  }

  const completionReentrySnapshot = () => {
    if (editor === undefined) {
      throw new Error('Missing editor')
    }

    return {
      events: structuredClone(events),
      changes: structuredClone(changes),
      captures: [...captures],
      held: count(),
      accepted: structuredClone(editor.snapshot.value),
      preview: structuredClone(editor?.connectionPreview.value),
    }
  }

  try {
    if (finishMode.startsWith('click')) {
      requiredElement(
        root,
        '[data-node-id="a"] [data-handle-id="out"]'
      ).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      )
      requiredElement(
        root,
        '[data-node-id="c"] [data-handle-id="in"]'
      ).dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      )
    } else {
      completionReentrySend(
        requiredElement(
          root,
          phase.startsWith('reconnect')
            ? '.flow-vue-edge-reconnect-anchor[data-endpoint="target"]'
            : '[data-node-id="a"] [data-handle-id="out"]'
        ),
        'pointerdown',
        7
      )
      completionReentrySend(
        requiredElement(root, '[data-node-id="c"] [data-handle-id="in"]'),
        'pointerup',
        7
      )
    }

    const afterA = completionReentrySnapshot()

    if (!disposed) {
      completionReentrySend(
        requiredElement(root, '[data-node-id="d"] [data-handle-id="in"]'),
        'pointerup',
        8
      )
    }

    return { afterA, final: completionReentrySnapshot() }
  } finally {
    reentered = true

    if (!disposed) {
      app.unmount()
    }

    root.remove()
  }
}

export const reactiveDisposal = async (
  route:
    | 'physical-connect'
    | 'physical-reconnect'
    | 'retained-click'
    | 'keyboard-reconnect'
    | 'node-control',
  recursive: boolean
) => {
  const root = reentryRoot()
  root.style.cssText =
    'width:1000px;height:600px;position:fixed;left:0;top:0;z-index:10000;background:white'
  const events: { name: string; payload: unknown; held: number }[] = []
  const captures: { action: string; target: string; id: number }[] = []
  const held = new Map<Element, Set<number>>()
  const count = () => [...held.values()].reduce((sum, ids) => sum + ids.size, 0)

  const record = <Payload = null>(
    name: string,
    payload: Payload | null = null
  ) => events.push({ name, payload: structuredClone(payload), held: count() })

  let editor: FlowEditor | undefined
  let recurse = recursive
  let unmounts = 0

  const app = createApp({
    setup: () => {
      onBeforeUnmount(() => record('beforeUnmount', (unmounts += 1)))

      return () =>
        h(FlowCanvas, {
          nodesResizable: true,
          document: reentryDocument(),
          documentMode: 'uncontrolled',
          nodeDragThreshold: 0,
          connectionDragThreshold: 0,
          selectNodesOnDrag: false,
          autoPanOnConnect: false,
          connectOnClick: true,
          onInit: (value) => {
            editor = value
          },
          onConnectStart: (value) => record('connectStart', value),
          onClickConnectStart: (value) => record('clickConnectStart', value),
          onReconnectStart: (value) => record('reconnectStart', value),
          onConnectEnd: (value) => record('connectEnd', value),
          onClickConnectEnd: (value) => record('clickConnectEnd', value),
          onReconnectEnd: (value) => record('reconnectEnd', value),
          onNodeDragStart: (value) => record('nodeDragStart', value),
          onNodeDragEnd: (value) => record('nodeDragEnd', value),
          onNodeDragStop: (value) => record('nodeDragStop', value),
          onChange: (value) => record('change', value),
        })
    },
  })

  app.mount(root)
  await nextTick()
  await mountedGeometry()

  for (const element of root.querySelectorAll('*')) {
    if (!(element instanceof HTMLElement || element instanceof SVGElement)) {
      continue
    }

    const ids = new Set<number>()
    held.set(element, ids)

    const target =
      element.dataset.nodeId ?? element.dataset.endpoint ?? 'canvas'

    element.setPointerCapture = (id) => {
      ids.add(id)
      captures.push({ action: 'set', target, id })
    }

    element.hasPointerCapture = (id) => ids.has(id)
    element.releasePointerCapture = (id) => {
      ids.delete(id)
      captures.push({ action: 'release', target, id })
    }
  }

  const source = requiredElement(
    root,
    '[data-node-id="a"] [data-handle-id="out"]'
  )

  const anchor = requiredElement(
    root,
    '.flow-vue-edge-reconnect-anchor[data-endpoint="target"]'
  )

  if (route === 'physical-connect' || route === 'retained-click') {
    reactiveDisposalSend(source, 'pointerdown')

    if (route === 'retained-click') {
      reactiveDisposalSend(source, 'pointerup')
    }
  } else if (route === 'physical-reconnect') {
    reactiveDisposalSend(anchor, 'pointerdown')
  } else if (route === 'keyboard-reconnect') {
    anchor.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    )
  } else {
    reactiveDisposalSend(
      requiredElement(root, '[data-node-id="a"]'),
      'pointerdown'
    )
  }

  if (editor === undefined) {
    throw new Error('Missing public editor')
  }

  const initial = structuredClone(editor.connectionPreview.value)
  record('watch:armed', initial === null ? 'null' : 'nonnull')

  const stop = watch(
    editor.connectionPreview,
    (value) => {
      record('watch:null', value)

      if (value === null && recurse) {
        recurse = false
        record('nested:enter')
        app.unmount()
        record('nested:return')
      }
    },
    { flush: 'sync' }
  )

  record('outer:enter')
  let frameworkError = null

  try {
    app.unmount()
  } catch (error) {
    if (!(error instanceof Error)) {
      throw error
    }

    frameworkError = { name: error.name, message: error.message }
    record('outer:error', frameworkError)
  }

  record('outer:return')
  stop()

  const result = {
    initial,
    events,
    captures,
    held: count(),
    accepted: structuredClone(editor.snapshot.value),
    frameworkError,
  }

  root.remove()

  return result
}

export const continuationReentry = async (
  mode: 'selectionChange' | 'change' | 'pan' | 'auto-pan',
  controlled = false,
  cancelPhase: 'viewportStart' | 'moveStart' = 'viewportStart'
) => {
  const root = reentryRoot()
  root.style.cssText =
    'width:1000px;height:600px;position:fixed;left:0;top:0;z-index:10000;background:white'
  const events: { name: string; payload: unknown }[] = []
  const changes: FlowChange[] = []
  let editor: FlowEditor | undefined
  let reentered = false
  let cancelled = false

  const record = <Payload = null>(
    name: string,
    payload: Payload | null = null
  ) => events.push({ name, payload: structuredClone(payload) })

  const target = (selector: string) => requiredElement(root, selector)

  const startB = () => {
    if (reentered) {
      return
    }

    reentered = true
    const canvas = target('.flow-vue-canvas')

    if (mode === 'auto-pan') {
      const handle = target('[data-node-id="b"] [data-handle-id="out"]')
      continuationReentrySend(
        handle,
        'pointerdown',
        8,
        continuationReentryPoint(handle)
      )
    } else {
      if (mode === 'pan') {
        continuationReentrySend(canvas, 'pointercancel', 7, { x: 650, y: 300 })
      }

      continuationReentrySend(
        canvas,
        'pointerdown',
        8,
        { x: 700, y: 400 },
        mode !== 'pan'
      )
    }
  }

  const app = createApp({
    render: () =>
      h(FlowCanvas, {
        nodesResizable: true,
        document: reentryDocument(),
        documentMode: controlled ? 'controlled' : 'uncontrolled',
        viewportMode: controlled ? 'controlled' : 'uncontrolled',
        viewport: { x: 0, y: 0, zoom: 1 },
        nodeDragThreshold: 0,
        connectionDragThreshold: 0,
        selectNodesOnDrag: false,
        panOnDrag: true,
        autoPanOnConnect: mode === 'auto-pan',
        connectOnClick: false,
        onInit: (value) => {
          editor = value
        },
        onSelectionStart: (value) => record('selectionStart', value),
        onSelectionDragStart: (value) => record('selectionDragStart', value),
        onSelectionEnd: (value) => record('selectionEnd', value),
        onSelectionDragStop: (value) => record('selectionDragStop', value),
        onSelectionChange: (value) => {
          record('selectionChange', value)

          if (mode === 'selectionChange') {
            startB()
          }
        },
        onChange: (value) => {
          changes.push(value)
          record('change', value)

          if (mode === 'change') {
            startB()
          }
        },
        onViewportStart: (value) => {
          record('viewportStart', value)

          if (
            mode === 'auto-pan' &&
            cancelPhase === 'viewportStart' &&
            !cancelled
          ) {
            cancelled = true
            continuationReentrySend(
              target('.flow-vue-canvas'),
              'pointercancel',
              7,
              {
                x: 650,
                y: 300,
              }
            )
          }
        },
        onMoveStart: (value) => {
          record('moveStart', value)

          if (
            mode === 'auto-pan' &&
            cancelPhase === 'moveStart' &&
            !cancelled
          ) {
            cancelled = true
            continuationReentrySend(
              target('.flow-vue-canvas'),
              'pointercancel',
              7,
              { x: 650, y: 300 }
            )
          }
        },
        onViewportChange: (value) => record('viewportChange', value),
        onMove: (value) => {
          record('move', value)

          if (mode === 'pan') {
            startB()
          }
        },
        onViewportEnd: (viewport, status) =>
          record('viewportEnd', { viewport, status }),
        onMoveEnd: (viewport, status) =>
          record('moveEnd', { viewport, status }),
        onConnectStart: (value) => record('connectStart', value),
        onConnect: (value) => record('connect', value),
        onConnectProgress: (value) => record('connectProgress', value),
        onConnectEnd: (value) => {
          record('connectEnd', value)

          if (mode === 'auto-pan' && cancelled) {
            startB()
          }
        },
      }),
  })

  app.mount(root)
  await nextTick()
  await mountedGeometry()
  const capture = syntheticCaptures(root)

  const continuationReentrySnapshot = () => {
    if (editor === undefined) {
      throw new Error('Missing editor')
    }

    return {
      events: structuredClone(events),
      changes: structuredClone(changes),
      captures: [...capture.attempts],
      captureHistory: [...capture.history],
      held: capture.count(),
      accepted: structuredClone(editor.snapshot.value),
      preview: structuredClone(editor?.connectionPreview.value),
    }
  }

  try {
    const canvas = target('.flow-vue-canvas')

    if (mode === 'auto-pan') {
      const a = target('[data-node-id="a"] [data-handle-id="out"]')
      continuationReentrySend(a, 'pointerdown', 7, continuationReentryPoint(a))
      const bounds = canvas.getBoundingClientRect()
      continuationReentrySend(canvas, 'pointermove', 7, {
        x: bounds.right - 1,
        y: bounds.top + bounds.height / 2,
      })
    } else {
      continuationReentrySend(
        canvas,
        'pointerdown',
        7,
        { x: 600, y: 300 },
        mode !== 'pan'
      )
      continuationReentrySend(
        canvas,
        'pointerup',
        7,
        { x: 650, y: 350 },
        mode !== 'pan'
      )
    }

    const afterA = continuationReentrySnapshot()

    if (mode === 'auto-pan') {
      const c = target('[data-node-id="c"] [data-handle-id="in"]')
      continuationReentrySend(c, 'pointerup', 8, continuationReentryPoint(c))
    } else {
      continuationReentrySend(
        canvas,
        'pointerup',
        8,
        { x: 740, y: 440 },
        mode !== 'pan'
      )
    }

    return { afterA, final: continuationReentrySnapshot() }
  } finally {
    reentered = true
    app.unmount()
    root.remove()
  }
}

export const disposalClaimsProof = async (
  live:
    | 'none'
    | 'physical-connect'
    | 'physical-reconnect'
    | 'retained-click'
    | 'keyboard-reconnect'
    | 'node-control'
    | 'selection'
    | 'pan',
  claimRoute: 'physical' | 'click' | 'reconnect',
  entry: 'watch' | 'terminal' | 'release',
  recursive: boolean,
  controlled: boolean
) => {
  // eslint-disable-next-line prefer-const -- Callback closures capture this binding before the mounted fixture supplies it.
  let app: ReturnType<typeof createApp>
  const root = reentryRoot()
  root.style.cssText =
    'width:1000px;height:600px;position:fixed;left:0;top:0;z-index:10000;background:white'
  const input = reentryDocument()
  const events: { name: string; payload: unknown; held: number }[] = []
  const captures: { action: string; target: string; id: number }[] = []
  const held = new Map<Element, Set<number>>()

  const count = () =>
    [...held.values()].reduce((total, ids) => total + ids.size, 0)

  const record = <Payload = null>(
    name: string,
    payload: Payload | null = null
  ) => events.push({ name, payload: structuredClone(payload), held: count() })

  // eslint-disable-next-line prefer-const -- Callback closures capture this binding before the mounted fixture supplies it.
  let deniedNode: Element | undefined
  let editor: FlowEditor | undefined
  let validation = 0
  let unmounts = 0
  let recurse = recursive
  let stopWatch: (() => void) | undefined

  let frameworkError: { name: string; message: string } | null = null
  const target = (selector: string) => requiredElement(root, selector)

  const nested = () => {
    if (!recurse) {
      return
    }

    recurse = false
    record('nested:enter')
    app.unmount()
    record('nested:return')
  }

  const terminal = <Payload>(name: string, payload: Payload) => {
    record(name, payload)

    if (entry === 'terminal') {
      nested()
    }

    if (deniedNode !== undefined) {
      disposalClaimsProofSend(deniedNode, 'pointerdown', 90)
    }
  }

  const admitLive = () => {
    const source = target('[data-node-id="a"] [data-handle-id="out"]')

    const anchor = target(
      '.flow-vue-edge-reconnect-anchor[data-endpoint="target"]'
    )

    switch (live) {
      case 'none': {
        break
      }

      case 'physical-connect': {
        disposalClaimsProofSend(source, 'pointerdown', 9)
        break
      }

      case 'retained-click': {
        disposalClaimsProofSend(source, 'pointerdown', 9)
        disposalClaimsProofSend(source, 'pointerup', 9)
        break
      }

      case 'physical-reconnect': {
        disposalClaimsProofSend(anchor, 'pointerdown', 9)
        break
      }

      case 'keyboard-reconnect': {
        disposalClaimsProofKey(anchor)
        break
      }

      case 'node-control': {
        disposalClaimsProofSend(target('[data-node-id="a"]'), 'pointerdown', 9)
        break
      }

      case 'selection': {
        disposalClaimsProofSend(
          target('[data-testid="flow-canvas"]'),
          'pointerdown',
          9,
          true
        )
        break
      }

      case 'pan': {
        disposalClaimsProofSend(
          target('[data-testid="flow-canvas"]'),
          'pointerdown',
          9
        )
        break
      }

      default: {
        const exhausted: never = live

        return exhausted
      }
    }
  }

  const outer = () => {
    admitLive()

    if (editor === undefined) {
      throw new Error('Missing editor')
    }

    if (entry === 'watch') {
      record(
        'watch:armed',
        editor.connectionPreview.value === null ? 'null' : 'nonnull'
      )
      stopWatch = watch(
        editor.connectionPreview,
        (value) => {
          record('watch:null', value)

          if (value === null) {
            nested()
          }
        },
        { flush: 'sync' }
      )
    }

    record('outer:enter')

    try {
      app.unmount()
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error
      }

      frameworkError = { name: error.name, message: error.message }
      record('outer:error', frameworkError)
    }

    record('outer:return')
  }

  const complete = (node: 'a' | 'b', id: number) => {
    const source = target(`[data-node-id="${node}"] [data-handle-id="out"]`)
    const destination = target('[data-node-id="c"] [data-handle-id="in"]')

    if (claimRoute === 'click') {
      disposalClaimsProofKey(source)
      disposalClaimsProofKey(destination)

      return
    }

    if (claimRoute === 'reconnect') {
      disposalClaimsProofSend(
        target('.flow-vue-edge-reconnect-anchor[data-endpoint="target"]'),
        'pointerdown',
        id
      )
    } else {
      disposalClaimsProofSend(source, 'pointerdown', id)
    }

    disposalClaimsProofSend(destination, 'pointerup', id)
  }

  app = createApp({
    setup: () => {
      onBeforeUnmount(() => {
        unmounts += 1
        record('beforeUnmount', unmounts)
      })

      return () =>
        h(FlowCanvas, {
          nodesResizable: true,
          document: input,
          documentMode: controlled ? 'controlled' : 'uncontrolled',
          viewport: { x: 0, y: 0, zoom: 1 },
          viewportMode: controlled ? 'controlled' : 'uncontrolled',
          nodeDragThreshold: 0,
          connectionDragThreshold: 0,
          selectNodesOnDrag: false,
          autoPanOnConnect: false,
          connectOnClick: true,
          onInit: (value) => {
            editor = value
          },
          isValidConnection: (value) => {
            validation += 1
            record('validate', value)

            if (validation === 1) {
              complete('b', 8)
            } else if (validation === 2) {
              outer()
            }

            return true
          },
          onConnectStart: (value) => record('connectStart', value),
          onClickConnectStart: (value) => record('clickConnectStart', value),
          onReconnectStart: (value) => record('reconnectStart', value),
          onConnectEnd: (value) => terminal('connectEnd', value),
          onClickConnectEnd: (value) => terminal('clickConnectEnd', value),
          onReconnectEnd: (value) => terminal('reconnectEnd', value),
          onNodeDragStart: (value) => record('nodeDragStart', value),
          onNodeDragEnd: (value) => terminal('nodeDragEnd', value),
          onNodeDragStop: (value) => terminal('nodeDragStop', value),
          onSelectionStart: (value) => record('selectionStart', value),
          onSelectionDragStart: (value) => record('selectionDragStart', value),
          onSelectionEnd: (value) => terminal('selectionEnd', value),
          onSelectionDragStop: (value) => terminal('selectionDragStop', value),
          onViewportStart: (value) => record('viewportStart', value),
          onMoveStart: (value) => record('moveStart', value),
          onViewportEnd: (value, status) =>
            terminal('viewportEnd', { viewport: value, status }),
          onMoveEnd: (value, status) =>
            terminal('moveEnd', { viewport: value, status }),
          onChange: (value) => record('change', value),
          onConnect: (value) => record('connect', value),
          onReconnect: (value) => record('reconnect', value),
        })
    },
  })

  app.mount(root)
  await nextTick()
  await mountedGeometry()

  for (const element of root.querySelectorAll('*')) {
    if (!(element instanceof HTMLElement || element instanceof SVGElement)) {
      continue
    }

    const ids = new Set<number>()
    held.set(element, ids)
    const label = element.dataset.nodeId ?? element.dataset.endpoint ?? 'canvas'
    element.setPointerCapture = (id) => {
      ids.add(id)
      captures.push({ action: 'set', target: label, id })
    }

    element.hasPointerCapture = (id) => ids.has(id)
    element.releasePointerCapture = (id) => {
      ids.delete(id)
      captures.push({ action: 'release', target: label, id })

      if (entry === 'release' && id === 9) {
        nested()
      }
    }
  }

  deniedNode = target('[data-node-id="a"]')
  complete('a', 7)
  stopWatch?.()

  if (editor === undefined) {
    throw new Error('Missing editor')
  }

  const result = {
    events: structuredClone(events),
    captures: [...captures],
    held: count(),
    accepted: structuredClone(editor.snapshot.value),
    frameworkError,
  }

  const beforeRepeat = { events: events.length, captures: captures.length }
  app.unmount()

  const repeat = {
    before: beforeRepeat,
    after: { events: events.length, captures: captures.length },
  }

  root.remove()

  return { ...result, repeat }
}

// eslint-disable-next-line complexity -- This public fixture enumerates physical, retained and keyboard claims with the same synchronous disposal barrier.
export const reactiveCompletionProof = async (
  route:
    | 'physical-connect'
    | 'physical-reconnect'
    | 'retained-click'
    | 'keyboard-reconnect'
    | 'node-control',
  mounted: boolean,
  controlled: boolean,
  threshold: number,
  valid = true,
  autoPan: 'none' | 'partial' | 'full' = 'none'
) => {
  const root = reentryRoot()
  root.style.cssText =
    'width:1000px;height:600px;position:fixed;left:0;top:0;z-index:10000;background:white'
  const events: { name: string; payload: unknown; held: number }[] = []
  const captures: { action: string; target: string; id: number }[] = []
  const held = new Map<Element, Set<number>>()
  const count = () => [...held.values()].reduce((sum, ids) => sum + ids.size, 0)

  const record = <Payload = null>(
    name: string,
    payload: Payload | null = null
  ) => events.push({ name, payload: structuredClone(payload), held: count() })

  let editor: FlowEditor | undefined
  let recurse = !mounted
  let unmounts = 0

  const app = createApp({
    setup: () => {
      onBeforeUnmount(() => record('beforeUnmount', (unmounts += 1)))

      return () =>
        h(FlowCanvas, {
          nodesResizable: true,
          document: reentryDocument(),
          documentMode: controlled ? 'controlled' : 'uncontrolled',
          nodeDragThreshold: 0,
          connectionDragThreshold: threshold,
          selectNodesOnDrag: false,
          autoPanOnConnect: autoPan !== 'none',
          viewport: { x: 0, y: 0, zoom: 1 },
          viewportMode: controlled ? 'controlled' : 'uncontrolled',
          onViewportStart: (value) => {
            record('viewportStart', value)

            if (autoPan === 'partial') {
              const destination = requiredElement(
                root,
                '[data-node-id="c"] [data-handle-id="in"]'
              )

              if (route === 'retained-click') {
                destination.dispatchEvent(
                  new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
                )
              } else {
                reactiveCompletionProofSend(destination, 'pointerup')
              }
            }
          },
          onMoveStart: (value) => record('moveStart', value),
          onViewportChange: (value) => record('viewportChange', value),
          onMove: (value) => record('move', value),
          onViewportEnd: (viewport, status) =>
            record('viewportEnd', { viewport, status }),
          onMoveEnd: (viewport, status) =>
            record('moveEnd', { viewport, status }),
          connectOnClick: true,
          onInit: (value) => {
            editor = value
          },
          onConnectStart: (value) => record('connectStart', value),
          onClickConnectStart: (value) => record('clickConnectStart', value),
          onReconnectStart: (value) => record('reconnectStart', value),
          onConnectProgress: (value) => record('connectProgress', value),
          onReconnectProgress: (value) => record('reconnectProgress', value),
          'onUpdate:viewport': (value) => record('update:viewport', value),
          onConnectEnd: (value) => record('connectEnd', value),
          onClickConnectEnd: (value) => record('clickConnectEnd', value),
          onReconnectEnd: (value) => record('reconnectEnd', value),
          onNodeDragStart: (value) => record('nodeDragStart', value),
          onNodeDragEnd: (value) => record('nodeDragEnd', value),
          onNodeDragStop: (value) => record('nodeDragStop', value),
          onChange: (value) => record('change', value),
          onConnect: (value) => record('connect', value),
          onReconnect: (value) => record('reconnect', value),
          isValidConnection: (value) => {
            record('validate', value)

            return valid
          },
        })
    },
  })

  app.mount(root)
  await nextTick()
  await mountedGeometry()

  for (const element of root.querySelectorAll('*')) {
    if (!(element instanceof HTMLElement || element instanceof SVGElement)) {
      continue
    }

    const ids = new Set<number>()
    held.set(element, ids)

    const target =
      element.dataset.nodeId ?? element.dataset.endpoint ?? 'canvas'

    element.setPointerCapture = (id) => {
      ids.add(id)
      captures.push({ action: 'set', target, id })
    }

    element.hasPointerCapture = (id) => ids.has(id)
    element.releasePointerCapture = (id) => {
      ids.delete(id)
      captures.push({ action: 'release', target, id })
    }
  }

  const source = requiredElement(
    root,
    '[data-node-id="a"] [data-handle-id="out"]'
  )

  const anchor = requiredElement(
    root,
    '.flow-vue-edge-reconnect-anchor[data-endpoint="target"]'
  )

  if (route === 'physical-connect' || route === 'retained-click') {
    reactiveCompletionProofSend(source, 'pointerdown')

    if (route === 'retained-click') {
      reactiveCompletionProofSend(source, 'pointerup')
    }

    if (route === 'physical-connect' && threshold > 0) {
      const rect = source.getBoundingClientRect()
      dispatchPointer(source, 'pointermove', {
        x: rect.x + rect.width / 2 + 6,
        y: rect.y + rect.height / 2,
      })
    }
  } else if (route === 'physical-reconnect') {
    reactiveCompletionProofSend(anchor, 'pointerdown')

    if (threshold > 0) {
      const rect = anchor.getBoundingClientRect()
      dispatchPointer(anchor, 'pointermove', {
        x: rect.x + rect.width / 2 + 5,
        y: rect.y + rect.height / 2,
      })
      record('threshold:equality', {
        events: structuredClone(events),
        preview: editor?.connectionPreview.value ?? null,
      })
      dispatchPointer(anchor, 'pointermove', {
        x: rect.x + rect.width / 2 + 6,
        y: rect.y + rect.height / 2,
      })
    }
  } else if (route === 'keyboard-reconnect') {
    anchor.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    )
  } else {
    reactiveCompletionProofSend(
      requiredElement(root, '[data-node-id="a"]'),
      'pointerdown'
    )
  }

  if (editor === undefined) {
    throw new Error('Missing public editor')
  }

  const initial = structuredClone(editor.connectionPreview.value)
  record('watch:armed', initial === null ? 'null' : 'nonnull')

  const stop = watch(
    editor.connectionPreview,
    (value) => {
      record(value === null ? 'watch:null' : 'watch:preview', value)

      if (value === null && recurse) {
        recurse = false
        record('watcher:enter')
        app.unmount()
        record('watcher:return')
      }
    },
    { flush: 'sync' }
  )

  const destination = requiredElement(
    root,
    '[data-node-id="c"] [data-handle-id="in"]'
  )

  record('complete:target')

  if (autoPan !== 'none') {
    dispatchPointer(requiredElement(root, '.flow-vue-canvas'), 'pointermove', {
      x: 1035,
      y: 300,
    })
  }

  if (autoPan !== 'partial') {
    if (route === 'physical-connect') {
      reactiveCompletionProofSend(destination, 'pointerup')
    } else if (route === 'retained-click' && threshold > 0) {
      reactiveCompletionProofSend(destination, 'pointerdown')
      reactiveCompletionProofSend(destination, 'pointerup')
    } else {
      destination.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      )
    }
  }

  record('complete:return')
  stop()
  const beforeLate = { events: events.length, captures: captures.length }
  reactiveCompletionProofSend(anchor, 'pointerup')
  anchor.dispatchEvent(
    new PointerEvent('lostpointercapture', { pointerId: 7, bubbles: true })
  )

  const lateQuiet =
    events.length === beforeLate.events &&
    captures.length === beforeLate.captures

  const result = {
    initial,
    lateQuiet,
    events: structuredClone(events),
    captures: [...captures],
    held: count(),
    accepted: structuredClone(editor.snapshot.value),
  }

  if (mounted) {
    app.unmount()
  }

  root.remove()

  return result
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

export const viewportOwnershipProof = async (
  phase:
    | 'viewportStart'
    | 'moveStart'
    | 'viewportChange'
    | 'move'
    | 'viewportEnd'
    | 'pan-nested'
    | 'pan-nested-request',
  controlled: boolean
) => {
  const root = reentryRoot()
  const events: { name: string; payload: unknown; held: number }[] = []
  let editor: FlowEditor | undefined
  let armed = true
  let nestedRequest: Promise<unknown> | undefined
  let capture = { count: () => 0 }

  const record = <Payload>(name: string, payload: Payload) =>
    events.push({
      name,
      payload: structuredClone(payload),
      held: capture.count(),
    })

  const observe = <Payload>(name: string, payload: Payload) => {
    record(name, payload)

    if (
      !armed ||
      editor === undefined ||
      name !== (phase.startsWith('pan-nested') ? 'move' : phase)
    ) {
      return
    }

    armed = false

    if (phase === 'pan-nested') {
      editor.updateViewport({ x: 7, y: 9, zoom: 1 })
    } else {
      nestedRequest = editor.setViewport({ x: 70, y: 90, zoom: 1 })
    }
  }

  const app = createApp({
    render: () =>
      h(FlowCanvas, {
        nodesResizable: true,
        document: reentryDocument(),
        documentMode: 'uncontrolled',
        viewport: { x: 0, y: 0, zoom: 1 },
        viewportMode: controlled ? 'controlled' : 'uncontrolled',
        onInit: (value) => {
          editor = value
        },
        onViewportStart: (value) => observe('viewportStart', value),
        onMoveStart: (value) => observe('moveStart', value),
        onViewportChange: (value) => observe('viewportChange', value),
        onMove: (value) => observe('move', value),
        onViewportEnd: (viewport, status) =>
          observe('viewportEnd', { viewport, status }),
        onMoveEnd: (viewport, status) =>
          observe('moveEnd', { viewport, status }),
        'onUpdate:viewport': (value) => record('update:viewport', value),
      }),
  })

  app.mount(root)
  await nextTick()
  await mountedGeometry()
  capture = syntheticCaptures(root)

  if (editor === undefined) {
    throw new Error('Missing editor')
  }

  try {
    let outerResult: Awaited<ReturnType<FlowEditor['setViewport']>> | null =
      null

    if (phase.startsWith('pan-nested')) {
      const canvas = requiredElement(root, '[data-testid="flow-canvas"]')
      dispatchPointer(canvas, 'pointerdown', { x: 650, y: 350 })
      dispatchPointer(canvas, 'pointerup', { x: 700, y: 400 })
    } else {
      outerResult = await editor.setViewport({ x: 20, y: 30, zoom: 1 })
    }

    const nestedResult =
      nestedRequest === undefined ? null : await nestedRequest

    return {
      events,
      outerResult,
      nestedResult,
      viewport: structuredClone(editor.snapshot.value.viewport),
      held: capture.count(),
    }
  } finally {
    armed = false
    app.unmount()
    root.remove()
  }
}

export const keyboardPreviewProof = async (
  entry: 'editor' | 'renderer',
  mode:
    | 'ordinary'
    | 'escape'
    | 'error'
    | 'dispose'
    | 'error-dispose'
    | 'error-successor'
) => {
  // eslint-disable-next-line prefer-const -- Callback closures capture this binding before the mounted fixture supplies it.
  let app: ReturnType<typeof createApp>
  const root = reentryRoot()
  root.style.cssText =
    'width:1000px;height:600px;position:fixed;left:0;top:0;z-index:10000;background:white'
  const input = reentryDocument()
  const c = input.nodes.find((node) => node.id === 'c')

  if (c === undefined) {
    throw new Error('Missing c')
  }

  const documentState = {
    ...input,
    nodes: input.nodes.map((node) =>
      node.id === 'c'
        ? {
            ...node,
            position: { x: 70, y: 20 },
            handles: [{ id: 'out', kind: 'source', side: 'right' }],
          }
        : { ...node, selected: false }
    ),
  }

  const parsed = Effect.runSync(decodeFlowDocument(documentState))
  const events: { name: string; payload: unknown }[] = []
  let editor: FlowEditor | undefined
  let armed = true
  let disposed = false
  let failures = 0

  const record = <Payload>(name: string, payload: Payload) =>
    events.push({ name, payload: structuredClone(payload) })

  const cancel = () =>
    root.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    )

  const dispose = () => {
    disposed = true
    app.unmount()
  }

  const previewProps: Pick<
    InstanceType<typeof FlowCanvas>['$props'],
    'connectionPreview'
  > = {}

  if (entry === 'renderer') {
    previewProps.connectionPreview = (props) => {
      record('render-preview', props.preview)

      return h(
        'span',
        { 'data-testid': 'keyboard-public-preview' },
        JSON.stringify(props.preview)
      )
    }
  }

  app = createApp({
    render: () =>
      h(FlowCanvas, {
        nodesResizable: true,
        document: parsed,
        documentMode: 'uncontrolled',
        connectionDragThreshold: 0,
        autoPanOnConnect: false,
        onInit: (value) => {
          editor = value
        },
        ...previewProps,
        isValidConnection: (value) => {
          record('validate', value)

          if (mode === 'error-successor') {
            throw new Error('preview-check')
          }

          if (armed) {
            armed = false

            if (mode === 'escape') {
              cancel()
            }

            if (mode === 'dispose') {
              dispose()
            }

            if (mode === 'error' || mode === 'error-dispose') {
              throw new Error('preview-check')
            }
          }

          return true
        },
        onError: (value) => {
          record('error', value)
          failures += 1

          if (mode === 'error-dispose') {
            dispose()
          } else {
            cancel()

            if (mode === 'error-successor' && failures === 1) {
              requiredElement(
                root,
                '.flow-vue-edge-reconnect-anchor[data-endpoint="source"]'
              ).dispatchEvent(
                new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
              )
            }
          }
        },
        onReconnectStart: (value) => record('reconnectStart', value),
        onReconnectEnd: (value) => record('reconnectEnd', value),
        onReconnectProgress: (value) => record('reconnectProgress', value),
        onChange: (value) => record('change', value),
      }),
  })

  app.mount(root)
  await nextTick()
  await mountedGeometry()
  const capture = syntheticCaptures(root)
  const b = requiredElement(root, '[data-node-id="b"] [data-handle-id="in"]')
  const bounds = b.getBoundingClientRect()

  const target = document
    .elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)
    ?.closest<HTMLElement>('[data-handle-id]')

  const measuredTarget = {
    node: target?.closest<HTMLElement>('[data-node-id]')?.dataset.nodeId,
    handle: target?.dataset.handleId,
  }

  if (measuredTarget.node !== 'c') {
    throw new Error(
      `Overlap fixture missed c: ${JSON.stringify({ measuredTarget, b: bounds.toJSON(), c: requiredElement(root, '[data-node-id="c"] [data-handle-id="out"]').getBoundingClientRect().toJSON(), hit: document.elementFromPoint(bounds.x + bounds.width / 2, bounds.y + bounds.height / 2)?.outerHTML.slice(0, 500) })}`
    )
  }

  const anchor = requiredElement(
    root,
    '.flow-vue-edge-reconnect-anchor[data-endpoint="source"]'
  )

  anchor.dispatchEvent(
    new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
  )

  if (editor === undefined) {
    throw new Error('Missing editor')
  }

  let preview = null
  let frameworkError: { name: string; message: string } | null = null

  if (entry === 'editor') {
    preview = structuredClone(editor.connectionPreview.value)
  } else {
    try {
      await nextTick()
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error
      }

      frameworkError = { name: error.name, message: error.message }
    }
  }

  if (mode === 'error-successor' && editor !== undefined) {
    await nextTick()
    void editor.connectionPreview.value
  }

  const result = {
    events: structuredClone(events),
    frameworkError,
    preview,
    measuredTarget,
    captures: [...capture.attempts],
    held: capture.count(),
    rendered:
      root.querySelector('[data-testid="keyboard-public-preview"]')
        ?.textContent ?? null,
    accepted: structuredClone(editor.snapshot.value),
  }

  if (!disposed) {
    app.unmount()
  }

  root.remove()

  return result
}

export const semanticBoundaryProof = async (
  actor: 'node' | 'selection' | 'connection' | 'reconnection',
  action:
    | 'dispose-selectionChange'
    | 'dispose-change'
    | 'switch-mode'
    | 'nested'
    | 'defaults'
    | 'metadata'
    | 'invalid-endpoint'
    | 'ordinary'
) => {
  const root = reentryRoot()
  root.style.cssText =
    'width:1000px;height:600px;position:fixed;left:0;top:0;z-index:10000;background:white'
  const input = reentryDocument()
  const events: { name: string; payload: unknown; held: number }[] = []
  let editor: FlowEditor | undefined
  // eslint-disable-next-line prefer-const -- Listeners close over instrumentation installed after mount.
  let capture: ReturnType<typeof syntheticCaptures> | undefined
  let controlled = false
  let defaults = { label: 'before-connect' }
  let once = false
  let disposed = false

  const record = <Payload>(name: string, payload: Payload) =>
    events.push({
      name,
      payload: structuredClone(payload),
      held: capture?.count() ?? 0,
    })

  const target = (selector: string) => requiredElement(root, selector)

  const dispose = () => {
    disposed = true
    record('dispose', action)
    renderVue(null, root)
  }

  const render = () =>
    renderVue(
      h(FlowCanvas, {
        nodesResizable: true,
        document: input,
        documentMode: controlled ? 'controlled' : 'uncontrolled',
        nodeDragThreshold: 0,
        connectionDragThreshold: 0,
        autoPanOnConnect: false,
        connectOnClick: false,
        selectNodesOnDrag: false,
        defaultEdgeOptions: defaults,
        onInit: (value) => {
          editor = value
        },
        onNodeDragStart: (value) => record('nodeStart', value),
        onNodeDragEnd: (value) => record('nodeEnd', value),
        onNodeDragStop: (value) => record('nodeStop', value),
        onSelectionStart: (value) => record('selectionStart', value),
        onSelectionDragStart: (value) => record('selectionDragStart', value),
        onSelectionEnd: (value) => record('selectionEnd', value),
        onSelectionDragStop: (value) => record('selectionStop', value),
        onConnectStart: (value) => record('connectStart', value),
        onReconnectStart: (value) => record('reconnectStart', value),
        onConnectEnd: (value) => record('connectEnd', value),
        onReconnectEnd: (value) => record('reconnectEnd', value),
        onSelectionChange: (value) => {
          record('selectionChange', value)

          if (action === 'dispose-selectionChange') {
            dispose()
          }
        },
        onChange: (value) => {
          record('change', value)

          if (action === 'dispose-change') {
            dispose()
          }

          if (action === 'switch-mode') {
            controlled = true
            render()
          }
        },
        isValidConnection: (value) => {
          record('validate', value)

          if (editor !== undefined && action === 'metadata') {
            editor.updateDocument({
              ...editor.snapshot.value.document,
              edges: editor.snapshot.value.document.edges.map((edge) => ({
                ...edge,
                label: 'after-validation',
              })),
            })
          }

          if (editor !== undefined && action === 'invalid-endpoint') {
            editor.updateDocument({
              ...editor.snapshot.value.document,
              nodes: editor.snapshot.value.document.nodes.map((node) =>
                node.id === 'c'
                  ? {
                      ...node,
                      handles: node.handles?.map((handle) => ({
                        ...handle,
                        kind: 'source',
                      })),
                    }
                  : node
              ),
            })
          }

          return true
        },
        onConnect: (value) => {
          record('connect', value)

          if (action === 'defaults') {
            defaults = { label: 'after-connect' }
            render()
          }

          if (action === 'nested' && !once) {
            once = true
            semanticBoundaryProofSend(
              target('[data-node-id="b"] [data-handle-id="out"]'),
              'pointerdown',
              8
            )
            semanticBoundaryProofSend(
              target('[data-node-id="c"] [data-handle-id="in"]'),
              'pointerup',
              8
            )
          }
        },
        onReconnect: (value) => {
          record('reconnect', value)

          if (action === 'metadata' && editor !== undefined) {
            editor.updateDocument({
              ...editor.snapshot.value.document,
              edges: editor.snapshot.value.document.edges.map((edge) => ({
                ...edge,
                label: 'after-reconnect',
              })),
            })
          }
        },
      }),
      root
    )

  render()
  await nextTick()
  await mountedGeometry()
  capture = syntheticCaptures(root)

  if (editor === undefined) {
    throw new Error('Missing editor')
  }

  try {
    if (actor === 'node') {
      const element = target('[data-node-id="a"]')
      semanticBoundaryProofSend(element, 'pointerdown', 7, { x: 80, y: 70 })
      semanticBoundaryProofSend(element, 'pointerup', 7, { x: 92, y: 76 })
    } else if (actor === 'selection') {
      const canvas = target('[data-testid="flow-canvas"]')
      semanticBoundaryProofSend(
        canvas,
        'pointerdown',
        7,
        { x: 600, y: 300 },
        true
      )
      semanticBoundaryProofSend(
        canvas,
        'pointerup',
        7,
        { x: 650, y: 350 },
        true
      )
    } else {
      semanticBoundaryProofSend(
        target(
          actor === 'connection'
            ? '[data-node-id="a"] [data-handle-id="out"]'
            : '.flow-vue-edge-reconnect-anchor[data-endpoint="target"]'
        ),
        'pointerdown',
        7
      )
      semanticBoundaryProofSend(
        target('[data-node-id="c"] [data-handle-id="in"]'),
        'pointerup',
        7
      )
    }

    return {
      events: structuredClone(events),
      held: capture?.count() ?? 0,
      captures: capture.history,
      accepted: structuredClone(editor.snapshot.value),
    }
  } finally {
    if (!disposed) {
      renderVue(null, root)
    }

    root.remove()
  }
}

/* eslint-disable promise/prefer-await-to-callbacks, node/callback-return -- This fixture exercises synchronous captured native callbacks and recursive disposal before the next effect. */
export const disposalResourceProof = async (recursive: boolean) => {
  const root = reentryRoot()
  const events: { name: string; payload: unknown }[] = []

  const record = <Payload>(name: string, payload: Payload) =>
    events.push({ name, payload: structuredClone(payload) })

  const nativeFrame = globalThis.requestAnimationFrame
  const nativeCancel = globalThis.cancelAnimationFrame
  const NativeResizeObserver = globalThis.ResizeObserver
  const frozenResize: (() => void)[] = []

  class CapturedResizeObserver extends NativeResizeObserver {
    constructor(callback: ResizeObserverCallback) {
      super((entries, observer) => {
        frozenResize.push(() => callback(entries, observer))
        callback(entries, observer)
      })
    }
  }

  globalThis.ResizeObserver = CapturedResizeObserver
  let editor: FlowEditor | undefined
  let recurse = recursive
  let unmounts = 0

  const app = createApp({
    setup: () => {
      onBeforeUnmount(() => {
        unmounts += 1
        record('beforeUnmount', unmounts)
      })

      return () =>
        h(FlowCanvas, {
          nodesResizable: true,
          document: reentryDocument(),
          documentMode: 'uncontrolled',
          onInit: (value) => {
            editor = value
          },
          onViewportStart: (value) => record('viewportStart', value),
          onMoveStart: (value) => record('moveStart', value),
          onViewportChange: (value) => record('viewportChange', value),
          onMove: (value) => record('move', value),
          onViewportEnd: (viewport, status) =>
            record('viewportEnd', { viewport, status }),
          onMoveEnd: (viewport, status) =>
            record('moveEnd', { viewport, status }),
        })
    },
  })

  app.mount(root)
  await nextTick()
  await mountedGeometry()

  if (editor === undefined) {
    throw new Error('Missing editor')
  }

  const frames = new Map<number, FrameRequestCallback>()
  let sequence = 0
  globalThis.requestAnimationFrame = (callback) => {
    sequence += 1
    frames.set(sequence, callback)
    record('frame:request', sequence)

    return sequence
  }

  globalThis.cancelAnimationFrame = (id) => {
    frames.delete(id)
    record('frame:cancel', id)

    if (recurse) {
      recurse = false
      record('nested:enter', null)
      app.unmount()
      record('nested:return', null)
    }
  }

  try {
    editor.observeKeyPress('Shift', { target: document }, (value) =>
      record('key', value)
    )
    document.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'Shift',
        code: 'ShiftLeft',
        bubbles: true,
      })
    )

    const request = editor.setViewport(
      { x: 20, y: 30, zoom: 1 },
      { duration: 100 }
    )

    const internals = editor.updateNodeInternals('a')
    const before = structuredClone(editor.snapshot.value)
    record('outer:enter', null)
    let frameworkError = null

    try {
      app.unmount()
    } catch (error) {
      if (!(error instanceof Error)) {
        throw error
      }

      frameworkError = { name: error.name, message: error.message }
      record('outer:error', frameworkError)
    }

    record('outer:return', null)
    const result = await request
    const internalsResult = await internals
    record('request:result', result)
    record('internals:result', internalsResult)
    const beforeFrozen = events.length

    const frozenFrames = [...frames.values()]

    for (const callback of frozenFrames) {
      callback(128)
    }

    for (const callback of frozenResize) {
      callback()
    }

    document.dispatchEvent(
      new KeyboardEvent('keyup', {
        key: 'Shift',
        code: 'ShiftLeft',
        bubbles: true,
      })
    )

    return {
      events: structuredClone(events),
      before,
      after: structuredClone(editor.snapshot.value),
      beforeFrozen,
      afterFrozen: events.length,
      frozenResizeCount: frozenResize.length,
      remainingFrames: [...frames.keys()],
      frameworkError,
    }
  } finally {
    globalThis.requestAnimationFrame = nativeFrame
    globalThis.cancelAnimationFrame = nativeCancel
    globalThis.ResizeObserver = NativeResizeObserver
    root.remove()
  }
}

/* eslint-enable promise/prefer-await-to-callbacks, node/callback-return */

export const retainedPressProof = async (promoted: boolean) => {
  const root = reentryRoot()
  root.style.cssText =
    'width:1000px;height:600px;position:fixed;left:0;top:0;z-index:10000;background:white'
  let editor: FlowEditor | undefined
  const events: { name: string; payload: unknown; held: number }[] = []
  // eslint-disable-next-line prefer-const -- Callback closures are installed before capture instrumentation after mount.
  let capture: ReturnType<typeof syntheticCaptures> | undefined

  const record = <Payload>(name: string, payload: Payload) =>
    events.push({
      name,
      payload: structuredClone(payload),
      held: capture?.count() ?? 0,
    })

  const app = createApp({
    render: () =>
      h(FlowCanvas, {
        nodesResizable: true,
        document: reentryDocument(),
        documentMode: 'uncontrolled',
        connectionDragThreshold: 5,
        autoPanOnConnect: false,
        onInit: (value) => {
          editor = value
        },
        onConnectStart: (value) => record('connectStart', value),
        onClickConnectStart: (value) => record('clickConnectStart', value),
        onConnectProgress: (value) => record('connectProgress', value),
        onConnectEnd: (value) => record('connectEnd', value),
        onClickConnectEnd: (value) => record('clickConnectEnd', value),
        onConnect: (value) => record('connect', value),
        onChange: (value) => record('change', value),
        isValidConnection: (value) => {
          record('validate', value)

          return true
        },
      }),
  })

  app.mount(root)
  await nextTick()
  await mountedGeometry()
  capture = syntheticCaptures(root)

  const source = requiredElement(
    root,
    '[data-node-id="a"] [data-handle-id="out"]'
  )

  const target = requiredElement(
    root,
    '[data-node-id="c"] [data-handle-id="in"]'
  )

  const sourcePoint = continuationReentryPoint(source)
  const targetPoint = continuationReentryPoint(target)

  try {
    dispatchPointer(source, 'pointerdown', sourcePoint)
    dispatchPointer(source, 'pointerup', sourcePoint)
    dispatchPointer(target, 'pointerdown', targetPoint)
    dispatchPointer(target, 'pointermove', {
      x: targetPoint.x + 5,
      y: targetPoint.y,
    })

    if (editor === undefined) {
      throw new Error('Missing editor')
    }

    const pending = {
      events: structuredClone(events),
      held: capture.count(),
      preview: structuredClone(editor.connectionPreview.value),
    }

    if (promoted) {
      dispatchPointer(target, 'pointermove', {
        x: targetPoint.x + 6,
        y: targetPoint.y,
      })
    }

    const crossing = {
      events: structuredClone(events),
      held: capture.count(),
      preview: structuredClone(editor.connectionPreview.value),
    }

    dispatchPointer(target, 'pointerup', targetPoint)

    return {
      pending,
      crossing,
      events,
      captures: capture.history,
      held: capture.count(),
      accepted: structuredClone(editor.snapshot.value),
      sourcePoint,
      targetPoint,
    }
  } finally {
    app.unmount()
    root.remove()
  }
}

export const previewContinuationProof = async (
  route: 'physical' | 'retained',
  phase:
    | 'ordinary'
    | 'validate'
    | 'error'
    | 'viewportChange'
    | 'move'
    | 'update:viewport'
) => {
  const root = reentryRoot()
  root.style.cssText =
    'position:fixed;left:0;top:0;width:1000px;height:600px;z-index:10000;background:white'
  let editor: FlowEditor | undefined
  const events: { name: string; payload: unknown; held: number }[] = []
  // eslint-disable-next-line prefer-const -- Callback closures are installed before capture instrumentation after mount.
  let capture: ReturnType<typeof syntheticCaptures> | undefined
  let armed = phase !== 'ordinary'
  const target = (selector: string) => requiredElement(root, selector)

  const record = <Payload>(name: string, payload: Payload) =>
    events.push({
      name,
      payload: structuredClone(payload),
      held: capture?.count() ?? 0,
    })

  const replace = () => {
    if (!armed) {
      return
    }

    armed = false
    root.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    )
    const b = target('[data-node-id="b"] [data-handle-id="out"]')
    dispatchPointer(b, 'pointerdown', continuationReentryPoint(b))
  }

  const observe = <Payload>(name: string, payload: Payload) => {
    record(name, payload)

    if (name === phase) {
      replace()
    }
  }

  const app = createApp({
    render: () =>
      h(FlowCanvas, {
        nodesResizable: true,
        document: reentryDocument(),
        documentMode: 'uncontrolled',
        connectionDragThreshold: 0,
        viewportMode:
          phase === 'update:viewport' ? 'controlled' : 'uncontrolled',
        autoPanOnConnect:
          phase === 'viewportChange' ||
          phase === 'move' ||
          phase === 'update:viewport',
        onInit: (value) => {
          editor = value
        },
        onConnectStart: (value) => record('connectStart', value),
        onClickConnectStart: (value) => record('clickConnectStart', value),
        onConnectProgress: (value) => record('connectProgress', value),
        onConnectEnd: (value) => record('connectEnd', value),
        onClickConnectEnd: (value) => record('clickConnectEnd', value),
        onViewportStart: (value) => record('viewportStart', value),
        onMoveStart: (value) => record('moveStart', value),
        onViewportChange: (value) => observe('viewportChange', value),
        onMove: (value) => observe('move', value),
        'onUpdate:viewport': (value) => observe('update:viewport', value),
        onViewportEnd: (viewport, status) =>
          record('viewportEnd', { viewport, status }),
        onMoveEnd: (viewport, status) =>
          record('moveEnd', { viewport, status }),
        onError: (value) => {
          record('error', value)

          if (phase === 'error') {
            replace()
          }
        },
        isValidConnection: (value) => {
          record('validate', value)

          if (phase === 'error' && armed) {
            throw new Error('preview-check')
          }

          if (phase === 'validate') {
            replace()
          }

          return true
        },
      }),
  })

  app.mount(root)
  await nextTick()
  await mountedGeometry()
  capture = syntheticCaptures(root)
  const source = target('[data-node-id="a"] [data-handle-id="out"]')
  const canvas = target('.flow-vue-canvas')

  try {
    if (route === 'retained') {
      source.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
      )
    } else {
      dispatchPointer(source, 'pointerdown', continuationReentryPoint(source))
    }

    const viewportPhase =
      phase === 'viewportChange' ||
      phase === 'move' ||
      phase === 'update:viewport'

    const point = viewportPhase
      ? { x: 1035, y: 300 }
      : continuationReentryPoint(
          target('[data-node-id="c"] [data-handle-id="in"]')
        )

    dispatchPointer(canvas, 'pointermove', point)

    if (editor === undefined) {
      throw new Error('Missing editor')
    }

    const preview = structuredClone(editor.connectionPreview.value)

    return {
      events: structuredClone(events),
      captures: [...capture.history],
      held: capture.count(),
      preview,
      accepted: structuredClone(editor.snapshot.value),
    }
  } finally {
    app.unmount()
    root.remove()
  }
}

export const selectionContinuationProof = async (
  input: 'pointer' | 'keyboard',
  trigger: 'none' | 'start' | 'progress' | 'end',
  moved: boolean
) => {
  const root = reentryRoot()
  const events: { name: string; payload: unknown; held: number }[] = []
  // eslint-disable-next-line prefer-const -- Callback closures are installed before capture instrumentation after mount.
  let capture: ReturnType<typeof syntheticCaptures> | undefined
  let armed = trigger !== 'none'
  let editor: FlowEditor | undefined

  const record = <Payload>(name: string, payload: Payload) =>
    events.push({
      name,
      payload: structuredClone(payload),
      held: capture?.count() ?? 0,
    })

  const replace = () => {
    if (!armed) {
      return
    }

    armed = false

    if (trigger !== 'end') {
      root.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      )
    }

    dispatchPointer(
      requiredElement(root, '[data-node-id="a"]'),
      'pointerdown',
      { x: 40, y: 40 }
    )
  }

  const app = createApp({
    render: () =>
      h(FlowCanvas, {
        nodesResizable: true,
        document: reentryDocument(),
        documentMode: 'uncontrolled',
        nodeDragThreshold: 0,
        selectNodesOnDrag: false,
        onInit: (value) => {
          editor = value
        },
        onSelectionStart: (value) => {
          record('selectionStart', value)

          if (trigger === 'start') {
            replace()
          }
        },
        onSelectionDragStart: (value) => record('selectionDragStart', value),
        onSelectionProgress: (value) => {
          record('selectionProgress', value)

          if (trigger === 'progress') {
            replace()
          }
        },
        onSelectionDrag: (value) => record('selectionDrag', value),
        onSelectionEnd: (value) => {
          record('selectionEnd', value)

          if (trigger === 'end') {
            replace()
          }
        },
        onSelectionDragStop: (value) => record('selectionDragStop', value),
        onSelectionChange: (value) => record('selectionChange', value),
        onChange: (value) => record('change', value),
        onNodeDragStart: (value) => record('nodeStart', value),
        onNodeDragEnd: (value) => record('nodeEnd', value),
        onNodeDragStop: (value) => record('nodeStop', value),
      }),
  })

  app.mount(root)
  await nextTick()
  await mountedGeometry()
  capture = syntheticCaptures(root)
  const canvas = requiredElement(root, '.flow-vue-canvas')
  const b = requiredElement(root, '[data-node-id="b"]')

  try {
    if (input === 'keyboard') {
      b.dispatchEvent(
        new KeyboardEvent('keydown', {
          key: ' ',
          shiftKey: true,
          bubbles: true,
        })
      )
    } else {
      dispatchPointer(canvas, 'pointerdown', { x: 650, y: 350 }, true)
    }

    if (moved && trigger !== 'start') {
      if (input === 'keyboard') {
        b.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
        )
      } else {
        dispatchPointer(canvas, 'pointermove', { x: 660, y: 360 }, true)
      }
    }

    if (trigger === 'none' || trigger === 'end') {
      if (input === 'keyboard') {
        b.dispatchEvent(
          new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
        )
      } else {
        dispatchPointer(
          canvas,
          'pointerup',
          moved ? { x: 660, y: 360 } : { x: 650, y: 350 },
          true
        )
      }
    }

    if (editor === undefined) {
      throw new Error('Missing editor')
    }

    return {
      events: structuredClone(events),
      captures: [...capture.history],
      held: capture.count(),
      accepted: structuredClone(editor.snapshot.value),
    }
  } finally {
    armed = false
    app.unmount()
    root.remove()
  }
}

export const retainedNodeCancellationProof = async () => {
  const root = reentryRoot()
  const events: { name: string; payload: unknown; held: number }[] = []
  // eslint-disable-next-line prefer-const -- Callback closures are installed before capture instrumentation after mount.
  let capture: ReturnType<typeof syntheticCaptures> | undefined
  let editor: FlowEditor | undefined
  let replaced = false

  const record = <Payload>(name: string, payload: Payload) =>
    events.push({
      name,
      payload: structuredClone(payload),
      held: capture?.count() ?? 0,
    })

  const app = createApp({
    render: () =>
      h(FlowCanvas, {
        nodesResizable: true,
        document: reentryDocument(),
        documentMode: 'uncontrolled',
        nodeDragThreshold: 0,
        connectionDragThreshold: 0,
        selectNodesOnDrag: false,
        autoPanOnConnect: false,
        onInit: (value) => {
          editor = value
        },
        onNodeDragStart: (value) => record('nodeStart', value),
        onNodeDragStop: (value) => record('nodeStop', value),
        onNodeDragEnd: (value) => {
          record('nodeEnd', value)

          if (!replaced) {
            replaced = true

            const b = requiredElement(
              root,
              '[data-node-id="b"] [data-handle-id="out"]'
            )

            completionReentrySend(b, 'pointerdown', 8)
          }
        },
        onConnectStart: (value) => record('connectStart', value),
        onClickConnectStart: (value) => record('clickConnectStart', value),
        onConnectEnd: (value) => record('connectEnd', value),
        onClickConnectEnd: (value) => record('clickConnectEnd', value),
        onConnect: (value) => record('connect', value),
        onChange: (value) => record('change', value),
      }),
  })

  app.mount(root)
  await nextTick()
  await mountedGeometry()
  capture = syntheticCaptures(root)

  try {
    requiredElement(
      root,
      '[data-node-id="a"] [data-handle-id="out"]'
    ).dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    )
    dispatchPointer(
      requiredElement(root, '[data-node-id="a"]'),
      'pointerdown',
      { x: 40, y: 40 }
    )
    root.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    )

    if (editor === undefined) {
      throw new Error('Missing editor')
    }

    const after = {
      events: structuredClone(events),
      preview: structuredClone(editor.connectionPreview.value),
      held: capture.count(),
    }

    completionReentrySend(
      requiredElement(root, '[data-node-id="c"] [data-handle-id="in"]'),
      'pointerup',
      8
    )

    return {
      after,
      events: structuredClone(events),
      held: capture.count(),
      captures: [...capture.history],
      accepted: structuredClone(editor.snapshot.value),
    }
  } finally {
    replaced = true
    app.unmount()
    root.remove()
  }
}

export const viewportRequestProof = async (
  route: 'matching' | 'nonmatching' | 'animation' | 'stale-frame'
) => {
  const root = reentryRoot()
  let editor: FlowEditor | undefined
  let viewport = { x: 0, y: 0, zoom: 1 }
  const controlled = route === 'matching' || route === 'nonmatching'
  const events: { name: string; payload: unknown }[] = []

  const record = <Payload>(name: string, payload: Payload) =>
    events.push({ name, payload: structuredClone(payload) })

  let nested:
    | Promise<Awaited<ReturnType<FlowEditor['setViewport']>>>
    | undefined

  let replaceFrame = route === 'stale-frame'

  // eslint-disable-next-line promise/prefer-await-to-callbacks -- Vue listener positions are synchronous reentry barriers under test.
  const draw = () =>
    renderVue(
      h(FlowCanvas, {
        nodesResizable: true,
        document: reentryDocument(),
        documentMode: 'uncontrolled',
        viewport,
        viewportMode: controlled ? 'controlled' : 'uncontrolled',
        onInit: (value) => {
          editor = value
        },
        onViewportStart: (value) => record('viewportStart', value),
        onMoveStart: (value) => record('moveStart', value),
        onViewportChange: (value) => {
          record('viewportChange', value)

          if (replaceFrame && value.x > 0 && editor !== undefined) {
            replaceFrame = false
            nested = editor.setViewport(
              { x: 70, y: 90, zoom: 1 },
              { duration: 100 }
            )
          }
        },
        onMove: (value) => record('move', value),
        onViewportEnd: (value, status) =>
          record('viewportEnd', { viewport: value, status }),
        onMoveEnd: (value, status) =>
          record('moveEnd', { viewport: value, status }),
        // eslint-disable-next-line promise/prefer-await-to-callbacks -- Parent acknowledgement must reenter synchronously at this Vue emission.
        'onUpdate:viewport': (value) => {
          record('update:viewport', value)
          viewport = route === 'matching' ? value : { x: 3, y: 4, zoom: 1 }
          draw()
        },
      }),
      root
    )

  draw()
  await nextTick()
  await mountedGeometry()

  if (editor === undefined) {
    throw new Error('Missing editor')
  }

  const activeEditor = editor
  const states = [structuredClone(activeEditor.snapshot.value)]

  const stopStates = watch(
    [
      () => activeEditor.snapshot.value.viewport.x,
      () => activeEditor.snapshot.value.viewport.y,
      () => activeEditor.snapshot.value.viewport.zoom,
    ],
    () => states.push(structuredClone(activeEditor.snapshot.value)),
    { flush: 'sync' }
  )

  interface FrameReplay {
    events: typeof events
    frames: typeof frameEvents
  }

  let beforeReplay: FrameReplay | null = null
  let afterReplay: FrameReplay | null = null
  const nativeFrame = window.requestAnimationFrame
  const nativeCancel = window.cancelAnimationFrame
  const frames = new Map<number, FrameRequestCallback>()
  const frameEvents: { action: string; id: number; timestamp?: number }[] = []
  let sequence = 100
  // eslint-disable-next-line promise/prefer-await-to-callbacks -- Capture the real frame callback for deterministic synchronous delivery.
  window.requestAnimationFrame = (callback) => {
    sequence += 1
    frames.set(sequence, callback)
    frameEvents.push({ action: 'request', id: sequence })

    return sequence
  }

  window.cancelAnimationFrame = (id) => {
    frames.delete(id)
    frameEvents.push({ action: 'cancel', id })
  }

  const tick = (timestamp: number) => {
    const entry = frames.entries().next().value

    if (entry === undefined) {
      throw new Error('Missing scheduled frame')
    }

    const [id, deliver] = entry
    frames.delete(id)
    frameEvents.push({ action: 'deliver', id, timestamp })
    deliver(timestamp)

    return deliver
  }

  try {
    const request = editor.setViewport(
      { x: 20, y: 30, zoom: 1 },
      { duration: 100 }
    )

    let staleQuiet = true

    if (!controlled) {
      tick(0)
      const oldTick = tick(50)

      if (route === 'stale-frame') {
        const before = events.length
        beforeReplay = {
          events: structuredClone(events),
          frames: structuredClone(frameEvents),
        }
        oldTick(100)
        afterReplay = {
          events: structuredClone(events),
          frames: structuredClone(frameEvents),
        }
        staleQuiet = events.length === before
        tick(200)
        tick(300)
      } else {
        tick(100)
      }
    }

    const result = await request
    const next = nested === undefined ? null : await nested

    return {
      events: structuredClone(events),
      states,
      beforeReplay,
      afterReplay,
      frames: frameEvents,
      pendingFrames: frames.size,
      result,
      next,
      staleQuiet,
      viewport: structuredClone(editor.snapshot.value.viewport),
    }
  } finally {
    stopStates()
    renderVue(null, root)
    window.requestAnimationFrame = nativeFrame
    window.cancelAnimationFrame = nativeCancel
    root.remove()
  }
}

export const viewportAcknowledgementProof = async (acknowledge: 1 | 2 | 65) => {
  const root = reentryRoot()
  let editor: FlowEditor | undefined
  let viewport = { x: 0, y: 0, zoom: 1 }
  const events: { name: string; payload: unknown }[] = []

  const record = <Payload>(name: string, payload: Payload) =>
    events.push({ name, payload: structuredClone(payload) })

  const draw = () =>
    renderVue(
      h(FlowCanvas, {
        nodesResizable: true,
        document: reentryDocument(),
        viewport,
        viewportMode: 'controlled',
        onInit: (value) => {
          editor = value
        },
        onViewportStart: (value) => record('viewportStart', value),
        onMoveStart: (value) => record('moveStart', value),
        onViewportChange: (value) => record('viewportChange', value),
        onMove: (value) => record('move', value),
        onViewportEnd: (value, status) =>
          record('viewportEnd', { viewport: value, status }),
        onMoveEnd: (value, status) =>
          record('moveEnd', { viewport: value, status }),
        'onUpdate:viewport': (value) => record('update:viewport', value),
      }),
      root
    )

  draw()
  await nextTick()
  await mountedGeometry()

  if (editor === undefined) {
    throw new Error('Missing editor')
  }

  try {
    const results = []

    for (let x = 1; x <= 65; x += 1) {
      // eslint-disable-next-line no-await-in-loop -- Each completed proposal must enter the acknowledgement history before the next request.
      results.push(await editor.setViewport({ x, y: 0, zoom: 1 }))
    }

    const before = {
      events: structuredClone(events),
      viewport: structuredClone(editor.snapshot.value.viewport),
    }

    viewport = { x: acknowledge, y: 0, zoom: 1 }
    draw()

    return {
      before,
      events,
      results,
      viewport: structuredClone(editor.snapshot.value.viewport),
    }
  } finally {
    renderVue(null, root)
    root.remove()
  }
}

export const ordinaryViewportProof = async (
  route: 'wheel' | 'doubleclick' | 'editor',
  joined: boolean,
  controlled: boolean
) => {
  const root = reentryRoot()
  root.style.cssText = 'position:fixed;left:0;top:0;width:1000px;height:600px'
  let editor: FlowEditor | undefined
  const events: { name: string; payload: unknown }[] = []

  const record = <Payload>(name: string, payload: Payload) =>
    events.push({ name, payload: structuredClone(payload) })

  const app = createApp({
    render: () =>
      h(FlowCanvas, {
        nodesResizable: true,
        document: reentryDocument(),
        documentMode: 'uncontrolled',
        viewport: { x: 0, y: 0, zoom: 1 },
        viewportMode: controlled ? 'controlled' : 'uncontrolled',
        panOnDrag: true,
        panOnScroll: true,
        panOnScrollSpeed: 1,
        zoomOnDoubleClick: true,
        onInit: (value) => {
          editor = value
        },
        onViewportStart: (value) => record('viewportStart', value),
        onMoveStart: (value) => record('moveStart', value),
        onViewportChange: (value) => record('viewportChange', value),
        onMove: (value) => record('move', value),
        onViewportEnd: (value, status) =>
          record('viewportEnd', { viewport: value, status }),
        onMoveEnd: (value, status) =>
          record('moveEnd', { viewport: value, status }),
        'onUpdate:viewport': (value) => record('update:viewport', value),
      }),
  })

  app.mount(root)
  await nextTick()
  await mountedGeometry()
  const capture = syntheticCaptures(root)
  const canvas = requiredElement(root, '[data-testid="flow-canvas"]')
  const bounds = canvas.getBoundingClientRect()

  if (editor === undefined) {
    throw new Error('Missing editor')
  }

  try {
    if (joined) {
      dispatchPointer(canvas, 'pointerdown', { x: 600, y: 300 })
    }

    if (route === 'wheel') {
      canvas.dispatchEvent(
        new WheelEvent('wheel', {
          bubbles: true,
          clientX: bounds.left + 100,
          clientY: bounds.top + 50,
          deltaX: 10,
          deltaY: 20,
        })
      )
    } else if (route === 'doubleclick') {
      canvas.dispatchEvent(
        new MouseEvent('dblclick', {
          bubbles: true,
          clientX: bounds.left + 100,
          clientY: bounds.top + 50,
        })
      )
    } else {
      editor.updateViewport({ x: 7, y: 9, zoom: 1 })
    }

    const afterWrite = {
      events: structuredClone(events),
      held: capture.count(),
      viewport: structuredClone(editor.snapshot.value.viewport),
    }

    if (joined) {
      dispatchPointer(canvas, 'pointerup', { x: 600, y: 300 })
    }

    return {
      afterWrite,
      events,
      captures: capture.history,
      held: capture.count(),
      viewport: structuredClone(editor.snapshot.value.viewport),
    }
  } finally {
    app.unmount()
    root.remove()
  }
}

// eslint-disable-next-line complexity -- Each branch is a separate fixed public entry route in the continuation proof.
export const continuationRoundFourViewport = async (
  route:
    | 'editor'
    | 'wheel'
    | 'doubleclick'
    | 'triple'
    | 'partial'
    | 'quiet-start'
    | 'quiet-move'
    | 'historical'
    | 'own'
    | 'nonmatching'
    | 'mode-historical'
    | 'mode-nonmatching'
    | 'pan'
) => {
  const root = reentryRoot()
  root.style.cssText = 'position:fixed;left:0;top:0;width:1000px;height:600px'
  const events: { name: string; payload: unknown }[] = []
  const frames: { action: string; id: number; time?: number }[] = []
  const pending = new Map<number, FrameRequestCallback>()

  const results: Record<
    string,
    Awaited<ReturnType<FlowEditor['setViewport']>> | undefined
  > = {}

  let editor: FlowEditor | undefined
  let sequence = 100
  let armed = false
  let nested = false

  let mode: 'controlled' | 'uncontrolled' =
    route === 'historical' ||
    route === 'own' ||
    route === 'nonmatching' ||
    route.startsWith('mode-')
      ? 'controlled'
      : 'uncontrolled'

  let supplied = { x: 0, y: 0, zoom: 1 }
  const nativeFrame = globalThis.requestAnimationFrame
  const nativeCancel = globalThis.cancelAnimationFrame

  const record = <Payload>(name: string, payload: Payload) =>
    events.push({ name, payload: structuredClone(payload) })

  const request = (name: string, x: number, y: number, duration = 0) => {
    if (editor === undefined) {
      throw new Error('Missing editor')
    }

    return editor.setViewport({ x, y, zoom: 1 }, { duration }).then((value) => {
      results[name] = value
    })
  }

  const draw = () =>
    renderVue(
      h(FlowCanvas, {
        nodesResizable: true,
        document: reentryDocument(),
        viewport: supplied,
        viewportMode: mode,
        style: { margin: '0', width: '100%', maxWidth: 'none', border: '0' },
        panOnDrag: true,
        panOnScroll: true,
        zoomOnDoubleClick: true,
        onInit: (value) => {
          editor = value
        },
        onViewportStart: (value) => {
          record('viewportStart', value)

          if (!nested && route === 'partial') {
            nested = true
            editor?.updateViewport({ x: 7, y: 9, zoom: 1 })
          }

          if (!nested && route === 'quiet-start') {
            nested = true
            void request('quiet', 0, 0)
          }

          if (
            armed &&
            !nested &&
            (route === 'historical' || route === 'nonmatching')
          ) {
            nested = true
            supplied = { x: route === 'historical' ? 10 : 7, y: 0, zoom: 1 }
            record('supplied', supplied)
            draw()
          }
        },
        onMoveStart: (value) => record('moveStart', value),
        onViewportChange: (value) => record('viewportChange', value),
        onMove: (value) => {
          record('move', value)

          if (!nested && route === 'quiet-move') {
            nested = true
            void request('quiet', 0, 0)
          }
        },
        onViewportEnd: (viewport, status) => {
          record('viewportEnd', { viewport, status })

          if (armed && !nested && route === 'triple') {
            nested = true
            void request('C', 80, 90, 100)
          }
        },
        onMoveEnd: (viewport, status) =>
          record('moveEnd', { viewport, status }),
        'onUpdate:viewport': (value) => {
          record('update:viewport', value)

          if (armed && !nested && route === 'own') {
            nested = true
            supplied = value
            record('supplied', value)
            draw()
          }
        },
      }),
      root
    )

  try {
    draw()
    await nextTick()
    await mountedGeometry()

    if (editor === undefined) {
      throw new Error('Missing editor')
    }

    const capture = syntheticCaptures(root)
    globalThis.requestAnimationFrame = (deliverFrame) => {
      sequence += 1
      const id = sequence
      pending.set(id, deliverFrame)
      frames.push({ action: 'request', id })

      return id
    }

    globalThis.cancelAnimationFrame = (id) => {
      pending.delete(id)
      frames.push({ action: 'cancel', id })
    }

    const canvas = requiredElement(root, '.flow-vue-canvas')

    if (
      route === 'historical' ||
      route === 'own' ||
      route === 'nonmatching' ||
      route.startsWith('mode-')
    ) {
      await request('A', 10, 0)

      if (route.startsWith('mode-')) {
        mode = 'uncontrolled'
        draw()
        await nextTick()
      }

      armed = true
      void request('B', 20, 0, route.startsWith('mode-') ? 100 : 0)

      if (route.startsWith('mode-')) {
        mode = 'controlled'
        draw()
        supplied = { x: route === 'mode-historical' ? 10 : 7, y: 0, zoom: 1 }
        draw()
      }
    } else if (route === 'quiet-start' || route === 'quiet-move') {
      editor.updateViewport({ x: 7, y: 9, zoom: 1 })
    } else if (route === 'partial') {
      dispatchPointer(canvas, 'pointerdown', { x: 600, y: 300 })
      dispatchPointer(canvas, 'pointerup', { x: 600, y: 300 })
    } else {
      void request('A', 20, 30, 100)
      armed = true

      if (route === 'triple') {
        void request('B', 50, 60, 100)
      } else if (route === 'editor') {
        editor.updateViewport({ x: 7, y: 9, zoom: 1 })
      } else if (route === 'wheel') {
        canvas.dispatchEvent(
          new WheelEvent('wheel', {
            bubbles: true,
            clientX: 100,
            clientY: 50,
            deltaX: 10,
            deltaY: 20,
          })
        )
      } else if (route === 'doubleclick') {
        canvas.dispatchEvent(
          new MouseEvent('dblclick', {
            bubbles: true,
            clientX: 100,
            clientY: 50,
          })
        )
      } else {
        dispatchPointer(canvas, 'pointerdown', { x: 600, y: 300 })
        dispatchPointer(canvas, 'pointerup', { x: 600, y: 300 })
      }
    }

    for (const time of [0, 100, 200]) {
      // eslint-disable-next-line unicorn/no-useless-spread -- Replay only the captured frame batch; reentrant requests remain pending.
      for (const [id, deliverFrame] of [...pending]) {
        pending.delete(id)
        frames.push({ action: 'deliver', id, time })
        deliverFrame(time)
      }
    }

    await Promise.resolve()
    await Promise.resolve()
    await nextTick()

    return {
      events: structuredClone(events),
      results: structuredClone(results),
      viewport: structuredClone(editor.snapshot.value.viewport),
      frames,
      pending: [...pending.keys()],
      captures: capture.history,
      held: capture.count(),
    }
  } finally {
    renderVue(null, root)
    globalThis.requestAnimationFrame = nativeFrame
    globalThis.cancelAnimationFrame = nativeCancel
    root.remove()
  }
}

export const continuationRoundFourReconnect = async (
  mutation: 'remove' | 'kind' | 'metadata'
) => {
  const root = reentryRoot()
  const events: { name: string; payload: unknown }[] = []
  const changes: FlowChange[] = []
  let editor: FlowEditor | undefined
  let validations = 0
  let validationsAtCallback = 0

  const record = <Payload>(name: string, payload: Payload) =>
    events.push({ name, payload: structuredClone(payload) })

  try {
    renderVue(
      h(FlowCanvas, {
        nodesResizable: true,
        document: reentryDocument(),
        documentMode: 'uncontrolled',
        connectionDragThreshold: 0,
        onInit: (value) => {
          editor = value
        },
        isValidConnection: () => {
          validations += 1

          return true
        },
        onReconnectStart: (value) => record('reconnectStart', value),
        onReconnectEnd: (value) => record('reconnectEnd', value),
        onChange: (value) => {
          changes.push(structuredClone(value))
        },
        onReconnect: (value) => {
          validationsAtCallback = validations
          record('reconnect', value)

          if (editor === undefined) {
            throw new Error('Missing editor')
          }

          const current = editor.snapshot.value.document
          editor.updateDocument(
            Effect.runSync(
              decodeFlowDocument({
                ...current,
                nodes: current.nodes.map((node) =>
                  (() => {
                    if (node.id === 'c') {
                      return {
                        ...node,
                        handles: (() => {
                          if (mutation === 'remove') {
                            return []
                          }

                          if (mutation === 'kind') {
                            return [{ id: 'in', kind: 'source', side: 'left' }]
                          }

                          return node.handles
                        })(),
                      }
                    }

                    return node
                  })()
                ),
                edges: current.edges.map((edge) =>
                  mutation === 'metadata'
                    ? { ...edge, label: 'callback metadata' }
                    : edge
                ),
              })
            )
          )
        },
      }),
      root
    )
    await nextTick()
    await mountedGeometry()
    const capture = syntheticCaptures(root)
    const input = actorInput(root, 'vue', 'reconnection')
    input.down()
    input.finish()
    await nextTick()

    if (editor === undefined) {
      throw new Error('Missing editor')
    }

    return {
      events,
      changes,
      validations,
      validationsAtCallback,
      captures: capture.history,
      held: capture.count(),
      document: structuredClone(editor.snapshot.value.document),
    }
  } finally {
    renderVue(null, root)
    root.remove()
  }
}

// eslint-disable-next-line complexity -- The fault matrix preserves the distinct synchronous, returned and Vue emitter channels.
export const continuationRoundFourRequestError = async (
  mode:
    | 'cancel'
    | 'retained'
    | 'end-C'
    | 'end-dispose'
    | 'cancel-C'
    | 'cancel-dispose'
    | 'media-get'
    | 'media-call'
    | 'media-matches'
    | 'initial-raf'
    | 'late-raf'
    | 'late-raf-throw'
    | 'late-dispose'
    | 'reschedule'
    | 'dispose'
    | 'terminal-handled'
    | 'terminal-unhandled'
    | 'dispose-terminal-handled'
    | 'dispose-terminal-unhandled'
    | 'decode-target'
    | 'decode-duration'
    | 'decode-duration-type'
    | 'decode-id'
) => {
  const root = reentryRoot()
  root.style.cssText = 'position:fixed;left:0;top:0;width:1000px;height:600px'
  let editor: FlowEditor | undefined
  let mounted = true
  let armed = false
  let nested = false
  let sequence = 100
  const events: { name: string; payload: unknown }[] = []

  const native: {
    op: string
    handle?: number
    timestamp?: number
    deleted?: boolean
    throws?: string
    message?: string
  }[] = []

  const results: { name: string; value: unknown }[] = []
  const handlers: { message: string; info: string; identity: string }[] = []
  const failedDecodes: { message: string; identity: string }[] = []
  const direct: { message: string; identity: string }[] = []
  const states: unknown[] = []
  const rejections: string[] = []
  const pending = new Map<number, FrameRequestCallback>()
  const saved = new Map<number, FrameRequestCallback>()

  const cancelCause = new Error(
    mode.startsWith('dispose') || mode === 'dispose'
      ? 'dispose-cancel'
      : 'cancel-A'
  )

  const terminalCause = new Error('terminal-A')
  const mediaCause = new Error('media-B')

  const rafCause = new Error(
    (() => {
      if (mode === 'reschedule') {
        return 'raf-next'
      }

      if (mode.startsWith('late')) {
        return 'late-B'
      }

      return 'raf-B'
    })()
  )

  const identity = (cause: unknown) =>
    (() => {
      if (cause === cancelCause) {
        return 'resource'
      }

      if (cause === terminalCause) {
        return 'terminal'
      }

      if (cause === mediaCause) {
        return 'media'
      }

      if (cause === rafCause) {
        return 'raf'
      }

      return 'other'
    })()

  const errorRecord = (cause: unknown) => ({
    message: cause instanceof Error ? cause.message : String(cause),
    identity: identity(cause),
  })

  const record = <Payload>(name: string, payload: Payload) =>
    events.push({ name, payload: structuredClone(payload) })

  const recordSettlement = async (
    name: string,
    promise: Promise<unknown>
  ): Promise<void> => {
    try {
      results.push({ name, value: structuredClone(await promise) })
    } catch (error) {
      results.push({ name, value: errorRecord(error) })
    }
  }

  const track = (name: string, promise: Promise<unknown>): void => {
    void recordSettlement(name, promise)
  }

  const c = () => {
    if (!nested && editor !== undefined) {
      nested = true
      track(
        'C',
        editor.setViewport({ x: 80, y: 90, zoom: 1 }, { duration: 100 })
      )
    }
  }

  const app = createApp({
    render: () =>
      h(FlowCanvas, {
        nodesResizable: true,
        document: reentryDocument(),
        style: { margin: '0', width: '100%', maxWidth: 'none', border: '0' },
        onInit: (value) => {
          editor = value
        },
        onViewportStart: (value) => record('viewportStart', value),
        onMoveStart: (value) => record('moveStart', value),
        onViewportChange: (value) => record('viewportChange', value),
        onMove: (value) => record('move', value),
        onViewportEnd: (viewport, status) => {
          record('viewportEnd', { viewport, status })

          if (!armed) {
            return
          }

          if (mode === 'end-C') {
            c()
          }

          if (mode === 'end-dispose' && mounted) {
            mounted = false
            app.unmount()
          }

          if (mode.includes('terminal')) {
            throw terminalCause
          }
        },
        onMoveEnd: (viewport, status) =>
          record('moveEnd', { viewport, status }),
      }),
  })

  const unmount = () => {
    if (mounted) {
      mounted = false
      app.unmount()
    }
  }

  if (
    mode === 'dispose' ||
    mode === 'terminal-handled' ||
    mode === 'dispose-terminal-handled'
  ) {
    app.config.errorHandler = (cause, _instance, info) =>
      handlers.push({ ...errorRecord(cause), info })
  }

  const nativeFrame = globalThis.requestAnimationFrame
  const nativeCancel = globalThis.cancelAnimationFrame

  const mediaDescriptor = Object.getOwnPropertyDescriptor(
    globalThis,
    'matchMedia'
  )

  const rejectionListener = (event: PromiseRejectionEvent) => {
    rejections.push(String(event.reason))
    event.preventDefault()
  }

  globalThis.addEventListener('unhandledrejection', rejectionListener)

  try {
    app.mount(root)
    await nextTick()
    await mountedGeometry()

    if (editor === undefined) {
      throw new Error('Missing editor')
    }

    const capture = syntheticCaptures(root)
    const viewportElement = requiredElement(root, '.flow-vue-viewport')

    if (!(viewportElement instanceof HTMLElement)) {
      throw new TypeError('Missing viewport')
    }

    editor.subscribeState((value) => states.push(structuredClone(value)))
    globalThis.requestAnimationFrame = (deliverFrame) => {
      if (
        armed &&
        (mode === 'initial-raf' || mode === 'reschedule') &&
        sequence === 101
      ) {
        native.push({ op: 'request-throw', message: rafCause.message })
        throw rafCause
      }

      sequence += 1
      const handle = sequence
      pending.set(handle, deliverFrame)
      saved.set(handle, deliverFrame)

      if (armed && mode.startsWith('late') && handle === 102) {
        native.push({ op: 'request-enter', handle })

        if (mode === 'late-dispose') {
          unmount()
        } else {
          c()
        }

        native.push({ op: 'return-handle', handle })
      } else {
        native.push({ op: 'request', handle })
      }

      return handle
    }

    globalThis.cancelAnimationFrame = (handle) => {
      const failure =
        armed &&
        ((handle === 101 &&
          (mode === 'cancel' ||
            mode === 'retained' ||
            mode.startsWith('end-') ||
            mode.startsWith('cancel-') ||
            mode.startsWith('dispose') ||
            mode.startsWith('terminal-'))) ||
          (handle === 102 &&
            (mode === 'late-raf-throw' || mode === 'late-dispose')))

      const deleted = mode !== 'retained'

      if (deleted) {
        pending.delete(handle)
      }

      if (failure) {
        const cause = handle === 102 ? rafCause : cancelCause
        native.push({ op: 'cancel', handle, deleted, throws: cause.message })

        if (mode === 'cancel-C') {
          c()
        }

        if (mode === 'cancel-dispose') {
          unmount()
        }

        throw cause
      }

      native.push({ op: 'cancel', handle })
    }

    track('A', editor.setViewport({ x: 20, y: 30, zoom: 1 }, { duration: 100 }))
    armed = true

    if (mode.startsWith('media-')) {
      if (mode === 'media-get') {
        Object.defineProperty(globalThis, 'matchMedia', {
          configurable: true,
          get: () => {
            throw mediaCause
          },
        })
      } else if (mode === 'media-call') {
        Object.defineProperty(globalThis, 'matchMedia', {
          configurable: true,
          value: () => {
            throw mediaCause
          },
        })
      } else {
        Object.defineProperty(globalThis, 'matchMedia', {
          configurable: true,
          value: () => ({
            get matches() {
              throw mediaCause
            },
          }),
        })
      }
    }

    if (mode === 'decode-id') {
      try {
        editor.setViewport({ x: Number.NaN, y: 0, zoom: 1 })
      } catch (error) {
        failedDecodes.push(errorRecord(error))
      }

      try {
        editor.setViewport({ x: 50, y: 60, zoom: 1 }, { duration: -1 })
      } catch (error) {
        failedDecodes.push(errorRecord(error))
      }
    }

    let returnedB = false

    try {
      if (mode.startsWith('decode-') && mode !== 'decode-id') {
        if (mode === 'decode-target') {
          editor.setViewport({ x: Number.NaN, y: 0, zoom: 1 })
        } else if (mode === 'decode-duration') {
          editor.setViewport({ x: 50, y: 60, zoom: 1 }, { duration: -1 })
        } else {
          // eslint-disable-next-line anti-slop/no-reflect-apply -- The public runtime decoder is exercised from an explicitly untyped consumer.
          Reflect.apply(editor.setViewport, editor, [
            { x: 50, y: 60, zoom: 1 },
            { duration: 'bad' },
          ])
        }
      } else if (mode.startsWith('dispose') || mode === 'dispose') {
        unmount()
      } else if (mode === 'reschedule') {
        const deliverFrame = pending.get(101)
        pending.delete(101)
        native.push({ op: 'deliver', handle: 101, timestamp: 0 })
        deliverFrame?.(0)
      } else {
        const promise = editor.setViewport(
          { x: 50, y: 60, zoom: 1 },
          { duration: 100 }
        )

        returnedB = true
        track('B', promise)
      }
    } catch (error) {
      direct.push(errorRecord(error))
    }

    if (mediaDescriptor !== undefined) {
      Object.defineProperty(globalThis, 'matchMedia', mediaDescriptor)
    }

    if (mode === 'end-C' || mode === 'cancel-C') {
      for (const timestamp of [0, 100]) {
        // eslint-disable-next-line unicorn/no-useless-spread -- Replay only the captured frame batch; newly acquired frames belong to successors.
        for (const [handle, deliverFrame] of [...pending]) {
          pending.delete(handle)
          native.push({ op: 'deliver', handle, timestamp })
          deliverFrame(timestamp)
        }
      }
    }

    if (mode === 'retained') {
      const deliverFrame = pending.get(101)
      pending.delete(101)
      native.push({ op: 'deliver-retained', handle: 101, timestamp: 100 })
      deliverFrame?.(100)
    }

    await Promise.resolve()
    await Promise.resolve()
    await nextTick()

    const beforeDispose = {
      events: structuredClone(events),
      native: structuredClone(native),
      results: structuredClone(results),
      states: structuredClone(states),
      viewport: structuredClone(editor.getViewport()),
      dom: viewportElement.style.transform,
      pending: [...pending.keys()],
      connected: viewportElement.isConnected,
      direct: [...direct],
      handlers: [...handlers],
      returnedB,
    }

    if (mounted) {
      try {
        unmount()
      } catch (error) {
        direct.push(errorRecord(error))
      }
    }

    await Promise.resolve()
    await Promise.resolve()
    const barrier = new MessageChannel()
    const turn = Promise.withResolvers<null>()
    barrier.port1.addEventListener('message', () => turn.resolve(null), {
      once: true,
    })
    barrier.port1.start()
    barrier.port2.postMessage(null)
    await turn.promise
    barrier.port1.close()
    barrier.port2.close()

    return {
      failedDecodes,
      beforeDispose,
      events,
      native,
      results,
      states,
      direct,
      handlers,
      rejections,
      captures: capture.history,
      held: capture.count(),
      pending: [...pending.keys()],
      dom: viewportElement.style.transform,
      connected: viewportElement.isConnected,
    }
  } finally {
    armed = false
    globalThis.requestAnimationFrame = nativeFrame
    globalThis.cancelAnimationFrame = nativeCancel

    if (mediaDescriptor !== undefined) {
      Object.defineProperty(globalThis, 'matchMedia', mediaDescriptor)
    }

    globalThis.removeEventListener('unhandledrejection', rejectionListener)

    if (mounted) {
      unmount()
    }

    root.remove()
  }
}

export const ownershipRoundFiveViewport = async (
  route:
    | 'plain-pan'
    | 'request-during-pan'
    | 'plain-instant'
    | 'state-nested-animated'
    | 'nested-start'
    | 'nested-move'
    | 'nested-twice'
    | 'nested-throw'
    | 'plain-animation'
    | 'frame-change-throw'
    | 'frame-move-throw'
) => {
  const root = reentryRoot()
  root.style.cssText = 'position:fixed;left:0;top:0;width:1000px;height:600px'
  let editor: FlowEditor | undefined
  let armed = false
  let nested = false
  let sequence = 100
  const events: { name: string; payload: unknown }[] = []
  const states: unknown[] = []
  const frames: unknown[] = []
  const results: unknown[] = []
  const errors: unknown[] = []
  const rejected: unknown[] = []
  const checkpoints: unknown[] = []
  const pending = new Map<number, FrameRequestCallback>()
  const sentinel = new Error(`listener-${route}`)

  const errorRecord = (cause: unknown) => ({
    message: cause instanceof Error ? cause.message : String(cause),
    sameSentinel: cause === sentinel,
  })

  const record = <Payload>(name: string, payload: Payload) =>
    events.push({ name, payload: structuredClone(payload) })

  const nativeFrame = globalThis.requestAnimationFrame
  const nativeCancel = globalThis.cancelAnimationFrame
  let unsubscribe: (() => void) | undefined

  try {
    renderVue(
      h(FlowCanvas, {
        nodesResizable: true,
        document: reentryDocument(),
        documentMode: 'uncontrolled',
        viewportMode: 'uncontrolled',
        panOnDrag: true,
        style: { margin: '0', width: '100%', maxWidth: 'none', border: '0' },
        onInit: (value: FlowEditor) => {
          editor = value
        },
        onViewportStart: (value: ReturnType<FlowEditor['getViewport']>) => {
          record('viewportStart', value)

          if (armed && !nested && route === 'nested-start') {
            nested = true
            editor?.updateViewport({ x: 7, y: 9, zoom: 1 })
          }
        },
        onMoveStart: (value: ReturnType<FlowEditor['getViewport']>) =>
          record('moveStart', value),
        onViewportChange: (value: ReturnType<FlowEditor['getViewport']>) => {
          record('viewportChange', value)

          if (armed && route === 'frame-change-throw') {
            throw sentinel
          }
        },
        onMove: (value: ReturnType<FlowEditor['getViewport']>) => {
          record('move', value)

          if (armed && route === 'frame-move-throw') {
            throw sentinel
          }

          if (
            armed &&
            !nested &&
            ['nested-move', 'nested-twice', 'nested-throw'].includes(route)
          ) {
            nested = true
            editor?.updateViewport({ x: 7, y: 9, zoom: 1 })
            checkpoints.push(structuredClone(events))

            if (route === 'nested-throw') {
              throw sentinel
            }

            if (route === 'nested-twice') {
              editor?.updateViewport({ x: 11, y: 13, zoom: 1 })
              checkpoints.push(structuredClone(events))
            }
          }
        },
        onViewportEnd: (
          viewport: ReturnType<FlowEditor['getViewport']>,
          status: Awaited<ReturnType<FlowEditor['setViewport']>>['status']
        ) => record('viewportEnd', { viewport, status }),
        onMoveEnd: (
          viewport: ReturnType<FlowEditor['getViewport']>,
          status: Awaited<ReturnType<FlowEditor['setViewport']>>['status']
        ) => record('moveEnd', { viewport, status }),
      }),
      root
    )
    await nextTick()
    await mountedGeometry()

    if (editor === undefined) {
      throw new Error('Missing editor')
    }

    const active = editor
    const capture = syntheticCaptures(root)
    const viewportElement = requiredElement(root, '.flow-vue-viewport')

    if (!(viewportElement instanceof HTMLElement)) {
      throw new TypeError('Missing viewport element')
    }

    const observeResult = async (
      promise: ReturnType<FlowEditor['setViewport']>
    ): Promise<void> => {
      try {
        results.push(structuredClone(await promise))
      } catch (error) {
        rejected.push(errorRecord(error))
      }
    }

    unsubscribe = active.subscribeState((change) => {
      states.push(structuredClone(change))

      if (route === 'state-nested-animated' && !nested) {
        nested = true
        void observeResult(
          active.setViewport({ x: 80, y: 90, zoom: 1 }, { duration: 100 })
        )
      }
    })
    globalThis.requestAnimationFrame = (deliverFrame) => {
      sequence += 1
      const id = sequence
      pending.set(id, deliverFrame)
      frames.push({ action: 'request', id })

      return id
    }

    globalThis.cancelAnimationFrame = (id) => {
      pending.delete(id)
      frames.push({ action: 'cancel', id })
    }

    const snapshot = () => ({
      events: structuredClone(events),
      states: structuredClone(states),
      frames: structuredClone(frames),
      results: structuredClone(results),
      errors: structuredClone(errors),
      rejected: structuredClone(rejected),
      pending: [...pending.keys()],
      captures: structuredClone(capture.history),
      held: capture.count(),
      state: structuredClone(active.snapshot.value),
      transform: viewportElement.style.transform,
    })

    armed = true
    const pan = route === 'plain-pan' || route === 'request-during-pan'

    if (pan) {
      const canvas = requiredElement(root, '.flow-vue-canvas')
      dispatchPointer(canvas, 'pointerdown', { x: 600, y: 300 })

      if (route === 'request-during-pan') {
        observeResult(
          active.setViewport({ x: 7, y: 9, zoom: 1 }, { duration: 0 })
        )
      }
    } else if (route === 'plain-animation' || route.startsWith('frame-')) {
      void observeResult(
        active.setViewport({ x: 50, y: 60, zoom: 1 }, { duration: 100 })
      )
    } else {
      try {
        active.updateViewport(
          route === 'plain-instant' || route === 'state-nested-animated'
            ? { x: 7, y: 9, zoom: 1 }
            : { x: 20, y: 30, zoom: 1 }
        )
      } catch (error) {
        errors.push(errorRecord(error))
      }
    }

    await nextTick()
    const afterCall = snapshot()

    if (pan) {
      dispatchPointer(requiredElement(root, '.flow-vue-canvas'), 'pointerup', {
        x: 620,
        y: 310,
      })
    }

    const deliverFrames = (time: number): void => {
      const deliveries = [...pending]

      for (const [id, deliverFrame] of deliveries) {
        pending.delete(id)
        frames.push({ action: 'deliver', id, time })

        try {
          deliverFrame(time)
        } catch (error) {
          errors.push(errorRecord(error))
        }
      }
    }

    deliverFrames(0)
    await Promise.resolve()
    deliverFrames(100)
    await Promise.resolve()
    await nextTick()
    const afterWork = snapshot()
    armed = false
    renderVue(null, root)
    await nextTick()
    await Promise.resolve()

    return {
      afterCall,
      afterWork,
      afterDispose: snapshot(),
      checkpoints,
      connected: viewportElement.isConnected,
    }
  } finally {
    armed = false
    unsubscribe?.()
    globalThis.requestAnimationFrame = nativeFrame
    globalThis.cancelAnimationFrame = nativeCancel
    renderVue(null, root)
    root.remove()
  }
}

export const ownershipRoundFiveConnection = async (
  residence: 'physical' | 'retained'
) => {
  const root = reentryRoot()
  root.style.cssText = 'width:1000px;height:600px;position:fixed;left:0;top:0'
  let editor: FlowEditor | undefined
  let nested = false
  const events: { name: string; payload: unknown }[] = []
  const lifecycle: { name: string; payload: unknown }[] = []
  const states: unknown[] = []

  const record = <Payload>(name: string, payload: Payload) =>
    events.push({ name, payload: structuredClone(payload) })

  const recordLifecycle = <Payload>(name: string, payload: Payload) =>
    lifecycle.push({ name, payload: structuredClone(payload) })

  try {
    renderVue(
      h(FlowCanvas, {
        nodesResizable: true,
        document: reentryDocument(),
        documentMode: 'uncontrolled',
        viewportMode: 'uncontrolled',
        connectionDragThreshold: 0,
        connectOnClick: true,
        autoPanOnConnect: true,
        style: { margin: '0', width: '100%', maxWidth: 'none', border: '0' },
        onInit: (value: FlowEditor) => {
          editor = value
        },
        onViewportStart: (value) => record('viewportStart', value),
        onMoveStart: (value) => record('moveStart', value),
        onViewportChange: (value) => record('viewportChange', value),
        onMove: (value) => {
          record('move', value)

          if (!nested) {
            nested = true
            editor?.updateViewport({ x: 7, y: 9, zoom: 1 })
          }
        },
        onViewportEnd: (viewport, status) =>
          record('viewportEnd', { viewport, status }),
        onMoveEnd: (viewport, status) =>
          record('moveEnd', { viewport, status }),
        onConnectStart: (value) => recordLifecycle('connectStart', value),
        onConnectEnd: (value) => recordLifecycle('connectEnd', value),
        onClickConnectStart: (value) =>
          recordLifecycle('clickConnectStart', value),
        onClickConnectEnd: (value) => recordLifecycle('clickConnectEnd', value),
      }),
      root
    )
    await nextTick()
    await mountedGeometry()

    if (editor === undefined) {
      throw new Error('Missing editor')
    }

    const active = editor
    active.subscribeState((change) => states.push(structuredClone(change)))
    const capture = syntheticCaptures(root)
    const canvas = requiredElement(root, '.flow-vue-canvas')

    const handle = requiredElement(
      root,
      '[data-node-id="a"] [data-handle-id="out"]'
    )

    const point = continuationReentryPoint(handle)
    dispatchPointer(handle, 'pointerdown', point)

    if (residence === 'retained') {
      dispatchPointer(handle, 'pointerup', point)
    }

    const bounds = canvas.getBoundingClientRect()
    dispatchPointer(canvas, 'pointermove', {
      x: bounds.right - 1,
      y: bounds.top + bounds.height / 2,
    })
    await nextTick()

    const snapshot = () => ({
      events: structuredClone(events),
      lifecycle: structuredClone(lifecycle),
      states: structuredClone(states),
      state: structuredClone(active.snapshot.value),
      captures: structuredClone(capture.history),
      held: capture.count(),
    })

    const beforeCancel = snapshot()
    root.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
    )
    await nextTick()
    const afterCancel = snapshot()
    renderVue(null, root)
    await nextTick()

    return { beforeCancel, afterCancel, afterDispose: snapshot() }
  } finally {
    renderVue(null, root)
    root.remove()
  }
}

export const externalNestedViewportProof = async (switchMode: boolean) => {
  const root = reentryRoot()
  let editor: FlowEditor | undefined
  let viewport = { x: 0, y: 0, zoom: 1 }
  let nested = false
  let viewportMode: 'controlled' | 'uncontrolled' = 'controlled'
  const events: { name: string; payload: unknown }[] = []
  const checkpoints: (typeof events)[] = []

  const record = <Payload>(name: string, payload: Payload) =>
    events.push({ name, payload: structuredClone(payload) })

  const draw = () =>
    renderVue(
      h(FlowCanvas, {
        nodesResizable: true,
        document: reentryDocument(),
        viewport,
        viewportMode,
        onInit: (value) => {
          editor = value
        },
        onViewportStart: (value) => record('viewportStart', value),
        onMoveStart: (value) => record('moveStart', value),
        onViewportChange: (value) => record('viewportChange', value),
        onMove: (value) => {
          record('move', value)

          if (!nested) {
            nested = true
            editor?.updateViewport({ x: 7, y: 9, zoom: 1 })
            checkpoints.push(structuredClone(events))
          }
        },
        'onUpdate:viewport': (value) => {
          record('update:viewport', value)

          if (switchMode) {
            viewportMode = 'uncontrolled'
            draw()
          }
        },
        onViewportEnd: (value, status) =>
          record('viewportEnd', { viewport: value, status }),
        onMoveEnd: (value, status) =>
          record('moveEnd', { viewport: value, status }),
      }),
      root
    )

  draw()
  await nextTick()
  await mountedGeometry()

  if (editor === undefined) {
    throw new Error('Missing editor')
  }

  const capture = syntheticCaptures(root)

  try {
    viewport = { x: 1, y: 0, zoom: 1 }
    draw()

    const beforeDispose = {
      events: structuredClone(events),
      checkpoints,
      state: structuredClone(editor.snapshot.value),
      captures: structuredClone(capture.history),
      held: capture.count(),
    }

    renderVue(null, root)

    return { beforeDispose, afterDispose: structuredClone(events) }
  } finally {
    renderVue(null, root)
    root.remove()
  }
}

import { Effect } from 'effect'
import {
  createApp,
  h,
  nextTick,
  onBeforeUnmount,
  render as renderVue,
  watch,
} from 'vue'

import {
  actorInput,
  dispatchPointer,
  mountedGeometry,
  reentryDocument,
  reentryRoot,
  requiredElement,
  syntheticCaptures,
} from '../../../../apps/shared-e2e/node-reentry-fixture.ts'
import { decodeFlowDocument } from '../../../core/src/public.ts'
import type { FlowChange } from '../../../core/src/public.ts'
import { FlowCanvas } from '../../src/public.ts'
import type { FlowEditor } from '../../src/public.ts'

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

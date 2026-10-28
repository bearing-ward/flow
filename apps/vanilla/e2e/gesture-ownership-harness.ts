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
import { createFlow } from '../src/mount-flow.ts'

const previewFanoutProofPoint = (element: Element) => {
  const rect = element.getBoundingClientRect()

  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 }
}

export const terminalDispatchReentry = async (
  actor: 'node' | 'connection' | 'reconnection',
  threshold: number,
  terminal: 'pointerup' | 'pointercancel'
) => {
  const root = reentryRoot()
  const events: { name: string; payload: unknown }[] = []
  const changes: FlowChange[] = []
  let started = false

  const controller = await createFlow(root, reentryDocument(), {
    documentMode: 'uncontrolled',
    nodesResizable: true,
    nodeDragThreshold: 0,
    connectionDragThreshold: threshold,
    selectNodesOnDrag: false,
    viewport: {
      mode: 'uncontrolled',
      initial: { x: 0, y: 0, zoom: 1 },
      limits: { minZoom: 0.25, maxZoom: 4 },
    },
    onNodeDragStart: (payload) => events.push({ name: 'nodeStart', payload }),
    onNodeDragStop: (payload) => {
      events.push({ name: 'nodeStop', payload })

      if (!started) {
        started = true
        actorInput(root, 'vanilla', actor).down()
      }
    },
    onConnectStart: (payload) => events.push({ name: 'connectStart', payload }),
    onConnect: (payload) => events.push({ name: 'connect', payload }),
    onConnectEnd: (payload) => events.push({ name: 'connectEnd', payload }),
    onReconnectStart: (payload) =>
      events.push({ name: 'reconnectStart', payload }),
    onReconnect: (payload) => events.push({ name: 'reconnect', payload }),
    onReconnectEnd: (payload) => events.push({ name: 'reconnectEnd', payload }),
  })

  controller.subscribe((change) => changes.push(change))
  await mountedGeometry()
  const capture = syntheticCaptures(root)

  const terminalDispatchReentrySnapshot = () => ({
    events: structuredClone(events),
    changes: structuredClone(changes),
    held: capture.count(),
    captures: [...capture.attempts],
    captureHistory: [...capture.history],
    document: controller.getSnapshot().document,
    preview: controller.getConnectionPreview(),
  })

  try {
    const a = requiredElement(root, '.flow-node[data-node-id="a"]')
    dispatchPointer(a, 'pointerdown')
    dispatchPointer(a, terminal)
    const afterA = terminalDispatchReentrySnapshot()
    actorInput(root, 'vanilla', actor).finish()

    return { afterA, final: terminalDispatchReentrySnapshot() }
  } finally {
    started = true
    await controller.destroyAsync()
    root.remove()
  }
}

export const escapeDispatchProof = async (
  mode: 'ordinary' | 'nested' | 'redispatch' | 'outside' | 'loss'
) => {
  const root = reentryRoot()
  const events: { name: string; payload: unknown }[] = []
  const propagation: string[] = []
  let stopped = 0

  const node = (id: string) =>
    requiredElement(root, `.flow-node[data-node-id="${id}"]`)

  const canvasBubble = () => propagation.push('canvas')
  const windowBubble = () => propagation.push('window')

  const controller = await createFlow(root, reentryDocument(), {
    documentMode: 'uncontrolled',
    nodesResizable: true,
    viewport: {
      mode: 'uncontrolled',
      initial: { x: 0, y: 0, zoom: 1 },
      limits: { minZoom: 0.25, maxZoom: 4 },
    },
    nodeDragThreshold: 0,
    selectNodesOnDrag: false,
    onNodeDragStart: (payload) => events.push({ name: 'start', payload }),
    onNodeDragStop: (payload) => {
      events.push({ name: 'stop', payload })
      stopped += 1

      if (stopped < 3) {
        dispatchPointer(node(stopped === 1 ? 'b' : 'c'), 'pointerdown')

        if (mode === 'nested' && stopped === 1) {
          node('b').dispatchEvent(
            new KeyboardEvent('keydown', {
              key: 'Escape',
              bubbles: true,
              cancelable: true,
            })
          )
        }
      }
    },
  })

  await mountedGeometry()
  const capture = syntheticCaptures(root)
  const canvas = requiredElement(root, '[data-testid="flow-canvas"]')
  canvas.addEventListener('keydown', canvasBubble)
  window.addEventListener('keydown', windowBubble)

  const escape = new KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
    cancelable: true,
  })

  const escapeDispatchProofSnapshot = () => ({
    events: structuredClone(events),
    captures: [...capture.attempts],
    captureHistory: [...capture.history],
    document: controller.getSnapshot().document,
    held: capture.count(),
    propagation: [...propagation],
  })

  try {
    dispatchPointer(node('a'), 'pointerdown')
    dispatchPointer(node('b'), 'pointerdown')
    const competing = escapeDispatchProofSnapshot()

    if (mode === 'outside') {
      window.dispatchEvent(escape)
    } else {
      node('a').dispatchEvent(escape)
    }

    const afterA = escapeDispatchProofSnapshot()

    if (mode === 'redispatch') {
      node('b').dispatchEvent(escape)
    } else if (mode === 'loss') {
      dispatchPointer(node('a'), 'lostpointercapture')
      dispatchPointer(node('b'), 'lostpointercapture')
      dispatchPointer(node('b'), 'lostpointercapture', { x: 40, y: 40 })
    }

    const afterContinuation = escapeDispatchProofSnapshot()
    const current = mode === 'nested' || mode === 'redispatch' ? 'c' : 'b'
    dispatchPointer(node(current), 'pointerup', { x: 52, y: 40 })

    return {
      competing,
      afterA,
      afterContinuation,
      final: escapeDispatchProofSnapshot(),
      prevented: escape.defaultPrevented,
    }
  } finally {
    stopped = 3
    window.removeEventListener('keydown', windowBubble)
    await controller.destroyAsync()
    root.remove()
  }
}

export const previewFanoutProof = async () => {
  const root = reentryRoot()
  const events: { name: string; payload: unknown }[] = []
  const elements = new Map<Element, number>()
  let armed = false
  let nextElement = 0

  const controller = await createFlow(root, reentryDocument(), {
    documentMode: 'uncontrolled',
    nodesResizable: true,
    viewport: {
      mode: 'uncontrolled',
      initial: { x: 0, y: 0, zoom: 1 },
      limits: { minZoom: 0.25, maxZoom: 4 },
    },
    connectionDragThreshold: 0,
    connectOnClick: false,
    autoPanOnConnect: false,
    connectionPreview: (value, element) => {
      if (!elements.has(element)) {
        nextElement += 1
        elements.set(element, nextElement)
      }

      events.push({
        name: 'renderer',
        payload: {
          value,
          element: elements.get(element),
          connected: element.isConnected,
        },
      })
    },
    onConnectStart: (payload) => events.push({ name: 'start', payload }),
    onConnectEnd: (payload) => events.push({ name: 'end', payload }),
  })

  await mountedGeometry()
  const capture = syntheticCaptures(root)

  const a = requiredElement(
    root,
    '.flow-node[data-node-id="a"] .flow-handle[data-handle-id="out"]'
  )

  const b = requiredElement(
    root,
    '.flow-node[data-node-id="b"] .flow-handle[data-handle-id="out"]'
  )

  const first = controller.subscribeConnectionPreview((value) => {
    events.push({ name: 'first', payload: value })

    if (value === null && armed) {
      armed = false
      dispatchPointer(b, 'pointerdown', previewFanoutProofPoint(b))
    }
  })

  const second = controller.subscribeConnectionPreview((value) =>
    events.push({ name: 'second', payload: value })
  )

  try {
    dispatchPointer(a, 'pointerdown', previewFanoutProofPoint(a))
    events.length = 0
    armed = true
    dispatchPointer(a, 'pointercancel', previewFanoutProofPoint(a))

    const result = {
      events: structuredClone(events),
      captures: [...capture.attempts],
      held: capture.count(),
      preview: controller.getConnectionPreview(),
      previewElements: [...elements].map(([element, id]) => ({
        id,
        connected: element.isConnected,
      })),
    }

    return result
  } finally {
    armed = false
    first()
    second()
    await controller.destroyAsync()
    root.remove()
  }
}

const observationPointer = (
  canvas: Element,
  type: string,
  id: number,
  x: number,
  y: number,
  touch = false
) =>
  canvas.dispatchEvent(
    new PointerEvent(type, {
      pointerId: id,
      pointerType: touch ? 'touch' : 'mouse',
      bubbles: true,
      button: 0,
      buttons: type === 'pointerup' ? 0 : 1,
      clientX: x,
      clientY: y,
    })
  )

export const aggregateEntryProof = async (
  actor: 'keyboard-node' | 'keyboard-resize' | 'retained' | 'touch',
  terminal: 'escape' | 'blur'
) => {
  const root = reentryRoot()
  const events: { name: string; payload: unknown }[] = []
  let replacement = false
  // eslint-disable-next-line prefer-const -- Callback closures are installed before capture instrumentation after mount.
  let capture: ReturnType<typeof syntheticCaptures> | undefined

  const record = <Payload>(name: string, payload: Payload) =>
    events.push({ name, payload: structuredClone(payload) })

  const enterB = () => {
    if (replacement) {
      return
    }

    replacement = true

    if (actor === 'touch') {
      observationPointer(
        requiredElement(root, '.flow-canvas'),
        'pointerdown',
        7,
        650,
        350,
        true
      )
    } else {
      dispatchPointer(
        requiredElement(root, '.flow-node[data-node-id="a"]'),
        'pointerdown',
        { x: 40, y: 40 }
      )
    }
  }

  const controller = await createFlow(root, reentryDocument(), {
    documentMode: 'uncontrolled',
    nodesResizable: true,
    nodeDragThreshold: 0,
    connectionDragThreshold: 5,
    connectOnClick: true,
    panOnDrag: true,
    selectNodesOnDrag: false,
    viewport: {
      mode: 'uncontrolled',
      initial: { x: 0, y: 0, zoom: 1 },
      limits: { minZoom: 0.25, maxZoom: 4 },
    },
    onNodeDragStart: (value) => record('nodeStart', value),
    onNodeDrag: (value) => record('nodeMove', value),
    onNodeDragStop: (value) => {
      record('nodeStop', value)

      if (actor === 'keyboard-node') {
        enterB()
      }
    },
    onConnectStart: (value) => record('connectStart', value),
    onConnectEnd: (value) => {
      record('connectEnd', value)

      if (actor === 'retained') {
        enterB()
      }
    },
    onMoveStart: (value) => record('moveStart', value),
    onMoveEnd: (value) => {
      record('moveEnd', value)

      if (actor === 'touch') {
        enterB()
      }
    },
  })

  controller.subscribe((value) => record('change', value))
  await mountedGeometry()
  capture = syntheticCaptures(root)
  const canvas = requiredElement(root, '.flow-canvas')

  try {
    if (actor === 'retained') {
      requiredElement(
        root,
        '[data-node-id="a"] [data-handle-id="out"]'
      ).dispatchEvent(new MouseEvent('click', { bubbles: true }))
    } else if (actor === 'touch') {
      observationPointer(canvas, 'pointerdown', 7, 650, 350, true)
    } else {
      const element =
        actor === 'keyboard-node'
          ? requiredElement(root, '.flow-node[data-node-id="b"]')
          : requiredElement(
              root,
              '[data-testid="flow-node-resize-handle"][data-direction="right"]'
            )

      element.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })
      )
    }

    const before = { events: structuredClone(events), held: capture.count() }

    if (terminal === 'escape') {
      canvas.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })
      )
    } else {
      window.dispatchEvent(new Event('blur'))
    }

    if (actor === 'keyboard-resize') {
      enterB()
    }

    const after = {
      events: structuredClone(events),
      captures: [...capture.history],
      held: capture.count(),
      document: controller.getSnapshot().document,
      connecting: requiredElement(
        root,
        '[data-node-id="a"] [data-handle-id="out"]'
      ).classList.contains('connecting'),
    }

    window.dispatchEvent(
      new KeyboardEvent('keyup', { key: 'ArrowRight', bubbles: true })
    )
    const a = requiredElement(root, '.flow-node[data-node-id="a"]')

    if (actor === 'touch') {
      observationPointer(canvas, 'pointerdown', 8, 750, 350, true)
      observationPointer(canvas, 'pointermove', 8, 850, 350, true)
      observationPointer(canvas, 'pointerup', 8, 850, 350, true)
    } else {
      dispatchPointer(a, 'pointermove', { x: 52, y: 40 })
      dispatchPointer(a, 'pointerup', { x: 52, y: 40 })
    }

    return {
      before,
      after,
      events,
      captures: capture.history,
      held: capture.count(),
      document: controller.getSnapshot().document,
    }
  } finally {
    replacement = true
    await controller.destroyAsync()
    root.remove()
  }
}

export const frozenFrameProof = async (
  actor: 'connection' | 'selection' | 'node'
) => {
  const root = reentryRoot()
  root.style.cssText = 'position:fixed;left:0;top:0;width:1000px;height:600px'
  const events: { name: string; payload: unknown }[] = []
  let replacement = false

  const target = (which: 'a' | 'b') => {
    if (actor === 'selection') {
      return requiredElement(root, '.flow-canvas')
    }

    if (actor === 'node') {
      return requiredElement(root, `.flow-node[data-node-id="${which}"]`)
    }

    return requiredElement(
      root,
      `[data-node-id="${which}"] [data-handle-id="out"]`
    )
  }

  const send = (element: Element, kind: string, id: number, x: number) =>
    element.dispatchEvent(
      new PointerEvent(kind, {
        pointerId: id,
        clientX: x,
        clientY: 200,
        bubbles: true,
        button: 0,
        buttons: kind === 'pointerup' ? 0 : 1,
        shiftKey: actor === 'selection',
      })
    )

  const record = <Payload>(name: string, payload: Payload) =>
    events.push({ name, payload: structuredClone(payload) })

  const replace = () => {
    if (replacement) {
      return
    }

    replacement = true
    send(target('b'), 'pointerdown', 8, 700)
    send(target('b'), 'pointermove', 8, 995)
  }

  const controller = await createFlow(root, reentryDocument(), {
    documentMode: 'uncontrolled',
    nodesResizable: true,
    nodeDragThreshold: 0,
    connectionDragThreshold: 0,
    autoPanOnConnect: true,
    selectNodesOnDrag: actor === 'selection',
    viewport: {
      mode: 'uncontrolled',
      initial: { x: 0, y: 0, zoom: 1 },
      limits: { minZoom: 0.25, maxZoom: 4 },
    },
    onConnectStart: (value) => record('connectStart', value),
    onConnectEnd: (value) => {
      record('connectEnd', value)

      if (actor === 'connection') {
        replace()
      }
    },
    onSelectionStart: (value) => record('selectionStart', value),
    onSelectionEnd: (value) => {
      record('selectionEnd', value)

      if (actor === 'selection') {
        replace()
      }
    },
    onNodeDragStart: (value) => record('nodeStart', value),
    onNodeDrag: (value) => record('nodeMove', value),
    onNodeDragStop: (value) => {
      record('nodeStop', value)

      if (actor === 'node') {
        replace()
      }
    },
  })

  await mountedGeometry()
  const capture = syntheticCaptures(root)
  const nativeFrame = window.requestAnimationFrame
  const nativeCancel = window.cancelAnimationFrame
  const pending = new Map<number, FrameRequestCallback>()
  const history: { action: string; id: number }[] = []
  let id = 100
  window.requestAnimationFrame = (deliver) => {
    id += 1
    pending.set(id, deliver)
    history.push({ action: 'request', id })

    return id
  }

  window.cancelAnimationFrame = (handle) => {
    pending.delete(handle)
    history.push({ action: 'cancel', id: handle })
  }

  const snapshot = () => ({
    events: structuredClone(events),
    frames: [...pending.keys()],
    history: [...history],
    captures: [...capture.history],
    held: capture.count(),
    preview: controller.getConnectionPreview(),
    viewport: controller.getSnapshot().viewport,
  })

  try {
    send(target('a'), 'pointerdown', 7, 650)
    send(target('a'), 'pointermove', 7, 995)
    const oldFrames = [...pending.values()]
    send(target('a'), 'pointercancel', 7, 995)
    const before = snapshot()

    for (const deliver of oldFrames) {
      deliver(100)
    }

    return { oldFrameCount: oldFrames.length, before, after: snapshot() }
  } finally {
    replacement = true
    await controller.destroyAsync()
    window.requestAnimationFrame = nativeFrame
    window.cancelAnimationFrame = nativeCancel
    root.remove()
  }
}

export const suppressionTimerProof = async () => {
  const root = reentryRoot()
  const input = reentryDocument()

  const documentState = {
    ...input,
    nodes: input.nodes.map((node) => ({ ...node, selected: false })),
  }

  const events: { name: string; payload: unknown }[] = []

  const record = <Payload>(name: string, payload: Payload) =>
    events.push({ name, payload: structuredClone(payload) })

  let replaced = false

  const controller = await createFlow(root, documentState, {
    documentMode: 'uncontrolled',
    nodesResizable: true,
    nodeDragThreshold: 0,
    selectNodesOnDrag: false,
    viewport: {
      mode: 'uncontrolled',
      initial: { x: 0, y: 0, zoom: 1 },
      limits: { minZoom: 0.25, maxZoom: 4 },
    },
    onNodeDragStop: (value) => {
      record('nodeStop', value)

      if (!replaced) {
        replaced = true
        dispatchPointer(
          requiredElement(root, '.flow-node[data-node-id="b"]'),
          'pointerdown',
          { x: 240, y: 40 }
        )
      }
    },
    onNodeClick: (value) => record('nodeClick', value),
  })

  controller.subscribe((value) => record('change', value))
  await mountedGeometry()
  const capture = syntheticCaptures(root)
  const original = window.setTimeout
  const timers: (() => void)[] = []

  const interceptTimeout = (
    handler: TimerHandler,
    delay?: number,
    ...args: unknown[]
  ): number => {
    // eslint-disable-next-line anti-slop/no-runtime-typeof -- TimerHandler is the browser boundary's string-or-callable union; only callable timers can be replayed.
    if (delay !== 0 || typeof handler !== 'function') {
      return original(handler, delay, ...args)
    }

    timers.push(() => handler(...args))

    return 1000 + timers.length
  }

  Object.defineProperty(window, 'setTimeout', {
    configurable: true,
    writable: true,
    value: interceptTimeout,
  })

  const b = requiredElement(root, '.flow-node[data-node-id="b"]')
  const clicks: string[] = []
  const parent = () => clicks.push('parent')
  const outer = () => clicks.push('window')
  b.addEventListener('click', () => clicks.push('node'))
  root.addEventListener('click', parent)
  window.addEventListener('click', outer)

  try {
    const a = requiredElement(root, '.flow-node[data-node-id="a"]')
    dispatchPointer(a, 'pointerdown', { x: 40, y: 40 })
    // Pinned packages/react/src/components/NodeWrapper/index.tsx:109 permits stationary clicks. Move to own a drag suppression receipt.
    dispatchPointer(a, 'pointermove', { x: 41, y: 40 })
    dispatchPointer(a, 'pointerup', { x: 40, y: 40 })
    const [oldTimer] = timers

    if (oldTimer === undefined) {
      throw new Error('Missing A reset timer')
    }

    dispatchPointer(b, 'pointermove', { x: 241, y: 40 })
    dispatchPointer(b, 'pointerup', { x: 240, y: 40 })
    oldTimer()
    b.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    const first = {
      events: structuredClone(events),
      clicks: [...clicks],
      document: controller.getSnapshot().document,
    }

    b.dispatchEvent(new MouseEvent('click', { bubbles: true }))

    return {
      first,
      events,
      clicks,
      captures: capture.history,
      held: capture.count(),
      document: controller.getSnapshot().document,
      timerCount: timers.length,
    }
  } finally {
    window.setTimeout = original
    window.removeEventListener('click', outer)
    await controller.destroyAsync()
    root.remove()
  }
}

export const matchingLossProof = async () => {
  const root = reentryRoot()
  const events: { name: string; payload: unknown }[] = []
  let replaced = false

  const record = <Payload>(name: string, payload: Payload) =>
    events.push({ name, payload: structuredClone(payload) })

  const controller = await createFlow(root, reentryDocument(), {
    documentMode: 'uncontrolled',
    nodesResizable: true,
    nodeDragThreshold: 0,
    selectNodesOnDrag: false,
    viewport: {
      mode: 'uncontrolled',
      initial: { x: 0, y: 0, zoom: 1 },
      limits: { minZoom: 0.25, maxZoom: 4 },
    },
    onNodeDragStart: (value) => record('start', value),
    onNodeDragStop: (value) => {
      record('stop', value)

      if (!replaced) {
        replaced = true
        dispatchPointer(
          requiredElement(root, '.flow-node[data-node-id="b"]'),
          'pointerdown'
        )
      }
    },
  })

  controller.subscribe((value) => record('change', value))
  await mountedGeometry()
  const capture = syntheticCaptures(root)
  const a = requiredElement(root, '.flow-node[data-node-id="a"]')
  const b = requiredElement(root, '.flow-node[data-node-id="b"]')

  const snapshot = () => ({
    events: structuredClone(events),
    captures: [...capture.history],
    held: capture.count(),
    document: controller.getSnapshot().document,
  })

  try {
    dispatchPointer(a, 'pointerdown')
    const before = snapshot()
    a.dispatchEvent(
      new PointerEvent('lostpointercapture', { bubbles: true, pointerId: 99 })
    )
    const wrong = snapshot()
    a.releasePointerCapture(7)
    dispatchPointer(a, 'lostpointercapture')
    const afterLoss = snapshot()
    dispatchPointer(a, 'lostpointercapture')
    dispatchPointer(b, 'lostpointercapture')
    const stale = snapshot()
    dispatchPointer(b, 'pointerup', { x: 52, y: 40 })

    return { before, wrong, afterLoss, stale, final: snapshot() }
  } finally {
    replaced = true
    await controller.destroyAsync()
    root.remove()
  }
}

export const continuationRoundFourNode = async (
  route: 'frame' | 'dispose' | 'combined' | 'combined-pending'
) => {
  const root = reentryRoot()
  root.style.cssText = 'position:fixed;left:0;top:0;width:1000px;height:600px'
  const events: { name: string; payload: unknown }[] = []
  const publications: { name: string; payload: unknown }[] = []
  const frames: { action: string; id: number }[] = []
  const pending = new Map<number, FrameRequestCallback>()
  let armed = false
  let entered = false
  let started = false
  let sequence = 100

  const record = <Payload>(name: string, payload: Payload) =>
    events.push({ name, payload: structuredClone(payload) })

  const send = (id: string, type: string, pointerId: number, clientX: number) =>
    requiredElement(root, `.flow-node[data-node-id="${id}"]`).dispatchEvent(
      new PointerEvent(type, {
        bubbles: true,
        button: 0,
        buttons: type === 'pointerup' ? 0 : 1,
        pointerId,
        clientX,
        clientY: 200,
      })
    )

  const toolbarNodes = Object.fromEntries(
    ['a', 'b', 'c'].map((id) => [id, globalThis.document.createElement('div')])
  )

  const toolbarEdge = globalThis.document.createElement('div')

  let toolbarAnchors:
    | Parameters<
        NonNullable<Parameters<typeof createFlow>[2]['onToolbarAnchors']>
      >[0]
    | null = null

  const input = reentryDocument()
  const configured = route === 'combined-pending'

  const controller = await createFlow(
    root,
    configured
      ? {
          ...input,
          edges: input.edges.map((edge) => ({ ...edge, label: 'edge-label' })),
        }
      : input,
    {
      ui: configured ? { minimap: true } : undefined,
      toolbarContainers: configured
        ? { nodes: toolbarNodes, edges: { edge: toolbarEdge } }
        : undefined,
      onToolbarAnchors: (value) => {
        toolbarAnchors = structuredClone(value)
      },
      documentMode: 'uncontrolled',
      nodesResizable: true,
      nodeDragThreshold: route === 'combined-pending' ? 8 : 0,
      connectionDragThreshold: 0,
      connectOnClick: true,
      selectNodesOnDrag: false,
      viewport: {
        mode: 'uncontrolled',
        initial: { x: 0, y: 0, zoom: 1 },
        limits: { minZoom: 0.25, maxZoom: 4 },
      },
      onNodeDragStart: (value) => record('nodeStart', value),
      onNodeDrag: (value) => record('nodeMove', value),
      onNodeDragStop: (value) => {
        record('nodeStop', value)

        if (route === 'frame' && entered && !started) {
          started = true
          send('b', 'pointerdown', 8, 600)
          send('b', 'pointermove', 8, 610)
        }
      },
      onMove: (value) => {
        record('move', value)

        if (armed && !entered && !route.startsWith('combined')) {
          entered = true

          if (route === 'dispose') {
            controller.destroy()
          } else {
            send('a', 'pointercancel', 7, 995)
          }
        }
      },
      onConnectStart: (value) => record('connectStart', value),
      onConnectEnd: (value) => record('connectEnd', value),
    }
  )

  await mountedGeometry()

  if (configured) {
    for (const node of root.querySelectorAll<HTMLElement>('.flow-node')) {
      node.style.border = '0'
      node.style.padding = '0'
      node.style.margin = '0'
      node.style.boxSizing = 'border-box'

      for (const handle of node.querySelectorAll<HTMLElement>('.flow-handle')) {
        handle.style.cssText = `box-sizing:border-box;width:11px;height:11px;margin:0;top:17px;transform:none;right:auto;bottom:auto;left:${handle.dataset.handleId === 'out' ? 138 : 1}px`
      }
    }

    await controller.updateNodeInternals(['a', 'b', 'c'])
    controller.subscribe((change) =>
      publications.push({ name: 'change', payload: structuredClone(change) })
    )
    controller.subscribeState((change) =>
      publications.push({ name: 'state', payload: structuredClone(change) })
    )
  }

  const capture = syntheticCaptures(root)
  const a = requiredElement(root, '.flow-node[data-node-id="a"]')
  const b = requiredElement(root, '.flow-node[data-node-id="b"]')

  if (!(a instanceof HTMLElement && b instanceof HTMLElement)) {
    throw new TypeError('Missing nodes')
  }

  const nativeFrame = globalThis.requestAnimationFrame
  const nativeCancel = globalThis.cancelAnimationFrame

  const snapshot = () => ({
    publications: structuredClone(publications),
    pixels: configured
      ? {
          anchors: structuredClone(toolbarAnchors),
          toolbars: [
            ...Object.entries(toolbarNodes),
            ['edge', toolbarEdge] as const,
          ].map(([id, element]) => ({
            id,
            transform: element.style.transform,
            hidden: element.hidden,
          })),
          minimap: [
            ...root.querySelectorAll<SVGElement>(
              '.flow-minimap-node, .flow-minimap-viewport'
            ),
          ].map((element) => ({
            nodeId: element.dataset.nodeId ?? null,
            x: Number(element.getAttribute('x')),
            y: Number(element.getAttribute('y')),
            width: Number(element.getAttribute('width')),
            height: Number(element.getAttribute('height')),
          })),
          path:
            root.querySelector('.flow-edge-path')?.getAttribute('d') ?? null,
          endpoints: [
            ...root.querySelectorAll<SVGElement>('.flow-edge-reconnect-anchor'),
          ].map((element) => ({
            endpoint: element.dataset.endpoint,
            x: element.getAttribute('cx'),
            y: element.getAttribute('cy'),
          })),
          label: (() => {
            const element = root.querySelector('.flow-edge-label')

            return {
              text: element?.textContent ?? null,
              x: element?.getAttribute('x') ?? null,
              y: element?.getAttribute('y') ?? null,
            }
          })(),
          previewCount: root.querySelectorAll('.flow-connection-preview')
            .length,
        }
      : null,
    events: structuredClone(events),
    frames: structuredClone(frames),
    pending: [...pending.keys()],
    captures: structuredClone(capture.history),
    held: capture.count(),
    a: {
      transform: a.style.transform,
      dragging: a.classList.contains('dragging'),
      connected: a.isConnected,
    },
    b: {
      transform: b.style.transform,
      dragging: b.classList.contains('dragging'),
      connected: b.isConnected,
    },
    state: structuredClone(controller.getSnapshot()),
  })

  try {
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

    if (route.startsWith('combined')) {
      controller.subscribeConnectionPreview((value) => {
        if (armed && value === null && !started) {
          started = true
          send('a', 'pointerdown', 8, 500)

          if (route !== 'combined-pending') {
            send('a', 'pointermove', 8, 540)
          }
        }
      })

      const handle = requiredElement(
        root,
        '[data-node-id="a"] [data-handle-id="out"]'
      )

      const rect = handle.getBoundingClientRect()
      handle.dispatchEvent(
        new MouseEvent('click', {
          bubbles: true,
          clientX: rect.x + rect.width / 2,
          clientY: rect.y + rect.height / 2,
        })
      )
      send('a', 'pointerdown', 7, 500)
      send('a', 'pointermove', 7, 520)
    } else {
      send('a', 'pointerdown', 7, 650)
      send('a', 'pointermove', 7, 995)
    }

    const before = snapshot()
    armed = true

    if (route.startsWith('combined')) {
      a.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' })
      )
    } else {
      const frame = pending.entries().next().value

      if (frame === undefined) {
        throw new Error('Missing frame')
      }

      pending.delete(frame[0])
      frames.push({ action: 'deliver', id: frame[0] })
      frame[1](100)
    }

    const after = snapshot()

    if (route !== 'dispose') {
      send(
        route.startsWith('combined') ? 'a' : 'b',
        'pointerup',
        8,
        route.startsWith('combined') ? 540 : 610
      )
    }

    return { before, after, finished: snapshot() }
  } finally {
    globalThis.requestAnimationFrame = nativeFrame
    globalThis.cancelAnimationFrame = nativeCancel
    await controller.destroyAsync()
    root.remove()
  }
}

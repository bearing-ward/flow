import {
  actorInput,
  dispatchPointer,
  mountedGeometry,
  reentryDocument,
  reentryRoot,
  requiredElement,
  syntheticCaptures,
} from '../../../../apps/shared-e2e/node-reentry-fixture.ts'
import type { FlowChange } from '../../../../packages/core/src/public.ts'
import { createFlow } from '../../src/mount-flow.ts'

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
  let stopped = 0

  const node = (id: string) =>
    requiredElement(root, `.flow-node[data-node-id="${id}"]`)

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
    onNodeDragStop: () => {
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

  const escape = new KeyboardEvent('keydown', {
    key: 'Escape',
    bubbles: true,
    cancelable: true,
  })

  const escapeDispatchProofSnapshot = () => ({
    captureHistory: [...capture.history],
    held: capture.count(),
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
      afterContinuation,
      final: escapeDispatchProofSnapshot(),
      prevented: escape.defaultPrevented,
    }
  } finally {
    stopped = 3
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

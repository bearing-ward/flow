import { h, nextTick, render as renderVue, watch } from 'vue'

import {
  dispatchPointer,
  mountedGeometry,
  reentryDocument,
  reentryRoot,
  requiredElement,
  syntheticCaptures,
} from '../../../../apps/shared-e2e/node-reentry-fixture.ts'
import { FlowCanvas } from '../../src/public.ts'
import type { FlowEditor } from '../../src/public.ts'

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

    const boundsOfHandle = handle.getBoundingClientRect()

    const point = {
      x: boundsOfHandle.x + boundsOfHandle.width / 2,
      y: boundsOfHandle.y + boundsOfHandle.height / 2,
    }

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

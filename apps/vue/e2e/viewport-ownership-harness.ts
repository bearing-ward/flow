import { createApp, h, nextTick, render as renderVue, watch } from 'vue'

import { FlowCanvas } from '../../../packages/vue/dist/public.js'
import type { FlowEditor } from '../../../packages/vue/dist/public.js'
import {
  dispatchPointer,
  mountedGeometry,
  reentryDocument,
  reentryRoot,
  requiredElement,
  syntheticCaptures,
} from '../../shared-e2e/node-reentry-fixture.ts'

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

      return value
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
      // Pinned packages/system/src/xypanzoom/eventhandler.ts:238 needs a move to establish this displacement.
      dispatchPointer(
        requiredElement(root, '.flow-vue-canvas'),
        'pointermove',
        { x: 620, y: 310 }
      )
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

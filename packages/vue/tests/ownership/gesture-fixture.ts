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

const reactiveDisposalSend = (element: Element, type: string) => {
  const bounds = element.getBoundingClientRect()
  dispatchPointer(element, type, {
    x: bounds.x + bounds.width / 2,
    y: bounds.y + bounds.height / 2,
  })
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
    | 'keyboard-reconnect',
  mounted: boolean,
  controlled: boolean,
  threshold: number
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
          autoPanOnConnect: false,
          viewport: { x: 0, y: 0, zoom: 1 },
          viewportMode: controlled ? 'controlled' : 'uncontrolled',
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

            return true
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
  } else {
    anchor.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
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

  if (route === 'physical-connect') {
    reactiveCompletionProofSend(destination, 'pointerup')
  } else {
    destination.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })
    )
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
  mode: 'ordinary' | 'escape' | 'error' | 'dispose' | 'error-dispose'
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

          if (mode === 'error-dispose') {
            dispose()
          } else {
            cancel()
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

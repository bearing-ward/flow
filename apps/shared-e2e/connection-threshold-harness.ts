import { Effect, Schema } from 'effect'
import { Runtime } from 'foldkit'
import { createApp, h, shallowRef, nextTick } from 'vue'

import {
  decodeFlowDocument,
  FlowChangeSchema,
} from '../../packages/core/dist/public.js'
import type {
  FlowChange,
  FlowDocument,
  FlowSnapshot,
  ConnectionPreviewSnapshot,
} from '../../packages/core/dist/public.js'
import {
  createProgram,
  defaultInteractionOptions,
  HostAction,
  createFoldkitSnapshotClient,
  createFoldkitNodeMeasurementObserver,
} from '../../packages/foldkit/dist/public.js'
import type {
  ports,
  InteractionEventSchema,
} from '../../packages/foldkit/dist/public.js'
import { FlowCanvas } from '../../packages/vue/dist/public.js'
import type { FlowEditor } from '../../packages/vue/dist/public.js'
import {
  createFlowHost,
  acquireFlowHost,
  mountFlow,
} from '../vanilla/src/public.ts'

import '../vanilla/src/style.css'
import '../../packages/vue/dist/style.css'
import '../../packages/foldkit/dist/style.css'

export interface Options {
  geometry?: boolean
  group?: boolean
  acknowledgeNode?: boolean
  parentOrigin?: boolean
  nodeThreshold?: number | undefined
  threshold?: number | undefined
  zoom?: number
  click?: boolean
  loose?: boolean
  edge?: boolean
  edgeZIndex?: number
  pan?: boolean
  controlled?: boolean
  reentrant?: 'dispose' | 'replace'
}

const initialDocument = () =>
  Effect.runSync(
    decodeFlowDocument({
      nodes: [
        {
          id: 'source',
          label: 'Source',
          position: { x: 60, y: 70 },
          handles: [{ id: 'out', kind: 'source', side: 'right' }],
        },
        {
          id: 'original',
          label: 'Original',
          position: { x: 290, y: 70 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
        {
          id: 'target',
          label: 'Target',
          position: { x: 290, y: 220 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
        {
          id: 'source-next',
          label: 'Next',
          position: { x: 60, y: 220 },
          handles: [{ id: 'out', kind: 'source', side: 'right' }],
        },
      ],
      edges: [
        {
          id: 'edge',
          source: 'source',
          sourceHandle: 'out',
          target: 'original',
          targetHandle: 'in',
          selected: true,
          label: 'Keep label',
          data: { keep: 42 },
        },
      ],
    })
  )

let state: () => Promise<FlowSnapshot | null> = () => Promise.resolve(null)

type ThresholdInput = number | string | null | undefined

let setNodeThreshold: (value: ThresholdInput) => void = () => {
  throw new Error('Vue is not mounted')
}

let setThreshold: (value: ThresholdInput) => void = () => {
  throw new Error('Vue is not mounted')
}

let rawEvents: (typeof InteractionEventSchema.Encoded)[] = []

let viewportEvents: string[] = []

let events: string[] = []

let changes: FlowChange[] = []

let captureEvents: string[] = []

let nodeClicks: string[] = []

let errors: string[] = []

let validations = 0

let captureAtStart: boolean[] = []

let owner: Element | null = null

let pointerId = -1

let preview: () => ConnectionPreviewSnapshot = () => null

let publicPreview: ConnectionPreviewSnapshot = null

let fixture = initialDocument()

let dispose = () => {
  owner = null
}

let replace: (document: FlowDocument) => void = (next) => {
  fixture = next
}

export const frames = (count = 6): Promise<boolean> =>
  Effect.runPromise(
    Effect.callback<boolean>((resume) => {
      let remaining = count

      const frame = () => {
        remaining -= 1

        if (remaining <= 0) {
          resume(Effect.succeed(true))
        } else {
          requestAnimationFrame(frame)
        }
      }

      requestAnimationFrame(frame)
    })
  )

// eslint-disable-next-line complexity -- the fixture supports the three public host constructors.
export const mount = async (
  host: 'vanilla' | 'vue' | 'foldkit',
  options: Options = {}
) => {
  dispose()
  globalThis.dispatchEvent(new Event('beforeunload'))
  const root = document.querySelector<HTMLElement>('#app')

  if (root === null) {
    throw new Error('Missing test root')
  }

  root.replaceChildren()
  root.style.cssText = 'width:960px;height:640px;position:relative'
  fixture = initialDocument()

  if (options.geometry) {
    fixture = Effect.runSync(
      decodeFlowDocument({
        nodes: [
          {
            id: 'parent',
            label: '',
            position: options.parentOrigin
              ? { x: 150, y: 250 }
              : { x: 100, y: 200 },
            size: { width: 100, height: 100 },
            origin: options.parentOrigin ? [0.5, 0.5] : [0, 0],
          },
          {
            id: 'source',
            label: '',
            selectable: false,
            parentId: 'parent',
            position: { x: 30, y: 40 },
            size: { width: 20, height: 10 },
            origin: [0.5, 0.5],
          },
        ],
        edges: [],
      })
    )
  }

  if (options.group) {
    fixture = {
      ...fixture,
      nodes: fixture.nodes.map((node) => ({
        ...node,
        selected: node.id === 'source' || node.id === 'source-next',
        origin: [0.5, 0.5],
      })),
    }
  }

  if (!options.edge) {
    fixture = { ...fixture, edges: [] }
  }

  fixture = {
    ...fixture,
    edges: fixture.edges.map((edge) => ({
      ...edge,
      zIndex: options.edgeZIndex ?? 0,
    })),
  }
  viewportEvents = []
  rawEvents = []
  events = []
  changes = []
  errors = []
  validations = 0
  captureEvents = []
  nodeClicks = []
  captureAtStart = []
  owner = null
  pointerId = -1
  const viewport = { x: 80, y: 80, zoom: options.zoom ?? 1 }

  const observeChange = (change: FlowChange) => {
    changes.push(change)

    if (options.acknowledgeNode && change.kind === 'node-position') {
      fixture = {
        ...fixture,
        nodes: fixture.nodes.map((node) =>
          node.id === change.nodeId
            ? { ...node, position: change.position }
            : node
        ),
      }
      replace(fixture)
    }
  }

  const record = (name: string) => {
    events.push(name)

    if (
      name === 'connectStart' ||
      name === 'reconnectStart' ||
      name === 'nodeStart'
    ) {
      captureAtStart.push(owner?.hasPointerCapture(pointerId) ?? false)

      if (options.reentrant === 'dispose') {
        dispose()
      }

      if (options.reentrant === 'replace') {
        replace({ nodes: [], edges: [] })
      }
    }
  }

  const down = (event: PointerEvent) => {
    ;({ pointerId } = event)
    const { target } = event
    owner =
      (host === 'vue' || options.nodeThreshold !== undefined) &&
      target instanceof Element
        ? (target.closest('[data-testid="flow-edge-reconnect-anchor"]') ??
          target.closest('[data-node-id]'))
        : root.querySelector('[data-testid="flow-canvas"]')
  }

  const got = (event: PointerEvent) => {
    if (event.pointerId === pointerId) {
      captureEvents.push('got')
    }
  }

  const lost = (event: PointerEvent) => {
    if (event.pointerId === pointerId && event.target === owner) {
      captureEvents.push('lost')
    }
  }

  const clickTarget = (event: MouseEvent) => {
    if (event.target instanceof Element) {
      nodeClicks.push(
        event.target.closest<HTMLElement>('[data-node-id]')?.dataset.nodeId ??
          'pane'
      )
    }
  }

  root.addEventListener('click', clickTarget, true)
  root.addEventListener('pointerdown', down, true)
  root.addEventListener('gotpointercapture', got, true)
  root.addEventListener('lostpointercapture', lost, true)

  const clear = () => {
    root.removeEventListener('click', clickTarget, true)
    root.removeEventListener('pointerdown', down, true)
    root.removeEventListener('gotpointercapture', got, true)
    root.removeEventListener('lostpointercapture', lost, true)
  }

  if (host === 'vanilla') {
    const controller = mountFlow(root, fixture, {
      documentMode: options.controlled ? 'controlled' : 'uncontrolled',
      nodeDragThreshold: options.nodeThreshold,
      connectionDragThreshold: options.threshold,
      connectOnClick: options.click ?? false,
      connectionMode: options.loose ? 'loose' : 'strict',
      viewport: {
        mode: 'uncontrolled',
        initial: viewport,
        limits: { minZoom: 0.25, maxZoom: 4 },
      },
      isValidConnection: () => {
        validations += 1

        return true
      },
      onNodeDragStart: () => record('nodeStart'),
      onNodeDrag: () => record('nodeMove'),
      onNodeDragStop: () => record('nodeStop'),
      onConnectStart: () => record('connectStart'),
      onConnectEnd: () => record('connectEnd'),
      onConnect: () => record('connect'),
      onReconnectStart: () => record('reconnectStart'),
      onReconnectEnd: () => record('reconnectEnd'),
      onReconnect: () => record('reconnect'),
    })

    controller.subscribe(observeChange)
    dispose = () => {
      controller.destroy()
      clear()
    }

    replace = (document) => controller.update(document)
    state = () => Promise.resolve(controller.getSnapshot())
    preview = () => controller.getConnectionPreview()
    await controller.updateNodeInternals(fixture.nodes.map(({ id }) => id))
  } else if (host === 'vue') {
    const documentState = shallowRef(fixture)
    const threshold = shallowRef(options.threshold)
    const nodeThreshold = shallowRef(options.nodeThreshold)
    const component = shallowRef<{ editor: FlowEditor }>()

    const app = createApp({
      render: () => {
        const properties = {
          ref: component,
          document: documentState.value,
          documentMode: options.controlled ? 'controlled' : 'uncontrolled',
          viewport,
          viewportMode: 'uncontrolled',
          connectOnClick: options.click ?? false,
          connectionMode: options.loose ? 'loose' : 'strict',
          onChange: observeChange,
          isValidConnection: () => {
            validations += 1

            return true
          },
          onViewportStart: () => viewportEvents.push('start'),
          onViewportChange: () => viewportEvents.push('change'),
          onViewportEnd: () => viewportEvents.push('end'),
          onNodeDragStart: () => record('nodeStart'),
          onNodeDrag: () => record('nodeMove'),
          onNodeDragStop: () => record('nodeStop'),
          onConnectStart: () => record('connectStart'),
          onConnectEnd: () => record('connectEnd'),
          onConnect: () => record('connect'),
          onReconnectStart: () => record('reconnectStart'),
          onReconnectEnd: () => record('reconnectEnd'),
          onReconnect: () => record('reconnect'),
          onConnectProgress: () => record('connectProgress'),
          onReconnectProgress: () => record('reconnectProgress'),
        } satisfies InstanceType<typeof FlowCanvas>['$props']

        if (nodeThreshold.value !== undefined) {
          Object.assign(properties, { nodeDragThreshold: nodeThreshold.value })
        }

        if (threshold.value !== undefined) {
          Object.assign(properties, {
            connectionDragThreshold: threshold.value,
          })
        }

        return h(FlowCanvas, properties)
      },
    })

    app.config.errorHandler = (error) => errors.push(String(error))
    app.mount(root)
    dispose = () => {
      app.unmount()
      clear()
    }

    replace = (document) => {
      documentState.value = document
    }

    setNodeThreshold = (value) => {
      Reflect.set(nodeThreshold, 'value', value)
    }

    setThreshold = (value) => {
      Reflect.set(threshold, 'value', value)
    }

    state = () =>
      Promise.resolve(component.value?.editor.snapshot.value ?? null)
    preview = () => component.value?.editor.connectionPreview.value ?? null
    await nextTick()
  } else {
    const container = document.createElement('div')
    root.append(container)
    container.id = 'threshold-foldkit'

    const program = createProgram(
      container,
      fixture,
      viewport,
      fixture.nodes.map(({ id }) => id),
      options.controlled ? 'controlled' : 'uncontrolled',
      'uncontrolled',
      {},
      undefined,
      'full',
      {
        ...defaultInteractionOptions,
        panOnDrag: options.pan ?? false,
        nodeDragThreshold: options.nodeThreshold,
        connectionDragThreshold: options.threshold,
        connectOnClick: options.click ?? false,
        connectionMode: options.loose ? 'loose' : 'strict',
      }
    )

    const active = Runtime.embed<typeof ports, never, 'Element'>(program)
    const client = createFoldkitSnapshotClient(active.ports)
    active.ports.viewportEvents.subscribe((event) =>
      viewportEvents.push(event.kind)
    )
    active.ports.changes.subscribe((change) =>
      observeChange(Schema.decodeUnknownSync(FlowChangeSchema)(change))
    )
    active.ports.interactionEvents.subscribe((items) => {
      rawEvents.push(...items)

      for (const event of items) {
        const names = new Map<string, string>(
          Object.entries({
            onNodeDragStart: 'nodeStart',
            onNodeDrag: 'nodeMove',
            onNodeDragStop: 'nodeStop',
            onConnectStart: 'connectStart',
            onConnectEnd: 'connectEnd',
            onConnect: 'connect',
            onReconnectStart: 'reconnectStart',
            onReconnectEnd: 'reconnectEnd',
            onReconnect: 'reconnect',
            onConnectionPreview: 'connectProgress',
            onReconnectPreview: 'reconnectProgress',
          })
        )

        const name = names.get(event.name)

        if (name !== undefined) {
          record(name)
        }
      }
    })

    const observer = createFoldkitNodeMeasurementObserver({
      owner: root,
      zoom: () => viewport.zoom,
      onMeasure: (requests) => {
        active.ports.actions.send(HostAction.MeasureNodes({ requests }))
      },
    })

    dispose = () => {
      observer.dispose()
      client.dispose()
      active.dispose()
      clear()
    }

    replace = (document) => {
      active.ports.actions.send(HostAction.ReplaceDocument({ document }))
    }

    state = async () => {
      const result = await client.requestVersioned()

      if (result.status !== 'succeeded') {
        return null
      }

      publicPreview = result.response.connectionPreview

      return result.response.snapshot
    }

    preview = () => publicPreview
  }

  await frames()
  const canvas = root.querySelector<HTMLElement>('[data-testid="flow-canvas"]')

  if (canvas !== null) {
    canvas.style.cssText +=
      ';position:relative;width:960px;height:640px;overflow:hidden;touch-action:none'
  }

  if (options.geometry) {
    const sizing = document.createElement('style')
    sizing.textContent = `
      #app [data-node-id] { box-sizing: border-box !important; padding: 0 !important; border: 0 !important; min-width: 0 !important; min-height: 0 !important; }
      #app [data-node-id="source"] { width: 20px !important; height: 10px !important; }
      #app [data-node-id="parent"] { width: 100px !important; height: 100px !important; }
    `
    root.append(sizing)

    for (const node of root.querySelectorAll<HTMLElement>('[data-node-id]')) {
      node.style.boxSizing = 'border-box'
      node.style.padding = '0'
      node.style.border = '0'
      node.style.minWidth = '0'
      node.style.minHeight = '0'
    }
  }

  await frames()
}

export const read = async () => {
  const snapshot = await state()

  return {
    rawEvents,
    viewportEvents: [...viewportEvents],
    events: [...events],
    changes: [...changes],
    captureEvents: [...captureEvents],
    nodeClicks: [...nodeClicks],
    captureAtStart: [...captureAtStart],
    captured: owner?.hasPointerCapture(pointerId) ?? false,
    pointerId,
    preview: preview(),
    state: snapshot,
    renderedTransform: document.querySelector<HTMLElement>(
      '.flow-viewport, .flow-vue-viewport, .flow-foldkit-viewport'
    )?.style.transform,
    errors: [...errors],
    validations,
  }
}

export const clearEvents = () => {
  events = []
  changes = []
}

export const cancel = (
  kind:
    | 'blur'
    | 'cancel'
    | 'loss'
    | 'foreign-loss'
    | 'obsolete-loss'
    | 'dispose'
    | 'replace'
) => {
  if (kind === 'blur') {
    window.dispatchEvent(new Event('blur'))
  }

  if (kind === 'cancel') {
    owner?.dispatchEvent(
      new PointerEvent('pointercancel', { pointerId, bubbles: true })
    )
  }

  if (kind === 'foreign-loss') {
    document
      .querySelector('[data-node-id="target"]')
      ?.dispatchEvent(
        new PointerEvent('lostpointercapture', { pointerId, bubbles: true })
      )
  }

  if (kind === 'obsolete-loss') {
    owner?.dispatchEvent(
      new PointerEvent('lostpointercapture', { pointerId, bubbles: true })
    )
  }

  if (kind === 'loss') {
    owner?.releasePointerCapture(pointerId)
  }

  if (kind === 'dispose') {
    dispose()
  }

  if (kind === 'replace') {
    replace({ nodes: [], edges: [] })
  }
}

export const invalidate = (
  kind: 'selection' | 'hidden' | 'reconnectable' | 'handle-kind'
) => {
  replace({
    ...fixture,
    edges: fixture.edges.map((edge) => {
      if (kind === 'selection') {
        return { ...edge, selected: false }
      }

      if (kind === 'reconnectable') {
        return { ...edge, reconnectable: false }
      }

      return edge
    }),
    nodes: fixture.nodes.map((node) => {
      if (node.id !== 'source') {
        return node
      }

      if (kind === 'hidden') {
        return { ...node, hidden: true }
      }

      if (kind === 'handle-kind') {
        return {
          ...node,
          handles: node.handles?.map((handle) => ({
            ...handle,
            kind: 'target' as const,
          })),
        }
      }

      return node
    }),
  })
}

export const threshold = (value: ThresholdInput) => setThreshold(value)

const nativeCapture = Element.prototype.setPointerCapture

const failedCapture = () => {
  throw new DOMException('Feature capture failure', 'NotFoundError')
}

const refusedCapture = () => false

export const captureFailure = (enabled: boolean | 'false') => {
  if (enabled === 'false') {
    Element.prototype.setPointerCapture = refusedCapture

    return
  }

  Element.prototype.setPointerCapture = enabled ? failedCapture : nativeCapture
}

export const wrongPointer = () =>
  owner?.dispatchEvent(
    new PointerEvent('pointermove', {
      bubbles: true,
      pointerId: pointerId + 100,
      clientX: 800,
      clientY: 500,
    })
  )

export const invalid = async (
  host: 'vanilla' | 'vue' | 'foldkit',
  value: ThresholdInput
) => {
  const options: Options = { threshold: 1 }
  Reflect.set(options, 'threshold', value)

  try {
    await mount(host, options)

    return { rejected: errors.length > 0, errors }
  } catch (error) {
    return { rejected: true, error: String(error) }
  }
}

export const invalidVanillaHost = (value: ThresholdInput) => {
  const root = document.querySelector<HTMLElement>('#app')

  if (root === null) {
    throw new Error('Missing test root')
  }

  const options = {
    documentMode: 'uncontrolled' as const,
    connectionDragThreshold: 1,
    viewport: {
      mode: 'uncontrolled' as const,
      initial: { x: 0, y: 0, zoom: 1 },
      limits: { minZoom: 0.5, maxZoom: 2 },
    },
    runEffect: Effect.runSync,
  }

  Reflect.set(options, 'connectionDragThreshold', value)

  return [createFlowHost, acquireFlowHost].map((create) => {
    try {
      create(root, fixture, options)

      return false
    } catch {
      return true
    }
  })
}

export const restoreEdgeSelection = () => replace(fixture)

export const acknowledge = () => {
  const proposal = changes.findLast(
    (change) => change.kind === 'edge-reconnect'
  )

  if (proposal?.kind === 'edge-reconnect') {
    replace({ ...fixture, edges: [proposal.edge] })
  }
}

export const invalidConstructors = async (
  host: 'vanilla' | 'vue' | 'foldkit'
) => {
  const rejected: boolean[] = []

  for (const value of [-1, null, '8', Number.NaN, Infinity, -Infinity]) {
    // eslint-disable-next-line no-await-in-loop
    const result = await invalid(host, value)
    rejected.push(result.rejected)

    if (host === 'vanilla') {
      rejected.push(...invalidVanillaHost(value))
    }
  }

  return rejected
}

export const overlapLabel = async () => {
  const label = document.querySelector<HTMLElement>('.flow-foldkit-edge-label')

  if (label === null) {
    throw new Error('Missing edge label')
  }

  replace({
    ...fixture,
    edges: fixture.edges.map((edge) => ({
      ...edge,
      selected: false,
      zIndex: 0,
    })),
    nodes: fixture.nodes.map((node) =>
      node.id === 'source-next'
        ? {
            ...node,
            position: {
              x: label.offsetLeft - 25,
              y: label.offsetTop - 15,
            },
            zIndex: 2,
          }
        : node
    ),
  })
  await frames()
}

export const nodeThreshold = (value: ThresholdInput) => setNodeThreshold(value)

export const nodeMutation = async (
  kind:
    | 'position'
    | 'selection'
    | 'origin'
    | 'hidden'
    | 'draggable'
    | 'remove'
    | 'ancestor-move'
    | 'ancestor-hidden'
    | 'ancestry'
) => {
  const snapshot = await state()

  if (snapshot === null) {
    throw new Error('Missing mounted state')
  }

  replace({
    ...snapshot.document,
    nodes: snapshot.document.nodes.flatMap((node) => {
      if (node.id === 'parent' && kind === 'ancestor-move') {
        return [
          { ...node, position: { x: node.position.x + 1, y: node.position.y } },
        ]
      }

      if (node.id === 'parent' && kind === 'ancestor-hidden') {
        return [{ ...node, hidden: true }]
      }

      if (node.id === 'source' && kind === 'ancestry') {
        const { parentId: _parentId, ...rootNode } = node

        return [rootNode]
      }

      if (node.id !== 'source' || kind.startsWith('ancestor')) {
        return [node]
      }

      if (kind === 'remove') {
        return []
      }

      if (kind === 'position') {
        return [{ ...node, position: { x: 65, y: 70 } }]
      }

      if (kind === 'selection') {
        return [{ ...node, selected: true }]
      }

      if (kind === 'origin') {
        return [{ ...node, origin: [0.5, 0.5] }]
      }

      if (kind === 'hidden') {
        return [{ ...node, hidden: true }]
      }

      return [{ ...node, draggable: false }]
    }),
    edges: [],
  })
  await nextTick()
}

export const invalidNodeConstructors = async (
  host: 'vanilla' | 'vue' | 'foldkit'
) => {
  const rejected: boolean[] = []
  const values = [-1, null, '5', true, false, Number.NaN, Infinity, -Infinity]

  for (const value of values) {
    const options: Options = { nodeThreshold: 1 }
    Reflect.set(options, 'nodeThreshold', value)

    try {
      // eslint-disable-next-line no-await-in-loop -- Each invalid mount owns and releases the same fixture container.
      await mount(host, options)
      rejected.push(errors.length > 0)
    } catch {
      rejected.push(true)
    }

    if (host === 'vanilla') {
      const root = document.querySelector<HTMLElement>('#app')

      if (root === null) {
        throw new Error('Missing root')
      }

      const hostOptions = {
        documentMode: 'uncontrolled' as const,
        runEffect: Effect.runSync,
        nodeDragThreshold: 1,
        viewport: {
          mode: 'uncontrolled' as const,
          initial: { x: 0, y: 0, zoom: 1 },
          limits: { minZoom: 0.5, maxZoom: 2 },
        },
      }

      Reflect.set(hostOptions, 'nodeDragThreshold', value)

      for (const constructor of [createFlowHost, acquireFlowHost]) {
        try {
          constructor(root, fixture, hostOptions)
          rejected.push(false)
        } catch {
          rejected.push(true)
        }
      }
    }
  }

  return rejected
}

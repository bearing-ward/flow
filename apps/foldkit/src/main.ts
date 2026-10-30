import {
  decodeFlowDocument,
  createFlowGraph,
  FlowEditDisposedSchema,
  getConnectedEdges,
  getIncomers,
  getOutgoers,
  NodeIdSchema,
  FlowSnapshotSchema,
} from '@flow/core'
import type {
  FlowDocument,
  MeasuredNode,
  NodeId,
  Viewport,
  FlowEditTransactionSchema,
} from '@flow/core'
import {
  createProgram,
  createFoldkitSnapshotClient,
  prepareVersionedSavedSession,
  createFoldkitBaseNode,
  createFoldkitBaseHandle,
  createFoldkitLabeledHandle,
  createViewportClient,
  HostAction,
  createFoldkitObservers,
  createFoldkitNodeMeasurementObserver,
  createFoldkitNodeInternalsRefresher,
  createFoldkitDeleteClient,
  createFlowMiniMap,
  mountFlowCanvasUI,
  defaultInteractionOptions,
  createFoldkitInteractivity,
} from '@flow/foldkit'
import type {
  EditResponse,
  ports,
  VersionedSnapshotResponseSchema,
  MeasurementResultSchema,
  FoldkitHostOptions,
  FlowCanvasUIMount,
  FlowMiniMapMount,
} from '@flow/foldkit'
import { Effect, Exit, Match, Option, Schema } from 'effect'

import '@flow/foldkit/style.css'
import { Runtime } from 'foldkit'

import './playground.css'

const original = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'source',
        label: 'Source',
        position: { x: 100, y: 120 },
        handles: [{ id: 'out', kind: 'source', side: 'right' }],
      },
      {
        id: 'validate',
        label: 'Validate',
        type: 'demo-node',
        selected: true,
        position: { x: 420, y: 120 },
        handles: [
          { id: 'in', kind: 'target', side: 'left' },
          { id: 'out', kind: 'source', side: 'right' },
        ],
      },
      {
        id: 'target',
        label: 'Target',
        position: { x: 420, y: 300 },
        handles: [{ id: 'in', kind: 'target', side: 'left' }],
      },
    ],
    edges: [
      {
        id: 'source-validate',
        source: 'source',
        target: 'validate',
        type: 'demo-edge',
        path: 'bezier',
        label: 'validated input',
        markerEnd: 'arrowclosed',
      },
      {
        id: 'validate-target',
        source: 'validate',
        target: 'target',
        path: 'step',
      },
    ],
  })
)

const root = globalThis.document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing #app')
}

root.innerHTML = `<main class="flow-foldkit-layout"><aside class="flow-foldkit-tools"><h1>Flow Foldkit playground</h1><p>Foldkit owns the graph model; typed renderer registries customize the host view.</p><section class="flow-state-tools"><h2>State and persistence</h2><button data-state="measure-toggle">Toggle measured size and handle offset</button><label>Refresh node geometry <input data-refresh-node-id aria-label="Refresh node geometry" value="validate"></label><button data-state="refresh-node">Refresh node internals</button><output data-measurement aria-live="polite"></output><label>Node label <input aria-label="Node label" value="Validate"></label><button data-state="label">Update label</button><button data-state="hidden">Toggle hidden</button><button data-state="node-data">Update node data</button><button data-state="edge-data">Update edge data</button><button data-state="add-node">Add node</button><button data-state="remove-node">Remove added node</button><button data-state="add-protected">Add protected node</button><button data-state="protected-delete">Try protected delete</button><button data-state="reconnect-middle">Delete middle and reconnect</button><button data-state="inspect">Inspect graph</button><button data-state="save">Save snapshot</button><button data-state="change">Change graph and viewport</button><button data-state="restore" disabled>Restore snapshot</button><button data-state="reset">Reset example</button><small>Saved in this page session only. Reloading discards the snapshot.</small><output aria-live="polite"></output></section><section class="flow-viewport-tools"><h2>Viewport</h2><button data-viewport="center">Center on selected</button><button data-viewport="fit">Fit selected</button><button data-viewport="zoom">Zoom to 1.25</button><button data-viewport="zoom-low">Zoom to 0.75</button><button data-viewport="zoom-high">Zoom to 1.5</button><button data-viewport="convert">Show coordinate conversion</button><button data-viewport="cancel">Cancel animation</button><output data-viewport-result aria-live="polite"></output></section></aside><div class="flow-foldkit-host"></div></main>`

const canvas = root.querySelector<HTMLElement>('.flow-foldkit-host')

const input = root.querySelector<HTMLInputElement>('[aria-label="Node label"]')

const output = root.querySelector<HTMLOutputElement>(
  'output:not([data-measurement])'
)

const restore = root.querySelector<HTMLButtonElement>('[data-state="restore"]')

const tools = root.querySelector<HTMLElement>('.flow-state-tools')

if (
  canvas === null ||
  input === null ||
  output === null ||
  restore === null ||
  tools === null
) {
  throw new Error('Missing state demo elements')
}

canvas.id = 'flow-foldkit-runtime'

const aside = root.querySelector<HTMLElement>('.flow-foldkit-tools')

if (aside === null) {
  throw new Error('Missing playground tools')
}

aside.insertAdjacentHTML(
  'beforeend',
  `<nav aria-label="Template examples"><a href="${import.meta.env.BASE_URL}workflow/">Workflow and offline AI editor</a></nav>`
)

aside.insertAdjacentHTML(
  'beforeend',
  `<section class="flow-interaction-tools" aria-labelledby="interaction-heading">
    <h2 id="interaction-heading">Interaction demos</h2>
    <p>Choose a mode, then use pointer or keyboard input on the canvas.</p>
    <div class="flow-interaction-controls" role="group" aria-label="Interaction demo modes">
      <button type="button" data-demo-control="connection-events" aria-pressed="false">Connection events</button>
      <button type="button" data-demo-control="resize" aria-pressed="false">Resize</button>
      <button type="button" data-demo-control="drag-handle" aria-pressed="false">Drag handle</button>
      <button type="button" data-demo-control="touch-ready" aria-pressed="false">Touch ready</button>
    </div>
    <output data-demo-status aria-live="polite">Choose an interaction demo.</output>
  </section>`
)

const interactionStatus =
  root.querySelector<HTMLOutputElement>('[data-demo-status]')

if (interactionStatus === null) {
  throw new Error('Missing interaction status output')
}

const rendererRegistry = {
  nodeTypes: {
    'demo-node': (node, h) =>
      createFoldkitBaseNode(
        node.label,
        h,
        h.div(
          [],
          [
            h.p([], ['Caller-owned node content.']),
            h.button(
              [
                h.Type('button'),
                h.DataAttribute('flow-no-drag', ''),
                h.DataAttribute('demo-details', ''),
              ],
              ['Open details']
            ),
            h.div(
              [h.Class('flow-foldkit-base-handle-list')],
              (node.handles ?? []).flatMap((handle) => [
                createFoldkitBaseHandle(
                  {
                    handle,
                    label:
                      handle.kind === 'source'
                        ? 'Validated result'
                        : 'Incoming data',
                  },
                  h
                ),
                createFoldkitLabeledHandle(
                  {
                    id: handle.id,
                    label: handle.kind === 'source' ? 'Output' : 'Input',
                    side: handle.side,
                  },
                  h
                ),
              ])
            ),
          ]
        )
      ),
  },
  edgeTypes: {
    'demo-edge': (edge, geometry, h) =>
      h.path([
        h.Class('flow-foldkit-demo-edge'),
        h.D(geometry.path),
        h.Fill('none'),
        h.Stroke(edge.stroke ?? '#7c3aed'),
        h.StrokeWidth(String(edge.strokeWidth ?? 2.5)),
        ...(geometry.markerEndId === undefined
          ? []
          : [h.MarkerEnd(`url(#${geometry.markerEndId})`)]),
      ]),
  },
} satisfies NonNullable<Parameters<typeof createProgram>[6]>

let runtimeDisposed = false

const runtime = Runtime.embed<typeof ports, never, 'Element'>(
  createProgram(
    canvas,
    original,
    { x: 0, y: 0, zoom: 1 },
    ['target'],
    'uncontrolled',
    'uncontrolled',
    rendererRegistry,
    undefined,
    undefined,
    {
      ...defaultInteractionOptions,
      nodesResizable: true,
      panOnDrag: true,
      zoomOnScroll: true,
      selectionOnDrag: false,
    }
  )
)

const associateLabeledHandles = (): void => {
  const labeledHandles = globalThis.document.querySelectorAll<HTMLElement>(
    '[data-flow-labeled-handle]'
  )

  for (let index = 0; index < labeledHandles.length; index += 1) {
    const label = labeledHandles.item(index)

    if (label === null) {
      continue
    }

    const handleId = label.dataset.flowLabeledHandle

    const button = globalThis.document.querySelector<HTMLButtonElement>(
      `[data-handle-id="${handleId}"]`
    )

    if (button !== null) {
      button.setAttribute('aria-describedby', label.id)
    }
  }
}

associateLabeledHandles()

const labeledHandleObserver = new MutationObserver(associateLabeledHandles)

labeledHandleObserver.observe(root, { childList: true, subtree: true })

globalThis.addEventListener(
  'pagehide',
  () => labeledHandleObserver.disconnect(),
  {
    once: true,
  }
)

/** Keep the playground's historical auto-approve behavior when hosts omit a hook. */
const defaultBeforeDelete: FoldkitHostOptions['beforeDelete'] = () => true

const hostOptions = globalThis.window?.flowFoldkitOptions

const deleteClient = createFoldkitDeleteClient(
  runtime,
  hostOptions?.beforeDelete ?? defaultBeforeDelete,
  hostOptions
)

const observers = createFoldkitObservers(
  runtime.ports.acceptedStates,
  { document: original, viewport: { x: 0, y: 0, zoom: 1 } },
  canvas.ownerDocument
)

// The Controls lock reads and sets the Runtime's interaction switches.
const interactivity = createFoldkitInteractivity(runtime.ports)

const viewportClient = createViewportClient(
  runtime.ports,
  () => {
    const pane =
      root.querySelector<HTMLElement>('.flow-foldkit-canvas') ?? canvas

    const bounds = pane.getBoundingClientRect()

    return {
      width: bounds.width,
      height: bounds.height,
      originX: bounds.left,
      originY: bounds.top,
    }
  },
  { x: 0, y: 0, zoom: 1 }
)

let canvasUiMount: FlowCanvasUIMount | null = null

let miniMapMount: FlowMiniMapMount | null = null

const miniMapMeasurements = new Map<NodeId, MeasuredNode>()

let miniMapGraph = createFlowGraph(original)

let miniMapViewport: Viewport = { x: 0, y: 0, zoom: 1 }

root.style.setProperty('--flow-labeled-handle-inverse-zoom', '1')

const reconcileCanvasUI = (): void => {
  if (runtimeDisposed) {
    return
  }

  const pane = root.querySelector<HTMLElement>('.flow-foldkit-canvas')

  if (pane === null) {
    canvasUiMount?.dispose()
    canvasUiMount = null
    miniMapMount?.dispose()
    miniMapMount = null

    return
  }

  if (canvasUiMount?.canvas !== pane) {
    canvasUiMount?.dispose()
    miniMapMount?.dispose()
    miniMapMount = null
    miniMapMount = createFlowMiniMap(
      pane.ownerDocument,
      pane,
      viewportClient,
      miniMapGraph,
      miniMapViewport
    )
    canvasUiMount = mountFlowCanvasUI(pane, viewportClient, {
      position: 'bottom-right',
      orientation: 'vertical',
      fitViewOptions: { padding: 0.12 },
      minZoom: 0.5,
      maxZoom: 1.5,
      interactivity,
    })
    canvasUiMount.element.dataset.testid = 'foldkit-public-controls'

    const synchronizeViewport = async (): Promise<void> => {
      const response = await viewportClient.getViewport()
      canvasUiMount?.updateViewport(response.viewport)
    }

    void synchronizeViewport()

    return
  }

  canvasUiMount.ensureMounted()
}

const stopCanvasUIState = runtime.ports.acceptedStates.subscribe((change) => {
  canvasUiMount?.updateViewport(change.current.viewport)
  root.style.setProperty(
    '--flow-labeled-handle-inverse-zoom',
    String(1 / change.current.viewport.zoom)
  )
  const snapshot = Schema.decodeUnknownSync(FlowSnapshotSchema)(change.current)
  miniMapViewport = snapshot.viewport
  const documentNodeIds = new Set(snapshot.document.nodes.map(({ id }) => id))

  for (const nodeId of miniMapMeasurements.keys()) {
    if (!documentNodeIds.has(nodeId)) {
      miniMapMeasurements.delete(nodeId)
    }
  }

  miniMapGraph = createFlowGraph(snapshot.document, miniMapMeasurements)
  miniMapMount?.update(miniMapGraph, miniMapViewport)
})

const stopCanvasUIFrames = runtime.ports.viewportResults.subscribe(
  (response) => {
    miniMapViewport = response.viewport
    canvasUiMount?.updateViewport(response.viewport)
    miniMapMount?.update(miniMapGraph, miniMapViewport)
  }
)

const viewportOutput = root.querySelector<HTMLOutputElement>(
  '[data-viewport-result]'
)

const viewportAnimation = { duration: 450, easing: 'ease-in-out' as const }

for (const button of root.querySelectorAll<HTMLButtonElement>(
  '[data-viewport]'
)) {
  button.addEventListener('click', async () => {
    const action = button.dataset.viewport
    let result = ''

    if (action === 'center') {
      result =
        JSON.stringify(
          await viewportClient.setCenter({ x: 480, y: 210 }, viewportAnimation)
        ) ?? ''
    } else if (action === 'fit') {
      result =
        JSON.stringify(
          await viewportClient.fitView('selected', 0.12, viewportAnimation)
        ) ?? ''
    } else if (action === 'zoom') {
      result =
        JSON.stringify(
          await viewportClient.zoomTo(1.25, undefined, viewportAnimation)
        ) ?? ''
    } else if (action === 'zoom-low' || action === 'zoom-high') {
      result =
        JSON.stringify(
          await viewportClient.zoomTo(
            action === 'zoom-low' ? 0.75 : 1.5,
            undefined,
            viewportAnimation
          )
        ) ?? ''
    } else if (action === 'convert') {
      const converted = await viewportClient.flowToScreen({ x: 480, y: 210 })
      result =
        JSON.stringify({ flow: { x: 480, y: 210 }, screen: converted.point }) ??
        ''
    } else if (action === 'cancel') {
      result = JSON.stringify(await viewportClient.cancelAnimation()) ?? ''
    }

    if (viewportOutput !== null) {
      viewportOutput.textContent = result
    }
  })
}

type MeasurementResult = typeof MeasurementResultSchema.Encoded

let measurementRequestNumber = 0

const pendingMeasurementRequests = new Map<
  string,
  {
    readonly nodeId: string
    readonly resolve: (result: MeasurementResult) => void
  }
>()

runtime.ports.measurementResults.subscribe((result) => {
  if (result.status === 'measured' && result.internalNode !== null) {
    const measuredNodeId = NodeIdSchema.make(result.internalNode.node.id)
    miniMapMeasurements.set(measuredNodeId, {
      nodeId: measuredNodeId,
      width: result.internalNode.width,
      height: result.internalNode.height,
    })
    miniMapGraph = createFlowGraph(miniMapGraph.document, miniMapMeasurements)
    miniMapMount?.update(miniMapGraph, miniMapViewport)
  }

  const owner = pendingMeasurementRequests.get(result.requestId)

  if (owner !== undefined) {
    for (const [requestId, pending] of pendingMeasurementRequests) {
      if (pending.nodeId === owner.nodeId) {
        pendingMeasurementRequests.delete(requestId)
        pending.resolve({ ...result, requestId })
      }
    }
  }
})

const measurementObserver = createFoldkitNodeMeasurementObserver({
  owner: root,
  zoom: () => miniMapViewport.zoom,
  onMeasure: (requests) => {
    const sent = runtime.ports.actions.send(
      HostAction.MeasureNodes({ requests })
    )

    if (Exit.isFailure(sent)) {
      throw new Error('Foldkit rejected a node measurement')
    }
  },
  onMutations: reconcileCanvasUI,
})

const nodeInternalsRefresher = createFoldkitNodeInternalsRefresher({
  resolveElement: (nodeId) =>
    [...root.querySelectorAll<HTMLElement>('[data-node-id]')].find(
      (element) => element.dataset.nodeId === nodeId
    ),
  measure: (element, nodeId) => {
    const request = [...pendingMeasurementRequests].find(
      ([, pending]) => pending.nodeId === nodeId
    )

    return measurementObserver.measure(element, request?.[0])
  },
})

const nextAnimationFrame = (): Promise<undefined> => {
  const { promise, resolve } = Promise.withResolvers<undefined>()
  requestAnimationFrame(() => resolve())

  return promise
}

const refreshNodeInternals = async (
  nodeId: NodeId
): Promise<
  MeasurementResult | { readonly status: 'missing' | 'disposed' | 'failed' }
> => {
  measurementRequestNumber += 1
  const requestId = `refresh-${measurementRequestNumber}`
  const { promise, resolve } = Promise.withResolvers<MeasurementResult>()
  pendingMeasurementRequests.set(requestId, { nodeId, resolve })
  const [request] = await nodeInternalsRefresher.refresh(nodeId)

  if (request === undefined) {
    throw new Error('Missing requested measurement result')
  }

  if (request.status !== 'requested') {
    pendingMeasurementRequests.delete(requestId)

    return { status: request.status }
  }

  return promise
}

let saved: unknown

let editRequestNumber = 0

const snapshotClient = createFoldkitSnapshotClient(runtime.ports)

const pendingEditRequests = new Map<string, (response: EditResponse) => void>()

runtime.ports.editResults.subscribe((response) => {
  if (runtimeDisposed) {
    return
  }

  pendingEditRequests.get(response.requestId)?.(response)
  pendingEditRequests.delete(response.requestId)
})

const disposeRuntime = (): void => {
  if (runtimeDisposed) {
    return
  }

  runtimeDisposed = true
  snapshotClient.dispose()
  canvasUiMount?.dispose()
  canvasUiMount = null
  miniMapMount?.dispose()
  miniMapMount = null
  stopCanvasUIState()
  stopCanvasUIFrames()
  observers.dispose()
  viewportClient.dispose()
  measurementObserver.dispose()
  nodeInternalsRefresher.dispose()

  for (const [requestId, pending] of pendingMeasurementRequests) {
    pending.resolve({
      requestId,
      nodeId: pending.nodeId,
      status: 'disposed',
      internalNode: null,
      nodesInitialized: false,
    })
  }

  pendingMeasurementRequests.clear()

  for (const [requestId, resolve] of pendingEditRequests) {
    resolve({ requestId, error: FlowEditDisposedSchema.make({}) })
  }

  pendingEditRequests.clear()
  deleteClient.dispose()
}

globalThis.addEventListener('pagehide', disposeRuntime, { once: true })

const snapshot = async (): Promise<
  typeof VersionedSnapshotResponseSchema.Encoded
> => {
  const result = await snapshotClient.requestVersioned({ nodeId: 'validate' })

  return Match.value(result).pipe(
    Match.when({ status: 'succeeded' }, ({ response }) => response),
    Match.when({ status: 'failed' }, ({ reason }) => {
      throw new Error(`Foldkit snapshot failed: ${reason}`)
    }),
    Match.when({ status: 'disposed' }, () => {
      throw new Error('Foldkit snapshot owner is disposed')
    }),
    Match.exhaustive
  )
}

const requestEdit = (
  transaction: typeof FlowEditTransactionSchema.Encoded
): Promise<EditResponse> => {
  editRequestNumber += 1
  const requestId = `edit-${editRequestNumber}`
  const { promise, resolve } = Promise.withResolvers<EditResponse>()

  if (runtimeDisposed) {
    resolve({ requestId, error: FlowEditDisposedSchema.make({}) })

    return promise
  }

  pendingEditRequests.set(requestId, resolve)
  const sent = runtime.ports.editRequests.send({ requestId, transaction })

  if (Exit.isFailure(sent)) {
    pendingEditRequests.delete(requestId)
    throw new Error('Foldkit rejected the graph edit request')
  }

  return promise
}

const settleRuntime = async (): Promise<void> => {
  await nextAnimationFrame()
  await nextAnimationFrame()
}

const setDocument = async (document: FlowDocument): Promise<void> => {
  runtime.ports.actions.send(HostAction.ReplaceDocument({ document }))
  await settleRuntime()
}

const setViewport = async (viewport: Viewport): Promise<void> => {
  runtime.ports.actions.send(HostAction.ReplaceViewport({ viewport }))
  await settleRuntime()
}

const setStatus = (message: string): void => {
  output.textContent = message
}

const interactionModes = [
  'connection-events',
  'resize',
  'drag-handle',
  'touch-ready',
] as const

type InteractionMode = (typeof interactionModes)[number]

let interactionMode: InteractionMode | null = null

const moveNodeFromKeyboard = async (event: KeyboardEvent): Promise<void> => {
  const delta = {
    ArrowUp: { x: 0, y: -16 },
    ArrowRight: { x: 16, y: 0 },
    ArrowDown: { x: 0, y: 16 },
    ArrowLeft: { x: -16, y: 0 },
  }[event.key]

  if (delta === undefined) {
    return
  }

  event.preventDefault()
  event.stopPropagation()

  const current = await snapshot()
  const document = Effect.runSync(decodeFlowDocument(current.snapshot.document))
  const node = document.nodes.find(({ id }) => id === 'validate')

  if (node === undefined) {
    return
  }

  const result = await requestEdit({
    operations: [
      {
        kind: 'update-node',
        nodeId: 'validate',
        patch: {
          position: {
            x: node.position.x + delta.x,
            y: node.position.y + delta.y,
          },
        },
      },
    ],
  })

  setStatus(
    'result' in result
      ? `Moved Validate with the keyboard to ${node.position.x + delta.x}, ${node.position.y + delta.y}`
      : result.error._tag
  )
}

const syncDragHandle = (enabled: boolean): void => {
  const node = root.querySelector<HTMLElement>('[data-node-id="validate"]')

  if (node === null) {
    return
  }

  const existing = node.querySelector<HTMLElement>('[data-demo-drag-handle]')

  if (!enabled) {
    existing?.remove()

    return
  }

  if (existing !== null) {
    return
  }

  const handle = document.createElement('div')
  handle.className = 'flow-foldkit-demo-drag-handle'
  handle.dataset.demoDragHandle = 'true'
  handle.dataset.flowDragHandle = ''
  const keyboardControl = document.createElement('button')
  keyboardControl.type = 'button'
  keyboardControl.dataset.flowNoDrag = ''
  keyboardControl.setAttribute('aria-label', 'Drag Validate node')
  keyboardControl.title = 'Use arrow keys to move Validate'
  keyboardControl.textContent = '↕'
  keyboardControl.addEventListener('keydown', async (event) => {
    await moveNodeFromKeyboard(event)
  })
  handle.append(keyboardControl)
  node.append(handle)
}

const interactionInstructions: Record<InteractionMode, string> = {
  'connection-events':
    'Drag Source’s output handle to a target handle. Connection changes appear here.',
  resize:
    'Use any of Validate’s eight resize handles. Resize proposals update the graph state.',
  'drag-handle':
    'Drag the Validate handle, or focus it and use the arrow keys to move the node.',
  'touch-ready':
    'Touch input is enabled with larger graph targets and browser gestures disabled on the canvas.',
}

const setInteractionMode = (mode: InteractionMode | null): void => {
  interactionMode = mode
  root.dataset.interactionMode = mode ?? ''
  root.classList.toggle('flow-touch-ready', mode === 'touch-ready')
  syncDragHandle(mode === 'drag-handle')

  for (const button of root.querySelectorAll<HTMLButtonElement>(
    '[data-demo-control]'
  )) {
    button.setAttribute(
      'aria-pressed',
      String(button.dataset.demoControl === mode)
    )
  }

  interactionStatus.textContent =
    mode === null
      ? 'Choose an interaction demo.'
      : interactionInstructions[mode]
}

const bindInteractionControl = (button: HTMLButtonElement): void => {
  button.addEventListener('click', () => {
    const mode = interactionModes.find(
      (candidate) => candidate === button.dataset.demoControl
    )

    if (mode === undefined) {
      return
    }

    setInteractionMode(interactionMode === mode ? null : mode)
  })
}

for (const button of root.querySelectorAll<HTMLButtonElement>(
  '[data-demo-control]'
)) {
  bindInteractionControl(button)
}

runtime.ports.changes.subscribe((change) => {
  if (interactionMode === 'connection-events') {
    interactionStatus.textContent = `Connection event: ${change.kind}`
  }
})

const handleAdditionalGraphEdit = async (state: string): Promise<boolean> => {
  switch (state) {
    case 'node-data': {
      const result = await requestEdit({
        operations: [
          {
            kind: 'update-node-data',
            nodeId: 'playground-edit-node',
            data: { editedInPlayground: true },
          },
        ],
      })

      setStatus('result' in result ? 'Updated node data' : result.error._tag)

      return true
    }

    case 'add-protected': {
      const result = await requestEdit({
        operations: [
          {
            kind: 'add-nodes',
            nodes: [
              {
                id: 'protected-node',
                label: 'Protected',
                position: { x: 100, y: 500 },
                deletable: false,
              },
            ],
          },
        ],
      })

      setStatus('result' in result ? 'Added protected node' : result.error._tag)

      return true
    }

    case 'protected-delete': {
      const result = await deleteClient.deleteElements({
        nodeIds: [NodeIdSchema.make('protected-node')],
        edgeIds: [],
      })

      setStatus(
        'result' in result
          ? 'Protected delete unexpectedly succeeded'
          : result.error._tag
      )

      return true
    }

    default: {
      return false
    }
  }
}

const handleGraphEdit = async (
  state: string,
  graph: FlowDocument,
  selectedNode: FlowDocument['nodes'][number] | undefined
): Promise<boolean> => {
  if (await handleAdditionalGraphEdit(state)) {
    return true
  }

  switch (state) {
    case 'label': {
      const result = await requestEdit({
        operations: [
          {
            kind: 'update-node',
            nodeId: 'validate',
            patch: { label: input.value },
          },
        ],
      })

      setStatus(
        'result' in result
          ? `Updated Validate to ${input.value}`
          : result.error._tag
      )

      return true
    }

    case 'hidden': {
      const nextHidden = selectedNode?.hidden !== true

      const result = await requestEdit({
        operations: [
          {
            kind: 'update-node',
            nodeId: 'validate',
            patch: { hidden: nextHidden },
          },
        ],
      })

      setStatus(
        'result' in result
          ? `Validate hidden=${String(nextHidden)}; incident edges=${getConnectedEdges(selectedNode === undefined ? [] : [selectedNode], graph.edges).filter((edge) => edge.hidden !== true).length}`
          : result.error._tag
      )

      return true
    }

    case 'edge-data': {
      const result = await requestEdit({
        operations: [
          {
            kind: 'update-edge-data',
            edgeId: 'validate-target',
            data: { editedInPlayground: true },
          },
        ],
      })

      setStatus('result' in result ? 'Updated edge data' : result.error._tag)

      return true
    }

    case 'add-node': {
      const result = await requestEdit({
        operations: [
          {
            kind: 'add-nodes',
            nodes: [
              {
                id: 'playground-edit-node',
                label: 'Added through Foldkit edit port',
                position: { x: 560, y: 300 },
                data: { source: 'playground' },
              },
            ],
          },
        ],
      })

      setStatus('result' in result ? 'Added node' : result.error._tag)

      return true
    }

    case 'remove-node': {
      const result = await deleteClient.deleteElements({
        nodeIds: [NodeIdSchema.make('playground-edit-node')],
        edgeIds: [],
      })

      setStatus(
        'result' in result
          ? `Removed ${result.result.deletion.deletedNodeIds.join(', ')}`
          : result.error._tag
      )

      return true
    }

    case 'reconnect-middle': {
      if (selectedNode === undefined) {
        setStatus('Middle node is already removed; reset to try again')

        return true
      }

      const incoming = getIncomers(selectedNode, graph.nodes, graph.edges)
      const outgoing = getOutgoers(selectedNode, graph.nodes, graph.edges)

      const edges = incoming.flatMap((source) =>
        outgoing.map((target) => ({
          id: `reconnected-${source.id}-${target.id}`,
          source: source.id,
          target: target.id,
          path: 'bezier' as const,
        }))
      )

      const result = await requestEdit({
        operations: [
          { kind: 'delete-elements', nodeIds: [selectedNode.id] },
          { kind: 'add-edges', edges },
        ],
      })

      setStatus(
        'result' in result
          ? `Removed ${result.result.deletion.deletedNodeIds.join(', ')}; connected ${incoming.map(({ id }) => id).join(', ')} to ${outgoing.map(({ id }) => id).join(', ')}`
          : result.error._tag
      )

      return true
    }

    default: {
      return false
    }
  }
}

tools.addEventListener('pointerdown', (event) => event.stopPropagation())

const toggleMeasuredGeometry = async (): Promise<void> => {
  const node = root.querySelector<HTMLElement>('[data-node-id="validate"]')
  const handle = node?.querySelector<HTMLElement>('[data-handle-id="out"]')

  if (
    node === null ||
    node === undefined ||
    handle === null ||
    handle === undefined
  ) {
    setStatus('Measured node is not mounted')

    return
  }

  node.style.width = node.style.width === '150px' ? '220px' : '150px'
  node.style.height = node.style.height === '44px' ? '96px' : '44px'
  handle.style.top = handle.style.top === '70%' ? '30%' : '70%'
  const result = await refreshNodeInternals(NodeIdSchema.make('validate'))
  await nextAnimationFrame()
  setStatus(
    `Measurement ${result.status}; readiness=${String('nodesInitialized' in result ? result.nodesInitialized : false)}; observer deliveries=${measurementObserver.count()}`
  )
}

const handleNodeInternalsRefresh = async (): Promise<void> => {
  const nodeIdInput = root.querySelector<HTMLInputElement>(
    '[data-refresh-node-id]'
  )

  const nodeId = Option.getOrUndefined(
    Schema.decodeUnknownOption(NodeIdSchema)(nodeIdInput?.value)
  )

  if (nodeId === undefined) {
    setStatus('Measurement invalid-node-id')

    return
  }

  const result = await refreshNodeInternals(nodeId)
  setStatus(
    result.status === 'measured' && result.internalNode !== null
      ? `Measurement measured ${result.internalNode.width}x${result.internalNode.height}`
      : `Measurement ${result.status}`
  )
}

tools.addEventListener(
  'click',
  (event) => {
    const button =
      event.target instanceof HTMLElement
        ? event.target.closest<HTMLButtonElement>(
            'button[data-state="refresh-node"]'
          )
        : null

    if (button === null) {
      return
    }

    event.stopImmediatePropagation()
    void handleNodeInternalsRefresh()
  },
  { capture: true }
)

tools.addEventListener('click', async (event) => {
  const button =
    event.target instanceof HTMLElement
      ? event.target.closest<HTMLButtonElement>('button[data-state]')
      : null

  if (button === null) {
    return
  }

  await nextAnimationFrame()
  const current = await snapshot()
  const graph = Effect.runSync(decodeFlowDocument(current.snapshot.document))
  const selectedNode = graph.nodes.find((node) => node.id === 'validate')

  if (await handleGraphEdit(button.dataset.state ?? '', graph, selectedNode)) {
    return
  }

  switch (button.dataset.state) {
    case 'measure-toggle': {
      await toggleMeasuredGeometry()
      break
    }

    case 'inspect': {
      const node = selectedNode
      setStatus(
        JSON.stringify({
          nodes: graph.nodes.length,
          edges: graph.edges.length,
          selected: node?.label,
          isSelected: node?.selected === true,
          hidden: node?.hidden === true,
          nodeData: graph.nodes.find(
            (item) => item.id === 'playground-edit-node'
          )?.data,
          protectedNode: graph.nodes.find(
            (item) => item.id === 'protected-node'
          )?.id,
          edgeData: graph.edges.find((edge) => edge.id === 'validate-target')
            ?.data,
          viewport: current.snapshot.viewport,
          incomers:
            node === undefined
              ? []
              : getIncomers(node, graph.nodes, graph.edges).map(
                  (item) => item.id
                ),
          outgoers:
            node === undefined
              ? []
              : getOutgoers(node, graph.nodes, graph.edges).map(
                  (item) => item.id
                ),
        })
      )
      break
    }

    case 'save': {
      saved = current.savedSession
      restore.disabled = false
      setStatus('Snapshot saved for this session')
      break
    }

    case 'change': {
      await requestEdit({
        operations: [
          {
            kind: 'update-node',
            nodeId: 'validate',
            patch: { label: 'Changed after save', hidden: false },
          },
          {
            kind: 'update-edge-data',
            edgeId: 'validate-target',
            data: { changedAfterSave: true },
            replace: true,
          },
        ],
      })
      await setViewport({ x: -80, y: 30, zoom: 0.9 })
      setStatus('Changed label, visibility, and viewport')
      break
    }

    case 'restore': {
      if (saved === undefined) {
        setStatus('No snapshot saved')
        break
      }

      const state = await Effect.runPromise(prepareVersionedSavedSession(saved))
      await setDocument(state.document)
      await setViewport(state.viewport)
      setStatus('Restored document and viewport; selection is transient')
      break
    }

    case 'reset': {
      saved = undefined
      restore.disabled = true
      input.value = 'Validate'
      await setDocument(original)
      await setViewport({ x: 0, y: 0, zoom: 1 })
      setStatus('Reset to the original example')
      break
    }

    default: {
      break
    }
  }
})

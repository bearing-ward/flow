import {
  applyEdgeReconnectChange,
  applyEdgeRemoveChange,
  applyEdgeSelectionChange,
  applyNodePositionChange,
  applyNodeSizeChange,
  applyNodeBoundsChange,
  applyNodePositionsChange,
  applyNodeSelectionChange,
  applySelectionSetChange,
  decodeFlowDocument,
  FlowEditErrorSchema,
  getIncomers,
  getOutgoers,
  getConnectedEdges,
  simpleBezierEdgePath,
} from '@flow/core'
import type {
  FlowChange,
  FlowDocument,
  FlowEdge,
  FlowNode,
  FlowSnapshot,
} from '@flow/core'
import { Effect, ManagedRuntime, Schema } from 'effect'

import './style.css'
import { createFlowHost } from './mount-flow.ts'
import { BrowserApplicationLive } from './telemetry.ts'

const source = {
  nodes: [
    {
      id: 'input',
      label: 'Input · drag me',
      position: { x: 110, y: 500 },
      handles: [{ id: 'out', kind: 'source', side: 'right' }],
    },
    {
      id: 'transform',
      label: 'Transform',
      position: { x: 390, y: 320 },
      type: 'demo-card',
      data: { detail: 'Typed node renderer' },
      size: { width: 210, height: 100 },
      handles: [
        { id: 'in', kind: 'target', side: 'left' },
        { id: 'out', kind: 'source', side: 'right' },
      ],
    },
    {
      id: 'validate',
      label: 'Validate',
      position: { x: 390, y: 510 },
      handles: [
        { id: 'in', kind: 'target', side: 'left' },
        { id: 'out', kind: 'source', side: 'right' },
      ],
    },
    {
      id: 'output',
      label: 'Output',
      position: { x: 710, y: 410 },
      handles: [{ id: 'in', kind: 'target', side: 'left' }],
    },
    {
      id: 'remote-a',
      label: 'Remote input',
      position: { x: 1900, y: 400 },
      handles: [{ id: 'out', kind: 'source', side: 'right' }],
    },
    {
      id: 'remote-b',
      label: 'Remote output',
      position: { x: 2200, y: 400 },
      handles: [{ id: 'in', kind: 'target', side: 'left' }],
    },
  ],
  edges: [
    {
      id: 'straight',
      source: 'input',
      target: 'transform',
      path: 'straight',
      label: 'straight',
      markerEnd: 'arrowclosed',
      stroke: '#2563eb',
    },
    {
      id: 'bezier',
      source: 'input',
      target: 'validate',
      path: 'bezier',
      label: 'bezier',
      markerEnd: 'arrow',
    },
    {
      id: 'simple',
      source: 'transform',
      target: 'output',
      path: 'simplebezier',
      type: 'demo-edge',
      label: 'simple Bezier',
      markerEnd: 'arrowclosed',
      zIndex: 1,
      stroke: '#7c3aed',
    },
    {
      id: 'smooth',
      source: 'validate',
      target: 'output',
      path: 'smoothstep',
      label: 'smooth step',
    },
    {
      id: 'hidden',
      source: 'transform',
      target: 'validate',
      path: 'step',
      label: 'step · hidden',
      hidden: true,
      stroke: '#ea580c',
    },
    {
      id: 'remote',
      source: 'remote-a',
      target: 'remote-b',
      path: 'step',
      label: 'step',
      markerEnd: 'arrowclosed',
    },
  ],
}

const interactionScenes = {
  connections: {
    nodes: [
      {
        id: 'event-source',
        label: 'Source · click to connect',
        position: { x: 100, y: 300 },
        size: { width: 220, height: 88 },
        handles: [{ id: 'out', kind: 'source', side: 'right' }],
      },
      {
        id: 'event-target',
        label: 'Target · click to complete',
        position: { x: 520, y: 300 },
        size: { width: 220, height: 88 },
        handles: [{ id: 'in', kind: 'target', side: 'left' }],
      },
    ],
    edges: [],
  },
  touchReady: {
    nodes: [
      {
        id: 'touch-source',
        label: 'Touch source',
        position: { x: 54, y: 360 },
        size: { width: 220, height: 100 },
        selected: true,
        handles: [{ id: 'out', kind: 'source', side: 'right' }],
      },
      {
        id: 'touch-target',
        label: 'Touch target',
        position: { x: 54, y: 590 },
        size: { width: 220, height: 100 },
        handles: [{ id: 'in', kind: 'target', side: 'left' }],
      },
    ],
    edges: [],
  },
  resize: {
    nodes: [
      {
        id: 'container',
        label: 'Resize me',
        position: { x: 280, y: 220 },
        size: { width: 300, height: 190 },
        selected: true,
        type: 'demo-card',
        data: { scene: 'resize' },
      },
      {
        id: 'child',
        label: 'Child node',
        parentId: 'container',
        extent: 'parent',
        position: { x: 32, y: 58 },
        size: { width: 120, height: 56 },
      },
    ],
    edges: [],
  },
  drag: {
    nodes: [
      {
        id: 'drag-card',
        label: 'Custom drag region',
        position: { x: 280, y: 250 },
        size: { width: 300, height: 150 },
        type: 'demo-card',
        data: { scene: 'drag' },
      },
      {
        id: 'drag-target',
        label: 'Drop target',
        position: { x: 690, y: 280 },
        size: { width: 160, height: 90 },
      },
    ],
    edges: [],
  },
  viewport: {
    nodes: [
      {
        id: 'viewport-card',
        label: 'Measured custom card',
        position: { x: 360, y: 260 },
        size: { width: 230, height: 120 },
        selected: true,
      },
      {
        id: 'viewport-peer',
        label: 'Viewport peer',
        position: { x: 780, y: 410 },
        size: { width: 170, height: 76 },
      },
    ],
    edges: [],
  },
  panels: {
    nodes: [
      {
        id: 'panel-node',
        label: 'Panel anchor',
        position: { x: 360, y: 300 },
        size: { width: 210, height: 90 },
      },
    ],
    edges: [],
  },
} as const

const runtime = ManagedRuntime.make(BrowserApplicationLive)

const playgroundCopy = {
  home: {
    description:
      'Main graph: compare edge paths, connect handles, reveal the hidden step edge, and hide Validate to see its connected edges disappear.',
    helper:
      'Click to select a node. Control or Command adds nodes to the selection; drag one selected node to move the group. Drag between handles or click a source and target to connect. Shift-drag the pane to select overlapping nodes.',
  },
  remote: {
    description:
      'Distant graph: inspect the remote node pair. Viewport culling removes the main graph from the DOM until you return to it.',
    helper:
      'Only nodes near the viewport are rendered. Connect Remote input to Remote output, then choose Main graph to return. Drag near a pane edge during a connection to pan.',
  },
  connections: {
    description:
      'Connection events: connect the two nodes by dragging between handles or clicking the source and target handles in order.',
    helper:
      'The live status reports accepted edge changes. Repeating the same connection is rejected as a duplicate; Escape cancels an in-progress pointer connection.',
  },
  touchReady: {
    description:
      'Touch-ready scene: larger handle and resize hit areas keep common gestures reachable on a narrow screen.',
    helper:
      'Use touch to connect the two nodes or move them. Keyboard users can Tab to the handles and resize controls, then use arrow keys to resize.',
  },
  resize: {
    description:
      'Nested resize: the selected parent exposes eight resize controls. Drag a corner or edge and watch its child keep the same world position.',
    helper:
      'Resize the parent with a pointer or focus a resize control and use the arrow keys. The child is compensated as the parent bounds change.',
  },
  drag: {
    description:
      'Custom drag handle: only the marked header moves the node. The action button inside the card remains interactive without starting a drag.',
    helper:
      'Drag the blue header to move the card. Click its button, or drag the card body, to see those regions excluded from node dragging.',
  },
  panels: {
    description:
      'Placed panel: the caller-owned panel is mounted in the canvas at the top left and keeps its own focusable action.',
    helper:
      'Use the panel action or drag the graph behind it. Panel placement belongs to the vanilla host; the graph document contains no DOM elements.',
  },
  viewport: {
    description:
      'Viewport APIs: operate on measured, selected custom-sized nodes and inspect client-space conversion.',
    helper:
      'Center or fit the selected card, choose fractional zoom, place a conversion marker, or start and cancel an animated viewport request.',
  },
  fit: {
    description:
      'Fit graph: centered the full graph, including nodes outside the current viewport.',
    helper:
      'Fit graph uses measured sizes where available and temporary node-size estimates elsewhere. It leaves padding around the whole graph; visited nodes use their exact measured sizes.',
  },
  fitPending: {
    description:
      'Fit graph: the graph already fits within the current viewport.',
    helper:
      'Drag the pane or zoom with the mouse wheel, then choose Fit graph to return to an overview of all nodes.',
  },
  validatorOn: {
    description:
      'Connection rule active: new links into Output are rejected. Try connecting Input to Output, then turn the rule off.',
    helper:
      "Drag from Input's source handle or click it, then choose Output's target handle. The rule rejects that new edge; existing edges stay visible.",
  },
  validatorOff: {
    description:
      'Connection rule off: new source-to-target links into Output are allowed when they are not duplicates.',
    helper:
      'Connect Input to Output by dragging or by clicking the two handles. A duplicate endpoint pair is still rejected.',
  },
  hiddenShown: {
    description:
      'Step edge visible: compare its right-angle route with the other paths in the main graph.',
    helper:
      'The step edge runs from Transform to Validate. Choose Hide step edge to remove its rendered path while keeping it in the document.',
  },
  hiddenHidden: {
    description:
      'Step edge hidden: its edge remains in the document but has no rendered path.',
    helper:
      'Choose Show hidden edge to render the same edge again. The graph document keeps the edge throughout the toggle.',
  },
  nodeHidden: {
    description:
      'Validate hidden: its node and connected edges leave the canvas while the document keeps them.',
    helper:
      'Choose Show Validate node to restore the node and its connected edges. Other nodes and edges remain mounted.',
  },
  nodeShown: {
    description:
      'Validate visible: its node and connected edges return without replacing the graph.',
    helper:
      'Drag Validate to see its connected paths follow, or choose Hide Validate node to remove it from the rendered canvas again.',
  },
} as const

const applyNodeGeometryChange = (
  document: FlowDocument,
  change: Extract<FlowChange, { kind: 'node-bounds' | 'node-size' }>
): FlowDocument =>
  change.kind === 'node-size'
    ? (applyNodeSizeChange(document, change) ?? document)
    : (applyNodeBoundsChange(document, change) ?? document)

const applyDocumentChange = (
  document: FlowDocument,
  change: FlowChange
): FlowDocument => {
  switch (change.kind) {
    case 'node-bounds': {
      return applyNodeGeometryChange(document, change)
    }

    case 'node-size': {
      return applyNodeGeometryChange(document, change)
    }

    case 'node-position': {
      return applyNodePositionChange(document, change) ?? document
    }

    case 'node-positions': {
      return applyNodePositionsChange(document, change) ?? document
    }

    case 'node-selection': {
      return applyNodeSelectionChange(document, change) ?? document
    }

    case 'selection-set': {
      return applySelectionSetChange(document, change) ?? document
    }

    case 'edge-add': {
      return { ...document, edges: [...document.edges, change.edge] }
    }

    case 'edge-selection': {
      return applyEdgeSelectionChange(document, change) ?? document
    }

    case 'edge-reconnect': {
      return applyEdgeReconnectChange(document, change) ?? document
    }

    case 'edge-remove': {
      return applyEdgeRemoveChange(document, change) ?? document
    }

    case 'viewport': {
      return document
    }

    case 'edit-proposal': {
      return change.document
    }

    default: {
      const exhaustive: never = change

      return exhaustive
    }
  }
}

const program = Effect.gen(function* program() {
  const root = globalThis.document.querySelector<HTMLElement>('#app')

  if (root === null) {
    return yield* Effect.die(new Error('Missing #app host element'))
  }

  const document = yield* decodeFlowDocument(source)

  const sceneDocuments = {
    viewport: yield* decodeFlowDocument(interactionScenes.viewport),
    connections: yield* decodeFlowDocument(interactionScenes.connections),
    touchReady: yield* decodeFlowDocument(interactionScenes.touchReady),
    resize: yield* decodeFlowDocument(interactionScenes.resize),
    drag: yield* decodeFlowDocument(interactionScenes.drag),
    panels: yield* decodeFlowDocument(interactionScenes.panels),
  }

  let currentDocument = document
  let mainDocument = document
  let interactionSceneActive = false
  let blockOutputConnections = false

  const placedPanel = globalThis.document.createElement('aside')
  placedPanel.className = 'flow-scene-panel'
  placedPanel.hidden = true
  placedPanel.innerHTML =
    '<strong>Caller panel</strong><p>Placed at top left</p><button type="button">Panel action</button>'
  placedPanel.querySelector('button')?.addEventListener('click', () => {
    placedPanel.dataset.actionCount = String(
      Number(placedPanel.dataset.actionCount ?? '0') + 1
    )
  })

  const host = yield* createFlowHost(root, document, {
    documentMode: 'uncontrolled',
    // The playground demonstrates node resizing (React Flow's NodeResizer).
    nodesResizable: true,
    autoPanOnConnect: true,
    connectOnClick: true,
    connectionRadius: 20,
    isValidConnection: (connection) =>
      !blockOutputConnections || connection.target !== 'output',
    nodeDragThreshold: 4,
    nodeExtent: { minX: 0, minY: 0, maxX: 3200, maxY: 1000 },
    renderOnlyVisible: true,
    selectionMode: 'partial',
    ui: { controls: true, minimap: true },
    panels: [
      { id: 'playground-panel', element: placedPanel, placement: 'top-left' },
    ],
    snapGrid: { x: 10, y: 10 },
    runEffect: runtime.runSync,
    runTelemetry: (effect) => {
      runtime.runFork(effect)
    },
    runPromise: (effect) => runtime.runPromise(effect),
    nodeRenderers: {
      'demo-card': (node: FlowNode, content: HTMLElement) => {
        const render = (next: FlowNode): void => {
          if (next.data?.scene === 'drag') {
            const header = globalThis.document.createElement('div')
            header.className = 'flow-demo-drag-handle'
            header.dataset.flowDragHandle = ''
            header.textContent = 'Drag this header'
            const action = globalThis.document.createElement('button')
            action.type = 'button'
            action.dataset.flowNoDrag = ''
            action.textContent = 'Card action'
            action.addEventListener('click', () => {
              action.dataset.clicked = 'true'
            })
            content.replaceChildren(header, action)

            return
          }

          content.textContent = `${next.label} · ${String(next.data?.detail ?? 'Nested parent')}`
        }

        const update = (next: FlowNode): void => {
          render(next)
        }

        update(node)

        return { update, destroy: () => content.replaceChildren() }
      },
    },
    edgeRenderers: {
      'demo-edge': {
        geometry: (_edge: FlowEdge, endpoints) => ({
          pathData: simpleBezierEdgePath(
            endpoints.source,
            endpoints.target,
            endpoints.sourceSide,
            endpoints.targetSide
          ),
          labelAnchor: {
            x: (endpoints.source.x + endpoints.target.x) / 2,
            y: (endpoints.source.y + endpoints.target.y) / 2,
          },
        }),
      },
    },
    viewport: {
      extent: { minX: -100, minY: -100, maxX: 3200, maxY: 1200 },
      initial: { x: 0, y: 0, zoom: 1 },
      limits: { maxZoom: 2, minZoom: 0.5 },
      mode: 'uncontrolled',
    },
  })

  const panel = globalThis.document.createElement('aside')
  panel.className = 'flow-demo-panel'
  panel.innerHTML = `<span class="flow-demo-kicker">VANILLA HOST · LIVE</span>
    <h1>Flow playground</h1>
    <p class="flow-demo-description" aria-live="polite">${playgroundCopy.home.description}</p>
    <div class="flow-demo-actions">
      <button type="button" data-action="home" aria-pressed="true" aria-current="true">Main graph</button>
      <button type="button" data-action="remote" aria-pressed="false">Distant graph</button>
      <button type="button" data-action="connections" aria-pressed="false">Connection events</button>
      <button type="button" data-action="resize" aria-pressed="false">Nested resize</button>
      <button type="button" data-action="drag" aria-pressed="false">Custom drag handle</button>
      <button type="button" data-action="touch-ready" aria-pressed="false">Touch-ready</button>
      <button type="button" data-action="panels" aria-pressed="false">Placed panel</button>
      <button type="button" data-action="viewport" aria-pressed="false">Viewport API scene</button>
      <button type="button" data-action="center-selected">Center selected</button>
      <button type="button" data-action="fit-selected">Fit selected</button>
      <button type="button" data-action="zoom-fractional">Zoom to 0.73</button>
      <button type="button" data-action="conversion-marker">Show conversion marker</button>
      <button type="button" data-action="animate-viewport">Animate viewport</button>
      <button type="button" data-action="cancel-animation">Cancel animation</button>
      <button type="button" data-action="fit">Fit graph</button>
      <button type="button" data-action="validator" aria-pressed="false">Block Output connections</button>
      <button type="button" data-action="hidden">Show hidden edge</button>
      <button type="button" data-action="node">Hide Validate node</button>
    </div>
    <p class="flow-demo-note" aria-live="polite">${playgroundCopy.home.helper}</p>
    <output class="flow-demo-status" aria-live="polite">Ready · 5 edge paths · 6 nodes</output>`
  root.append(panel)

  const statePanel = globalThis.document.createElement('section')
  statePanel.className = 'flow-state-tools'
  panel.classList.add('flow-demo-panel-with-state-tools')
  statePanel.innerHTML = `<h2>State and persistence</h2>
    <label>Node label <input aria-label="Node label" value="Validate"></label>
    <button type="button" data-state="label">Update label</button>
    <button type="button" data-state="add">Add node</button>
    <button type="button" data-state="node-data">Update node data</button>
    <button type="button" data-state="edge-data">Update edge data</button>
    <button type="button" data-state="remove">Remove added node</button>
    <button type="button" data-state="add-protected">Add protected node</button>
    <button type="button" data-state="protected-delete">Try protected delete</button>
    <button type="button" data-state="reconnect-middle">Delete middle and reconnect</button>
    <button type="button" data-state="hidden">Hide selected node</button>
    <button type="button" data-state="inspect">Inspect graph</button>
    <button type="button" data-state="save">Save snapshot</button>
    <button type="button" data-state="change">Change graph and viewport</button>
    <button type="button" data-state="restore" disabled>Restore snapshot</button>
    <button type="button" data-state="reset">Reset example</button>
    <small>Saved in this page session only. Reloading discards the snapshot.</small>
    <output data-state-result aria-live="polite"></output>
    <nav aria-label="Template examples"><a href="${import.meta.env.BASE_URL}workflow/">Workflow and offline AI editor</a></nav>`
  panel.append(statePanel)
  const stateInput = statePanel.querySelector<HTMLInputElement>('input')
  const stateOutput = statePanel.querySelector<HTMLOutputElement>('output')
  let savedState: unknown

  const selectedId = 'validate'

  const showState = (text: string): void => {
    stateOutput?.replaceChildren(text)
  }

  const inspectState = (): void => {
    const snapshot = host.getSnapshot()
    const node = host.getNode(selectedId)

    const incomers =
      node === undefined
        ? []
        : getIncomers(node, snapshot.document.nodes, snapshot.document.edges)

    const outgoers =
      node === undefined
        ? []
        : getOutgoers(node, snapshot.document.nodes, snapshot.document.edges)

    showState(
      JSON.stringify({
        nodes: host.getNodes().length,
        edges: host.getEdges().length,
        selected: node?.label,
        isSelected: node?.selected === true,
        hidden: node?.hidden === true,
        nodeData: host.getNode('added-node')?.data,
        protectedNode: host.getNode('protected-node')?.id,
        edgeData: snapshot.document.edges.find((edge) => edge.id === 'straight')
          ?.data,
        viewport: host.getViewport(),
        incomers: incomers.map((item) => item.id),
        outgoers: outgoers.map((item) => item.id),
      })
    )
  }

  const handleAdditionalGraphEditAction = async (
    action: string | undefined
  ): Promise<boolean> => {
    switch (action) {
      case 'node-data': {
        const result = await host.applyEdit({
          operations: [
            {
              kind: 'update-node-data',
              nodeId: 'added-node',
              data: { editedInPlayground: true },
            },
          ],
        })

        currentDocument = result.document
        mainDocument = currentDocument
        showState(
          `Updated added-node data; ${JSON.stringify(host.getNode('added-node')?.data)}`
        )

        return true
      }

      case 'add-protected': {
        const result = await host.applyEdit({
          operations: [
            {
              kind: 'add-nodes',
              nodes: [
                {
                  id: 'protected-node',
                  label: 'Protected',
                  position: { x: 620, y: 300 },
                  deletable: false,
                },
              ],
            },
          ],
        })

        currentDocument = result.document
        mainDocument = currentDocument
        showState('Added protected node')

        return true
      }

      case 'protected-delete': {
        try {
          await host.applyEdit({
            operations: [
              { kind: 'delete-elements', nodeIds: ['protected-node'] },
            ],
          })
          showState('Protected delete unexpectedly succeeded')
        } catch (error) {
          showState(Schema.decodeUnknownSync(FlowEditErrorSchema)(error)._tag)
        }

        return true
      }

      default: {
        return false
      }
    }
  }

  const handleGraphEditAction = async (
    action: string | undefined,
    snapshot: FlowSnapshot
  ): Promise<boolean> => {
    switch (action) {
      case 'label': {
        const label = stateInput?.value ?? ''

        const result = await host.applyEdit({
          operations: [
            { kind: 'update-node', nodeId: selectedId, patch: { label } },
          ],
        })

        currentDocument = result.document
        mainDocument = currentDocument
        showState(`Updated ${selectedId} to ${label}`)

        return true
      }

      case 'add': {
        if (host.getNode('added-node') !== undefined) {
          showState('Added node already exists')

          return true
        }

        const result = await host.applyEdit({
          operations: [
            {
              kind: 'add-nodes',
              nodes: [
                {
                  id: 'added-node',
                  label: 'Added',
                  position: { x: 560, y: 300 },
                  data: { source: 'playground' },
                },
              ],
            },
          ],
        })

        currentDocument = result.document
        mainDocument = currentDocument
        showState(`Added node; accepted nodes=${host.getNodes().length}`)

        return true
      }

      case 'edge-data': {
        const edge = snapshot.document.edges.find(
          (item) => item.id === 'straight'
        )

        if (edge === undefined) {
          showState('No edge is available to update')

          return true
        }

        const result = await host.applyEdit({
          operations: [
            {
              kind: 'update-edge-data',
              edgeId: edge.id,
              data: { editedInPlayground: true },
            },
          ],
        })

        currentDocument = result.document
        mainDocument = currentDocument
        showState(
          `Updated ${edge.id} data; ${JSON.stringify(host.getEdge(edge.id)?.data)}`
        )

        return true
      }

      case 'remove': {
        const result = await host.applyEdit({
          operations: [{ kind: 'delete-elements', nodeIds: ['added-node'] }],
        })

        currentDocument = result.document
        mainDocument = currentDocument
        showState(
          `Removed nodes=${result.deletion.deletedNodeIds.join(',')}; edges=${result.deletion.deletedEdgeIds.join(',')}`
        )

        return true
      }

      case 'reconnect-middle': {
        const middle = snapshot.document.nodes.find(
          (node) => node.id === 'transform'
        )

        if (middle === undefined) {
          showState('Middle node is already removed; reset to try again')

          return true
        }

        const incoming = getIncomers(
          middle,
          snapshot.document.nodes,
          snapshot.document.edges
        )

        const outgoing = getOutgoers(
          middle,
          snapshot.document.nodes,
          snapshot.document.edges
        )

        const edges = incoming.flatMap((sourceNode) =>
          outgoing.map((target) => ({
            id: `reconnected-${sourceNode.id}-${target.id}`,
            source: sourceNode.id,
            target: target.id,
            path: 'bezier' as const,
          }))
        )

        const result = await host.applyEdit({
          operations: [
            { kind: 'delete-elements', nodeIds: [middle.id] },
            { kind: 'add-edges', edges },
          ],
        })

        currentDocument = result.document
        mainDocument = currentDocument
        showState(
          `Removed ${middle.id}; connected ${incoming.map(({ id }) => id).join(', ')} to ${outgoing.map(({ id }) => id).join(', ')}`
        )

        return true
      }

      default: {
        return false
      }
    }
  }

  statePanel.addEventListener('click', async (event) => {
    const button =
      event.target instanceof HTMLElement
        ? event.target.closest<HTMLButtonElement>('button[data-state]')
        : null

    if (button === null) {
      return
    }

    if (await handleAdditionalGraphEditAction(button.dataset.state)) {
      return
    }

    const snapshot = host.getSnapshot()

    if (await handleGraphEditAction(button.dataset.state, snapshot)) {
      return
    }

    switch (button.dataset.state) {
      case 'hidden': {
        const target = host.getNode(selectedId)

        if (target === undefined) {
          return
        }

        currentDocument = {
          ...snapshot.document,
          nodes: snapshot.document.nodes.map((node) =>
            node.id === selectedId
              ? { ...node, hidden: node.hidden !== true }
              : node
          ),
        }
        host.update(currentDocument)
        mainDocument = currentDocument
        button.textContent =
          target.hidden === true ? 'Hide selected node' : 'Show selected node'
        showState(
          `${selectedId} hidden=${String(target.hidden !== true)}; incident edges=${getConnectedEdges([target], snapshot.document.edges).filter((edge) => edge.hidden !== true).length}`
        )
        break
      }

      case 'inspect': {
        inspectState()
        break
      }

      case 'save': {
        savedState = host.getVersionedSavedSession()

        const restore = statePanel.querySelector<HTMLButtonElement>(
          '[data-state="restore"]'
        )

        restore?.removeAttribute('disabled')
        showState('Snapshot saved for this session')
        break
      }

      case 'change': {
        currentDocument = {
          ...snapshot.document,
          nodes: snapshot.document.nodes.map((node) =>
            node.id === selectedId
              ? { ...node, label: 'Changed after save', hidden: false }
              : node
          ),
          edges: snapshot.document.edges.map((edge) =>
            edge.id === 'straight'
              ? { ...edge, data: { changedAfterSave: true } }
              : edge
          ),
        }
        host.update(currentDocument)
        host.updateViewport({ x: -80, y: 30, zoom: 0.9 })
        mainDocument = currentDocument
        showState('Changed label, visibility, and viewport')
        break
      }

      case 'restore': {
        if (savedState === undefined) {
          showState('No snapshot saved')

          return
        }

        const restored = await host.prepareVersionedRestore(savedState)
        currentDocument = restored.document
        mainDocument = restored.document
        host.update(restored.document)
        host.updateViewport(restored.viewport)
        showState(
          'Restored document and viewport; transient selection is not saved'
        )
        break
      }

      case 'reset': {
        savedState = undefined
        currentDocument = document
        mainDocument = document

        if (stateInput !== null) {
          stateInput.value = 'Validate'
        }

        const restore = statePanel.querySelector<HTMLButtonElement>(
          '[data-state="restore"]'
        )

        if (restore !== null) {
          restore.disabled = true
        }

        const hiddenButton = statePanel.querySelector<HTMLButtonElement>(
          '[data-state="hidden"]'
        )

        hiddenButton?.replaceChildren('Hide selected node')
        host.update(document)
        host.updateViewport({ x: 0, y: 0, zoom: 1 })
        showState('Reset to the original example')
        break
      }

      default: {
        break
      }
    }
  })

  const status = panel.querySelector<HTMLOutputElement>('output')

  const description = panel.querySelector<HTMLParagraphElement>(
    '.flow-demo-description'
  )

  const helper = panel.querySelector<HTMLParagraphElement>('.flow-demo-note')

  const selectAction = (
    action: string,
    copy: { readonly description: string; readonly helper: string }
  ): void => {
    if (description !== null) {
      description.textContent = copy.description
    }

    if (helper !== null) {
      helper.textContent = copy.helper
    }

    for (const button of panel.querySelectorAll<HTMLButtonElement>(
      'button[data-action]'
    )) {
      if (button.dataset.action === action) {
        button.setAttribute('aria-current', 'true')
      } else {
        button.removeAttribute('aria-current')
      }
    }
  }

  let hiddenShown = false
  let validateHidden = false

  const showExample = (example: 'home' | 'remote'): void => {
    placedPanel.hidden = true
    statePanel.hidden = false
    panel.classList.add('flow-demo-panel-with-state-tools')
    interactionSceneActive = false
    delete root.dataset.playgroundScene
    currentDocument = mainDocument
    host.update(currentDocument)
    host.updateViewport(
      example === 'home' ? { x: 0, y: 0, zoom: 1 } : { x: -1730, y: 0, zoom: 1 }
    )

    selectAction(example, playgroundCopy[example])

    for (const button of panel.querySelectorAll<HTMLButtonElement>(
      'button[data-action]'
    )) {
      button.setAttribute(
        'aria-pressed',
        String(button.dataset.action === example)
      )
    }
  }

  const showScene = (
    scene:
      | 'connections'
      | 'resize'
      | 'drag'
      | 'touchReady'
      | 'panels'
      | 'viewport'
  ): void => {
    interactionSceneActive = true
    statePanel.hidden = true
    panel.classList.remove('flow-demo-panel-with-state-tools')
    currentDocument = sceneDocuments[scene]
    const activeAction = scene === 'touchReady' ? 'touch-ready' : scene
    root.dataset.playgroundScene = activeAction
    host.update(currentDocument)
    host.updateViewport({ x: 0, y: 0, zoom: 1 })
    placedPanel.hidden = scene !== 'panels'
    selectAction(scene, playgroundCopy[scene])

    for (const button of panel.querySelectorAll<HTMLButtonElement>(
      'button[data-action]'
    )) {
      button.setAttribute(
        'aria-pressed',
        String(button.dataset.action === activeAction)
      )
    }
  }

  const showFit = async (): Promise<void> => {
    selectAction('fit', playgroundCopy.fitPending)
    const result = await host.fitView()
    selectAction(
      'fit',
      result.status === 'accepted' || result.status === 'proposed'
        ? playgroundCopy.fit
        : playgroundCopy.fitPending
    )
  }

  const toggleConnectionValidation = (button: HTMLButtonElement): void => {
    showExample('home')
    blockOutputConnections = !blockOutputConnections
    button.setAttribute('aria-pressed', String(blockOutputConnections))
    button.textContent = blockOutputConnections
      ? 'Allow Output connections'
      : 'Block Output connections'

    selectAction(
      'validator',
      blockOutputConnections
        ? playgroundCopy.validatorOn
        : playgroundCopy.validatorOff
    )
  }

  const toggleHiddenEdge = (button: HTMLButtonElement): void => {
    showExample('home')
    hiddenShown = !hiddenShown
    currentDocument = {
      ...currentDocument,
      edges: currentDocument.edges.map((edge) =>
        edge.id === 'hidden' ? { ...edge, hidden: !hiddenShown } : edge
      ),
    }
    mainDocument = currentDocument
    host.update(currentDocument)
    button.textContent = hiddenShown ? 'Hide step edge' : 'Show hidden edge'

    selectAction(
      'hidden',
      hiddenShown ? playgroundCopy.hiddenShown : playgroundCopy.hiddenHidden
    )
  }

  const toggleValidationNode = (button: HTMLButtonElement): void => {
    showExample('home')
    validateHidden = !validateHidden
    currentDocument = {
      ...currentDocument,
      nodes: currentDocument.nodes.map((node) =>
        node.id === 'validate' ? { ...node, hidden: validateHidden } : node
      ),
    }
    mainDocument = currentDocument
    host.update(currentDocument)
    button.textContent = validateHidden
      ? 'Show Validate node'
      : 'Hide Validate node'

    selectAction(
      'node',
      validateHidden ? playgroundCopy.nodeHidden : playgroundCopy.nodeShown
    )
  }

  const handleViewportPanelAction = (action: string | undefined): boolean => {
    switch (action) {
      case 'center-selected': {
        const node = host.getNode('viewport-card')

        if (node !== undefined) {
          void host.setCenter(node.position.x + 115, node.position.y + 60, {
            zoom: 1.1,
          })
        }

        return true
      }

      case 'fit-selected': {
        void host.fitView({ nodes: 'selected', duration: 180 })

        return true
      }

      case 'zoom-fractional': {
        void host.zoomTo(0.73, { duration: 180 })

        return true
      }

      case 'conversion-marker': {
        const node = host.getNode('viewport-card')

        const canvas = root.querySelector<HTMLElement>(
          '[data-testid="flow-canvas"]'
        )

        if (node !== undefined && canvas !== null) {
          let marker = canvas.querySelector<HTMLElement>(
            '[data-testid="conversion-marker"]'
          )

          if (marker === null) {
            marker = globalThis.document.createElement('span')
            marker.dataset.testid = 'conversion-marker'
            marker.textContent = 'flow → screen'
            marker.style.position = 'absolute'
            marker.style.zIndex = '20'
            marker.style.pointerEvents = 'none'
            canvas.append(marker)
          }

          const screen = host.flowToScreenPosition({
            x: node.position.x + 115,
            y: node.position.y + 60,
          })

          const bounds = canvas.getBoundingClientRect()
          marker.style.left = `${screen.x - bounds.left}px`
          marker.style.top = `${screen.y - bounds.top}px`
        }

        return true
      }

      case 'animate-viewport': {
        void host.setViewport(
          { x: -240, y: -120, zoom: 1.3 },
          { duration: 900 }
        )

        const resultOutput =
          panel.querySelector<HTMLOutputElement>('.flow-demo-status')

        if (resultOutput !== null) {
          resultOutput.textContent = 'Viewport animation started'
        }

        return true
      }

      case 'cancel-animation': {
        void host.setViewport(host.getViewport())

        const resultOutput =
          panel.querySelector<HTMLOutputElement>('.flow-demo-status')

        if (resultOutput !== null) {
          resultOutput.textContent = 'Viewport animation cancelled'
        }

        return true
      }

      default: {
        return false
      }
    }
  }

  const onPanelClick = (event: MouseEvent): void => {
    const button =
      event.target instanceof HTMLElement
        ? event.target.closest<HTMLButtonElement>('button[data-action]')
        : null

    if (button === null) {
      return
    }

    if (handleViewportPanelAction(button.dataset.action)) {
      return
    }

    switch (button.dataset.action) {
      case 'home': {
        showExample('home')
        break
      }

      case 'remote': {
        showExample('remote')
        break
      }

      case 'connections': {
        showScene('connections')
        break
      }

      case 'resize': {
        showScene('resize')
        break
      }

      case 'drag': {
        showScene('drag')
        break
      }

      case 'touch-ready': {
        showScene('touchReady')
        break
      }

      case 'panels': {
        showScene('panels')
        break
      }

      case 'viewport': {
        showScene('viewport')
        break
      }

      case 'fit': {
        showFit()
        break
      }

      case 'validator': {
        toggleConnectionValidation(button)
        break
      }

      case 'hidden': {
        toggleHiddenEdge(button)
        break
      }

      case 'node': {
        toggleValidationNode(button)
        break
      }

      default: {
        break
      }
    }
  }

  panel.addEventListener('click', onPanelClick)

  const unsubscribe = host.subscribe((change) => {
    currentDocument = applyDocumentChange(currentDocument, change)

    root.dataset.lastChange = JSON.stringify(change)
    root.dataset.edgeCount = String(currentDocument.edges.length)

    if (!interactionSceneActive) {
      mainDocument = currentDocument
    }

    if (status !== null) {
      status.textContent = `${change.kind.replaceAll('-', ' ')} · ${new Date().toLocaleTimeString()}`
    }
  })

  yield* Effect.sync(() => {
    placedPanel.hidden = true
    globalThis.addEventListener(
      'beforeunload',
      () => {
        panel.removeEventListener('click', onPanelClick)
        unsubscribe()
        void host.destroyAsync().finally(() => runtime.dispose())
      },
      { once: true }
    )
  })
}).pipe(Effect.withSpan('flow.app.start'))

void runtime.runPromise(
  program.pipe(Effect.catchCause((cause) => Effect.logFatal(cause)))
)

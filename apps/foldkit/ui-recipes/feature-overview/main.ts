import { createFlowGraph, getBezierPath, NodeIdSchema } from '@flow/core'
import type { FlowDocument, FlowNode, MeasuredNode, NodeId } from '@flow/core'
import {
  createFlowMiniMap,
  flowBaseEdge,
  mountFlowCanvasUI,
  mountFlowNodeToolbar,
  mountFlowPanel,
} from '@flow/foldkit'
import type {
  FlowCanvasUIMount,
  FlowMiniMapMount,
  FlowNodeToolbarMount,
  FoldkitEdgeRenderer,
  FoldkitNodeRenderer,
} from '@flow/foldkit'
import { Option, Schema as S } from 'effect'

import { mountRecipeHost } from '../recipe-host.ts'

import './feature-overview.css'

const ColorDataSchema = S.Struct({ color: S.String })

const colorOf = (data: FlowNode['data']): string =>
  Option.match(S.decodeUnknownOption(ColorDataSchema)(data), {
    onNone: () => '#94a3b8',
    onSome: ({ color }) => color,
  })

/** Custom node: an annotation card with its own markup. */
const annotationNode: FoldkitNodeRenderer = (node, h) =>
  h.div(
    [h.Class('overview-annotation'), h.DataAttribute('testid', 'custom-node')],
    [
      h.span(
        [
          h.Class('overview-swatch'),
          h.Style({ background: colorOf(node.data) }),
        ],
        []
      ),
      h.span([], [node.label]),
    ]
  )

/** Custom edge: a bezier with a label button in the edge label layer. */
const labeledEdge: FoldkitEdgeRenderer = (edge, { props }, h, labels) => {
  const [path, labelX, labelY] = getBezierPath(props)

  labels(
    h.div(
      [
        h.Class('overview-edge-label'),
        h.DataAttribute('testid', 'custom-edge'),
        h.Style({
          position: 'absolute',
          left: '0',
          top: '0',
          transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
        }),
      ],
      [edge.label ?? edge.id]
    )
  )

  return flowBaseEdge(h, { path, markerEnd: props.markerEnd })
}

/** Foldkit edges have no `animated` flag; a recipe edge animates its dash. */
const animatedEdge: FoldkitEdgeRenderer = (_edge, { props }, h) =>
  flowBaseEdge(h, {
    path: getBezierPath(props)[0],
    markerEnd: props.markerEnd,
    className: 'overview-animated',
    attributes: { 'data-testid': 'animated-edge' },
  })

const handles = [
  { id: 'in', kind: 'target', side: 'top' },
  { id: 'out', kind: 'source', side: 'bottom' },
] as const

const node = (id: string, label: string, x: number, y: number) => ({
  id,
  label,
  position: { x, y },
  handles,
})

const edge = (source: string, target: string) => ({
  id: `e-${source}-${target}`,
  source,
  sourceHandle: 'out',
  target,
  targetHandle: 'in',
})

const host = mountRecipeHost({
  page: 'feature-overview-page',
  document: {
    nodes: [
      node('input', 'Input', 260, 0),
      node('default', 'Default node', 60, 140),
      node('output', 'Output', 60, 300),
      {
        ...node('annotation', 'Annotation', 420, 140),
        type: 'annotation',
        data: { color: '#f97316' },
      },
      {
        ...node('resizable', 'Select me to resize', 420, 300),
        size: { width: 180, height: 56 },
      },
    ],
    edges: [
      { ...edge('input', 'default'), markerEnd: 'arrowclosed' },
      {
        ...edge('default', 'output'),
        path: 'smoothstep',
        label: 'smoothstep',
        markerEnd: 'arrow',
      },
      {
        ...edge('input', 'annotation'),
        type: 'labeled',
        label: 'custom edge',
        markerEnd: 'arrowclosed',
      },
      { ...edge('annotation', 'resizable'), type: 'animated' },
    ],
  },
  registry: {
    nodeTypes: { annotation: annotationNode },
    edgeTypes: { labeled: labeledEdge, animated: animatedEdge },
  },
})

const measurements = new Map<NodeId, MeasuredNode>()

const graphOf = (document: FlowDocument) =>
  createFlowGraph(document, measurements)

let canvasUi: FlowCanvasUIMount | undefined

let miniMap: FlowMiniMapMount | undefined

const toolbars: FlowNodeToolbarMount[] = []

const refreshCanvasUi = (): void => {
  const graph = graphOf(host.document())
  const viewport = host.viewport()
  canvasUi?.updateViewport(viewport)
  miniMap?.update(graph, viewport)

  for (const toolbar of toolbars) {
    toolbar.update(graph, viewport)
  }

  host.status.dataset.zoom = String(Math.round(viewport.zoom * 1000) / 1000)
  host.status.dataset.selected = host
    .document()
    .nodes.filter(({ selected }) => selected === true)
    .map(({ id }) => id)
    .join(',')
  host.status.value = `zoom:${host.status.dataset.zoom}`
}

const toolbarFor = (nodeId: string): HTMLElement => {
  const content = document.createElement('div')
  content.className = 'overview-toolbar'
  content.dataset.testid = 'overview-node-toolbar'
  content.dataset.for = nodeId

  const remove = document.createElement('button')
  remove.type = 'button'
  remove.textContent = `Delete ${nodeId}`
  remove.addEventListener('click', () => {
    void host.edit([{ kind: 'delete-elements', nodeIds: [nodeId] }])
  })
  content.append(remove)

  return content
}

/** Mount the canvas UI once Foldkit has rendered the pane, and keep it mounted. */
const mountCanvasUi = (): void => {
  const pane = host.pane()

  if (pane === null) {
    return
  }

  if (canvasUi?.canvas === pane) {
    canvasUi.ensureMounted()

    return
  }

  canvasUi?.dispose()
  miniMap?.dispose()

  canvasUi = mountFlowCanvasUI(pane, host.viewportClient, {
    position: 'bottom-left',
    background: { variant: 'dots', gap: 16 },
  })
  canvasUi.element.dataset.testid = 'overview-controls'
  miniMap = createFlowMiniMap(
    pane.ownerDocument,
    pane,
    host.viewportClient,
    graphOf(host.document()),
    host.viewport()
  )

  const panel = document.createElement('div')
  panel.className = 'overview-panel'
  panel.dataset.testid = 'overview-panel'
  panel.innerHTML =
    '<strong>Feature Overview</strong><p>Custom nodes and edges, minimap, controls, background, toolbars and resizing.</p>'
  mountFlowPanel(pane, panel, { position: 'top-right', ariaLabel: 'Overview' })

  for (const { id } of host.document().nodes) {
    toolbars.push(
      mountFlowNodeToolbar(pane, toolbarFor(id), {
        nodeId: NodeIdSchema.make(id),
        position: 'top',
      })
    )
  }

  refreshCanvasUi()
}

const paneObserver = new MutationObserver(mountCanvasUi)

paneObserver.observe(host.frame, { childList: true, subtree: true })

mountCanvasUi()

host.onDispose(() => {
  paneObserver.disconnect()
  canvasUi?.dispose()
  miniMap?.dispose()

  for (const toolbar of toolbars) {
    toolbar.dispose()
  }
})

host.onAccepted(refreshCanvasUi)

host.runtime.ports.viewportResults.subscribe(refreshCanvasUi)

let fitted = false

const fitOnce = async (): Promise<void> => {
  await host.viewportClient.fitView('all', 0.15)
  host.status.dataset.fitted = 'true'
  refreshCanvasUi()
}

host.runtime.ports.measurementResults.subscribe((result) => {
  if (result.status !== 'measured' || result.internalNode === null) {
    return
  }

  const nodeId = NodeIdSchema.make(result.internalNode.node.id)
  measurements.set(nodeId, {
    nodeId,
    width: result.internalNode.width,
    height: result.internalNode.height,
  })
  refreshCanvasUi()

  // Start with fitView once every node has a measured size.
  if (!fitted && result.nodesInitialized) {
    fitted = true
    void fitOnce()
  }
})

// Foldkit reports node clicks; selecting the clicked node shows its toolbar
// and Foldkit's resize controls.
host.runtime.ports.interactionEvents.subscribe((events) => {
  const clicked = events.find(({ name }) => name === 'onNodeClick')?.nodeId

  if (clicked === undefined || clicked === null) {
    return
  }

  void host.edit(
    host.document().nodes.map(({ id }) => ({
      kind: 'update-node' as const,
      nodeId: id,
      patch: { selected: id === clicked },
    }))
  )
})

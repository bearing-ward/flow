import {
  createFlowGraph,
  FlowDocumentSchema,
  FlowChangeSchema,
  ViewportSchema,
  NodeIdSchema,
} from '@flow/core'
import type { FlowDocument, MeasuredNode, NodeId } from '@flow/core'
import {
  createProgram,
  createViewportClient,
  defaultInteractionOptions,
  createFoldkitNodeMeasurementObserver,
  createFoldkitDeleteClient,
  createFoldkitInteractivity,
  createFoldkitInteractionHandlers,
  createFlowControls,
  createFlowMiniMap,
  createFlowBackground,
  alignFlowBackgroundToViewport,
  HostAction,
} from '@flow/foldkit'
import type { ports, FlowControlsMount, FlowMiniMapMount } from '@flow/foldkit'
import { Schema as S } from 'effect'
import { Runtime } from 'foldkit'

import { upstreamExampleConfig } from '../../../packages/conformance/src/upstream-examples/index.ts'
import { applyUpstreamChange } from '../../../packages/conformance/src/upstream-generic/index.ts'
import {
  exampleOptions,
  mountExamplePanel,
  prepareExampleRoot,
  renderedExampleReady,
} from '../../shared/upstream/examples.ts'

import '@flow/foldkit/style.css'

const root = prepareExampleRoot()

const name = location.pathname.slice('/upstream-examples/'.length)

const config = upstreamExampleConfig(name)

const { minZoom, maxZoom, selectionMode, ...options } = exampleOptions(
  name,
  config,
  root
)

const container = document.createElement('div')

container.id = 'upstream-example-foldkit'

root.append(container)

let viewport = S.decodeUnknownSync(ViewportSchema)({ x: 0, y: 0, zoom: 1 })

let accepted: FlowDocument = config.document

const runtime = Runtime.embed<typeof ports, never, 'Element'>(
  createProgram(
    container,
    accepted,
    viewport,
    [],
    'controlled',
    'uncontrolled',
    {
      nodeTypes: {
        dragHandleNode: (_node, h) =>
          h.div(
            [h.Class('upstream-custom-drag-content')],
            [
              'Only draggable here → ',
              h.span([h.Class('custom-drag-handle')], []),
            ]
          ),
      },
    },
    { minZoom: minZoom ?? 0.5, maxZoom: maxZoom ?? 2 },
    selectionMode ?? 'full',
    {
      ...defaultInteractionOptions,
      ...options,
      fitView: false,
      panOnDrag: options.panOnDrag ?? true,
      isValidConnection: () => true,
      zoomOnScroll: options.zoomOnScroll ?? true,
      zoomOnDoubleClick: options.zoomOnDoubleClick ?? true,
    }
  )
)

const handlers = createFoldkitInteractionHandlers(runtime.ports)

const recordClick = () => {
  root.dataset.clicks = String(Number(root.dataset.clicks ?? 0) + 1)
}

const deleteClient = createFoldkitDeleteClient(runtime, () => true)

const interactivity = createFoldkitInteractivity(runtime.ports)

const viewportClient = createViewportClient(
  runtime.ports,
  () => {
    const bounds = root.getBoundingClientRect()

    return {
      width: bounds.width,
      height: bounds.height,
      originX: bounds.left,
      originY: bounds.top,
    }
  },
  viewport,
  { minZoom: minZoom ?? 0.5, maxZoom: maxZoom ?? 2 }
)

const measurements = new Map<NodeId, MeasuredNode>()

let controls: FlowControlsMount | undefined

let minimap: FlowMiniMapMount | undefined

let background: SVGSVGElement | undefined

const updateUI = () => {
  const pane = root.querySelector<HTMLElement>('.flow-foldkit-canvas')

  if (!pane) {
    return
  }

  if (config.className) {
    pane.classList.add(config.className)
  }

  if (config.controls && !controls) {
    controls = createFlowControls(document, viewportClient, { interactivity })
  }

  if (controls && controls.element.parentElement !== pane) {
    pane.append(controls.element)
  }

  const graph = createFlowGraph(accepted, measurements)

  if (config.minimap && !minimap) {
    minimap = createFlowMiniMap(document, pane, viewportClient, graph, viewport)
  }

  minimap?.update(graph, viewport)

  if (minimap && minimap.element.parentElement !== pane) {
    pane.append(minimap.element)
  }

  if (config.background && !background) {
    background = createFlowBackground(document, { variant: config.background })
    background.classList.add('flow-foldkit-background-overlay')
  }

  if (background) {
    alignFlowBackgroundToViewport(background, viewport)
  }

  if (background && background.parentElement !== pane) {
    pane.prepend(background)
  }
}

let fitStarted = false

let stopReady: (() => void) | undefined

const ready = async () => {
  if (
    fitStarted ||
    measurements.size <
      config.document.nodes.filter((node) => !node.hidden).length
  ) {
    return
  }

  fitStarted = true

  const response = options.fitView
    ? await viewportClient.fitView(options.fitViewOptions)
    : { viewport }

  updateUI()
  stopReady = renderedExampleReady(
    root,
    '.flow-foldkit-viewport',
    response.viewport
  )
}

const stopMeasurements = runtime.ports.measurementResults.subscribe(
  (result) => {
    if (result.status === 'measured' && result.internalNode) {
      const nodeId = NodeIdSchema.make(result.internalNode.node.id)
      measurements.set(nodeId, {
        nodeId,
        width: result.internalNode.width,
        height: result.internalNode.height,
      })
      updateUI()
      void ready()
    }
  }
)

const stopChanges = runtime.ports.changes.subscribe((change) => {
  const next = applyUpstreamChange(
    accepted,
    S.decodeUnknownSync(FlowChangeSchema)(change)
  )

  if (next !== accepted) {
    accepted = next
    runtime.ports.actions.send(HostAction.ReplaceDocument({ document: next }))
  }
})

const stopStates = runtime.ports.acceptedStates.subscribe(({ current }) => {
  viewport = S.decodeUnknownSync(ViewportSchema)(current.viewport)
  accepted = S.decodeUnknownSync(FlowDocumentSchema)(current.document)
  updateUI()
})

const observer = createFoldkitNodeMeasurementObserver({
  owner: root,
  zoom: () => {
    const rendered = root.querySelector<HTMLElement>('.flow-foldkit-viewport')

    return rendered ? new DOMMatrix(getComputedStyle(rendered).transform).a : 1
  },
  onMeasure: ({ requestId, measurement }) => {
    runtime.ports.actions.send(
      HostAction.MeasureNode({ requestId, measurement })
    )
  },
})

const stopPanel = mountExamplePanel(root, name, {
  getDocument: () => accepted,
  replaceDocument: (document) => {
    accepted = document
    runtime.ports.actions.send(HostAction.ReplaceDocument({ document }))
  },
  setInteractivity: (patch) => interactivity.set(patch),
  setCanvasOptions: (patch) => {
    runtime.ports.actions.send(HostAction.SetCanvasOptions({ options: patch }))
  },
  setCaptureClicks: (capture) => {
    handlers.set(
      capture ? { onNodeClick: recordClick, onEdgeClick: recordClick } : {}
    )
  },
})

const mountObserver = new MutationObserver(() => {
  updateUI()
  void ready()
})

mountObserver.observe(root, { childList: true })

updateUI()

void ready()

window.addEventListener(
  'pagehide',
  () => {
    mountObserver.disconnect()
    stopReady?.()
    stopPanel()
    stopMeasurements()
    stopChanges()
    stopStates()
    observer.dispose()
    controls?.dispose()
    minimap?.dispose()
    interactivity.dispose()
    handlers.dispose()
    deleteClient.dispose()
    viewportClient.dispose()
  },
  { once: true }
)

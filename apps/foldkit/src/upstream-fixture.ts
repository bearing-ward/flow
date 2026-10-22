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
  mountFlowNodeToolbar,
  createFlowBackground,
  createFoldkitDeleteClient,
  HostAction,
} from '@flow/foldkit'
import type { ports } from '@flow/foldkit'
import { Schema } from 'effect'
import { Runtime } from 'foldkit'

import {
  upstreamGenericConfig,
  applyUpstreamChange,
  toolbarOptions,
} from '../../../packages/conformance/src/upstream-generic/index.ts'
import {
  prepareUpstreamRoot,
  colorModeSelect,
  toolbarVisibility,
  toolbarContent,
} from '../../shared/upstream/fixture.ts'

import '@flow/foldkit/style.css'

const root = prepareUpstreamRoot()

const container = document.createElement('div')

container.id = 'upstream-foldkit'

root.append(container)

const path = location.pathname.slice('/upstream/'.length)

const config = upstreamGenericConfig(path)

const {
  defaultViewport,
  minZoom,
  maxZoom,
  panOnDrag,
  panActivationKeyCode: _panActivationKeyCode,
  ...options
} = config.options

let viewport = Schema.decodeUnknownSync(ViewportSchema)(
  defaultViewport ?? { x: 0, y: 0, zoom: 1 }
)

const runtime = Runtime.embed<typeof ports, never, 'Element'>(
  createProgram(
    container,
    config.document,
    viewport,
    [],
    'controlled',
    'uncontrolled',
    {
      nodeTypes: {
        ToolbarNode: (node, h) => h.div([], [node.label]),
        DragHandleNode: (_node, h) =>
          h.div(
            [h.Class('upstream-drag-content')],
            [h.div([h.Class('custom-drag-handle')], [])]
          ),
      },
    },
    { minZoom: minZoom ?? 0.5, maxZoom: maxZoom ?? 2 },
    'full',
    {
      ...defaultInteractionOptions,
      isValidConnection: () => true,
      fitView: options.fitView ?? false,
      deleteKeyCode: options.deleteKeyCode ?? 'Backspace',
      multiSelectionKeyCode: options.multiSelectionKeyCode ?? [
        'Meta',
        'Control',
      ],
      nodeDragThreshold: options.nodeDragThreshold ?? 1,
      panOnScroll: options.panOnScroll ?? false,
      autoPanOnNodeDrag: options.autoPanOnNodeDrag ?? true,
      autoPanOnConnect: options.autoPanOnConnect ?? true,
      panOnDrag: panOnDrag === undefined,
      selectionOnDrag: options.selectionOnDrag ?? false,
      zoomOnScroll: options.zoomOnScroll ?? true,
    }
  )
)

const deleteClient = createFoldkitDeleteClient(runtime, () => true)

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

const expectedMeasurements = config.document.nodes.filter(
  (node) => node.hidden !== true
).length

let initialFitStarted = false

let mountObserver: MutationObserver | undefined

const completeMount = async () => {
  if (initialFitStarted || measurements.size < expectedMeasurements) {
    return
  }

  initialFitStarted = true

  const { viewport: fittedViewport } =
    options.fitView === true ? await viewportClient.fitView() : { viewport }

  const expectedStyle = document.createElement('div').style
  expectedStyle.transform = `translate(${fittedViewport.x}px, ${fittedViewport.y}px) scale(${fittedViewport.zoom})`

  const completeRender = () => {
    const rendered = root.querySelector<HTMLElement>('.flow-foldkit-viewport')

    if (rendered?.style.transform === expectedStyle.transform) {
      mountObserver?.disconnect()
      root.dataset.upstreamReady = 'true'
    }
  }

  mountObserver = new MutationObserver(completeRender)
  mountObserver.observe(root, {
    attributes: true,
    attributeFilter: ['style'],
    childList: true,
    subtree: true,
  })
  completeRender()
}

const toolbars = config.document.nodes
  .filter((node) => node.type === 'ToolbarNode')
  .map((node) => {
    const data = toolbarOptions(node)
    const visibility = toolbarVisibility(data.toolbarVisible)

    return mountFlowNodeToolbar(root, toolbarContent(), {
      nodeId: node.id,
      position: data.toolbarPosition,
      align: data.toolbarAlign ?? 'center',
      ...visibility,
    })
  })

let acceptedDocument: FlowDocument = config.document

const updateToolbars = () => {
  const graph = createFlowGraph(acceptedDocument, measurements)

  for (const toolbar of toolbars) {
    toolbar.update(graph, viewport)
  }
}

const unsubscribeMeasurements = runtime.ports.measurementResults.subscribe(
  (result) => {
    if (result.status === 'measured' && result.internalNode !== null) {
      const nodeId = NodeIdSchema.make(result.internalNode.node.id)
      measurements.set(nodeId, {
        nodeId,
        width: result.internalNode.width,
        height: result.internalNode.height,
      })
      updateToolbars()
      void completeMount()
    }
  }
)

const unsubscribeChanges = runtime.ports.changes.subscribe((change) => {
  const next = applyUpstreamChange(
    acceptedDocument,
    Schema.decodeUnknownSync(FlowChangeSchema)(change)
  )

  if (next !== acceptedDocument) {
    acceptedDocument = next
    runtime.ports.actions.send(HostAction.ReplaceDocument({ document: next }))
  }
})

const unsubscribe = runtime.ports.acceptedStates.subscribe((change) => {
  viewport = Schema.decodeUnknownSync(ViewportSchema)(change.current.viewport)

  acceptedDocument = Schema.decodeUnknownSync(FlowDocumentSchema)(
    change.current.document
  )
  updateToolbars()
})

const graph = createFlowGraph(config.document)

for (const toolbar of toolbars) {
  toolbar.update(graph, viewport)
}

const observer = createFoldkitNodeMeasurementObserver({
  owner: root,
  zoom: () => viewport.zoom,
  onMeasure: ({ requestId, measurement }) => {
    runtime.ports.actions.send(
      HostAction.MeasureNode({ requestId, measurement })
    )
  },
})

if (path === 'color-mode') {
  colorModeSelect(root, (mode) => {
    runtime.ports.actions.send(HostAction.SetColorMode({ mode }))
  })
}

if (path === 'backgrounds') {
  for (const backgroundOptions of [
    { id: 'pattern-flow-a0', variant: 'dots' },
    { id: 'pattern-flow-d1', variant: 'lines', gap: 100, offset: 2 },
  ] as const) {
    root.append(createFlowBackground(document, backgroundOptions))
  }
}

window.addEventListener(
  'pagehide',
  () => {
    mountObserver?.disconnect()
    observer.dispose()
    viewportClient.dispose()
    unsubscribe()
    unsubscribeChanges()
    unsubscribeMeasurements()

    for (const toolbar of toolbars) {
      toolbar.dispose()
    }

    deleteClient.dispose()
  },
  { once: true }
)

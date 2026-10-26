import {
  flowFigureNodeType,
  createFlowGraph,
  FlowStateChangeSchema,
} from '@flow/core'
import type { FlowDocument, Viewport } from '@flow/core'
import {
  createProgram,
  createFoldkitFlowInstance,
  createFoldkitHistoryClient,
  createFoldkitClipboardClient,
  createFoldkitNodeMeasurementObserver,
  createFlowMiniMap,
  createFoldkitFigureMiniMapNode,
  createViewportClient,
  defaultInteractionOptions,
  foldkitFigureNodeRenderer,
  HostAction,
} from '@flow/foldkit'
import { Schema as S } from 'effect'
import { Runtime } from 'foldkit'

import {
  mountFiguresControls,
  figuresDocument,
} from '../../shared/shapes/demo.ts'

import '@flow/foldkit/style.css'
import '../../shared/shapes/style.css'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing shapes root')
}

const container = document.createElement('div')

container.id = 'shapes-runtime'

root.append(container)

let current: FlowDocument = figuresDocument()

let viewport: Viewport = { x: 0, y: 0, zoom: 1 }

const runtime = Runtime.embed(
  createProgram(
    container,
    current,
    viewport,
    [],
    'uncontrolled',
    'uncontrolled',
    {
      nodeTypes: { [flowFigureNodeType]: foldkitFigureNodeRenderer },
    },
    undefined,
    'full',
    {
      ...defaultInteractionOptions,
      nodesResizable: true,
      isValidConnection: () => true,
      panOnDrag: true,
      selectionOnDrag: false,
      zoomOnScroll: true,
      autoPanOnNodeFocus: false,
    }
  )
)

const instance = createFoldkitFlowInstance(runtime.ports)

const history = createFoldkitHistoryClient(runtime.ports)

const clipboard = createFoldkitClipboardClient(runtime.ports)

const observer = createFoldkitNodeMeasurementObserver({
  owner: root,
  zoom: () => viewport.zoom,
  onMeasure: (requests) =>
    runtime.ports.actions.send(HostAction.MeasureNodes({ requests })),
})

const viewportClient = createViewportClient(
  runtime.ports,
  () => {
    const rect = root.getBoundingClientRect()

    return {
      width: rect.width,
      height: rect.height,
      originX: rect.left,
      originY: rect.top,
    }
  },
  viewport,
  { minZoom: 0.5, maxZoom: 2 }
)

const miniMap = createFlowMiniMap(
  document,
  root,
  viewportClient,
  createFlowGraph(current),
  viewport,
  {
    nodeComponent: (props, owner) =>
      createFoldkitFigureMiniMapNode(
        props,
        current.nodes.find((node) => node.id === props.id),
        owner
      ),
  }
)

const stops = new Set<() => void>()

const controls = mountFiguresControls({
  document: () =>
    instance.toObject().then(({ nodes, edges }) => ({ nodes, edges })),
  history: history.getStatus,
  edit: async (transaction) => {
    await instance.applyEdit(transaction.operations)
  },
  undo: history.undo,
  redo: history.redo,
  copy: clipboard.copySelection,
  paste: clipboard.pasteSelection,
  viewport: (next) =>
    runtime.ports.actions.send(HostAction.ReplaceViewport({ viewport: next })),
  dispose: () => {
    for (const release of stops) {
      release()
    }

    controls.dispose()
    miniMap.dispose()
    viewportClient.dispose()
    observer.dispose()
    history.dispose()
    instance.dispose()
    runtime.dispose()
  },
})

stops.add(
  runtime.ports.acceptedStates.subscribe((input) => {
    const state = S.decodeUnknownSync(FlowStateChangeSchema)(input)

    ;({ document: current, viewport } = state.current)
    miniMap.update(createFlowGraph(current), viewport)
    controls.refresh(current)
  })
)

window.addEventListener(
  'pagehide',
  () => {
    for (const release of stops) {
      release()
    }

    controls.dispose()
    miniMap.dispose()
    viewportClient.dispose()
    observer.dispose()
    history.dispose()
    instance.dispose()
    runtime.dispose()
  },
  { once: true }
)

import { flowFigureNodeType, FlowStateChangeSchema } from '@flow/core'
import {
  createProgram,
  createFoldkitFlowInstance,
  createFoldkitHistoryClient,
  createFoldkitClipboardClient,
  foldkitFigureNodeRenderer,
  createFoldkitNodeMeasurementObserver,
  createViewportClient,
  defaultInteractionOptions,
  HostAction,
} from '@flow/foldkit'
import { Schema as S } from 'effect'
import { Runtime } from 'foldkit'

import {
  rotationDocument,
  mountRotationControls,
} from '../../shared/rotatable-node/demo.ts'

import '@flow/foldkit/style.css'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing animation root')
}

const container = document.createElement('div')

container.id = 'rotation-runtime'

root.append(container)

let current = rotationDocument()

const runtime = Runtime.embed(
  createProgram(
    container,
    current,
    { x: 0, y: 0, zoom: 1 },
    [],
    'uncontrolled',
    'uncontrolled',
    { nodeTypes: { [flowFigureNodeType]: foldkitFigureNodeRenderer } },
    undefined,
    'full',
    {
      ...defaultInteractionOptions,
      autoPanOnNodeFocus: false,
      panOnDrag: true,
      zoomOnScroll: true,
      isValidConnection: () => true,
      selectionOnDrag: false,
    }
  )
)

let zoom = 1

const stopAccepted = runtime.ports.acceptedStates.subscribe((input) => {
  const state = S.decodeUnknownSync(FlowStateChangeSchema)(input)
  current = state.current.document
  ;({ zoom } = state.current.viewport)
})

const instance = createFoldkitFlowInstance(runtime.ports)

const history = createFoldkitHistoryClient(runtime.ports)

const clipboard = createFoldkitClipboardClient(runtime.ports)

const measurement = createFoldkitNodeMeasurementObserver({
  owner: root,
  zoom: () => zoom,
  onMeasure: (requests) =>
    runtime.ports.actions.send(HostAction.MeasureNodes({ requests })),
})

const viewport = createViewportClient(
  runtime.ports,
  () => ({
    width: root.clientWidth,
    height: root.clientHeight,
    originX: root.getBoundingClientRect().left,
    originY: root.getBoundingClientRect().top,
  }),
  { x: 0, y: 0, zoom: 1 }
)

const dispose = () => {
  stopAccepted()
  history.dispose()
  instance.dispose()
  measurement.dispose()
  viewport.dispose()
  runtime.dispose()
}

const controls = mountRotationControls({
  refresh: async (id) => {
    const element = root.querySelector(
      `[data-testid="flow-node"][data-node-id="${CSS.escape(id)}"]`
    )

    if (element !== null) {
      measurement.measure(element)
    }

    await instance.getInternalNode(id)
  },
  document: () => Promise.resolve(current),
  edit: async (transaction) => {
    await instance.applyEdit(transaction.operations)
  },
  history: history.getStatus,
  undo: history.undo,
  redo: history.redo,
  copy: clipboard.copySelection,
  paste: clipboard.pasteSelection,
  viewport: (value) => {
    ;({ zoom } = value)

    return viewport.setViewport(value)
  },
  dispose,
})

window.addEventListener(
  'pagehide',
  () => {
    controls.dispose()
    dispose()
  },
  { once: true }
)

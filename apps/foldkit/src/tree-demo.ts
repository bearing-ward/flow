import { getFlowLayoutInput, FlowStateChangeSchema } from '@flow/core'
import {
  createProgram,
  createFoldkitFlowInstance,
  createFoldkitHistoryClient,
  createFoldkitClipboardClient,
  createFoldkitNodeAnimationClient,
  createFoldkitNodeMeasurementObserver,
  createViewportClient,
  defaultInteractionOptions,
  HostAction,
} from '@flow/foldkit'
import { Schema as S } from 'effect'
import { Runtime } from 'foldkit'

import { treeDocument, mountTreeControls } from '../../shared/tree/demo.ts'

import '@flow/foldkit/style.css'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing animation root')
}

const container = document.createElement('div')

container.id = 'tree-runtime'

root.append(container)

let current = treeDocument()

const runtime = Runtime.embed(
  createProgram(
    container,
    current,
    { x: 0, y: 0, zoom: 1 },
    [],
    'uncontrolled',
    'uncontrolled',
    {},
    undefined,
    'full',
    {
      ...defaultInteractionOptions,
      autoPanOnNodeFocus: false,
      panOnDrag: true,
      selectionOnDrag: false,
    }
  )
)

const stopAccepted = runtime.ports.acceptedStates.subscribe((input) => {
  const state = S.decodeUnknownSync(FlowStateChangeSchema)(input)
  current = state.current.document
})

const instance = createFoldkitFlowInstance(runtime.ports)

const history = createFoldkitHistoryClient(runtime.ports)

const clipboard = createFoldkitClipboardClient(runtime.ports)

const animation = createFoldkitNodeAnimationClient(runtime.ports)

let zoom = 1

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
  animation.dispose()
  history.dispose()
  instance.dispose()
  measurement.dispose()
  viewport.dispose()
  runtime.dispose()
}

const controls = mountTreeControls({
  read: async () => {
    const document = current

    const internals = await Promise.all(
      document.nodes.map((node) => instance.getInternalNode(node.id))
    )

    return {
      document,
      input: getFlowLayoutInput(document, (id) =>
        internals.find((node) => node?.node.id === id)
      ),
    }
  },
  animate: animation.animateNodePositions,
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

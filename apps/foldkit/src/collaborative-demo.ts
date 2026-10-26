import { flowFigureNodeType, FlowStateChangeSchema } from '@flow/core'

import '@flow/foldkit/style.css'
import {
  createProgram,
  foldkitFigureNodeRenderer,
  createFoldkitFlowInstance,
  createFoldkitSnapshotClient,
  createFoldkitClipboardClient,
  createFoldkitNodeMeasurementObserver,
  defaultInteractionOptions,
  HostAction,
} from '@flow/foldkit'
import { Schema } from 'effect'
import { Runtime } from 'foldkit'

import { mountCollaborativeDemo } from '../../shared/collaborative/demo.ts'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing room canvas')
}

const container = document.createElement('div')

container.id = 'collaborative-runtime'

root.append(container)

const runtime = Runtime.embed(
  createProgram(
    container,
    { nodes: [], edges: [] },
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
      zoomOnDoubleClick: true,
      selectionOnDrag: false,
    }
  )
)

const instance = createFoldkitFlowInstance(runtime.ports)

const snapshots = createFoldkitSnapshotClient(runtime.ports)

const clipboard = createFoldkitClipboardClient(runtime.ports)

let zoom = 1

const read = async () => {
  const result = await snapshots.requestVersioned()

  if (result.status !== 'succeeded') {
    throw new Error(result.status)
  }

  ;({ zoom } = result.response.snapshot.viewport)

  return result.response.snapshot
}

const observer = createFoldkitNodeMeasurementObserver({
  owner: root,
  zoom: () => zoom,
  onMeasure: (requests) =>
    runtime.ports.actions.send(HostAction.MeasureNodes({ requests })),
})

await mountCollaborativeDemo({
  owner: root,
  read,
  live: async () => {
    const snapshot = await read()

    return snapshot.document
  },
  replace: async (document, context) => {
    runtime.ports.actions.send(
      HostAction.ReplaceDocument({ document, context })
    )
    await read()
  },
  subscribe: (listener) =>
    runtime.ports.acceptedStates.subscribe((input) => {
      const change = Schema.decodeUnknownSync(FlowStateChangeSchema)(input)

      ;({ zoom } = change.current.viewport)
      listener(change)
    }),
  apply: async (transaction) => {
    await instance.applyEdit(transaction.operations)
  },
  screenToFlow: async (position) => {
    const { viewport } = await read()
    const bounds = root.getBoundingClientRect()

    return {
      x: (position.x - bounds.x - viewport.x) / viewport.zoom,
      y: (position.y - bounds.y - viewport.y) / viewport.zoom,
    }
  },
  copy: clipboard.copySelection,
  paste: (options) => {
    clipboard.pasteSelection(options)
  },
  dispose: () => {
    observer.dispose()
    instance.dispose()
    snapshots.dispose()
    runtime.dispose()
  },
})

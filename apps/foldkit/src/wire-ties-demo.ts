import '@flow/foldkit/style.css'
import type { FlowRoutingResult } from '@flow/core'
import { flowMeasurementsFromInternalNodes } from '@flow/core'
import {
  createProgram,
  createFoldkitClipboardClient,
  createFoldkitFlowInstance,
  createFoldkitHistoryClient,
  createFoldkitSnapshotClient,
  createFoldkitNodeMeasurementObserver,
  defaultInteractionOptions,
  HostAction,
} from '@flow/foldkit'
import { Runtime } from 'foldkit'

import { mountWireTiesDemo } from '../../shared/wire-ties/demo.ts'
import { wireTiesDocument } from '../../shared/wire-ties/document.ts'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing wire tie root')
}

const container = document.createElement('div')

container.id = 'wire-ties-runtime'

root.append(container)

const runtime = Runtime.embed(
  createProgram(
    container,
    wireTiesDocument(),
    { x: 0, y: 0, zoom: 1 },
    ['a', 'b', 'c', 'd'],
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

const snapshots = createFoldkitSnapshotClient(runtime.ports)

const instance = createFoldkitFlowInstance(runtime.ports)

const history = createFoldkitHistoryClient(runtime.ports)

const clipboard = createFoldkitClipboardClient(runtime.ports)

let routes: FlowRoutingResult | undefined

let zoom = 1

const observer = createFoldkitNodeMeasurementObserver({
  owner: root,
  zoom: () => zoom,
  onMeasure: (requests) =>
    runtime.ports.actions.send(HostAction.MeasureNodes({ requests })),
})

void mountWireTiesDemo({
  owner: root,
  publishRouting: (result) => {
    routes = result
    runtime.ports.actions.send(HostAction.SetEdgeRouting({ result }))
  },
  object: () => instance.toObject(),
  read: async () => {
    const result = await snapshots.requestVersioned()

    if (result.status !== 'succeeded') {
      throw new Error(result.status)
    }

    return result.response.snapshot
  },
  geometry: async () => ({
    edgeRouting: routes,
    measurements: flowMeasurementsFromInternalNodes(
      await instance.getInternalNodes()
    ),
  }),
  apply: async (transaction) => {
    await instance.applyEdit(transaction.operations)
  },
  viewport: (viewport) => {
    ;({ zoom } = viewport)
    runtime.ports.actions.send(HostAction.ReplaceViewport({ viewport }))
  },
  history: history.getStatus,
  undo: history.undo,
  redo: history.redo,
  copy: clipboard.copySelection,
  paste: clipboard.pasteSelection,
  dispose: () => {
    observer.dispose()
    instance.dispose()
    history.dispose()
    snapshots.dispose()
    runtime.dispose()
  },
})

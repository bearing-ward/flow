import {
  createProgram,
  createFoldkitFlowInstance,
  createFoldkitSnapshotClient,
  createFoldkitNodeMeasurementObserver,
  defaultInteractionOptions,
  HostAction,
} from '@flow/foldkit'
import { Runtime } from 'foldkit'

import {
  edgeRoutingDocument,
  mountEdgeRoutingDemo,
} from '../../shared/edge-routing/demo.ts'

import '@flow/foldkit/style.css'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing routing root')
}

const container = document.createElement('div')

container.id = 'routing-runtime'

root.append(container)

const runtime = Runtime.embed(
  createProgram(
    container,
    edgeRoutingDocument(),
    { x: 0, y: 0, zoom: 1 },
    [],
    'uncontrolled',
    'uncontrolled',
    {},
    undefined,
    'full',
    {
      ...defaultInteractionOptions,
      editableEdges: true,
      autoPanOnNodeFocus: false,
    }
  )
)

const instance = createFoldkitFlowInstance(runtime.ports)

const snapshots = createFoldkitSnapshotClient(runtime.ports)

let zoom = 1

const observer = createFoldkitNodeMeasurementObserver({
  owner: root,
  zoom: () => zoom,
  onMeasure: (requests) =>
    runtime.ports.actions.send(HostAction.MeasureNodes({ requests })),
})

mountEdgeRoutingDemo({
  read: async () => {
    const response = await snapshots.requestVersioned()

    if (response.status !== 'succeeded') {
      throw new Error(response.status)
    }

    return response.response.snapshot.document
  },
  internals: instance.getInternalNodes,
  publish: (result) => {
    runtime.ports.actions.send(
      HostAction.SetEdgeRouting({ result: result ?? null })
    )
  },
  apply: async (document) => {
    await instance.applyEdit([
      { kind: 'set-nodes', nodes: document.nodes },
      { kind: 'set-edges', edges: document.edges },
    ])
  },
  viewport: (viewport) => {
    ;({ zoom } = viewport)
    runtime.ports.actions.send(HostAction.ReplaceViewport({ viewport }))
  },
  dispose: () => {
    observer.dispose()
    snapshots.dispose()
    instance.dispose()
    runtime.dispose()
  },
})

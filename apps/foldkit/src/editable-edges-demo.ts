import {
  decodeVersionedFlowDocument,
  encodeVersionedFlowDocument,
} from '@flow/core'
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
import { Effect } from 'effect'
import { Runtime } from 'foldkit'

import {
  editableEdgesDocument,
  mountEditableEdgesControls,
} from '../../shared/editable-edges/demo.ts'

import '@flow/foldkit/style.css'
import '../../shared/editable-edges/style.css'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing editable edges root')
}

const container = document.createElement('div')

container.id = 'editable-edges-runtime'

root.append(container)

const runtime = Runtime.embed(
  createProgram(
    container,
    editableEdgesDocument(),
    { x: 0, y: 0, zoom: 1 },
    ['a', 'b', 'c'],
    'uncontrolled',
    'uncontrolled',
    {},
    undefined,
    'full',
    {
      ...defaultInteractionOptions,
      editableEdges: true,
      connectionMode: new URLSearchParams(location.search).has('loose')
        ? 'loose'
        : 'strict',
      autoPanOnNodeFocus: false,
    }
  )
)

const clipboard = createFoldkitClipboardClient(runtime.ports)

const history = createFoldkitHistoryClient(runtime.ports)

const snapshots = createFoldkitSnapshotClient(runtime.ports)

const instance = createFoldkitFlowInstance(runtime.ports)

let zoom = 1

const observer = createFoldkitNodeMeasurementObserver({
  owner: root,
  zoom: () => zoom,
  onMeasure: (requests) =>
    runtime.ports.actions.send(HostAction.MeasureNodes({ requests })),
})

const readDocument = async () => {
  const result = await snapshots.requestVersioned()

  if (result.status !== 'succeeded') {
    throw new Error(result.status)
  }

  return result.response.snapshot.document
}

let disposed = false

const dispose = (): void => {
  if (disposed) {
    return
  }

  disposed = true
  observer.dispose()
  history.dispose()
  snapshots.dispose()
  instance.dispose()
  runtime.dispose()
}

mountEditableEdgesControls({
  document: readDocument,
  history: history.getStatus,
  undo: history.undo,
  redo: history.redo,
  transform: () => {
    zoom = 0.75
    runtime.ports.actions.send(
      HostAction.ReplaceViewport({ viewport: { x: 100, y: 50, zoom } })
    )
  },
  save: async () => {
    localStorage.setItem(
      'flow-editable-edges-foldkit',
      JSON.stringify(encodeVersionedFlowDocument(await readDocument()))
    )
  },
  load: async () => {
    const saved = localStorage.getItem('flow-editable-edges-foldkit')

    if (saved === null) {
      return
    }

    const input: unknown = JSON.parse(saved)
    const document = await Effect.runPromise(decodeVersionedFlowDocument(input))
    runtime.ports.actions.send(HostAction.ReplaceDocument({ document }))
  },
  copy: clipboard.copySelection,
  paste: clipboard.pasteSelection,
  moveEndpoint: () => {
    void instance.updateNode('a', { position: { x: 110, y: 130 } })
  },
  reconnect: () => {
    void instance.updateEdge('ab', { target: 'c', targetHandle: 'in' })
  },
  dispose,
})

window.addEventListener('pagehide', dispose, { once: true })

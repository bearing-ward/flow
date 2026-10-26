import {
  createProgram,
  createFoldkitClipboardClient,
  createFoldkitHistoryClient,
  createFoldkitSnapshotClient,
  createFoldkitNodeMeasurementObserver,
  defaultInteractionOptions,
  HostAction,
} from '@flow/foldkit'
import { Runtime } from 'foldkit'

import {
  helperLinesDocument,
  mountHelperControls,
} from '../../shared/helper-lines/demo.ts'

import '@flow/foldkit/style.css'
import '../../shared/helper-lines/style.css'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing clipboard root')
}

const container = document.createElement('div')

container.id = 'helper-runtime'

root.append(container)

const runtime = Runtime.embed(
  createProgram(
    container,
    helperLinesDocument(),
    { x: 0, y: 0, zoom: 1 },
    [],
    'uncontrolled',
    'uncontrolled',
    {},
    undefined,
    'full',
    {
      ...defaultInteractionOptions,
      helperLines: true,
      selectNodesOnDrag: true,
      snapToGrid: new URLSearchParams(location.search).has('grid'),
      snapGrid: [50, 50],
      nodeDragThreshold: 0,
      selectionKeyCode: 'Shift',
      multiSelectionKeyCode: 'Meta',
      autoPanOnNodeFocus: false,
    }
  )
)

const clipboard = createFoldkitClipboardClient(runtime.ports)

const history = createFoldkitHistoryClient(runtime.ports)

const snapshots = createFoldkitSnapshotClient(runtime.ports)

let zoom = 1

const observer = createFoldkitNodeMeasurementObserver({
  owner: root,
  zoom: () => zoom,
  onMeasure: (requests) => {
    runtime.ports.actions.send(HostAction.MeasureNodes({ requests }))
  },
})

const rendered = Promise.withResolvers<undefined>()

const canvasReady = (): boolean =>
  root.querySelector('.flow-foldkit-canvas') !== null

const readiness = new MutationObserver(() => {
  if (canvasReady()) {
    readiness.disconnect()
    rendered.resolve(undefined)
  }
})

if (canvasReady()) {
  rendered.resolve(undefined)
} else {
  readiness.observe(root, { childList: true, subtree: true })
}

const dispose = (): void => {
  readiness.disconnect()
  observer.dispose()
  history.dispose()
  snapshots.dispose()
  runtime.dispose()
}

void rendered.promise.then(() =>
  mountHelperControls({
    copy: clipboard.copySelection,
    paste: clipboard.pasteSelection,
    undo: history.undo,
    redo: history.redo,
    document: async () => {
      const result = await snapshots.requestVersioned()

      if (result.status !== 'succeeded') {
        throw new Error(result.status)
      }

      return result.response.snapshot.document
    },
    history: history.getStatus,
    transform: () => {
      zoom = 0.75
      runtime.ports.actions.send(
        HostAction.ReplaceViewport({ viewport: { x: 100, y: 50, zoom } })
      )
    },
    dispose,
  })
)

window.addEventListener('pagehide', dispose, { once: true })

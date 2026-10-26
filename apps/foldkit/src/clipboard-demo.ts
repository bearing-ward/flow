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
  clipboardDocument,
  mountClipboardControls,
} from '../../shared/clipboard/demo.ts'

import '@flow/foldkit/style.css'
import '../../shared/clipboard/style.css'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing clipboard root')
}

const container = document.createElement('div')

container.id = 'clipboard-runtime'

root.append(container)

const runtime = Runtime.embed(
  createProgram(
    container,
    clipboardDocument(),
    { x: 0, y: 0, zoom: 1 },
    [],
    'uncontrolled',
    'uncontrolled',
    {},
    undefined,
    'full',
    {
      ...defaultInteractionOptions,
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
  mountClipboardControls({
    copy: clipboard.copySelection,
    paste: clipboard.pasteSelection,
    set: clipboard.setClipboardFragment,
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

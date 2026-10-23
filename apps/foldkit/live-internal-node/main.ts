import { decodeFlowDocument, FlowDocumentSchema } from '@flow/core'
import type { FlowDocument } from '@flow/core'
import {
  createProgram,
  createFoldkitFlowInstance,
  createFoldkitNodeMeasurementObserver,
  createFoldkitNodeResizer,
  defaultInteractionOptions,
  HostAction,
} from '@flow/foldkit'
import type { FoldkitFlowInstance, ports } from '@flow/foldkit'
import { Effect, Schema } from 'effect'
import { Runtime } from 'foldkit'

import '@flow/foldkit/style.css'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing fixture root')
}

const custom = new URLSearchParams(location.search).has('custom')

const documentModel = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'a',
        label: 'A',
        type: 'custom',
        position: { x: 100, y: 100 },
        size: { width: 200, height: 100 },
        selected: true,
        handles: [{ id: 'out', kind: 'source', side: 'right' }],
      },
    ],
    edges: [],
  })
)

let accepted = documentModel

const resizer = createFoldkitNodeResizer()

const runtime = Runtime.embed<typeof ports, never, 'Element'>(
  createProgram(
    root,
    documentModel,
    { x: 0, y: 0, zoom: 1 },
    [],
    'uncontrolled',
    'uncontrolled',
    {
      nodeTypes: {
        custom: (_node, h, props) =>
          h.div(
            [],
            ['A', ...(custom ? resizer.view(h, { zoom: props.zoom }) : [])]
          ),
      },
    },
    undefined,
    'full',
    { ...defaultInteractionOptions, nodesResizable: !custom }
  )
)

const instance = createFoldkitFlowInstance(runtime.ports)

runtime.ports.acceptedStates.subscribe((change) => {
  accepted = Schema.decodeUnknownSync(FlowDocumentSchema)(
    change.current.document
  )
})

const observer = createFoldkitNodeMeasurementObserver({
  owner: root,
  onMeasure: (requests) => {
    runtime.ports.actions.send(HostAction.MeasureNodes({ requests }))
  },
})

declare global {
  interface Window {
    __foldkitResizeInstance?: {
      instance: FoldkitFlowInstance
      accepted: () => FlowDocument
    }
  }
}

window.__foldkitResizeInstance = { instance, accepted: () => accepted }

window.addEventListener(
  'pagehide',
  () => {
    observer.dispose()
    instance.dispose()
    resizer.dispose()
    runtime.dispose()
  },
  { once: true }
)

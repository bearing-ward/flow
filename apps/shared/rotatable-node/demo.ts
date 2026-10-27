import {
  decodeFlowDocument,
  decodeVersionedFlowDocument,
  encodeVersionedFlowDocument,
} from '@flow/core'
import type {
  FlowDocument,
  FlowEditTransactionInput,
  FlowHistoryStatus,
  SavedVersionedFlowDocument,
  Viewport,
} from '@flow/core'
import { Effect } from 'effect'

import './style.css'

export const rotationDocument = (): FlowDocument =>
  Effect.runSync(
    decodeFlowDocument({
      nodes: [
        {
          id: 'a',
          label: 'Rotate me',
          position: { x: 180, y: 150 },
          size: { width: 160, height: 80 },
          rotation: 0,
          style: { boxSizing: 'border-box' },
          selected: true,
          data: { opaque: ['rotation', 167] },
          sourcePosition: 'right',
          targetPosition: 'left',
        },
        {
          id: 'b',
          label: 'Rotating diamond',
          type: 'shape',
          position: { x: 570, y: 160 },
          size: { width: 120, height: 120 },
          rotation: 0,
          style: { boxSizing: 'border-box' },
          data: { type: 'diamond', color: '#1a8cff' },
          sourcePosition: 'right',
          targetPosition: 'left',
        },
      ],
      edges: [{ id: 'ab', source: 'a', target: 'b', path: 'straight' }],
    })
  )

export interface RotationDemo {
  readonly refresh: (nodeId: string) => Promise<void>
  readonly document: () => Promise<FlowDocument>
  readonly history: () => Promise<FlowHistoryStatus>
  readonly edit: (transaction: FlowEditTransactionInput) => Promise<void>
  readonly undo: () => void
  readonly redo: () => void
  readonly copy: () => void
  readonly paste: () => void
  readonly viewport: (viewport: Viewport) => void
  readonly dispose: () => void
}

declare global {
  var flowRotationDemo:
    | (RotationDemo & {
        readonly saved: () => SavedVersionedFlowDocument | undefined
      })
    | undefined
}

export const mountRotationControls = (demo: RotationDemo) => {
  const controls = document.querySelector('#rotation-controls')
  const status = document.querySelector('#rotation-status')

  if (controls === null || status === null) {
    throw new Error('Missing rotation controls')
  }

  let saved: SavedVersionedFlowDocument | undefined
  const listeners = new AbortController()

  const dispose = () => {
    listeners.abort()
    globalThis.flowRotationDemo = undefined
  }

  globalThis.flowRotationDemo = { ...demo, saved: () => saved }

  const button = (label: string, run: () => void | Promise<void>) => {
    const control = document.createElement('button')
    control.type = 'button'
    control.textContent = label
    control.addEventListener(
      'click',
      async () => {
        try {
          await run()
          status.textContent = ''
        } catch {
          status.textContent = 'Rotation document rejected'
        }
      },
      { signal: listeners.signal }
    )
    controls.append(control)
  }

  button('Undo', demo.undo)
  button('Redo', demo.redo)
  button('Copy', demo.copy)
  button('Paste', demo.paste)
  button('Transform viewport', () =>
    demo.viewport({ x: 55, y: 35, zoom: 0.75 })
  )
  button('Save', async () => {
    saved = encodeVersionedFlowDocument(await demo.document())
  })
  button('Load', async () => {
    const decoded = await Effect.runPromise(decodeVersionedFlowDocument(saved))
    await demo.edit({
      operations: [
        { kind: 'set-nodes', nodes: decoded.nodes },
        { kind: 'set-edges', edges: decoded.edges },
      ],
    })
  })
  button('Dispose', () => {
    demo.dispose()
    dispose()
  })

  return { dispose }
}

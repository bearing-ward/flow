import { Effect } from 'effect'

import { decodeFlowDocument } from '../../../packages/core/src/public.ts'
import type {
  FlowDocument,
  FlowHistoryStatus,
} from '../../../packages/core/src/public.ts'

export const editableEdgesDocument = (): FlowDocument =>
  Effect.runSync(
    decodeFlowDocument({
      nodes: [
        {
          id: 'a',
          label: 'Source',
          position: { x: 80, y: 70 },
          size: { width: 120, height: 50 },
          handles: [{ id: 'out', kind: 'source', side: 'right' }],
          selected: true,
        },
        {
          id: 'b',
          label: 'Target',
          position: { x: 480, y: 70 },
          size: { width: 120, height: 50 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
          selected: true,
        },
        {
          id: 'c',
          label: 'Reconnect here',
          position: { x: 650, y: 300 },
          size: { width: 120, height: 50 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
      ],
      edges: [
        {
          id: 'ab',
          source: 'a',
          target: 'b',
          sourceHandle: 'out',
          targetHandle: 'in',
          label: 'Editable route',
          selected: true,
          reconnectable: true,
          data: { opaque: { source: 'a', values: [1, null, true] } },
          route: {
            mode: 'manual',
            points: [
              { x: 280, y: 180 },
              { x: 380, y: 180 },
            ],
          },
        },
      ],
    })
  )

export interface EditableEdgesDemo {
  readonly document: () => Promise<FlowDocument>
  readonly history: () => Promise<FlowHistoryStatus>
  readonly undo: () => void
  readonly redo: () => void
  readonly transform: () => void
  readonly save: () => Promise<void>
  readonly load: () => Promise<void>
  readonly copy: () => void
  readonly paste: () => void
  readonly moveEndpoint: () => void
  readonly reconnect: () => void
  readonly dispose: () => void
}

declare global {
  var flowEditableDemo: EditableEdgesDemo | undefined
}

export const mountEditableEdgesControls = (demo: EditableEdgesDemo): void => {
  globalThis.flowEditableDemo = demo
  const toolbar = document.querySelector('#editable-controls')

  if (toolbar === null) {
    throw new Error('Missing editable edge controls')
  }

  const actions: readonly (readonly [string, () => void | Promise<void>])[] = [
    ['Undo', demo.undo],
    ['Redo', demo.redo],
    ['Transform viewport', demo.transform],
    ['Save', demo.save],
    ['Load', demo.load],
    ['Copy', demo.copy],
    ['Paste', demo.paste],
    ['Move endpoint', demo.moveEndpoint],
    ['Reconnect', demo.reconnect],
    ['Dispose', demo.dispose],
  ]

  for (const [label, action] of actions) {
    const button = document.createElement('button')

    button.textContent = label
    button.addEventListener('click', () => {
      void action()
    })
    toolbar.append(button)
  }
}

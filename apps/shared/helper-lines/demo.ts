import { Effect } from 'effect'

import { decodeFlowDocument } from '../../../packages/core/src/public.ts'
import type {
  FlowDocument,
  FlowHistoryStatus,
  FlowPasteOptions,
} from '../../../packages/core/src/public.ts'

export const helperLinesDocument = (): FlowDocument => {
  const scenario = new URLSearchParams(location.search).get('scenario')

  return Effect.runSync(
    decodeFlowDocument({
      nodes:
        scenario === 'nested'
          ? [
              {
                id: 'outer',
                label: 'Outer parent',
                position: { x: 20, y: 30 },
                size: { width: 900, height: 560 },
                draggable: false,
              },
              {
                id: 'parent',
                label: 'Parent',
                parentId: 'outer',
                position: { x: 30, y: 20 },
                size: { width: 650, height: 450 },
                draggable: false,
              },
              {
                id: 'a',
                label: 'Drag me',
                parentId: 'parent',
                position: { x: 50, y: 50 },
                size: { width: 100, height: 60 },
              },
              {
                id: 'b',
                label: 'Target',
                parentId: 'parent',
                position: { x: 350, y: 250 },
                size: { width: 140, height: 80 },
              },
            ]
          : [
              {
                id: 'a',
                label: 'Drag me',
                position: { x: 100, y: 100 },
                size: { width: 100, height: 60 },
                selected: scenario === 'multi',
              },
              {
                id: 'b',
                label: 'Target',
                position: { x: 400, y: 300 },
                size: { width: 140, height: 80 },
              },
              ...(scenario === 'multi'
                ? [
                    {
                      id: 'c',
                      label: 'Together',
                      position: { x: 100, y: 200 },
                      size: { width: 100, height: 60 },
                      selected: true,
                    },
                  ]
                : []),
            ],
      edges: [],
    })
  )
}

export interface HelperLinesDemo {
  readonly document: () => Promise<FlowDocument>
  readonly history: () => Promise<FlowHistoryStatus>
  readonly undo: () => void
  readonly redo: () => void
  readonly transform: () => void
  readonly dispose: () => void
  readonly copy: () => void
  readonly paste: (options?: FlowPasteOptions) => void
}

declare global {
  var flowHelperLinesDemo: HelperLinesDemo | undefined
}

export const mountHelperControls = (demo: HelperLinesDemo): void => {
  globalThis.flowHelperLinesDemo = demo
  const toolbar = document.querySelector('#helper-controls')

  if (toolbar === null) {
    throw new Error('Missing helper controls')
  }

  for (const [label, action] of [
    ['Undo', demo.undo],
    ['Redo', demo.redo],
    ['Transform viewport', demo.transform],
    ['Copy', demo.copy],
    ['Paste', () => demo.paste()],
    ['Dispose', demo.dispose],
  ] satisfies readonly (readonly [string, () => void])[]) {
    const button = document.createElement('button')
    button.textContent = label
    button.addEventListener('click', action)
    toolbar.append(button)
  }
}

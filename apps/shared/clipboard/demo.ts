import { Effect } from 'effect'

import { decodeFlowDocument } from '../../../packages/core/src/public.ts'
import type {
  FlowDocument,
  FlowHistoryStatus,
  FlowPasteOptions,
  FlowClipboardActions,
} from '../../../packages/core/src/public.ts'

export const clipboardDocument = (): FlowDocument =>
  Effect.runSync(
    decodeFlowDocument({
      nodes: [
        {
          id: 'a',
          label: 'Alpha',
          position: { x: 80, y: 70 },
          size: { width: 120, height: 50 },
          handles: [{ id: 'out', kind: 'source', side: 'right' }],
          data: { opaque: { id: 'a', values: [1, null, true] } },
        },
        {
          id: 'b',
          label: 'Beta',
          position: { x: 320, y: 70 },
          size: { width: 120, height: 50 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
        },
        {
          id: 'outside',
          label: 'Outside',
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
          position: { x: 650, y: 70 },
          size: { width: 120, height: 50 },
        },
        {
          id: 'group',
          label: 'Group',
          position: { x: 80, y: 250 },
          size: { width: 430, height: 240 },
          style: { background: '#e0f2fe' },
        },
        {
          id: 'child',
          label: 'Child',
          parentId: 'group',
          extent: 'parent',
          position: { x: 20, y: 50 },
          size: { width: 100, height: 45 },
          handles: [{ id: 'out', kind: 'source', side: 'right' }],
        },
        {
          id: 'nested',
          label: 'Nested',
          parentId: 'group',
          position: { x: 200, y: 40 },
          size: { width: 200, height: 170 },
          style: { background: '#dcfce7' },
        },
        {
          id: 'leaf',
          label: 'Leaf',
          parentId: 'nested',
          position: { x: 30, y: 60 },
          size: { width: 100, height: 45 },
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
          data: { untouched: 'a' },
        },
        {
          id: 'external',
          source: 'child',
          target: 'outside',
          sourceHandle: 'out',
          targetHandle: 'in',
        },
        {
          id: 'nested-edge',
          source: 'child',
          target: 'leaf',
          sourceHandle: 'out',
          targetHandle: 'in',
        },
      ],
    })
  )

export interface ClipboardDemo {
  readonly copy: () => void
  readonly paste: (options?: FlowPasteOptions) => void
  readonly set: (
    input: Parameters<FlowClipboardActions['setClipboardFragment']>[0]
  ) => void
  readonly undo: () => void
  readonly redo: () => void
  readonly document: () => Promise<FlowDocument>
  readonly history: () => Promise<FlowHistoryStatus>
  readonly transform: () => void
  readonly dispose: () => void
}

declare global {
  var flowClipboardDemo: ClipboardDemo | undefined
}

export const mountClipboardControls = (demo: ClipboardDemo): void => {
  globalThis.flowClipboardDemo = demo
  const toolbar = document.querySelector('#clipboard-controls')

  if (toolbar === null) {
    throw new Error('Missing clipboard controls')
  }

  for (const [label, action] of [
    ['Copy', demo.copy],
    ['Paste', () => demo.paste()],
    ['Undo', demo.undo],
    ['Redo', demo.redo],
    ['Transform viewport', demo.transform],
    [
      'Paste at graph point',
      () => demo.paste({ position: { x: 500, y: 200 } }),
    ],
    [
      'Load fragment',
      () =>
        demo.set({
          version: 1,
          document: {
            nodes: [
              {
                id: 'imported',
                label: 'Imported fragment',
                position: { x: 50, y: 60 },
                data: { sourceId: 'a' },
              },
            ],
            edges: [],
          },
        }),
    ],
    ['Malformed fragment', () => demo.set({ version: 999 })],
    [
      'Missing parent',
      () =>
        demo.set({
          version: 1,
          document: {
            nodes: [
              {
                id: 'bad',
                label: 'Bad',
                position: { x: 0, y: 0 },
                parentId: 'missing',
              },
            ],
            edges: [],
          },
        }),
    ],
    [
      'Dangling edge',
      () =>
        demo.set({
          version: 1,
          document: {
            nodes: [],
            edges: [{ id: 'bad', source: 'missing', target: 'absent' }],
          },
        }),
    ],
    ['Dispose', demo.dispose],
  ] satisfies readonly (readonly [string, () => void])[]) {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = label
    button.addEventListener('click', async () => {
      try {
        await action()
      } catch {
        /* Invalid fragments leave the current clipboard and graph intact. */
      }
    })
    toolbar.append(button)
  }

  const input = document.createElement('input')
  input.setAttribute('aria-label', 'Native text')
  input.className = 'nodrag nopan'
  input.style.cssText = 'position:absolute;left:20px;top:580px;z-index:1000'

  const canvas = document.querySelector(
    '.flow-canvas, .flow-vue-canvas, .flow-foldkit-canvas'
  )

  if (canvas === null) {
    throw new Error('Missing clipboard canvas')
  }

  canvas.append(input)
}

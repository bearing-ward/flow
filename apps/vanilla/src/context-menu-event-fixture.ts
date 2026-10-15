import { mountFlow } from './mount-flow.ts'
import type { FlowCanvasEventPayload } from './mount-flow.ts'

import './style.css'

export const mountContextMenuEventFixture = (
  root: HTMLElement,
  options: {
    readonly panOnDrag: boolean | readonly number[]
    readonly preventDefault: boolean
    readonly selection: boolean
  }
): void => {
  root.replaceChildren()

  root.style.cssText = 'width:900px;height:520px'
  const observations = document.createElement('output')
  observations.dataset.testid = 'context-observations'
  document.body.append(observations)
  const calls: object[] = []
  const defaults: boolean[] = []

  const recordEvent = (name: string) => (payload: FlowCanvasEventPayload) => {
    if (options.preventDefault) {
      payload.event.preventDefault()
    }

    calls.push({
      name,
      mouseEvent: payload.event instanceof MouseEvent,
      type: payload.event.type,
      nodeId: payload.nodeId,
      edgeId: payload.edgeId,
      defaultPrevented: payload.event.defaultPrevented,
    })
  }

  mountFlow(
    root,
    {
      nodes: [
        {
          id: 'a',
          label: 'Alpha',
          position: { x: 60, y: 60 },
          selected: options.selection,
          handles: [{ id: 'out', kind: 'source', side: 'right' }],
        },
        {
          id: 'b',
          label: 'Beta',
          position: { x: 420, y: 60 },
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
        },
      ],
    },
    {
      documentMode: 'uncontrolled',
      viewport: {
        mode: 'uncontrolled',
        initial: { x: 0, y: 0, zoom: 1 },
        limits: { minZoom: 0.1, maxZoom: 4 },
      },
      panOnDrag: options.panOnDrag,
      onPaneContextMenu: recordEvent('pane'),
      onNodeContextMenu: recordEvent('node'),
      onEdgeContextMenu: recordEvent('edge'),
      onSelectionContextMenu: options.selection
        ? ({ event }) => {
            calls.push({
              name: 'selection',
              mouseEvent: event instanceof MouseEvent,
              defaultPrevented: event.defaultPrevented,
            })
          }
        : undefined,
    }
  )
  window.addEventListener('contextmenu', (event) => {
    defaults.push(event.defaultPrevented)
    observations.textContent = JSON.stringify({ calls, defaults })
  })
}

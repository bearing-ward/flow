import { FlowCanvas } from '@flow/vue'
import { createApp, h } from 'vue'

import '@flow/vue/style.css'

export const mountContextMenuEventFixture = (
  root: HTMLElement,
  options: {
    readonly panOnDrag: boolean | readonly number[]
    readonly preventDefault: boolean
  }
): void => {
  const observations = document.createElement('output')
  observations.dataset.testid = 'context-observations'
  document.body.append(observations)
  const calls: object[] = []
  const defaults: boolean[] = []

  createApp({
    render: () =>
      h(FlowCanvas, {
        nodes: [],
        edges: [],
        panOnDrag: options.panOnDrag,
        style: { width: '900px', height: '520px' },
        onPaneContextMenu: (
          position: { readonly x: number; readonly y: number },
          event: MouseEvent
        ) => {
          if (options.preventDefault) {
            event.preventDefault()
          }

          calls.push({
            position,
            mouseEvent: event instanceof MouseEvent,
            type: event.type,
            defaultPrevented: event.defaultPrevented,
          })
        },
      }),
  }).mount(root)

  window.addEventListener('contextmenu', (event) => {
    defaults.push(event.defaultPrevented)
    observations.textContent = JSON.stringify({ calls, defaults })
  })
}

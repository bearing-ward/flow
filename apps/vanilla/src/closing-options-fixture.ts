import type { FlowDocumentInput, FlowMountOptionsInput } from './mount-flow.ts'
import { mountFlow } from './public.ts'
import type { JavaScriptFlowController, FlowNodeRenderer } from './public.ts'

import './style.css'

type SerializableOptions = Omit<
  FlowMountOptionsInput,
  | 'documentMode'
  | 'viewport'
  | `on${string}`
  | 'nodeRenderers'
  | 'edgeRenderers'
  | 'connectionPreview'
  | 'isValidConnection'
>

export interface ClosingOptionsInput {
  readonly options?: SerializableOptions
  readonly document?: FlowDocumentInput
  readonly customContent?: boolean
}

export interface ClosingOptionsFixture {
  readonly controller: JavaScriptFlowController
  readonly events: string[]
}

const contentRenderer: FlowNodeRenderer = (_node, content) => {
  for (const className of ['stop-drag', 'stop-wheel', 'stop-pan', 'nodrag']) {
    const element = document.createElement('div')
    element.className = className
    element.dataset.testid = className
    element.textContent = className
    content.append(element)
  }

  return {
    update: (next) => {
      content.dataset.label = next.label
    },
    destroy: () => content.replaceChildren(),
  }
}

export const mountClosingOptions = (
  root: HTMLElement,
  input: ClosingOptionsInput
): ClosingOptionsFixture => {
  root.style.width = '800px'
  root.style.height = '500px'
  const events: string[] = []

  const controller = mountFlow(
    root,
    input.document ?? {
      nodes: [
        {
          id: 'a',
          label: 'A',
          position: { x: 80, y: 80 },
          sourcePosition: 'right',
          targetPosition: 'left',
          type: input.customContent ? 'custom' : 'default',
          size: { width: 160, height: 140 },
        },
        {
          id: 'b',
          label: 'B',
          position: { x: 380, y: 80 },
          sourcePosition: 'right',
          targetPosition: 'left',
        },
      ],
      edges: [{ id: 'a-b', source: 'a', target: 'b', selected: true }],
    },
    {
      ...input.options,
      documentMode: 'uncontrolled',
      viewport: {
        mode: 'uncontrolled',
        initial: { x: 0, y: 0, zoom: 1 },
        limits: { minZoom: 0.2, maxZoom: 3 },
      },
      nodeRenderers: { custom: contentRenderer },
      onPaneClick: () => {
        events.push('pane-click')
      },
      onNodeClick: () => {
        events.push('node-click')
      },
      onPaneScroll: () => {
        events.push('scroll')
      },
      onClickConnectStart: () => {
        events.push('click-start')
      },
      onClickConnectEnd: (payload) => {
        events.push(`click-end:${payload.outcome}`)
      },
      onConnectStart: (payload) => {
        events.push(`start:${payload.inputKind}`)
      },
      onConnectEnd: (payload) => {
        events.push(`end:${payload.inputKind}`)
      },
      onError: (error) => {
        events.push(`error:${error.message}`)
      },
    }
  )

  return { controller, events }
}

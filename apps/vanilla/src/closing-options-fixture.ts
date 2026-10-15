import type { FlowDocumentInput, FlowMountOptionsInput } from './mount-flow.ts'
import { mountFlow } from './public.ts'
import type {
  JavaScriptFlowController,
  FlowNodeRenderer,
  FlowEdgeRenderer,
} from './public.ts'

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
  readonly trackMoves?: boolean
  readonly editingControls?: boolean
  readonly handleRender?: boolean
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

const editingEdge: FlowEdgeRenderer = {
  render: (_edge, context, visual) => {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', context.pathData)
    visual.append(path)

    const label = document.createElement('div')
    label.style.position = 'absolute'
    label.style.left = '280px'
    label.style.top = '250px'
    label.style.pointerEvents = 'all'

    const input = document.createElement('input')
    input.dataset.testid = 'edge-label-input'
    label.append(input)
    context.edgeLabelRenderer.append(label)

    return {
      update: (_next, nextContext) => {
        path.setAttribute('d', nextContext.pathData)
      },
      destroy: () => label.remove(),
    }
  },
}

export const mountClosingOptions = (
  root: HTMLElement,
  input: ClosingOptionsInput
): ClosingOptionsFixture => {
  root.style.width = '800px'
  root.style.height = '500px'
  const events: string[] = []
  const panel = document.createElement('div')

  for (const tag of ['input', 'textarea', 'select', 'div']) {
    const control = document.createElement(tag)
    control.dataset.testid = `panel-${tag}`

    if (tag === 'div') {
      control.contentEditable = 'true'
      control.innerHTML = '<span>Editable text</span>'
    }

    panel.append(control)
  }

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
      edges: [
        {
          id: 'a-b',
          source: 'a',
          target: 'b',
          selected: true,
          type: input.editingControls ? 'editing' : 'default',
        },
      ],
    },
    {
      ...input.options,
      documentMode: 'uncontrolled',
      viewport: {
        mode: 'uncontrolled',
        initial: { x: 0, y: 0, zoom: 1 },
        limits: { minZoom: 0.2, maxZoom: 3 },
      },
      onHandleRender: input.handleRender
        ? (node, _handle, element) => {
            element.title = JSON.stringify(node.data)
          }
        : undefined,
      nodeRenderers: { custom: contentRenderer },
      edgeRenderers: { editing: editingEdge },
      panels: input.editingControls
        ? [{ id: 'editing', element: panel, placement: 'bottom-left' }]
        : [],
      onMoveStart: () => {
        if (input.trackMoves) {
          events.push('move-start')
        }
      },
      onMove: () => {
        if (input.trackMoves) {
          events.push('move')
        }
      },
      onMoveEnd: () => {
        if (input.trackMoves) {
          events.push('move-end')
        }
      },
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

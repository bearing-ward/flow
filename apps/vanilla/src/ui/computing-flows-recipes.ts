import type { FlowNode } from '@flow/core'
import { mountFlow } from '@flow/vanilla'
import type { FlowNodeRenderer } from '@flow/vanilla'
import { Schema } from 'effect'

import './computing-flows-recipes.css'
import { createRecipePage, pageButton } from './recipe-page.ts'
import type { RecipeCanvasOwner } from './recipe-page.ts'

/*
 * React Flow's UseNodesData example: text nodes edit their own data, the
 * uppercase node derives its data from its upstream node, and the result
 * node lists the data of every connected source.
 */

const { canvas, status, toolbar } = createRecipePage('computing-flows')

const flow: RecipeCanvasOwner = { current: undefined }

/** Renderer repaints that read other nodes' data, like `useNodesData` subscribers. */
const dataSubscribers = new Set<() => void>()

const textOf = (data: FlowNode['data']): string => {
  const text = data?.text

  return Schema.is(Schema.String)(text) ? text : ''
}

/** Data `text` of every source node connected into `nodeId`, in edge order. */
const upstreamTexts = (nodeId: string): readonly string[] => {
  const controller = flow.current

  if (controller === undefined) {
    return []
  }

  const sources = controller
    .getNodeConnections({ nodeId, type: 'target' })
    .map(({ source }) => source)

  return controller.getNodesData(sources).map(({ data }) => textOf(data))
}

const subscribeData = (repaint: () => void): (() => void) => {
  dataSubscribers.add(repaint)
  queueMicrotask(repaint)

  return () => dataSubscribers.delete(repaint)
}

const textNode: FlowNodeRenderer = (node, content) => {
  const label = document.createElement('div')
  const input = document.createElement('input')

  label.className = 'computing-label'
  label.textContent = node.label
  input.className = 'computing-input nodrag'
  input.dataset.testid = `text-input-${node.id}`
  input.setAttribute('aria-label', `${node.label} text`)
  input.value = textOf(node.data)
  input.addEventListener('input', () => {
    void flow.current?.updateNodeData(node.id, { text: input.value })
  })
  content.append(label, input)

  return {
    update: (next) => {
      const text = textOf(next.data)

      // The focused input owns its value; accepted edits may trail keystrokes.
      if (document.activeElement !== input && input.value !== text) {
        input.value = text
      }
    },
    destroy: () => {
      label.remove()
      input.remove()
    },
  }
}

const uppercaseNode: FlowNodeRenderer = (node, content) => {
  const label = document.createElement('div')
  const value = document.createElement('div')

  label.className = 'computing-label'
  label.textContent = node.label
  value.className = 'computing-value'
  value.dataset.testid = 'upper-value'
  value.textContent = textOf(node.data)
  content.append(label, value)

  // Like the example's effect: derive this node's own data from its upstream node.
  const unsubscribe = subscribeData(() => {
    const own = textOf(flow.current?.getNode(node.id)?.data)
    const computed = (upstreamTexts(node.id)[0] ?? '').toUpperCase()

    if (own !== computed) {
      void flow.current?.updateNodeData(node.id, { text: computed })
    }
  })

  return {
    update: (next) => {
      value.textContent = textOf(next.data)
    },
    destroy: () => {
      unsubscribe()
      label.remove()
      value.remove()
    },
  }
}

const resultNode: FlowNodeRenderer = (node, content) => {
  const label = document.createElement('div')
  const value = document.createElement('div')

  label.className = 'computing-label'
  label.textContent = node.label
  value.className = 'computing-value'
  value.dataset.testid = 'result-value'
  content.append(label, value)

  const paint = (): void => {
    value.textContent = upstreamTexts(node.id).join(', ')
  }

  const unsubscribe = subscribeData(paint)

  return {
    update: paint,
    destroy: () => {
      unsubscribe()
      label.remove()
      value.remove()
    },
  }
}

const source = { id: 'out', kind: 'source', side: 'right' } as const

const target = { id: 'in', kind: 'target', side: 'left' } as const

const controller = mountFlow(
  canvas,
  {
    nodes: [
      {
        id: 'text-1',
        type: 'text',
        label: 'Text A',
        position: { x: 40, y: 40 },
        data: { text: 'hello' },
        handles: [source],
      },
      {
        id: 'text-2',
        type: 'text',
        label: 'Text B',
        position: { x: 40, y: 300 },
        data: { text: 'world' },
        handles: [source],
      },
      {
        id: 'upper',
        type: 'uppercase',
        label: 'Uppercase',
        position: { x: 320, y: 60 },
        data: { text: '' },
        handles: [target, source],
      },
      {
        id: 'result',
        type: 'result',
        label: 'Result',
        position: { x: 600, y: 180 },
        handles: [target],
      },
    ],
    edges: [
      { id: 'e-text-1-upper', source: 'text-1', target: 'upper' },
      { id: 'e-upper-result', source: 'upper', target: 'result' },
      { id: 'e-text-2-result', source: 'text-2', target: 'result' },
    ].map((edge) => ({ ...edge, sourceHandle: 'out', targetHandle: 'in' })),
  },
  {
    documentMode: 'uncontrolled',
    viewport: {
      mode: 'uncontrolled',
      initial: { x: 0, y: 0, zoom: 1 },
      limits: { minZoom: 0.5, maxZoom: 2 },
    },
    nodeRenderers: {
      text: textNode,
      uppercase: uppercaseNode,
      result: resultNode,
    },
  }
)

flow.current = controller

toolbar.append(
  pageButton('disconnect-text-2', 'Disconnect Text B', () => {
    void controller.deleteElements({ edgeIds: ['e-text-2-result'] })
  })
)

const report = (): void => {
  const nodes = controller.getNodes()

  status.value = `edges:${controller
    .getEdges()
    .map(({ id }) => id)
    .join(',')}`
  status.dataset.data = nodes
    .map(({ id, data }) => `${id}=${textOf(data)}`)
    .join(',')
}

const repaintAll = (): void => {
  for (const repaint of dataSubscribers) {
    repaint()
  }

  report()
}

repaintAll()

controller.subscribeState(repaintAll)

globalThis.addEventListener('pagehide', () => controller.destroy(), {
  once: true,
})

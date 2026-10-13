import { getBezierPath } from '@flow/core'
import type { FlowNode } from '@flow/core'
import {
  createFlowBaseEdge,
  createFlowNodeToolbar,
  mountFlow,
} from '@flow/vanilla'
import type {
  FlowEdgeRenderer,
  FlowEdgeRendererProps,
  FlowNodeRenderer,
} from '@flow/vanilla'
import { Schema } from 'effect'

import './feature-overview-recipes.css'
import { createRecipePage, everyFrame } from './recipe-page.ts'
import type { RecipeCanvasOwner } from './recipe-page.ts'

/*
 * Feature Overview: custom nodes and edges, built-in markers, an animated
 * edge, MiniMap, Controls, Background, a Panel, NodeToolbars and node
 * resizing on one canvas that starts with fitView.
 */

const { canvas, status } = createRecipePage('feature-overview')

const flow: RecipeCanvasOwner = { current: undefined }

const colorOf = (data: FlowNode['data']): string => {
  const color = data?.color

  return Schema.is(Schema.String)(color) ? color : '#94a3b8'
}

/** Custom node: a color swatch with its own markup. */
const colorNode: FlowNodeRenderer = (node, content) => {
  const shell = document.createElement('div')
  const swatch = document.createElement('span')
  const label = document.createElement('span')

  shell.className = 'overview-color-node'
  shell.dataset.testid = 'custom-node'
  swatch.className = 'overview-swatch'
  shell.append(swatch, label)
  content.append(shell)

  const paint = (next: typeof node): void => {
    label.textContent = next.label
    swatch.style.background = colorOf(next.data)
  }

  paint(node)

  return { update: paint, destroy: () => shell.remove() }
}

const buttonEdgeOptions = (props: FlowEdgeRendererProps) => {
  const [path, labelX, labelY] = getBezierPath(props)

  return {
    path,
    labelX,
    labelY,
    markerEnd: props.markerEnd,
    attributes: { 'data-testid': 'custom-edge' },
  }
}

/** Custom edge: a bezier path with a delete button at its midpoint. */
const buttonEdge: FlowEdgeRenderer = {
  render: (edge, context, visual) => {
    const mount = createFlowBaseEdge(document, buttonEdgeOptions(context.props))
    const button = document.createElement('button')

    button.type = 'button'
    button.className = 'overview-edge-button nodrag nopan'
    button.setAttribute('aria-label', `Delete edge ${edge.id}`)
    button.textContent = '×'
    button.addEventListener('click', () => {
      void flow.current?.deleteElements({ edgeIds: [edge.id] })
    })

    const paint = (props: FlowEdgeRendererProps): void => {
      const options = buttonEdgeOptions(props)

      mount.update(options)
      button.style.transform = `translate(-50%, -50%) translate(${options.labelX}px, ${options.labelY}px)`
    }

    visual.append(mount.element)
    context.edgeLabelRenderer.append(button)
    paint(context.props)

    return {
      update: (_next, nextContext) => paint(nextContext.props),
      updateProps: paint,
      destroy: () => {
        mount.dispose()
        button.remove()
      },
    }
  },
}

const panel = document.createElement('section')

panel.className = 'overview-panel'

panel.dataset.testid = 'overview-panel'

panel.innerHTML =
  '<h2>Feature overview</h2><p>Select a node for its toolbar; drag a corner to resize.</p>'

const handles = [
  { id: 'in', kind: 'target', side: 'left' },
  { id: 'out', kind: 'source', side: 'right' },
] as const

const controller = mountFlow(
  canvas,
  {
    nodes: [
      {
        id: 'input',
        label: 'Input',
        position: { x: 0, y: 120 },
        handles: [handles[1]],
      },
      {
        id: 'color',
        type: 'color',
        label: 'Color node',
        position: { x: 260, y: 20 },
        data: { color: '#f97316' },
        handles,
      },
      {
        id: 'default',
        label: 'Default node',
        position: { x: 260, y: 220 },
        handles,
      },
      {
        id: 'resizable',
        label: 'Resizable node',
        position: { x: 520, y: 220 },
        size: { width: 160, height: 60 },
        handles,
      },
      {
        id: 'output',
        label: 'Output',
        position: { x: 560, y: 40 },
        handles: [handles[0]],
      },
    ],
    edges: (
      [
        {
          id: 'e-input-color',
          source: 'input',
          target: 'color',
          markerEnd: 'arrowclosed',
        },
        {
          id: 'e-animated',
          source: 'input',
          target: 'default',
          label: 'animated',
        },
        {
          id: 'e-color-output',
          source: 'color',
          target: 'output',
          type: 'button',
          markerEnd: 'arrowclosed',
        },
        {
          id: 'e-default-resizable',
          source: 'default',
          target: 'resizable',
          path: 'smoothstep',
          markerStart: 'arrow',
          markerEnd: 'arrow',
        },
      ] as const
    ).map((edge) => ({ ...edge, sourceHandle: 'out', targetHandle: 'in' })),
  },
  {
    documentMode: 'uncontrolled',
    // React Flow's Feature Overview resizes its group with a NodeResizer.
    nodesResizable: true,
    viewport: {
      mode: 'uncontrolled',
      initial: { x: 0, y: 0, zoom: 1 },
      limits: { minZoom: 0.25, maxZoom: 2 },
    },
    background: { pattern: 'dots', spacing: 20, color: '#94a3b8' },
    ui: { controls: true, minimap: true },
    panels: [{ id: 'overview', element: panel, placement: 'top-right' }],
    nodeRenderers: { color: colorNode },
    edgeRenderers: { button: buttonEdge },
  }
)

flow.current = controller

for (const node of controller.getNodes()) {
  const content = document.createElement('div')

  content.className = 'overview-node-toolbar'
  content.dataset.testid = 'overview-node-toolbar'
  content.dataset.toolbarNode = node.id
  content.textContent = `Toolbar: ${node.label}`
  createFlowNodeToolbar(controller, content, { nodeId: node.id })
}

const fitOnce = async (): Promise<void> => {
  await controller.fitView({ padding: 0.2 })
  status.dataset.fitted = 'true'
}

// Start with fitView once every node is measured.
const stopFitWatch = everyFrame(() => {
  if (controller.nodesInitialized()) {
    stopFitWatch()
    void fitOnce()
  }
})

const report = (): void => {
  status.value = `nodes:${controller.getNodes().length}`
  status.dataset.selected = controller
    .getNodes()
    .filter(({ selected }) => selected === true)
    .map(({ id }) => id)
    .join(',')
}

report()

controller.subscribeState(report)

globalThis.addEventListener('pagehide', () => controller.destroy(), {
  once: true,
})

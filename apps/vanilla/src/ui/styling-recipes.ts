import {
  createFlowControls,
  createFlowMiniMap,
  createFlowNodeResizeControl,
  createFlowNodeResizer,
  mountFlow,
} from '@flow/vanilla'
import type {
  FlowColorMode,
  FlowNodeRenderer,
  FlowNodeResizerOptions,
  JavaScriptFlowController,
} from '@flow/vanilla'

import { createRecipePage, pageButton, sceneParameter } from './recipe-page.ts'

import './styling-recipes.css'

/*
 * Styling and node recipes from the React Flow examples, built only on the
 * public Vanilla API: Updating Nodes, Base Style, Dark Mode, Node Resizer
 * and the Labeled Group Node from the UI catalog. `?scene=` picks one.
 */

const scene = sceneParameter('updating-nodes')

const { canvas, status, toolbar } = createRecipePage(`styling-${scene}`)

const viewport = {
  mode: 'uncontrolled',
  initial: { x: 0, y: 0, zoom: 1 },
  limits: { minZoom: 0.25, maxZoom: 2 },
} as const

const reportNodes = (controller: JavaScriptFlowController): void => {
  const report = (): void => {
    const nodes = controller.getNodes()

    status.value = `nodes:${nodes.length}`
    status.dataset.nodes = JSON.stringify(
      nodes.map(({ id, label, hidden, style, className, size, position }) => ({
        id,
        label,
        hidden,
        style,
        className,
        size,
        position,
      }))
    )
  }

  report()
  controller.subscribeState(report)
}

const labeledInput = (
  testId: string,
  text: string,
  input: HTMLInputElement | HTMLSelectElement
): HTMLLabelElement => {
  const label = document.createElement('label')

  input.dataset.testid = testId
  label.append(`${text} `, input)

  return label
}

/** React "Updating Nodes": edit a node's label, background and visibility. */
const updatingNodes = (): JavaScriptFlowController => {
  const controller = mountFlow(
    canvas,
    {
      nodes: [
        {
          id: '1',
          label: 'Node 1',
          position: { x: 100, y: 100 },
          sourcePosition: 'bottom',
          targetPosition: 'top',
        },
        {
          id: '2',
          label: 'Node 2',
          position: { x: 100, y: 260 },
          sourcePosition: 'bottom',
          targetPosition: 'top',
        },
      ],
      edges: [{ id: 'e1-2', source: '1', target: '2' }],
    },
    { documentMode: 'uncontrolled', viewport }
  )

  const name = document.createElement('input')
  name.value = 'Node 1'
  name.addEventListener('input', () => {
    void controller.updateNode('1', { label: name.value })
  })

  const background = document.createElement('input')
  background.type = 'color'
  background.value = '#eeeeee'
  background.addEventListener('input', () => {
    void controller.updateNode('1', (node) => ({
      style: { ...node.style, backgroundColor: background.value },
    }))
  })

  const hidden = document.createElement('input')
  hidden.type = 'checkbox'
  hidden.addEventListener('change', () => {
    void controller.updateNode('1', { hidden: hidden.checked })
    void controller.updateEdge('e1-2', { hidden: hidden.checked })
  })

  toolbar.append(
    labeledInput('node-label', 'label:', name),
    labeledInput('node-background', 'background:', background),
    labeledInput('node-hidden', 'hidden:', hidden)
  )

  return controller
}

/** React "Base Style": the default theme, node `style`/`className`, and CSS variables. */
const baseStyle = (): JavaScriptFlowController =>
  mountFlow(
    canvas,
    {
      nodes: [
        {
          id: 'default',
          label: 'Default style',
          position: { x: 60, y: 60 },
          sourcePosition: 'right',
          targetPosition: 'left',
        },
        {
          id: 'styled',
          label: 'Inline style',
          position: { x: 300, y: 60 },
          sourcePosition: 'right',
          targetPosition: 'left',
          style: {
            backgroundColor: '#fde68a',
            borderColor: '#b45309',
            borderRadius: 12,
          },
        },
        {
          id: 'classed',
          label: 'Class name',
          position: { x: 540, y: 60 },
          sourcePosition: 'right',
          targetPosition: 'left',
          className: 'recipe-accent-node',
        },
      ],
      edges: [
        { id: 'a', source: 'default', target: 'styled', animated: true },
        {
          id: 'b',
          source: 'styled',
          target: 'classed',
          label: 'styled edge',
          style: { stroke: '#b45309', strokeWidth: 3 },
          labelStyle: { fill: '#b45309' },
          labelBgStyle: { fill: '#fff7ed' },
          markerEnd: { type: 'arrowclosed', color: '#b45309' },
        },
      ],
    },
    { documentMode: 'uncontrolled', viewport }
  )

/** React "Dark Mode": `colorMode` with the built-in controls, minimap and background. */
const darkMode = (): JavaScriptFlowController => {
  const controller = mountFlow(
    canvas,
    {
      nodes: [
        {
          id: 'a',
          label: 'Input',
          position: { x: 80, y: 80 },
          sourcePosition: 'bottom',
        },
        {
          id: 'b',
          label: 'Default',
          position: { x: 80, y: 220 },
          sourcePosition: 'bottom',
          targetPosition: 'top',
        },
        {
          id: 'c',
          label: 'Output',
          position: { x: 80, y: 360 },
          targetPosition: 'top',
        },
      ],
      edges: [
        { id: 'a-b', source: 'a', target: 'b', markerEnd: 'arrowclosed' },
        { id: 'b-c', source: 'b', target: 'c', label: 'to output' },
      ],
    },
    { documentMode: 'uncontrolled', viewport, colorMode: 'dark' }
  )

  createFlowControls(controller)
  createFlowMiniMap(controller)

  const select = document.createElement('select')

  for (const mode of ['dark', 'light', 'system'] as const) {
    select.append(new Option(mode, mode))
  }

  select.addEventListener('change', () => {
    // SAFETY: the options above are exactly the three color modes.
    controller.setColorMode(select.value as FlowColorMode)
  })

  toolbar.append(labeledInput('color-mode', 'color mode:', select))

  return controller
}

/** React "Node Resizer": resizers with constraints, a custom control and axis locks. */
const nodeResizer = (): JavaScriptFlowController => {
  const controller = mountFlow(
    canvas,
    {
      nodes: [
        {
          id: 'resizer',
          label: 'NodeResizer',
          position: { x: 40, y: 40 },
          size: { width: 160, height: 60 },
        },
        {
          id: 'aspect',
          label: 'keepAspectRatio',
          position: { x: 260, y: 40 },
          size: { width: 160, height: 80 },
        },
        {
          id: 'control',
          label: 'NodeResizeControl',
          position: { x: 480, y: 40 },
          size: { width: 160, height: 60 },
        },
        {
          id: 'horizontal',
          label: 'horizontal only',
          position: { x: 40, y: 220 },
          size: { width: 160, height: 60 },
        },
        {
          id: 'vertical',
          label: 'vertical only',
          position: { x: 260, y: 220 },
          size: { width: 160, height: 60 },
        },
      ],
      edges: [],
    },
    { documentMode: 'uncontrolled', viewport }
  )

  const events: string[] = []

  const callbacks: FlowNodeResizerOptions = {
    onResizeStart: () => events.push('start'),
    onResize: (_event, params) =>
      events.push(
        `resize:${Math.round(params.width)}x${Math.round(params.height)}`
      ),
    onResizeEnd: () => {
      events.push('end')
      status.dataset.resizeEvents = events.join(',')
    },
  }

  createFlowNodeResizer(controller, 'resizer', {
    minWidth: 100,
    minHeight: 40,
    maxWidth: 320,
    color: '#ff0071',
    ...callbacks,
  })
  createFlowNodeResizer(controller, 'aspect', {
    keepAspectRatio: true,
    ...callbacks,
  })

  const icon = document.createElement('span')
  icon.className = 'recipe-resize-icon'
  icon.textContent = '⤡'

  createFlowNodeResizeControl(controller, 'control', {
    position: 'bottom-right',
    minWidth: 100,
    minHeight: 40,
    content: icon,
    style: { background: 'transparent', border: 'none' },
    ...callbacks,
  })
  createFlowNodeResizeControl(controller, 'horizontal', {
    position: 'right',
    variant: 'line',
    resizeDirection: 'horizontal',
    ...callbacks,
  })
  createFlowNodeResizeControl(controller, 'vertical', {
    position: 'bottom',
    variant: 'line',
    resizeDirection: 'vertical',
    ...callbacks,
  })

  return controller
}

/** UI catalog "Labeled Group Node": a titled group whose children sit inside it. */
const labeledGroupNode: FlowNodeRenderer = (node, content) => {
  const title = document.createElement('div')

  title.className = 'recipe-labeled-group-title'
  title.dataset.testid = 'labeled-group-title'
  title.textContent = node.label
  content.append(title)

  return {
    update: (next) => {
      title.textContent = next.label
    },
    destroy: () => title.remove(),
  }
}

const labeledGroup = (): JavaScriptFlowController => {
  const controller = mountFlow(
    canvas,
    {
      nodes: [
        {
          id: 'group',
          label: 'Group label',
          type: 'labeled-group',
          className: 'recipe-labeled-group',
          position: { x: 80, y: 60 },
          size: { width: 380, height: 260 },
        },
        {
          id: 'child-a',
          label: 'Child A',
          parentId: 'group',
          extent: 'parent',
          position: { x: 30, y: 60 },
          size: { width: 120, height: 44 },
          sourcePosition: 'right',
          targetPosition: 'left',
        },
        {
          id: 'child-b',
          label: 'Child B',
          parentId: 'group',
          extent: 'parent',
          position: { x: 220, y: 170 },
          size: { width: 120, height: 44 },
          sourcePosition: 'right',
          targetPosition: 'left',
        },
      ],
      edges: [{ id: 'a-b', source: 'child-a', target: 'child-b' }],
    },
    {
      documentMode: 'uncontrolled',
      viewport,
      nodeRenderers: { 'labeled-group': labeledGroupNode },
    }
  )

  return controller
}

const scenes = new Map<string, () => JavaScriptFlowController>([
  ['updating-nodes', updatingNodes],
  ['base-style', baseStyle],
  ['dark-mode', darkMode],
  ['node-resizer', nodeResizer],
  ['labeled-group', labeledGroup],
])

const controller = (scenes.get(scene) ?? updatingNodes)()

toolbar.append(
  pageButton('fit-view', 'Fit view', () => {
    void controller.fitView()
  })
)

reportNodes(controller)

globalThis.addEventListener('pagehide', () => controller.destroy(), {
  once: true,
})

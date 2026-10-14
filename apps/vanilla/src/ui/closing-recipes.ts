import { getOutgoers, getViewportForBounds } from '@flow/core'
import { createFlowBaseEdge, mountFlow } from '@flow/vanilla'
import type {
  FlowEdgeRenderer,
  FlowNodeRenderer,
  JavaScriptFlowController,
} from '@flow/vanilla'
import { toPng } from 'html-to-image'

import { createRecipePage, pageButton, sceneParameter } from './recipe-page.ts'

import './closing-recipes.css'

const scene = sceneParameter('delete-edge-on-drop')

const { canvas, status, toolbar } = createRecipePage(`closing-${scene}`)

const viewport = {
  mode: 'uncontrolled',
  initial: { x: 0, y: 0, zoom: 1 },
  limits: { minZoom: 0.2, maxZoom: 3 },
} as const

const initialNodes = [
  {
    id: 'a',
    label: 'Input',
    position: { x: 80, y: 100 },
    sourcePosition: 'right',
    targetPosition: 'left',
  },
  {
    id: 'b',
    label: 'Process',
    position: { x: 340, y: 100 },
    sourcePosition: 'right',
    targetPosition: 'left',
  },
  {
    id: 'c',
    label: 'Output',
    position: { x: 600, y: 260 },
    sourcePosition: 'right',
    targetPosition: 'left',
  },
] as const

const report = (controller: JavaScriptFlowController): void => {
  status.dataset.nodes = JSON.stringify(controller.getNodes())
  status.dataset.edges = JSON.stringify(controller.getEdges())
  status.value = `nodes:${controller.getNodes().length} edges:${controller.getEdges().length}`
}

const deleteEdgeOnDrop = (): JavaScriptFlowController => {
  let reconnectSucceeded = false
  const events: string[] = []

  const controller = mountFlow(
    canvas,
    {
      nodes: initialNodes,
      edges: [{ id: 'a-b', source: 'a', target: 'b', selected: true }],
    },
    {
      documentMode: 'uncontrolled',
      viewport,
      autoPanOnConnect: false,
      onReconnectStart: () => {
        reconnectSucceeded = false
        events.push('start')
      },
      onReconnect: () => {
        reconnectSucceeded = true
        events.push('reconnect')
      },
      onReconnectEnd: (payload, details) => {
        events.push('end')
        status.dataset.events = events.join(',')

        if (
          !reconnectSucceeded &&
          details.connectionState.toNode === null &&
          details.event?.type === 'pointerup'
        ) {
          void controller.deleteElements({ edgeIds: [payload.edgeId] })
        }
      },
    }
  )

  return controller
}

const contextualZoom = (): JavaScriptFlowController => {
  const contents = new Set<HTMLElement>()

  const renderer: FlowNodeRenderer = (_node, content) => {
    const text = document.createElement('div')
    text.dataset.testid = 'zoom-content'
    contents.add(text)
    content.append(text)

    return {
      update: (next) => {
        text.dataset.nodeId = next.id
      },
      destroy: () => {
        contents.delete(text)
        text.remove()
      },
    }
  }

  const controller = mountFlow(
    canvas,
    {
      nodes: [
        {
          ...initialNodes[0],
          type: 'contextual',
          size: { width: 200, height: 80 },
        },
      ],
      edges: [],
    },
    {
      documentMode: 'uncontrolled',
      viewport,
      nodeRenderers: { contextual: renderer },
    }
  )

  const update = (zoom: number): void => {
    for (const content of contents) {
      let text = 'Detailed node content'

      if (zoom < 0.6) {
        text = 'Summary'
      } else if (zoom < 1) {
        text = 'Overview'
      }

      content.textContent = text
    }
  }

  update(controller.getViewport().zoom)
  controller.observeStore((state) => state.viewport.zoom, update)

  for (const [name, zoom] of [
    ['summary', 0.4],
    ['overview', 0.8],
    ['detail', 1.2],
  ] as const) {
    toolbar.append(
      pageButton(name, name, () => {
        void controller.zoomTo(zoom)
      })
    )
  }

  return controller
}

const dragAndDrop = (): JavaScriptFlowController => {
  const controller = mountFlow(
    canvas,
    { nodes: [], edges: [] },
    {
      documentMode: 'uncontrolled',
      viewport: { ...viewport, initial: { x: 70, y: 30, zoom: 1.5 } },
    }
  )

  const sidebar = document.createElement('aside')
  const item = document.createElement('div')
  item.draggable = true
  item.dataset.testid = 'sidebar-node'
  item.textContent = 'Drag a process node onto the canvas'
  sidebar.append(item)
  toolbar.append(sidebar)
  item.addEventListener('dragstart', (event) => {
    event.dataTransfer?.setData('application/flow-node', 'process')

    if (event.dataTransfer !== null) {
      event.dataTransfer.effectAllowed = 'move'
    }
  })
  canvas.addEventListener('dragover', (event) => {
    event.preventDefault()

    if (event.dataTransfer !== null) {
      event.dataTransfer.dropEffect = 'move'
    }
  })
  let sequence = 0
  canvas.addEventListener('drop', (event) => {
    event.preventDefault()

    if (event.dataTransfer?.getData('application/flow-node') !== 'process') {
      return
    }

    const position = controller.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    })

    status.dataset.drop = JSON.stringify({
      x: event.clientX,
      y: event.clientY,
      position,
    })
    void controller.addNodes([
      { id: `dropped-${sequence}`, label: 'Process', position },
    ])
    sequence += 1
  })

  return controller
}

const preventingCycles = (): JavaScriptFlowController => {
  const controller = mountFlow(
    canvas,
    {
      nodes: initialNodes,
      edges: [
        { id: 'a-b', source: 'a', target: 'b' },
        { id: 'b-c', source: 'b', target: 'c' },
      ],
    },
    {
      documentMode: 'uncontrolled',
      viewport,
      autoPanOnConnect: false,
      isValidConnection: (connection) => {
        const nodes = controller.getNodes()
        const edges = controller.getEdges()
        const visited = new Set<string>()

        const reachesSource = (id: string): boolean => {
          if (id === connection.source) {
            return true
          }

          if (visited.has(id)) {
            return false
          }

          visited.add(id)

          const node = nodes.find((candidate) => candidate.id === id)

          return (
            node !== undefined &&
            getOutgoers(node, nodes, edges).some((next) =>
              reachesSource(next.id)
            )
          )
        }

        return !reachesSource(connection.target)
      },
      onConnectEnd: (payload) => {
        status.dataset.outcome = payload.outcome
      },
    }
  )

  return controller
}

const turboNode: FlowNodeRenderer = (node, content) => {
  const card = document.createElement('div')
  card.className = 'turbo-card'
  card.textContent = node.label
  content.append(card)

  return {
    update: (next) => {
      card.textContent = next.label
    },
    destroy: () => card.remove(),
  }
}

const turboEdge: FlowEdgeRenderer = {
  render: (edge, context, visual) => {
    const namespace = 'http://www.w3.org/2000/svg'
    const defs = document.createElementNS(namespace, 'defs')
    const gradient = document.createElementNS(namespace, 'linearGradient')
    const id = `turbo-${edge.id}`
    gradient.id = id

    for (const [offset, color] of [
      ['0%', '#ff0072'],
      ['100%', '#00d4ff'],
    ]) {
      const stop = document.createElementNS(namespace, 'stop')
      stop.setAttribute('offset', offset ?? '')
      stop.setAttribute('stop-color', color ?? '')
      gradient.append(stop)
    }

    defs.append(gradient)

    const base = createFlowBaseEdge(document, {
      path: context.pathData,
      style: { stroke: `url(#${id})`, strokeWidth: '4' },
    })

    visual.append(defs, base.element)

    return {
      update: (_next, next) =>
        base.update({
          path: next.pathData,
          style: { stroke: `url(#${id})`, strokeWidth: '4' },
        }),
      destroy: () => {
        base.dispose()
        defs.remove()
      },
    }
  },
}

const turboFlow = (): JavaScriptFlowController =>
  mountFlow(
    canvas,
    {
      nodes: initialNodes.map((node) => ({
        ...node,
        type: 'turbo',
        className: 'turbo-node',
      })),
      edges: [
        { id: 'a-b', source: 'a', target: 'b', type: 'turbo' },
        { id: 'b-c', source: 'b', target: 'c', type: 'turbo' },
      ],
    },
    {
      documentMode: 'uncontrolled',
      viewport,
      colorMode: 'dark',
      nodeRenderers: { turbo: turboNode },
      edgeRenderers: { turbo: turboEdge },
    }
  )

const downloadImage = (): JavaScriptFlowController => {
  const controller = mountFlow(
    canvas,
    { nodes: initialNodes, edges: [{ id: 'a-b', source: 'a', target: 'b' }] },
    { documentMode: 'uncontrolled', viewport }
  )

  toolbar.append(
    pageButton('download-image', 'Download PNG', () => {
      const element = canvas.querySelector<HTMLElement>('.flow-viewport')
      const width = 1024
      const height = 768

      const fitted = getViewportForBounds({
        bounds: controller.getNodesBounds(controller.getNodes()),
        width,
        height,
        limits: { minZoom: 0.1, maxZoom: 2 },
        padding: 0.1,
      })

      if (element === null || fitted === undefined) {
        return
      }

      const exportImage = async (): Promise<void> => {
        try {
          const url = await toPng(element, {
            width,
            height,
            pixelRatio: 1,
            backgroundColor: '#ffffff',
            style: {
              width: `${width}px`,
              height: `${height}px`,
              transform: `translate(${fitted.x}px, ${fitted.y}px) scale(${fitted.zoom})`,
            },
          })

          status.dataset.png = url
          const link = document.createElement('a')
          link.download = 'flow.png'
          link.href = url
          link.click()
        } catch (error) {
          status.value = String(error)
        }
      }

      void exportImage()
    })
  )

  return controller
}

const scenes = new Map([
  ['delete-edge-on-drop', deleteEdgeOnDrop],
  ['contextual-zoom', contextualZoom],
  ['drag-and-drop', dragAndDrop],
  ['preventing-cycles', preventingCycles],
  ['turbo-flow', turboFlow],
  ['download-image', downloadImage],
])

const controller = (scenes.get(scene) ?? deleteEdgeOnDrop)()

report(controller)

controller.subscribeState(() => report(controller))

globalThis.addEventListener('pagehide', () => controller.destroy(), {
  once: true,
})

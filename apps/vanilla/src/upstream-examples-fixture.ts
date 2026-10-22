import {
  mountFlow,
  createFlowControls,
  createFlowMiniMap,
  createFlowBackground,
} from '@flow/vanilla'

import { upstreamExampleConfig } from '../../../packages/conformance/src/upstream-examples/index.ts'
import { applyUpstreamChange } from '../../../packages/conformance/src/upstream-generic/index.ts'
import {
  exampleOptions,
  mountExamplePanel,
  prepareExampleRoot,
  renderedExampleReady,
} from '../../shared/upstream/examples.ts'

import '@flow/vanilla/style.css'

const root = prepareExampleRoot()

const name = location.pathname.slice('/upstream-examples/'.length)

const config = upstreamExampleConfig(name)

const { minZoom, maxZoom, panOnDrag, ...options } = exampleOptions(
  name,
  config,
  root
)

const container = document.createElement('div')

container.className = 'upstream-example-canvas'

root.append(container)

let accepted = config.document

const recordClick = () => {
  root.dataset.clicks = String(Number(root.dataset.clicks ?? 0) + 1)
}

let captureClicks = false

let stopMount: (() => void) | undefined

const mount = (initial: { x: number; y: number; zoom: number }) => {
  const callbacks = captureClicks
    ? { onNodeClick: recordClick, onEdgeClick: recordClick }
    : undefined

  const controller = mountFlow(container, accepted, {
    ...options,
    fitView: false,
    documentMode: 'controlled',
    panOnDrag: panOnDrag ?? true,
    viewport: {
      mode: 'uncontrolled',
      initial,
      limits: { minZoom: minZoom ?? 0.5, maxZoom: maxZoom ?? 2 },
    },
    ...callbacks,
    nodeRenderers: {
      dragHandleNode: (_node, content) => {
        content.className = 'upstream-custom-drag-content'
        content.append('Only draggable here → ')
        const handle = document.createElement('span')
        handle.className = 'custom-drag-handle'
        content.append(handle)

        return {
          update: (node) => {
            content.dataset.upstreamNode = node.id
          },
          destroy: () => content.replaceChildren(),
        }
      },
    },
  })

  container
    .querySelector('.flow-canvas')
    ?.classList.add(...(config.className ? [config.className] : []))

  const unsubscribe = controller.subscribe((change) => {
    const next = applyUpstreamChange(accepted, change)

    if (next !== accepted) {
      accepted = next
      controller.update(next)
    }
  })

  const controls = config.controls ? createFlowControls(controller) : undefined
  const minimap = config.minimap ? createFlowMiniMap(controller) : undefined

  const background = config.background
    ? createFlowBackground(container, controller, {
        variant: config.background,
      })
    : undefined

  stopMount = () => {
    unsubscribe()
    controls?.destroy()
    minimap?.destroy()
    background?.destroy()
    controller.destroy()
  }

  return controller
}

let controller = mount({ x: 0, y: 0, zoom: 1 })

const stopPanel = mountExamplePanel(root, name, {
  getDocument: () => accepted,
  replaceDocument: (document) => {
    accepted = document
    controller.update(document)
  },
  setInteractivity: (patch) => controller.setInteractivity(patch),
  setCanvasOptions: (patch) => controller.setCanvasOptions(patch),
  setCaptureClicks: (capture) => {
    captureClicks = capture
    const viewport = controller.getViewport()
    stopMount?.()
    controller = mount(viewport)
  },
})

let stopReady: (() => void) | undefined

const ready = async () => {
  if (
    config.document.nodes.some((node) => !node.hidden) &&
    !controller.nodesInitialized()
  ) {
    requestAnimationFrame(() => {
      void ready()
    })

    return
  }

  if (options.fitView) {
    await controller.fitView(options.fitViewOptions)
  }

  stopReady = renderedExampleReady(
    root,
    '.flow-viewport',
    controller.getViewport()
  )
}

void ready()

window.addEventListener(
  'pagehide',
  () => {
    stopReady?.()
    stopPanel()
    stopMount?.()
  },
  { once: true }
)

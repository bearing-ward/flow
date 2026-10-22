import type { ExampleConfig } from '../../../packages/conformance/src/upstream-examples/index.ts'
import { addEmptyExampleNode } from '../../../packages/conformance/src/upstream-examples/model.ts'
import type { FlowDocument } from '../../../packages/conformance/src/upstream-examples/model.ts'
import { prepareUpstreamRoot } from './fixture.ts'

export const prepareExampleRoot = () => {
  const root = prepareUpstreamRoot()
  const style = document.createElement('style')
  // Upstream: packages/system/src/styles/style.css:70-83; DragHandle/DragHandleNode.tsx:8-21.
  style.textContent =
    '.flow-node:not([data-drag-handle]), .flow-vue-node:not([data-drag-handle]), .flow-foldkit-node:not([data-drag-handle]) {min-height:0;padding:10px;font:12px Arial} .upstream-custom-drag-content {display:flex;align-items:center;white-space:nowrap;font:12px Arial} .upstream-custom-drag-content .custom-drag-handle {display:inline-block;width:25px;height:25px;background:teal;margin-left:5px;border-radius:50%} .upstream-example-panel {position:absolute;left:10px;top:10px;z-index:4;font:12px Arial} .upstream-example-panel label {display:block} .upstream-example-canvas {position:absolute;inset:0} .flow-foldkit-controls {position:absolute;bottom:10px;left:10px;z-index:5} .flow-foldkit-controls button {display:block} .flow-foldkit-minimap {position:absolute;right:10px;bottom:10px;z-index:5}'
  document.head.append(style)

  return root
}

// Basic/index.tsx:58-60; system/src/utils/general.ts:196-211.
// Flow accepts numeric pixel sides. Convert upstream units at the DOM boundary.
export const exampleOptions = (
  name: string,
  config: ExampleConfig,
  root: HTMLElement
) => {
  const fitViewOptions =
    name === 'basic'
      ? {
          padding: {
            top: 100,
            left: 0,
            right: Math.floor(root.clientWidth * 0.1),
            bottom: Math.floor(
              (root.clientHeight - root.clientHeight / 1.1) * 0.5
            ),
          },
        }
      : { padding: 0.1 }

  const defaultEdgeOptions = { path: 'bezier' } satisfies { path: 'bezier' }

  return {
    ...config.options,
    fitViewOptions,
    defaultEdgeOptions,
  }
}

export interface ExampleOwner {
  readonly getDocument: () => FlowDocument
  readonly replaceDocument: (document: FlowDocument) => void
  readonly setInteractivity: (patch: {
    nodesDraggable?: boolean
    nodesConnectable?: boolean
    elementsSelectable?: boolean
  }) => void
  readonly setCanvasOptions: (patch: {
    zoomOnScroll?: boolean
    zoomOnDoubleClick?: boolean
  }) => void
  readonly setCaptureClicks: (capture: boolean) => void
}

export const mountExamplePanel = (
  root: HTMLElement,
  name: string,
  owner: ExampleOwner
) => {
  // Figma/index.tsx:17-20,40,43. The upstream callback cancels the native menu.
  const onContextMenu = (event: MouseEvent) => {
    if (name === 'figma') {
      event.preventDefault()
    }
  }

  root.addEventListener('contextmenu', onContextMenu)

  const panel = document.createElement('div')
  panel.className = 'upstream-example-panel'

  const checkbox = (
    id: string,
    label: string,
    checked: boolean,
    update: (checked: boolean) => void
  ) => {
    const field = document.createElement('label')
    field.textContent = label
    const input = document.createElement('input')
    input.type = 'checkbox'
    input.id = id
    input.checked = checked
    input.dataset.upstreamControl = id
    input.addEventListener('change', () => update(input.checked))
    field.append(input)
    panel.append(field)
  }

  if (name === 'hidden') {
    // Hidden/index.tsx:50-74,90-103.
    checkbox('ishidden', 'isHidden', true, (hidden) => {
      const current = owner.getDocument()
      owner.replaceDocument({
        ...current,
        nodes: current.nodes.map((node) => ({ ...node, hidden })),
        edges: current.edges.map((edge) => ({ ...edge, hidden })),
      })
    })
  }

  if (name === 'empty') {
    // Empty/index.tsx:33-44. The browser contract seeds Math.random, not positions.
    const button = document.createElement('button')
    button.textContent = 'add node'
    button.addEventListener('click', () => {
      const current = owner.getDocument()
      owner.replaceDocument(
        addEmptyExampleNode(current, {
          x: Math.random() * window.innerWidth,
          y: Math.random() * window.innerHeight,
        })
      )
    })
    panel.append(button)
  }

  if (name === 'interaction') {
    // Interaction/index.tsx:89-235. Only controls exercised by this suite.
    checkbox('draggable', 'nodesDraggable', false, (nodesDraggable) =>
      owner.setInteractivity({ nodesDraggable })
    )
    checkbox('connectable', 'nodesConnectable', false, (nodesConnectable) =>
      owner.setInteractivity({ nodesConnectable })
    )
    checkbox('selectable', 'elementsSelectable', false, (elementsSelectable) =>
      owner.setInteractivity({ elementsSelectable })
    )
    checkbox('zoomonscroll', 'zoomOnScroll', false, (zoomOnScroll) =>
      owner.setCanvasOptions({ zoomOnScroll })
    )
    checkbox('zoomondbl', 'zoomOnDoubleClick', false, (zoomOnDoubleClick) =>
      owner.setCanvasOptions({ zoomOnDoubleClick })
    )
    checkbox(
      'captureelementclick',
      'capture onElementClick',
      false,
      owner.setCaptureClicks
    )
  }

  if (name === 'figma') {
    // Figma/index.tsx:56-58.
    panel.style.left = 'auto'
    panel.style.right = '10px'
    const input = document.createElement('input')
    input.placeholder = 'name'
    panel.append(input)
  }

  root.append(panel)

  return () => {
    root.removeEventListener('contextmenu', onContextMenu)
    panel.remove()
  }
}

// Plan 130: observe the fitted DOM commit, never infer it from a frame count.
export const renderedExampleReady = (
  root: HTMLElement,
  selector: string,
  expected: { x: number; y: number; zoom: number }
) => {
  const { style } = document.createElement('div')
  style.transform = `translate(${expected.x}px, ${expected.y}px) scale(${expected.zoom})`

  const complete = () => {
    if (
      root.querySelector<HTMLElement>(selector)?.style.transform ===
      style.transform
    ) {
      root.dataset.upstreamReady = 'true'
    }
  }

  const observer = new MutationObserver((_records, activeObserver) => {
    complete()

    if (root.dataset.upstreamReady === 'true') {
      activeObserver.disconnect()
    }
  })

  observer.observe(root, {
    attributes: true,
    attributeFilter: ['style'],
    childList: true,
    subtree: true,
  })
  complete()

  if (root.dataset.upstreamReady === 'true') {
    observer.disconnect()
  }

  return () => observer.disconnect()
}

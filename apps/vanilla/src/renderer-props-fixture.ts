import { decodeFlowDocument, getBezierPath } from '@flow/core'
import type { FlowEdgeRendererProps, FlowNodeRendererProps } from '@flow/core'
import { Effect } from 'effect'

import type {
  FlowConnectionPreviewRenderer,
  FlowEdgeRenderer,
  FlowNodeRenderer,
} from './mount-flow.ts'
import { mountFlow } from './mount-flow.ts'

import './style.css'

const svgNamespace = 'http://www.w3.org/2000/svg'

const probeNode: FlowNodeRenderer = (node, content, props) => {
  const element = document.createElement('div')

  const paint = (next: FlowNodeRendererProps) => {
    element.dataset.testid = `probe-node-${next.id}`
    element.dataset.selected = String(next.selected)
    element.dataset.dragging = String(next.dragging)
    element.dataset.x = String(next.positionAbsoluteX)
    element.dataset.y = String(next.positionAbsoluteY)
    element.dataset.connectable = String(next.isConnectable)
    element.dataset.z = String(next.zIndex)
    element.dataset.size = `${next.width}x${next.height}`
    element.textContent = node.label
  }

  paint(props)
  content.append(element)

  return {
    update: (_next, nextProps) => paint(nextProps),
    destroy: () => element.remove(),
  }
}

const probeEdge: FlowEdgeRenderer = {
  render: (_edge, context, visual) => {
    const path = document.createElementNS(svgNamespace, 'path')
    path.dataset.testid = 'probe-edge-path'
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', '#0f766e')
    path.setAttribute('stroke-width', '2')

    const label = document.createElement('div')
    label.dataset.testid = 'probe-edge-label'
    label.style.position = 'absolute'
    label.style.background = '#fde68a'
    label.style.padding = '4px'
    label.style.pointerEvents = 'all'
    context.edgeLabelRenderer.append(label)

    const paint = (props: FlowEdgeRendererProps) => {
      const [d] = getBezierPath(props)

      path.setAttribute('d', d)
      path.dataset.selected = String(props.selected)
      path.dataset.targetNode = `${props.targetNode.id}:${props.targetNode.width}`

      if (props.markerEnd === undefined) {
        path.removeAttribute('marker-end')
      } else {
        path.setAttribute('marker-end', props.markerEnd)
      }

      label.dataset.labelX = String(props.labelX)
      label.dataset.labelY = String(props.labelY)
      label.style.transform = `translate(-50%, -50%) translate(${props.labelX}px, ${props.labelY}px)`
      label.textContent = `label ${props.id}`
    }

    paint(context.props)
    visual.append(path)

    return {
      update: (_next, nextContext) => paint(nextContext.props),
      destroy: () => {
        path.remove()
        label.remove()
      },
    }
  },
}

const probePreview: FlowConnectionPreviewRenderer = (
  preview,
  container,
  line
) => {
  let path = container.querySelector<SVGPathElement>(
    '[data-testid="probe-preview"]'
  )

  if (preview === null || line === null) {
    path?.remove()

    return
  }

  if (path === null) {
    path = document.createElementNS(svgNamespace, 'path')
    path.dataset.testid = 'probe-preview'
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', '#7c3aed')
    container.append(path)
  }

  path.setAttribute('d', line.path)
  path.dataset.from = `${line.fromNode.id}:${line.fromHandle.id}`
  path.dataset.positions = `${line.fromPosition}-${line.toPosition}`
  path.dataset.toNode = line.toNode?.id ?? ''
  path.dataset.lineType = line.connectionLineType
  path.dataset.status = line.connectionStatus ?? 'none'
}

const fixtureDocument = {
  nodes: [
    {
      id: 'a',
      label: 'A',
      type: 'probe',
      position: { x: 40, y: 60 },
      zIndex: 2,
      handles: [{ id: 'out', kind: 'source', side: 'right' }],
    },
    {
      id: 'b',
      label: 'B',
      position: { x: 420, y: 240 },
      handles: [{ id: 'in', kind: 'target', side: 'left' }],
    },
    {
      id: 'c',
      label: 'C',
      position: { x: 420, y: 40 },
      handles: [{ id: 'in', kind: 'target', side: 'left' }],
    },
  ],
  edges: [
    {
      id: 'custom',
      type: 'probe',
      source: 'a',
      sourceHandle: 'out',
      target: 'b',
      targetHandle: 'in',
      path: 'bezier',
      markerEnd: 'arrowclosed',
    },
    {
      id: 'builtin',
      source: 'a',
      sourceHandle: 'out',
      target: 'b',
      targetHandle: 'in',
      path: 'bezier',
    },
  ],
}

/** Mount the renderer props fixture used by the Vanilla browser test. */
export const mountVanillaRendererPropsFixture = (
  root: HTMLElement,
  options: { readonly customPreview: boolean }
) => {
  root.replaceChildren()
  root.style.width = '720px'
  root.style.height = '420px'

  return mountFlow(root, Effect.runSync(decodeFlowDocument(fixtureDocument)), {
    documentMode: 'uncontrolled',
    connectionLineType: options.customPreview ? 'step' : 'bezier',
    connectionPreview: options.customPreview ? probePreview : undefined,
    nodeRenderers: { probe: probeNode },
    edgeRenderers: { probe: probeEdge },
    viewport: {
      mode: 'uncontrolled',
      initial: { x: 0, y: 0, zoom: 1 },
      limits: { minZoom: 0.5, maxZoom: 2 },
    },
  })
}

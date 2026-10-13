import { getBezierPath, getFloatingEdgeParams } from '@flow/core'
import type { FlowEdgeRendererProps, FlowNode, NodeChange } from '@flow/core'

import { createFlowBaseEdge } from './base-edge.ts'
import { createFlowNodesState } from './flow-changes.ts'
import type { FlowNodesState } from './flow-changes.ts'
import type { FlowEdgeRenderer } from './mount-flow.ts'
import { mountFlow } from './mount-flow.ts'
import type { JavaScriptFlowController } from './public.ts'

import './style.css'

/** Plan 111 Vanilla host hardening: clicks, measured sizes, edge hits, resize controls. */
export interface HardeningFixtureOptions {
  readonly documentMode: 'controlled' | 'uncontrolled'
  readonly nodeResizeControls?: boolean
  /** Floating edge source of its hit path: BaseEdge or `interactionPath`. */
  readonly floating?: 'base-edge' | 'returned'
}

export interface HardeningFixture {
  readonly controller: JavaScriptFlowController
  readonly nodeClicks: string[]
  readonly edgeClicks: string[]
  readonly edgeEnters: string[]
  readonly nodeChanges: NodeChange[][]
  readonly callerNodes: () => readonly FlowNode[]
}

const floatingPath = (props: FlowEdgeRendererProps): string =>
  getBezierPath(getFloatingEdgeParams(props.sourceNode, props.targetNode))[0]

const svgNamespace = 'http://www.w3.org/2000/svg'

/** React Flow's Floating Edges example: BaseEdge on the facing node borders. */
const baseEdgeFloating: FlowEdgeRenderer = {
  render: (_edge, context, visual) => {
    const mount = createFlowBaseEdge(document, {
      path: floatingPath(context.props),
      attributes: { 'data-testid': 'floating-path' },
    })

    visual.append(mount.element)

    return {
      update: (_next, next) =>
        mount.update({
          path: floatingPath(next.props),
          attributes: { 'data-testid': 'floating-path' },
        }),
      destroy: () => mount.dispose(),
    }
  },
}

/** A hand-drawn floating edge that returns its own interaction path. */
const returnedFloating: FlowEdgeRenderer = {
  render: (_edge, context, visual) => {
    const path = document.createElementNS(svgNamespace, 'path')
    let d = floatingPath(context.props)

    path.dataset.testid = 'floating-path'
    path.setAttribute('fill', 'none')
    path.setAttribute('stroke', '#0f766e')
    path.setAttribute('stroke-width', '2')
    path.setAttribute('d', d)
    visual.append(path)

    return {
      update: (_next, next) => {
        d = floatingPath(next.props)
        path.setAttribute('d', d)
      },
      interactionPath: () => d,
      destroy: () => path.remove(),
    }
  },
}

/*
 * `a` sits above `b`. Their handles face right, so the handle route bulges
 * to the right, while the floating edge runs straight down between the
 * facing borders.
 */
const initialNodes = [
  {
    id: 'a',
    label: 'Alpha',
    position: { x: 200, y: 60 },
    handles: [{ id: 'out', kind: 'source', side: 'right' }],
  },
  {
    id: 'b',
    label: 'Beta',
    position: { x: 200, y: 320 },
    handles: [{ id: 'in', kind: 'target', side: 'right' }],
  },
] as const

interface CallerNodesOwner {
  state: FlowNodesState | undefined
}

const edge = (floating: HardeningFixtureOptions['floating']) => {
  const base = {
    id: 'e',
    source: 'a',
    sourceHandle: 'out',
    target: 'b',
    targetHandle: 'in',
  }

  return floating === undefined ? base : { ...base, type: 'floating' }
}

export const mountHardeningFixture = (
  root: HTMLElement,
  options: HardeningFixtureOptions
): HardeningFixture => {
  root.replaceChildren()
  root.style.width = '720px'
  root.style.height = '480px'

  const nodeClicks: string[] = []
  const edgeClicks: string[] = []
  const edgeEnters: string[] = []
  const nodeChanges: NodeChange[][] = []
  // The caller's `useNodesState`, bound once the canvas exists.
  const caller: CallerNodesOwner = { state: undefined }

  const controller = mountFlow(
    root,
    {
      nodes: initialNodes,
      edges: [edge(options.floating)],
    },
    {
      documentMode: options.documentMode,
      viewport: {
        mode: 'uncontrolled',
        initial: { x: 0, y: 0, zoom: 1 },
        limits: { minZoom: 0.5, maxZoom: 2 },
      },
      nodeResizeControls: options.nodeResizeControls,
      onNodesChange: (changes) => {
        nodeChanges.push([...changes])
        caller.state?.onChange(changes)
      },
      onNodeClick: ({ nodeId }) => {
        if (nodeId !== undefined) {
          nodeClicks.push(nodeId)
        }
      },
      onEdgeClick: ({ edgeId }) => {
        if (edgeId !== undefined) {
          edgeClicks.push(edgeId)
        }
      },
      onEdgeMouseEnter: ({ edgeId }) => {
        if (edgeId !== undefined) {
          edgeEnters.push(edgeId)
        }
      },
      edgeRenderers:
        options.floating === undefined
          ? undefined
          : {
              floating:
                options.floating === 'base-edge'
                  ? baseEdgeFloating
                  : returnedFloating,
            },
    }
  )

  const nodesState = createFlowNodesState(controller.getNodes())

  caller.state = nodesState

  if (options.documentMode === 'controlled') {
    nodesState.subscribe((nodes) =>
      controller.update({ nodes: [...nodes], edges: controller.getEdges() })
    )
  }

  return {
    controller,
    nodeClicks,
    edgeClicks,
    edgeEnters,
    nodeChanges,
    callerNodes: () => nodesState.get(),
  }
}

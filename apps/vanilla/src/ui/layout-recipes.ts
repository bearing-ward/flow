import {
  applyFlowLayoutPositions,
  getFlowLayoutInput,
  orientFlowHandles,
} from '@flow/core'
import type { FlowLayoutDirection, FlowLayoutInput, FlowNode } from '@flow/core'
import { mountFlow } from '@flow/vanilla'
import type { FlowNodeRenderer, JavaScriptFlowController } from '@flow/vanilla'

import {
  dagreLayout,
  elkLayout,
  elkPortLayout,
  portId,
} from './layout-recipes-engines.ts'
import type { LayoutPositions } from './layout-recipes-engines.ts'
import { startForceLayout } from './layout-recipes-force.ts'
import type { ForceLayoutControl } from './layout-recipes-force.ts'

import './layout-recipes.css'
import {
  createRecipePage,
  everyFrame,
  pageButton,
  sceneParameter,
} from './recipe-page.ts'
import type { RecipeCanvasOwner } from './recipe-page.ts'

/*
 * Layout recipes: Dagre, ELK, auto layout, force layout and dynamic layouting.
 * Every engine reads measured node sizes (and ELK measured handle boxes)
 * from the internal-node API and writes positions back through public edits.
 */

const page = createRecipePage('layout')

const { canvas, status, toolbar } = page

const flow: RecipeCanvasOwner = { current: undefined }

const verticalHandles = [
  { id: 'in', kind: 'target', side: 'top' },
  { id: 'out', kind: 'source', side: 'bottom' },
] as const

const treeLabels = [
  ['1', 'Root'],
  ['2', 'Short'],
  ['3', 'A much longer node label that is wider'],
  ['2a', 'Leaf'],
  ['2b', 'Another leaf node'],
  ['2c', 'c'],
  ['3a', 'Medium sized label'],
  ['3b', 'x'],
  ['3a1', 'Deep leaf one'],
  ['3a2', 'Deep'],
] as const

const treeEdges = [
  ['1', '2'],
  ['1', '3'],
  ['2', '2a'],
  ['2', '2b'],
  ['2', '2c'],
  ['3', '3a'],
  ['3', '3b'],
  ['3a', '3a1'],
  ['3a', '3a2'],
] as const

const treeEdge = (source: string, target: string, id = `e-${target}`) => ({
  id,
  source,
  target,
  sourceHandle: 'out',
  targetHandle: 'in',
})

/** Ten unsized nodes stacked at the origin, so only measurement can lay them out. */
const treeDocument = () => ({
  nodes: treeLabels.map(([id, label]) => ({
    id,
    label,
    position: { x: 0, y: 0 },
    handles: verticalHandles,
  })),
  edges: treeEdges.map(([source, target]) => treeEdge(source, target)),
})

const measuredInput = (controller: JavaScriptFlowController): FlowLayoutInput =>
  getFlowLayoutInput(controller.getSnapshot().document, (id) =>
    controller.getInternalNode(id)
  )

let layouts = 0

const reportLayouts = (): void => {
  status.dataset.layouts = String(layouts)
}

/** Apply engine positions and handle sides through one public edit, then fit. */
const applyLayout = async (
  positions: LayoutPositions,
  direction: FlowLayoutDirection
): Promise<void> => {
  const controller = flow.current

  if (controller === undefined) {
    return
  }

  await controller.setNodes((nodes) =>
    orientFlowHandles(applyFlowLayoutPositions(nodes, positions), direction)
  )
  layouts += 1
  reportLayouts()
  await controller.fitView({ padding: 0.1 })
}

/**
 * Re-run `run` whenever the laid-out node set, edge set or a measured node
 * size changes, once every visible node is measured.
 */
const layoutOnChange = (
  run: (input: FlowLayoutInput) => Promise<void>
): (() => void) => {
  let laidOut = ''
  let busy = false

  const runExclusive = async (input: FlowLayoutInput): Promise<void> => {
    try {
      await run(input)
    } finally {
      busy = false
    }
  }

  return everyFrame(() => {
    const controller = flow.current

    if (controller === undefined || busy) {
      return
    }

    const input = measuredInput(controller)

    if (input.unmeasured.length > 0 || input.nodes.length === 0) {
      return
    }

    const signature = JSON.stringify([
      input.nodes.map(({ id, width, height }) => [id, width, height]),
      input.edges.map(({ id }) => id),
    ])

    if (signature === laidOut) {
      return
    }

    laidOut = signature
    busy = true
    void runExclusive(input)
  })
}

interface Scene {
  readonly document: Parameters<typeof mountFlow>[1]
  readonly options?: Partial<Parameters<typeof mountFlow>[2]>
  readonly start: () => void
}

/** Dagre or ELK tree with TB / LR buttons that re-run the engine. */
const treeScene = (
  engine: (
    input: FlowLayoutInput,
    direction: FlowLayoutDirection
  ) => LayoutPositions | Promise<LayoutPositions>
): Scene => {
  let direction: FlowLayoutDirection = 'TB'

  const run = async (input: FlowLayoutInput): Promise<void> =>
    applyLayout(await engine(input, direction), direction)

  return {
    document: treeDocument(),
    start: () => {
      layoutOnChange(run)

      const rerun = (next: FlowLayoutDirection): void => {
        direction = next

        const controller = flow.current

        if (controller !== undefined) {
          void run(measuredInput(controller))
        }
      }

      toolbar.append(
        pageButton('layout-tb', 'Layout TB', () => rerun('TB')),
        pageButton('layout-lr', 'Layout LR', () => rerun('LR'))
      )
    },
  }
}

/** Status: each measured source handle's port id and center y offset. */
const reportPorts = (input: FlowLayoutInput): void => {
  status.dataset.ports = input.nodes
    .flatMap(({ id, handles }) =>
      handles
        .filter(({ kind }) => kind === 'source')
        .map(
          (handle) =>
            `${portId(id, handle.id)}@${Math.round(handle.y + handle.height / 2)}`
        )
    )
    .join(',')
}

const multipleHandlesScene = (): Scene => {
  const targets = ['t1', 't2', 't3'] as const

  return {
    document: {
      nodes: [
        {
          id: 's',
          label: 'Source',
          position: { x: 0, y: 0 },
          handles: ['out-a', 'out-b', 'out-c'].map((id) => ({
            id,
            kind: 'source' as const,
            side: 'right' as const,
          })),
        },
        ...targets.map((id) => ({
          id,
          label: `Target ${id}`,
          position: { x: 0, y: 0 },
          handles: [
            { id: 'in', kind: 'target' as const, side: 'left' as const },
          ],
        })),
      ],
      edges: (
        [
          ['out-a', 't3'],
          ['out-b', 't1'],
          ['out-c', 't2'],
        ] as const
      ).map(([sourceHandle, target]) => ({
        id: `e-${sourceHandle}`,
        source: 's',
        sourceHandle,
        target,
        targetHandle: 'in',
      })),
    },
    start: () => {
      layoutOnChange(async (input) => {
        reportPorts(input)
        await applyLayout(await elkPortLayout(input), 'LR')
      })
    },
  }
}

/** Remove the last node, never the root. */
const removeLast = (): void => {
  const last = flow.current?.getNodes().at(-1)

  if (last !== undefined && last.id !== '1') {
    void flow.current?.deleteElements({ nodeIds: [last.id] })
  }
}

const autoLayoutScene = (): Scene => {
  let added = 0

  const addChild = (): void => {
    const controller = flow.current

    if (controller === undefined) {
      return
    }

    const parent =
      controller.getNodes().find(({ selected }) => selected === true)?.id ?? '1'

    added += 1

    const id = `n${added}`

    void controller.applyEdit({
      operations: [
        {
          kind: 'add-nodes',
          nodes: [
            {
              id,
              label: `Child ${added}`,
              position: { x: 0, y: 0 },
              handles: verticalHandles,
            },
          ],
        },
        { kind: 'add-edges', edges: [treeEdge(parent, id)] },
      ],
    })
  }

  return {
    document: treeDocument(),
    start: () => {
      layoutOnChange((input) => applyLayout(dagreLayout(input, 'TB'), 'TB'))
      toolbar.append(
        pageButton('add-child', 'Add child', addChild),
        pageButton('remove-last', 'Remove last', removeLast)
      )
    },
  }
}

const placeholderType = 'placeholder'

const placeholderNode: FlowNodeRenderer = (node, content) => {
  const element = document.createElement('div')

  element.className = 'layout-placeholder'
  element.dataset.testid = 'placeholder'
  element.textContent = node.label
  content.append(element)

  return {
    update: (next) => {
      element.textContent = next.label
    },
    destroy: () => element.remove(),
  }
}

/** The clicked placeholder becomes a regular node with a new label. */
const promote = (node: FlowNode, id: string, label: string): FlowNode => {
  if (node.id !== id) {
    return node
  }

  const { type: _placeholder, ...regular } = node

  return { ...regular, label }
}

interface PendingTap {
  readonly nodeId: string
  readonly pointerId: number
  readonly x: number
  readonly y: number
}

const tappedNodeId = (target: EventTarget | null): string | undefined =>
  target instanceof Element
    ? target.closest<HTMLElement>('.flow-node')?.dataset.nodeId
    : undefined

/**
 * Report a press and release on one node without movement. The host's
 * `onNodeClick` misses the click that first selects a node (the browser
 * dispatches no `click` for it), so the recipe reads the pointer pair.
 */
const listenForNodeTaps = (onTap: (nodeId: string) => void): void => {
  let pending: PendingTap | undefined

  canvas.addEventListener(
    'pointerdown',
    (event) => {
      const nodeId = tappedNodeId(event.target)

      pending =
        nodeId === undefined || event.button !== 0
          ? undefined
          : {
              nodeId,
              pointerId: event.pointerId,
              x: event.clientX,
              y: event.clientY,
            }
    },
    { capture: true }
  )

  canvas.addEventListener(
    'pointerup',
    (event) => {
      const tap = pending

      pending = undefined

      if (
        tap?.pointerId === event.pointerId &&
        tappedNodeId(event.target) === tap.nodeId &&
        Math.hypot(event.clientX - tap.x, event.clientY - tap.y) < 3
      ) {
        onTap(tap.nodeId)
      }
    },
    { capture: true }
  )
}

const dynamicLayoutScene = (): Scene => {
  let created = 1
  let regular = 1

  const placeholderChild = (parent: string) => {
    created += 1

    const id = `p${created}`

    return {
      node: {
        id,
        label: '+',
        type: placeholderType,
        position: { x: 0, y: 0 },
        handles: verticalHandles,
      },
      edge: treeEdge(parent, id, `pe-${id}`),
    }
  }

  const onNodeTap = (nodeId: string): void => {
    const controller = flow.current
    const node = controller?.getNode(nodeId)

    if (controller === undefined || node === undefined) {
      return
    }

    const child = placeholderChild(node.id)

    if (node.type !== placeholderType) {
      void controller.applyEdit({
        operations: [
          { kind: 'add-nodes', nodes: [child.node] },
          { kind: 'add-edges', edges: [child.edge] },
        ],
      })

      return
    }

    regular += 1

    const label = `Node ${regular}`

    void controller.applyEdit({
      operations: [
        {
          kind: 'set-nodes',
          nodes: [
            ...controller
              .getNodes()
              .map((candidate) => promote(candidate, node.id, label)),
            child.node,
          ],
        },
        {
          kind: 'set-edges',
          edges: [
            ...controller
              .getEdges()
              .map((edge) =>
                edge.target === node.id ? { ...edge, id: `e-${node.id}` } : edge
              ),
            child.edge,
          ],
        },
      ],
    })
  }

  return {
    document: {
      nodes: [
        {
          id: 'root',
          label: 'Root',
          position: { x: 0, y: 0 },
          handles: verticalHandles,
        },
        {
          id: 'p1',
          label: '+',
          type: placeholderType,
          position: { x: 0, y: 0 },
          handles: verticalHandles,
        },
      ],
      edges: [treeEdge('root', 'p1', 'pe-p1')],
    },
    options: { nodeRenderers: { [placeholderType]: placeholderNode } },
    start: () => {
      layoutOnChange((input) => applyLayout(dagreLayout(input, 'TB'), 'TB'))
      listenForNodeTaps(onNodeTap)
    },
  }
}

/** Owns the running simulation so drag callbacks can reach it. */
interface ForceLayoutOwner {
  current: ForceLayoutControl | undefined
}

const forceLayoutScene = (): Scene => {
  const force: ForceLayoutOwner = { current: undefined }

  const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']

  return {
    document: {
      nodes: ids.map((id, index) => ({
        id,
        label: `Force ${id.toUpperCase()}`,
        position: { x: 380 + (index % 3) * 12, y: 240 + index * 6 },
      })),
      edges: (
        [
          ['a', 'b'],
          ['a', 'c'],
          ['b', 'd'],
          ['c', 'e'],
          ['e', 'f'],
          ['f', 'g'],
          ['g', 'h'],
        ] as const
      ).map(([source, target]) => ({
        id: `e-${source}-${target}`,
        source,
        target,
      })),
    },
    options: {
      onNodeDragStart: () => force.current?.pause(),
      onNodeDragStop: ({ outcome, positions }) =>
        force.current?.drop(outcome === 'proposed' ? positions : []),
    },
    start: () => {
      const controller = flow.current

      if (controller !== undefined) {
        force.current = startForceLayout(controller, status)
      }
    },
  }
}

const scenes = {
  'dagre-tree': () => treeScene(dagreLayout),
  'elk-tree': () => treeScene(elkLayout),
  'elk-multiple-handles': multipleHandlesScene,
  'auto-layout': autoLayoutScene,
  'force-layout': forceLayoutScene,
  'dynamic-layouting': dynamicLayoutScene,
} satisfies Readonly<Record<string, () => Scene>>

const sceneName = sceneParameter('dagre-tree')

const scene = Object.entries(scenes).find(([name]) => name === sceneName)?.[1]()

if (scene === undefined) {
  throw new Error(`Unknown layout recipe scene: ${sceneName}`)
}

page.root.dataset.scene = sceneName

const controller = mountFlow(canvas, scene.document, {
  documentMode: 'uncontrolled',
  viewport: {
    mode: 'uncontrolled',
    initial: { x: 0, y: 0, zoom: 1 },
    limits: { minZoom: 0.2, maxZoom: 1.5 },
  },
  ...scene.options,
})

flow.current = controller

const report = (): void => {
  const nodes = controller.getNodes()

  status.value = `nodes:${nodes.length}`
  status.dataset.nodes = String(
    nodes.filter(({ type }) => type !== placeholderType).length
  )
  status.dataset.placeholders = String(
    nodes.filter(({ type }) => type === placeholderType).length
  )
  status.dataset.ids = nodes.map(({ id }) => id).join(',')
  status.dataset.edges = controller
    .getEdges()
    .map(({ source, target }) => `${source}>${target}`)
    .join(',')
}

reportLayouts()

report()

controller.subscribeState(report)

scene.start()

globalThis.addEventListener('pagehide', () => controller.destroy(), {
  once: true,
})

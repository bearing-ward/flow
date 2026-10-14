import {
  applyFlowLayoutPositions,
  getFlowLayoutInput,
  orientFlowHandles,
} from '@flow/core'
import type {
  FlowDocument,
  FlowLayoutDirection,
  FlowLayoutInput,
} from '@flow/core'
import { flowBaseEdge } from '@flow/foldkit'
import type { FoldkitRendererRegistry } from '@flow/foldkit'
import { Option, Schema as S } from 'effect'

import { mountRecipeHost, nextFrame } from '../recipe-host.ts'
import type { EditOperations, RecipeHost } from '../recipe-host.ts'
import { dagreLayout, elkLayout } from './engines.ts'
import type { Positions } from './engines.ts'
import {
  dynamicDocument,
  forceDocument,
  multipleHandlesDocument,
  SceneNameSchema,
  treeDocument,
  treeEdge,
  treeNode,
} from './fixtures.ts'
import type { SceneName } from './fixtures.ts'
import { startForceLayout } from './force.ts'

import './layout.css'

const scene: SceneName = Option.getOrElse(
  S.decodeUnknownOption(SceneNameSchema)(
    new URLSearchParams(globalThis.location.search).get('scene')
  ),
  () => 'dagre-tree' as const
)

const registry: FoldkitRendererRegistry = {
  nodeTypes: {
    placeholder: (_node, h) =>
      h.div(
        [
          h.Class('layout-placeholder'),
          h.DataAttribute('testid', 'placeholder'),
        ],
        ['+']
      ),
  },
  edgeTypes: {
    placeholder: (_edge, { path }, h) =>
      flowBaseEdge(h, {
        path,
        attributes: { 'stroke-dasharray': '5 5' },
      }),
  },
}

const sceneDocuments = {
  'dagre-tree': treeDocument,
  'elk-tree': treeDocument,
  'elk-multiple-handles': multipleHandlesDocument,
  'auto-layout': treeDocument,
  'force-layout': forceDocument,
  'dynamic-layouting': dynamicDocument,
}

const host = mountRecipeHost({
  page: 'layout-page',
  document: sceneDocuments[scene],
  viewport:
    scene === 'force-layout'
      ? { x: 450, y: 270, zoom: 1 }
      : { x: 0, y: 0, zoom: 1 },
  registry,
})

const page = host.root.querySelector<HTMLElement>('main')

if (page !== null) {
  page.dataset.scene = scene
}

host.status.dataset.scene = scene

type Engine = (
  input: FlowLayoutInput,
  direction: FlowLayoutDirection
) => Positions | Promise<Positions>

const engineFor = (name: SceneName): Engine => {
  switch (name) {
    case 'elk-tree': {
      return (input, direction) => elkLayout(input, direction)
    }

    case 'elk-multiple-handles': {
      return (input, direction) => elkLayout(input, direction, true)
    }

    default: {
      return dagreLayout
    }
  }
}

/** Layout input identity: direction, node and edge sets, and measured sizes. */
const layoutKey = (input: FlowLayoutInput, direction: FlowLayoutDirection) =>
  [
    direction,
    ...input.nodes.map(
      ({ id, width, height }) =>
        `${id}:${Math.round(width)}x${Math.round(height)}`
    ),
    ...input.edges.map(({ source, target }) => `${source}>${target}`),
  ].join('|')

const showPorts = (input: FlowLayoutInput): void => {
  host.status.dataset.ports = input.nodes
    .flatMap((node) =>
      node.handles
        .filter(({ kind }) => kind === 'source')
        .map(
          (handle) =>
            `${node.id}:${handle.id}@${Math.round(handle.y + handle.height / 2)}`
        )
    )
    .join(',')
}

/**
 * Lays out with measured sizes whenever the node set, edge set, a measured
 * size or the direction changes. Unmeasured nodes postpone the run until
 * their measurements arrive.
 */
const createLayoutController = (
  target: RecipeHost,
  engine: Engine,
  initialDirection: FlowLayoutDirection
) => {
  let direction = initialDirection
  let layouts = 0
  let lastKey = ''
  let running = false
  let again = false

  target.status.dataset.layouts = '0'
  target.status.dataset.direction = direction

  const runOnce = async (): Promise<void> => {
    const { document, internals } = await target.measuredState()
    const input = getFlowLayoutInput(document, (id) => internals.get(id))

    if (input.unmeasured.length > 0 || input.nodes.length === 0) {
      return
    }

    const key = layoutKey(input, direction)

    if (key === lastKey) {
      return
    }

    const positions = await engine(input, direction)

    const nodes = orientFlowHandles(
      applyFlowLayoutPositions(document.nodes, positions),
      direction
    )

    const operations: EditOperations = nodes.map((node) => ({
      kind: 'update-node',
      nodeId: node.id,
      patch:
        node.handles === undefined
          ? { position: node.position }
          : { position: node.position, handles: node.handles },
    }))

    await target.edit(operations)
    lastKey = key
    layouts += 1

    // Handles may have moved sides; refresh their measurements, then fit.
    await nextFrame()
    target.remeasure()
    await target.viewportClient.fitView('all', 0.1)
    await nextFrame()
    showPorts(input)
    target.status.dataset.direction = direction
    target.status.dataset.layouts = String(layouts)
    target.status.value = `layouts:${layouts}`
  }

  const request = async (): Promise<void> => {
    if (running) {
      again = true

      return
    }

    running = true
    again = false

    try {
      await runOnce()
    } finally {
      running = false
    }

    if (again) {
      await request()
    }
  }

  // The React examples' `onNodesChange` trigger: lay out again on a
  // `dimensions` change (a new measured size, including each added node's
  // first measurement) or a `remove` change. Position changes, including the
  // layout's own, do not re-run it.
  const stop = target.runtime.ports.elementChanges.subscribe(({ nodes }) => {
    if (nodes.some(({ type }) => type === 'dimensions' || type === 'remove')) {
      void request()
    }
  })

  target.onDispose(stop)
  void request()

  return {
    setDirection: (next: FlowLayoutDirection) => {
      direction = next
      void request()
    },
  }
}

const childOf = (document: FlowDocument, parentId: string) =>
  document.nodes.find(({ id }) => id === parentId)?.position ?? { x: 0, y: 0 }

let created = 0

/** Add a node (or placeholder) below `parentId`; it has no meaningful position yet. */
const addChild = (
  parentId: string,
  options: { readonly placeholder: boolean }
): EditOperations => {
  created += 1
  const id = options.placeholder ? `p-${created + 1}` : `child-${created}`
  const position = childOf(host.document(), parentId)

  const flowNode = {
    ...treeNode(id, options.placeholder ? '+' : `Child ${created}`),
    position,
  }

  const flowEdge = treeEdge(parentId, id)

  return [
    {
      kind: 'add-nodes',
      nodes: [
        options.placeholder ? { ...flowNode, type: 'placeholder' } : flowNode,
      ],
    },
    {
      kind: 'add-edges',
      edges: [
        options.placeholder ? { ...flowEdge, type: 'placeholder' } : flowEdge,
      ],
    },
  ]
}

const renderCounts = (document: FlowDocument): void => {
  host.status.dataset.nodes = String(
    document.nodes.filter(({ type }) => type !== 'placeholder').length
  )
  host.status.dataset.placeholders = String(
    document.nodes.filter(({ type }) => type === 'placeholder').length
  )
}

switch (scene) {
  case 'dagre-tree':
  case 'elk-tree': {
    const controller = createLayoutController(host, engineFor(scene), 'TB')

    host
      .button('layout-tb', 'Vertical layout')
      .addEventListener('click', () => controller.setDirection('TB'))
    host
      .button('layout-lr', 'Horizontal layout')
      .addEventListener('click', () => controller.setDirection('LR'))
    break
  }

  case 'elk-multiple-handles': {
    createLayoutController(host, engineFor(scene), 'LR')
    break
  }

  case 'auto-layout': {
    createLayoutController(host, engineFor(scene), 'TB')
    const added: string[] = []

    host.button('add-child', 'Add child').addEventListener('click', () => {
      const document = host.document()

      const parent =
        document.nodes.find(({ selected }) => selected === true)?.id ?? '1'

      const operations = addChild(parent, { placeholder: false })
      added.push(`child-${created}`)
      void host.edit(operations)
    })

    host.button('remove-last', 'Remove last').addEventListener('click', () => {
      const last = added.pop()

      if (last !== undefined) {
        void host.edit([{ kind: 'delete-elements', nodeIds: [last] }])
      }
    })
    renderCounts(host.document())
    host.onAccepted(renderCounts)
    break
  }

  case 'force-layout': {
    startForceLayout(host)
    break
  }

  case 'dynamic-layouting': {
    createLayoutController(host, engineFor(scene), 'TB')
    renderCounts(host.document())
    host.onAccepted(renderCounts)

    let regular = 1

    // A placeholder becomes a regular node with a new placeholder under it;
    // a regular node gains a new placeholder branch.
    const onNodeClick = (nodeId: string): void => {
      const document = host.document()
      const clicked = document.nodes.find(({ id }) => id === nodeId)

      if (clicked === undefined) {
        return
      }

      if (clicked.type !== 'placeholder') {
        void host.edit(addChild(nodeId, { placeholder: true }))

        return
      }

      regular += 1

      const { type: _type, ...converted } = clicked

      void host.edit([
        {
          kind: 'set-nodes',
          nodes: document.nodes.map((flowNode) =>
            flowNode.id === nodeId
              ? { ...converted, label: `Node ${regular}` }
              : flowNode
          ),
        },
        {
          kind: 'set-edges',
          edges: document.edges.map((flowEdge) => {
            if (flowEdge.target !== nodeId) {
              return flowEdge
            }

            const { type: _edgeType, ...solid } = flowEdge

            return solid
          }),
        },
        ...addChild(nodeId, { placeholder: true }),
      ])
    }

    host.runtime.ports.interactionEvents.subscribe((events) => {
      for (const { name, nodeId } of events) {
        if (name === 'onNodeClick' && nodeId !== undefined && nodeId !== null) {
          onNodeClick(nodeId)
        }
      }
    })
    break
  }

  default: {
    break
  }
}

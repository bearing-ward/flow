import * as XYFlow from '@xyflow/react'
import { useEffect, useRef, useState } from 'react'

declare global {
  interface Window {
    __providerInitializationProgress?: string
  }
}

type ProviderInputs = Omit<
  Parameters<typeof XYFlow.ReactFlowProvider>[0],
  'children'
>

const sizedNodes: [XYFlow.Node] = [
  {
    id: 'sized',
    position: { x: 100, y: 50 },
    width: 100,
    height: 50,
    data: {},
  },
]

const unsizedNodes: XYFlow.Node[] = [
  { id: 'unsized', position: { x: 1000, y: 900 }, data: {} },
]

const initialNodes: XYFlow.Node[] = [
  {
    id: 'initial-a',
    position: { x: 0, y: 0 },
    width: 100,
    height: 50,
    data: {},
  },
  {
    id: 'initial-b',
    position: { x: 200, y: 0 },
    width: 100,
    height: 50,
    data: {},
  },
]

const defaultNodes = initialNodes.map((node) => ({
  ...node,
  id: node.id.replace('initial', 'default'),
}))

const controlledNodes = initialNodes.map((node) => ({
  ...node,
  id: node.id.replace('initial', 'controlled'),
}))

const pane = { initialWidth: 800, initialHeight: 600, fitView: true }

const providerCases = [
  { id: 'empty-fit', props: { ...pane, initialNodes: [] } },
  { id: 'all-unsized-fit', props: { ...pane, initialNodes: unsizedNodes } },
  {
    id: 'mixed-fit',
    props: { ...pane, initialNodes: [...sizedNodes, ...unsizedNodes] },
  },
  { id: 'sized-fit', props: { ...pane, initialNodes: sizedNodes } },
  {
    id: 'initial-node-dimensions-fit',
    props: {
      ...pane,
      initialNodes: [
        {
          id: 'initial-size',
          position: { x: 100, y: 50 },
          initialWidth: 100,
          initialHeight: 50,
          data: {},
        },
      ],
    },
  },
  { id: 'empty-max-zoom', props: { ...pane, initialMaxZoom: 1.25 } },
  {
    id: 'minimum-zoom',
    props: {
      ...pane,
      initialMinZoom: 0.75,
      initialNodes: [{ ...sizedNodes[0], width: 2000, height: 2000 }],
    },
  },
  {
    id: 'missing-pane-dimensions',
    props: { fitView: true, initialNodes: sizedNodes },
  },
  {
    id: 'fit-disabled',
    props: { ...pane, fitView: false, initialNodes: sizedNodes },
  },
  {
    id: 'default-collection-precedence',
    props: {
      initialNodes,
      defaultNodes,
      initialEdges: [
        { id: 'initial-edge', source: 'initial-a', target: 'initial-b' },
      ],
      defaultEdges: [
        { id: 'default-edge', source: 'default-a', target: 'default-b' },
      ],
    },
  },
  {
    id: 'empty-default-collection-precedence',
    props: {
      initialNodes,
      defaultNodes: [],
      initialEdges: [
        { id: 'initial-edge', source: 'initial-a', target: 'initial-b' },
      ],
      defaultEdges: [],
    },
  },
  {
    id: 'initial-fit-padding',
    props: {
      ...pane,
      initialMaxZoom: 20,
      initialNodes: sizedNodes,
      initialFitViewOptions: { padding: 0.5 },
    },
  },
] satisfies { id: string; props: ProviderInputs }[]

const childCases = [
  {
    id: 'controlled-after-provider-defaults',
    defaultViewport: { x: 13, y: 17, zoom: 1.25 },
    fitView: false,
  },
  {
    id: 'controlled-viewport-over-default',
    defaultViewport: { x: 13, y: 17, zoom: 1.25 },
    viewport: { x: 31, y: 37, zoom: 0.75 },
    fitView: false,
  },
  {
    id: 'child-fit-over-default-viewport',
    defaultViewport: { x: 13, y: 17, zoom: 1.25 },
    fitView: true,
  },
] satisfies {
  id: string
  defaultViewport: XYFlow.Viewport
  viewport?: XYFlow.Viewport
  fitView: boolean
}[]

const project = (instance: XYFlow.ReactFlowInstance) => {
  const graph = instance.toObject()

  return {
    nodeIds: graph.nodes.map(({ id }) => id),
    edgeIds: graph.edges.map(({ id }) => id),
    viewport: graph.viewport,
  }
}

type Observation = ReturnType<typeof project> & {
  renderedNodeIds: string[]
  renderedViewportTransform: string | null
}

const observations: {
  id: string
  phase: 'provider-only' | 'settled-controlled-child'
  value: Observation
}[] = []

const close = (left: number, right: number) =>
  Math.abs(left - right) <= 0.000001

const renderedMatches = ({
  phase,
  initialized,
  expectedNodeIds,
  value,
}: {
  phase: 'provider-only' | 'settled-controlled-child'
  initialized: boolean
  expectedNodeIds: string[]
  value: Observation
}) => {
  if (phase === 'provider-only') {
    return true
  }

  if (!initialized || value.renderedViewportTransform === null) {
    return false
  }

  const matrix = new DOMMatrixReadOnly(value.renderedViewportTransform)

  return (
    JSON.stringify(value.renderedNodeIds) === JSON.stringify(expectedNodeIds) &&
    close(matrix.m41, value.viewport.x) &&
    close(matrix.m42, value.viewport.y) &&
    close(matrix.a, value.viewport.zoom)
  )
}

const expectedChildViewport = (config: (typeof childCases)[number]) => {
  if ('viewport' in config) {
    return config.viewport
  }

  if (config.fitView) {
    return { x: 100, y: 250, zoom: 2 }
  }

  return config.defaultViewport
}

const PublicProbe = ({
  id,
  phase,
  expectedNodeIds,
  expectedViewport,
  onDone,
}: {
  id: string
  phase: 'provider-only' | 'settled-controlled-child'
  expectedNodeIds: string[]
  expectedViewport?: XYFlow.Viewport
  onDone: () => void
}) => {
  const instance = XYFlow.useReactFlow()
  const nodes = XYFlow.useNodes()
  const edges = XYFlow.useEdges()
  const viewport = XYFlow.useViewport()
  const initialized = XYFlow.useNodesInitialized()
  const owner = useRef<HTMLDivElement>(null)
  const latest = useRef({ nodes, edges, viewport, initialized })
  latest.current = { nodes, edges, viewport, initialized }

  useEffect(() => {
    let frame = 0
    let previous = ''
    let stableFrames = 0
    let finished = false

    const sample = () => {
      if (finished) {
        return
      }

      const graph = project(instance)
      const hooks = latest.current
      const canvas = owner.current?.closest('.react-flow')

      const renderedNodeIds = [
        ...(canvas?.querySelectorAll<HTMLElement>('.react-flow__node') ?? []),
      ].map((element) => element.dataset.id ?? '')

      const renderedViewportTransform =
        canvas?.querySelector<HTMLElement>('.react-flow__viewport')?.style
          .transform ?? null

      const value = { ...graph, renderedNodeIds, renderedViewportTransform }
      const serialized = JSON.stringify(value)

      const idsAgree =
        JSON.stringify(graph.nodeIds) === JSON.stringify(expectedNodeIds) &&
        JSON.stringify(hooks.nodes.map(({ id: nodeId }) => nodeId)) ===
          JSON.stringify(expectedNodeIds)

      const hooksAgree =
        JSON.stringify(hooks.viewport) === JSON.stringify(graph.viewport) &&
        JSON.stringify(hooks.edges.map(({ id: edgeId }) => edgeId)) ===
          JSON.stringify(graph.edgeIds)

      const expectedViewportAgree =
        expectedViewport === undefined ||
        JSON.stringify(expectedViewport) === JSON.stringify(graph.viewport)

      const renderedAgree = renderedMatches({
        phase,
        initialized: hooks.initialized,
        expectedNodeIds,
        value,
      })

      window.__providerInitializationProgress = JSON.stringify({
        id,
        phase,
        idsAgree,
        hooksAgree,
        renderedAgree,
        expectedViewportAgree,
        expectedViewport,
        hooks,
        initialized: hooks.initialized,
        value,
      })
      stableFrames =
        idsAgree &&
        hooksAgree &&
        renderedAgree &&
        expectedViewportAgree &&
        previous === serialized
          ? stableFrames + 1
          : 0
      previous = serialized

      if (stableFrames >= 8) {
        observations.push({ id, phase, value })
        finished = true
        onDone()

        return
      }

      frame = requestAnimationFrame(sample)
    }

    frame = requestAnimationFrame(sample)

    return () => {
      finished = true
      cancelAnimationFrame(frame)
    }
  }, [expectedNodeIds, expectedViewport, id, instance, onDone, phase])

  return <div ref={owner} />
}

const ChildCase = ({
  index,
  onDone,
}: {
  index: number
  onDone: () => void
}) => {
  const config = childCases[index]

  if (config === undefined) {
    throw new Error('Missing child case')
  }

  const expectedViewport = expectedChildViewport(config)

  const [childMounted, setChildMounted] = useState(false)

  return (
    <XYFlow.ReactFlowProvider
      initialNodes={initialNodes}
      defaultNodes={defaultNodes}
      initialEdges={[
        { id: 'initial-edge', source: 'initial-a', target: 'initial-b' },
      ]}
      defaultEdges={[
        { id: 'default-edge', source: 'default-a', target: 'default-b' },
      ]}
      {...pane}
    >
      {childMounted ? (
        <div style={{ width: 800, height: 600 }}>
          <XYFlow.ReactFlow
            nodes={controlledNodes}
            edges={[
              {
                id: 'controlled-edge',
                source: 'controlled-a',
                target: 'controlled-b',
              },
            ]}
            {...config}
          >
            <PublicProbe
              id={config.id}
              phase="settled-controlled-child"
              expectedNodeIds={controlledNodes.map(({ id }) => id)}
              expectedViewport={expectedViewport}
              onDone={onDone}
            />
          </XYFlow.ReactFlow>
        </div>
      ) : (
        <PublicProbe
          id={config.id}
          phase="provider-only"
          expectedNodeIds={defaultNodes.map(({ id }) => id)}
          onDone={() => setChildMounted(true)}
        />
      )}
    </XYFlow.ReactFlowProvider>
  )
}

export const InitializationCapture = ({
  onDone,
}: {
  onDone: (value: typeof observations) => void
}) => {
  const [index, setIndex] = useState(0)

  const advance = () => {
    if (index + 1 === providerCases.length + childCases.length) {
      onDone(observations)
    } else {
      setIndex(index + 1)
    }
  }

  const config = providerCases[index]

  if (config !== undefined) {
    return (
      <XYFlow.ReactFlowProvider key={config.id} {...config.props}>
        <PublicProbe
          id={config.id}
          phase="provider-only"
          expectedNodeIds={(
            config.props.defaultNodes ??
            config.props.initialNodes ??
            []
          ).map(({ id }) => id)}
          onDone={advance}
        />
      </XYFlow.ReactFlowProvider>
    )
  }

  return (
    <ChildCase
      key={index}
      index={index - providerCases.length}
      onDone={advance}
    />
  )
}

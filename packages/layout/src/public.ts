import { Graph, layout } from '@dagrejs/dagre'
import { decodeFlowLayoutSettings, layoutCenterToTopLeft } from '@flow/core'
import type {
  FlowLayoutInput,
  FlowLayoutRequest,
  FlowLayoutResult,
} from '@flow/core'
import { stratify, tree } from 'd3-hierarchy'
import { Effect } from 'effect'
import ELK from 'elkjs/lib/elk.bundled.js'

export { createForceSimulation } from './force.ts'

let elk: InstanceType<typeof ELK> | undefined

/** Reject arbitrary graphs before d3-hierarchy can silently reinterpret them. */
export const hierarchyRoot = (input: FlowLayoutInput) => {
  const parents = new Map<string, string>()

  for (const edge of input.edges) {
    if (parents.has(edge.target)) {
      throw new Error('Hierarchy requires one parent per node')
    }

    parents.set(edge.target, edge.source)
  }

  return stratify<(typeof input.nodes)[number]>()
    .id(({ id }) => id)
    .parentId(({ id }) => parents.get(id))([...input.nodes])
}

/** Optional engines consume measured boxes and return top-left positions. */
export const runLayoutEngine = (
  request: FlowLayoutRequest
): Effect.Effect<FlowLayoutResult, Error> =>
  Effect.gen(function* executeEngine() {
    const settings = yield* decodeFlowLayoutSettings(request.settings).pipe(
      Effect.mapError((error) => new Error(String(error)))
    )

    const { input } = request

    const positions = yield* Effect.tryPromise({
      try: async () => {
        if (input.unmeasured.length > 0 || input.nodes.length === 0) {
          throw new Error('Layout requires measured nodes')
        }

        if (settings.engine === 'elk') {
          elk ??= new ELK()

          const result = await elk.layout({
            id: 'root',
            layoutOptions: {
              'elk.algorithm': 'layered',
              'elk.direction': settings.direction === 'TB' ? 'DOWN' : 'RIGHT',
              'elk.spacing.nodeNode': String(settings.nodeSpacing),
              'elk.layered.spacing.nodeNodeBetweenLayers': String(
                settings.rankSpacing
              ),
            },
            children: input.nodes.map(({ id, width, height }) => ({
              id,
              width,
              height,
            })),
            edges: input.edges.map(({ id, source, target }) => ({
              id,
              sources: [source],
              targets: [target],
            })),
          })

          return new Map(
            (result.children ?? []).map(({ id, x = 0, y = 0 }) => [
              id,
              { x, y },
            ])
          )
        }

        if (settings.engine === 'hierarchy') {
          const root = hierarchyRoot(input)
          const horizontal = settings.direction === 'LR'

          const breadth = Math.max(
            ...input.nodes.map((n) => (horizontal ? n.height : n.width))
          )

          const depth = Math.max(
            ...input.nodes.map((n) => (horizontal ? n.width : n.height))
          )

          const result = tree<(typeof input.nodes)[number]>().nodeSize([
            breadth + settings.nodeSpacing,
            depth + settings.rankSpacing,
          ])(root)

          return new Map(
            result
              .descendants()
              .map((node) => [
                node.data.id,
                layoutCenterToTopLeft(
                  horizontal
                    ? { x: node.y, y: node.x }
                    : { x: node.x, y: node.y },
                  node.data
                ),
              ])
          )
        }

        const graph = new Graph<
          object,
          { width: number; height: number; x?: number; y?: number },
          object
        >()

        graph.setGraph({
          rankdir: settings.direction,
          nodesep: settings.nodeSpacing,
          ranksep: settings.rankSpacing,
        })
        graph.setDefaultEdgeLabel(() => ({}))

        for (const node of input.nodes) {
          graph.setNode(node.id, { width: node.width, height: node.height })
        }

        for (const edge of input.edges) {
          graph.setEdge(edge.source, edge.target)
        }

        layout(graph)

        return new Map(
          input.nodes.map((node) => {
            const { x = 0, y = 0 } = graph.node(node.id)

            return [node.id, layoutCenterToTopLeft({ x, y }, node)]
          })
        )
      },
      catch: (error) =>
        error instanceof Error ? error : new Error(String(error)),
    })

    return { revision: request.revision, settings, positions }
  })

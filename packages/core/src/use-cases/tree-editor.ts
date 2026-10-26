import { Effect } from 'effect'

import { prepareFlowEdit } from '../domain/flow-edit.ts'
import {
  createFlowLayoutSession,
  defaultFlowLayoutSettings,
  flowLayoutRevision,
} from '../domain/flow-layout-request.ts'
import type {
  FlowLayoutRequest,
  FlowLayoutResult,
} from '../domain/flow-layout-request.ts'
import type { FlowLayoutInput } from '../domain/flow-layout.ts'
import type {
  FlowNodeAnimationRequest,
  FlowNodeAnimationResult,
} from '../domain/flow-node-animation.ts'
import { projectFlowTree } from '../domain/flow-tree.schema.ts'
import { InvalidFlowTree, prepareFlowTreeEdit } from '../domain/flow-tree.ts'
import type { FlowTreeEditSchema } from '../domain/flow-tree.ts'
import type { FlowDocument } from '../domain/flow.schema.ts'
import { FlowAttribute, FlowSpan } from '../telemetry/flow-telemetry.ts'

/** Measured surviving nodes plus explicit authored boxes for newly created nodes. */
export const getFlowTreeLayoutInput = (
  document: FlowDocument,
  measured: FlowLayoutInput
): FlowLayoutInput => {
  const projection = projectFlowTree(document)
  const nodes: FlowLayoutInput['nodes'][number][] = []
  const unmeasured: string[] = []

  for (const node of projection.nodes) {
    if (node.hidden === true) {
      continue
    }

    const measurement = measured.nodes.find(({ id }) => id === node.id)
    const size = measurement ?? node.size

    if (size === undefined) {
      unmeasured.push(node.id)
    } else {
      nodes.push({
        id: node.id,
        width: size.width,
        height: size.height,
        handles: measurement?.handles ?? [],
      })
    }
  }

  const ids = new Set(nodes.map(({ id }) => id))

  return {
    nodes,
    unmeasured,
    edges: projection.edges
      .filter(
        (edge) =>
          edge.hidden !== true && ids.has(edge.source) && ids.has(edge.target)
      )
      .map((edge) => ({
        ...edge,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
      })),
  }
}

/** Shared tree/layout/animation workflow. The host retains accepted state and history. */
export const createFlowTreeEditor = (owner: {
  readonly read: () => Promise<{
    readonly document: FlowDocument
    readonly input: FlowLayoutInput
  }>
  readonly engine: (
    request: FlowLayoutRequest
  ) => Effect.Effect<FlowLayoutResult, Error>
  readonly animate: (
    request: FlowNodeAnimationRequest
  ) => Promise<FlowNodeAnimationResult>
}) => {
  const read = Effect.tryPromise({
    try: owner.read,
    catch: (error) =>
      error instanceof Error ? error : new Error(String(error)),
  })

  const session = createFlowLayoutSession()
  let disposed = false
  let pending = false

  return {
    dispose: () => {
      disposed = true
      session.dispose()
    },
    edit: (command: typeof FlowTreeEditSchema.Encoded, duration = 300) =>
      Effect.gen(function* editTree() {
        if (disposed || pending) {
          return yield* new InvalidFlowTree({
            reason: disposed
              ? 'Tree editor disposed'
              : 'Tree edit already pending',
          })
        }

        pending = true

        return yield* Effect.gen(function* prepareLayout() {
          const state = yield* read
          const edit = yield* prepareFlowTreeEdit(state.document, command)

          const candidate = (yield* prepareFlowEdit(state.document, edit))
            .document

          const input = getFlowTreeLayoutInput(candidate, state.input)
          const revision = flowLayoutRevision(state.document, state.input)
          let current = revision

          const settings = {
            ...defaultFlowLayoutSettings,
            engine: 'hierarchy',
          } as const

          const result = yield* session.run(
            { revision, input, settings },
            (request) =>
              (input.nodes.length === 0
                ? Effect.succeed<FlowLayoutResult>({
                    revision: request.revision,
                    settings: request.settings,
                    positions: new Map(),
                  })
                : owner.engine(request)
              ).pipe(
                Effect.flatMap((layout) =>
                  read.pipe(
                    Effect.map((latest) => {
                      current = flowLayoutRevision(
                        latest.document,
                        latest.input
                      )

                      const minX = Math.min(
                        0,
                        ...[...layout.positions.values()].map(({ x }) => x)
                      )

                      const minY = Math.min(
                        0,
                        ...[...layout.positions.values()].map(({ y }) => y)
                      )

                      return {
                        ...layout,
                        positions: new Map(
                          [...layout.positions].map(([id, point]) => [
                            id,
                            {
                              x: Math.round(point.x - minX + 60),
                              y: Math.round(point.y - minY + 60),
                            },
                          ])
                        ),
                      }
                    })
                  )
                )
              ),
            () => current
          )

          if (result.kind === 'discarded') {
            return yield* new InvalidFlowTree({
              reason: 'Tree changed during layout or editor disposed',
            })
          }

          const outcome = yield* Effect.tryPromise({
            try: () => owner.animate({ result: result.result, edit, duration }),
            catch: (error) =>
              error instanceof Error ? error : new Error(String(error)),
          })

          yield* Effect.logInfo('Tree gesture submitted').pipe(
            Effect.annotateLogs({
              [FlowAttribute.changeKind]: command.kind,
              [FlowAttribute.nodeCount]: candidate.nodes.length,
            })
          )

          return outcome
        }).pipe(
          Effect.ensuring(
            Effect.sync(() => {
              pending = false
            })
          )
        )
      }).pipe(
        Effect.withSpan(FlowSpan.controllerUpdate),
        Effect.tapError((cause) =>
          Effect.logWarning('Tree gesture failed').pipe(
            Effect.annotateLogs({
              [FlowAttribute.failureName]:
                cause instanceof Error ? cause.name : String(cause),
            }),
            Effect.withSpan(FlowSpan.editFailure)
          )
        )
      ),
  }
}

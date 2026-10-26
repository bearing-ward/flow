import { Effect, Schema as S } from 'effect'

import { FlowAttribute, FlowSpan } from '../telemetry/flow-telemetry.ts'
import { createFlowGraph } from './flow-graph.ts'
import { FlowRoutingResultSchema } from './flow-routing.schema.ts'
import { MeasuredNodeSchema } from './flow-runtime.schema.ts'
import { getViewportForBounds } from './flow-viewport-operation.schema.ts'
import {
  decodeFlowDocument,
  FlowDocumentSchema,
  flowNodeHandles,
} from './flow.schema.ts'

const dimension = S.Int.check(S.isBetween({ minimum: 64, maximum: 4096 }))

export const FlowExportSceneSchema = S.Struct({
  document: FlowDocumentSchema,
  measurements: S.Array(MeasuredNodeSchema),
  edgeRouting: S.NullOr(FlowRoutingResultSchema),
})

export type FlowExportScene = typeof FlowExportSceneSchema.Type

export const FlowImageExportRequestSchema = S.Struct({
  version: S.Literal(1),
  host: S.Literals(['vanilla', 'vue', 'foldkit']),
  revision: S.NonEmptyString.check(
    S.isMaxLength(128),
    S.isPattern(/^[a-zA-Z0-9._:-]+$/u)
  ),
  width: dimension,
  height: dimension,
  scene: FlowExportSceneSchema,
  framing: S.Union([
    S.Struct({
      kind: S.Literal('fit'),
      padding: S.Finite.check(S.isBetween({ minimum: 0, maximum: 0.4 })),
    }),
    S.Struct({
      kind: S.Literal('viewport'),
      x: S.Finite,
      y: S.Finite,
      zoom: S.Finite.check(S.isBetween({ minimum: 0.01, maximum: 10 })),
    }),
  ]),
  assets: S.Array(
    S.NonEmptyString.check(
      S.isPattern(/^[a-zA-Z0-9_-]+\.(?:svg|png|woff2|ttf)$/u)
    )
  ),
})

export type FlowImageExportRequest = typeof FlowImageExportRequestSchema.Type

const tagged = S.TaggedError

export class FlowImageExportFailure extends tagged<FlowImageExportFailure>()(
  'FlowImageExportFailure',
  {
    reason: S.Literals([
      'invalid-request',
      'unsupported-renderer',
      'asset',
      'timeout',
      'render',
      'unavailable',
    ]),
    message: S.String,
  }
) {}

/** Decode and detach the revision before any asynchronous rendering begins. */
// eslint-disable-next-line anti-slop/no-unknown-parameters -- Public export boundary decodes an external request with Effect Schema.
export const prepareFlowImageExport = (input: unknown) =>
  Effect.gen(function* prepareImage() {
    const request = yield* S.decodeUnknownEffect(FlowImageExportRequestSchema)(
      input
    )

    const document = yield* decodeFlowDocument(request.scene.document)

    const measurements = new Map(
      request.scene.measurements.map((item) => [item.nodeId, item])
    )

    const graph = createFlowGraph(document, measurements)

    if (
      measurements.size !== request.scene.measurements.length ||
      request.scene.measurements.some((item) => !graph.nodes.has(item.nodeId))
    ) {
      return yield* Effect.fail(new Error('Duplicate or unknown node bounds'))
    }

    for (const item of graph.orderedNodes) {
      if (
        ![item.absolutePosition.x, item.absolutePosition.y].every(
          Number.isFinite
        )
      ) {
        return yield* Effect.fail(
          new Error(`Non-finite node position for ${item.id}`)
        )
      }

      if (item.hidden) {
        continue
      }

      const measurement = measurements.get(item.id)
      const handles = flowNodeHandles(item.node)

      if (
        measurement?.handles?.some(
          (sample) => ![sample.offset.x, sample.offset.y].every(Number.isFinite)
        )
      ) {
        return yield* Effect.fail(
          new Error(`Non-finite handle position for ${item.id}`)
        )
      }

      if (
        measurement === undefined ||
        measurement.width <= 0 ||
        measurement.height <= 0 ||
        handles.length !== measurement.handles?.length ||
        handles.some(
          (handle) =>
            !measurement.handles?.some(
              (sample) =>
                sample.nodeId === item.id && sample.handleId === handle.id
            )
        ) ||
        new Set(measurement.handles?.map((handle) => handle.handleId)).size !==
          handles.length
      ) {
        return yield* Effect.fail(
          new Error(`Explicit node and handle bounds required for ${item.id}`)
        )
      }
    }

    const visible = graph.orderedNodes.filter((item) => !item.hidden)
    const x = Math.min(...visible.map((item) => item.absolutePosition.x))
    const y = Math.min(...visible.map((item) => item.absolutePosition.y))

    const right = Math.max(
      ...visible.map((item) => item.absolutePosition.x + item.dimensions.width)
    )

    const bottom = Math.max(
      ...visible.map((item) => item.absolutePosition.y + item.dimensions.height)
    )

    const viewport =
      request.framing.kind === 'viewport'
        ? {
            x: request.framing.x,
            y: request.framing.y,
            zoom: request.framing.zoom,
          }
        : (getViewportForBounds({
            bounds: { x, y, width: right - x, height: bottom - y },
            width: request.width,
            height: request.height,
            limits: { minZoom: 0.01, maxZoom: 10 },
            padding: request.framing.padding,
          }) ?? { x: 0, y: 0, zoom: 1 })

    const sized = {
      ...document,
      nodes: document.nodes.map((node) => {
        const measurement = measurements.get(node.id)

        return measurement === undefined
          ? node
          : {
              ...node,
              size: { width: measurement.width, height: measurement.height },
              measured: {
                width: measurement.width,
                height: measurement.height,
              },
            }
      }),
    }

    const snapshot = structuredClone({ request, document: sized, viewport })
    yield* Effect.logDebug('Decoded image export revision').pipe(
      Effect.annotateLogs({
        [FlowAttribute.changeKind]: 'image-export',
        [FlowAttribute.nodeCount]: document.nodes.length,
        [FlowAttribute.edgeCount]: document.edges.length,
      })
    )

    return snapshot
  }).pipe(
    Effect.mapError(
      (cause) =>
        new FlowImageExportFailure({
          reason: 'invalid-request',
          message: String(cause),
        })
    ),
    Effect.withSpan(FlowSpan.documentDecode)
  )

export type PreparedFlowImageExport = Effect.Success<
  ReturnType<typeof prepareFlowImageExport>
>

/** Revision and request sequence must both match before publishing an image. */
export const isCurrentFlowImage = (
  requested: { readonly revision: string; readonly sequence: number },
  current: { readonly revision: string; readonly sequence: number }
): boolean =>
  requested.revision === current.revision &&
  requested.sequence === current.sequence

/** Accepted semantic identity excludes local selection and DOM measurement publication. */
export const flowImageDocumentRevision = (
  document: FlowExportScene['document']
): string =>
  JSON.stringify({
    ...document,
    nodes: document.nodes.map(
      ({ selected: _selected, measured: _measured, ...node }) => node
    ),
    edges: document.edges.map(({ selected: _selected, ...edge }) => edge),
  })

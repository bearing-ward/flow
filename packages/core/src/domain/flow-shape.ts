import { Effect, Schema as S } from 'effect'

import { FlowAttribute, FlowSpan } from '../telemetry/flow-telemetry.ts'
import type { FlowEditTransaction } from './flow-edit.schema.ts'
import {
  FlowFigureColorSchema,
  FlowFigureDataSchema,
} from './flow-shape.schema.ts'
import type { FlowFigureData } from './flow-shape.schema.ts'
import {
  HandleIdSchema,
  NodeIdSchema,
  XYPositionSchema,
} from './flow-values.ts'
import { NodeSizeSchema } from './flow.schema.ts'
import type { FlowDocument, FlowNode } from './flow.schema.ts'

const tagged = S.TaggedError

export class InvalidFigureNode extends tagged<InvalidFigureNode>()(
  'InvalidFigureNode',
  { nodeId: S.String, reason: S.Literals(['missing-figure', 'duplicate-id']) }
) {}

export const FlowFigureEditSchema = S.Union([
  S.Struct({
    kind: S.Literal('create'),
    id: NodeIdSchema,
    position: XYPositionSchema,
    figure: FlowFigureDataSchema,
    size: S.optional(NodeSizeSchema),
  }),
  S.Struct({
    kind: S.Literal('color'),
    nodeId: NodeIdSchema,
    color: FlowFigureColorSchema,
  }),
])

export type FlowFigureEdit = typeof FlowFigureEditSchema.Type

/** Narrow decoded recipe data without projecting away application-owned metadata. */
export const flowFigureData = (
  node: FlowNode | undefined
): FlowFigureData | undefined =>
  node?.type === 'shape' && S.is(FlowFigureDataSchema)(node.data)
    ? node.data
    : undefined

/** Prepare one semantic transaction. The host's existing edit owner accepts it. */
export const prepareFlowFigureEdit = (
  document: FlowDocument,
  input: typeof FlowFigureEditSchema.Encoded
) =>
  Effect.gen(function* prepareFigure() {
    const command = yield* S.decodeUnknownEffect(FlowFigureEditSchema)(input)
    let transaction: FlowEditTransaction

    if (command.kind === 'create') {
      if (document.nodes.some(({ id }) => id === command.id)) {
        return yield* new InvalidFigureNode({
          nodeId: command.id,
          reason: 'duplicate-id',
        })
      }

      transaction = {
        operations: [
          {
            kind: 'add-nodes',
            nodes: [
              {
                id: command.id,
                type: 'shape',
                label: command.figure.type,
                position: command.position,
                size: command.size ?? { width: 120, height: 120 },
                data: command.figure,
                className: 'flow-shape-node',
                style: {
                  padding: 0,
                  border: 0,
                  borderRadius: 0,
                  background: 'transparent',
                  boxSizing: 'border-box',
                },
                handles: [
                  {
                    id: HandleIdSchema.make('in'),
                    kind: 'target',
                    side: 'left',
                  },
                  {
                    id: HandleIdSchema.make('out'),
                    kind: 'source',
                    side: 'right',
                  },
                ],
              },
            ],
          },
        ],
      }
    } else {
      const node = document.nodes.find(({ id }) => id === command.nodeId)

      if (flowFigureData(node) === undefined) {
        return yield* new InvalidFigureNode({
          nodeId: command.nodeId,
          reason: 'missing-figure',
        })
      }

      transaction = {
        operations: [
          {
            kind: 'update-node-data',
            nodeId: command.nodeId,
            data: { color: command.color },
          },
        ],
      }
    }

    return transaction
  }).pipe(
    Effect.withSpan(FlowSpan.editPrepare, {
      attributes: { [FlowAttribute.inputKind]: 'shape' },
    }),
    Effect.tapError((cause) =>
      Effect.logWarning('Figure edit rejected').pipe(
        Effect.annotateLogs({
          [FlowAttribute.inputKind]: 'shape',
          [FlowAttribute.failureName]: cause._tag,
        }),
        Effect.withSpan(FlowSpan.editFailure)
      )
    )
  )

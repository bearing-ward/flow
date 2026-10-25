import { decodeFlowDocument, NodeIdSchema } from '@flow/core'
import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { AppMessage, HostAction, initialModel, update } from './application.ts'
import * as Graph from './graph.ts'

const document = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'group',
        label: 'Group',
        type: 'group',
        position: { x: 0, y: 0 },
        size: { width: 200, height: 100 },
      },
    ],
    edges: [],
  })
)

const sample = (
  model: ReturnType<typeof initialModel>,
  generation: number,
  width: number
) =>
  update(
    model,
    AppMessage.HostAction({
      action: HostAction.MeasureNodes({
        requests: [
          {
            requestId: `sample-${generation}`,
            measurement: {
              nodeId: NodeIdSchema.make('group'),
              generation,
              width,
              height: 100,
            },
          },
        ],
      }),
    })
  ).model

describe('observer generations after wrapper recreation', () => {
  it('accepts the replacement DOM generation and rejects an older receipt', () => {
    const initial = initialModel(document, { x: 0, y: 0, zoom: 1 }, [])
    const measured = sample(initial, 1, 200)

    const removed = update(
      measured,
      AppMessage.HostAction({
        action: HostAction.ReplaceDocument({
          document: { nodes: [], edges: [] },
        }),
      })
    ).model

    const restored = update(
      removed,
      AppMessage.HostAction({
        action: HostAction.ReplaceDocument({ document }),
      })
    ).model

    const replacement = sample(restored, 2, 240)
    expect(Graph.selectInternalNode(replacement.graph, 'group')).toMatchObject({
      width: 240,
      measurementStatus: 'measured',
    })
    const stale = sample(replacement, 1, 800)
    expect(Graph.selectInternalNode(stale.graph, 'group')).toMatchObject({
      width: 240,
      measurementStatus: 'measured',
    })
  })
})

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
  width: number,
  height = 100
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
              height,
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

describe('document replacement measurements without auto-fit groups', () => {
  it.each(['group', 'note'])(
    'discards the enlarged %s sample before fitting an undone manual size',
    (type) => {
      const originalDocument = {
        ...document,
        nodes: document.nodes.map((node) => ({ ...node, type })),
      }

      const initial = initialModel(
        originalDocument,
        { x: 0, y: 0, zoom: 1 },
        []
      )

      const measured = sample(initial, 1, 200)

      const enlargedDocument = {
        ...originalDocument,
        nodes: originalDocument.nodes.map((node) => ({
          ...node,
          size: { width: 12_791, height: 12_741 },
        })),
      }

      const enlarged = update(
        measured,
        AppMessage.HostAction({
          action: HostAction.ReplaceDocument({ document: enlargedDocument }),
        })
      ).model

      const resampled = sample(enlarged, 2, 12_791, 12_741)

      expect(Graph.selectInternalNode(resampled.graph, 'group')).toMatchObject({
        width: 12_791,
        measurementStatus: 'measured',
      })

      const restored = update(
        resampled,
        AppMessage.HostAction({
          action: HostAction.ReplaceDocument({ document: originalDocument }),
        })
      ).model

      expect(Graph.selectInternalNode(restored.graph, 'group')).toMatchObject({
        width: 200,
        height: 100,
        measurementStatus: 'unmeasured',
      })
      expect({
        document: restored.graph.document,
        generations: restored.graph.measurements.generations,
      }).toStrictEqual({
        document: originalDocument,
        generations: [{ nodeId: 'group', generation: 2 }],
      })

      const fresh = sample(restored, 2, 200)
      expect(Graph.selectInternalNode(fresh.graph, 'group')).toMatchObject({
        width: 200,
        height: 100,
        measurementStatus: 'measured',
      })
      const stale = sample(fresh, 1, 12_791, 12_741)
      expect(Graph.selectInternalNode(stale.graph, 'group')).toMatchObject({
        width: 200,
        height: 100,
        measurementStatus: 'measured',
      })
    }
  )
})

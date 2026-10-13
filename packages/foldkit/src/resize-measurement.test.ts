import {
  decodeFlowDocument,
  HandleIdSchema,
  NodeIdSchema,
  setNodeMeasurementGenerations,
} from '@flow/core'
import { Effect } from 'effect'
import { describe, expect, test } from 'vitest'

import * as Graph from './graph.ts'

const parentId = NodeIdSchema.make('parent')

const childId = NodeIdSchema.make('child')

const document = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'parent',
        label: 'Parent',
        position: { x: 100, y: 100 },
        size: { width: 300, height: 190 },
        selected: true,
      },
      {
        id: 'child',
        label: 'Child',
        parentId: 'parent',
        extent: 'parent',
        position: { x: 20, y: 30 },
        size: { width: 20, height: 10 },
      },
    ],
    edges: [],
  })
)

const measured = (mode: 'controlled' | 'uncontrolled' = 'controlled') => {
  let model = Graph.initialModel(
    document,
    { x: 0, y: 0, zoom: 1 },
    [],
    mode,
    'uncontrolled',
    'full',
    { ...Graph.defaultInteractionOptions, nodesResizable: true }
  )

  for (const measurement of [
    { nodeId: parentId, width: 300, height: 190, generation: 1 },
    { nodeId: childId, width: 160, height: 72, generation: 2 },
  ]) {
    const result = Graph.update(
      model,
      Graph.Message.MeasureNode({ measurement })
    )

    ;({ model } = result)
  }

  return model
}

const preview = (model: Graph.Model) => {
  const resizing = Graph.update(
    model,
    Graph.Message.ResizeByKeyboard({
      nodeId: parentId,
      direction: 'bottom-right',
      delta: { x: -240, y: -160 },
    })
  ).model

  return Graph.update(
    resizing,
    Graph.Message.MeasureNode({
      measurement: { nodeId: parentId, width: 180, height: 102, generation: 1 },
    })
  ).model
}

const acceptedDocument = Effect.runSync(
  decodeFlowDocument({
    ...document,
    nodes: document.nodes.map((node) =>
      node.id === parentId
        ? { ...node, size: { width: 180, height: 102 } }
        : node
    ),
  })
)

describe('Foldkit resize measurement acceptance', () => {
  test('immediate controlled acknowledgement adopts a matching preview sample without observer redelivery', () => {
    const resizing = preview(measured())
    expect(Graph.selectInternalNode(resizing, parentId)).toMatchObject({
      width: 300,
      height: 190,
      measurementStatus: 'measured',
    })

    const released = Graph.update(
      resizing,
      Graph.Message.FinishKeyboardResize({ key: 'ArrowUp' })
    ).model

    const accepted = Graph.update(
      released,
      Graph.Message.ReplaceDocument({ document: acceptedDocument })
    ).model

    expect(Graph.selectInternalNode(accepted, parentId)).toMatchObject({
      width: 180,
      height: 102,
      measurementStatus: 'measured',
    })
    expect({
      nodesInitialized: Graph.selectNodesInitialized(accepted),
    }).toStrictEqual({ nodesInitialized: true })
  })

  test.each(['absent', 'stale'])(
    'acknowledgement preserves a current measurement delivered after release with the %s receipt sample',
    (receipt) => {
      const resizing = Graph.update(
        measured(),
        Graph.Message.ResizeByKeyboard({
          nodeId: parentId,
          direction: 'bottom-right',
          delta: { x: -240, y: -160 },
        })
      ).model

      const sampled =
        receipt === 'stale'
          ? Graph.update(
              resizing,
              Graph.Message.MeasureNode({
                measurement: {
                  nodeId: parentId,
                  width: 180,
                  height: 102,
                  generation: 0,
                },
              })
            ).model
          : resizing

      const released = Graph.update(
        sampled,
        Graph.Message.FinishKeyboardResize({ key: 'ArrowUp' })
      )

      expect(released.outMessage).toMatchObject({
        change: { kind: 'node-bounds', size: { width: 180, height: 102 } },
      })

      const delivered = Graph.update(
        released.model,
        Graph.Message.MeasureNode({
          measurement: {
            nodeId: parentId,
            width: 180,
            height: 102,
            generation: 1,
          },
        })
      ).model

      expect(Graph.selectInternalNode(delivered, parentId)).toMatchObject({
        width: 180,
        height: 102,
        measurementStatus: 'measured',
      })
      expect({
        nodesInitialized: Graph.selectNodesInitialized(delivered),
      }).toStrictEqual({ nodesInitialized: true })

      const accepted = Graph.update(
        delivered,
        Graph.Message.ReplaceDocument({ document: acceptedDocument })
      ).model

      expect(Graph.selectInternalNode(accepted, parentId)).toMatchObject({
        width: 180,
        height: 102,
        measurementStatus: 'measured',
      })
      expect({
        nodesInitialized: Graph.selectNodesInitialized(accepted),
      }).toStrictEqual({ nodesInitialized: true })
    }
  )

  test('a fresh accepted measurement keeps its handles instead of replaying an older same-generation receipt', () => {
    const withHandle = (input: typeof document) =>
      Effect.runSync(
        decodeFlowDocument({
          ...input,
          nodes: input.nodes.map((node) =>
            node.id === parentId
              ? {
                  ...node,
                  handles: [{ id: 'source', kind: 'source', side: 'right' }],
                }
              : node
          ),
        })
      )

    const starting = Graph.update(
      measured(),
      Graph.Message.ReplaceDocument({ document: withHandle(document) })
    ).model

    const released = Graph.update(
      preview(starting),
      Graph.Message.FinishKeyboardResize({ key: 'ArrowUp' })
    ).model

    const freshHandle = {
      nodeId: parentId,
      handleId: HandleIdSchema.make('source'),
      offset: { x: 180, y: 51 },
      width: 8,
      height: 8,
    }

    const delivered = Graph.update(
      released,
      Graph.Message.MeasureNode({
        measurement: {
          nodeId: parentId,
          width: 180,
          height: 102,
          generation: 1,
          handles: [freshHandle],
        },
      })
    ).model

    expect(Graph.selectInternalNode(delivered, parentId)).toMatchObject({
      handles: [freshHandle],
      measurementStatus: 'measured',
    })

    const accepted = Graph.update(
      delivered,
      Graph.Message.ReplaceDocument({ document: withHandle(acceptedDocument) })
    ).model

    expect(Graph.selectInternalNode(accepted, parentId)).toMatchObject({
      width: 180,
      height: 102,
      handles: [freshHandle],
      measurementStatus: 'measured',
    })
    expect({
      nodesInitialized: Graph.selectNodesInitialized(accepted),
    }).toStrictEqual({ nodesInitialized: true })
  })

  test('matching dimensions on stale accepted and buffered generations cannot establish measured readiness', () => {
    const released = Graph.update(
      preview(measured()),
      Graph.Message.FinishKeyboardResize({ key: 'ArrowUp' })
    ).model

    const delivered = Graph.update(
      released,
      Graph.Message.MeasureNode({
        measurement: {
          nodeId: parentId,
          width: 180,
          height: 102,
          generation: 1,
        },
      })
    ).model

    expect(Graph.selectInternalNode(delivered, parentId)).toMatchObject({
      width: 180,
      height: 102,
      measurementStatus: 'measured',
    })
    expect({
      nodesInitialized: Graph.selectNodesInitialized(delivered),
    }).toStrictEqual({ nodesInitialized: true })

    const remounted = {
      ...delivered,
      measurements: setNodeMeasurementGenerations(delivered.measurements, [
        { nodeId: parentId, generation: 2 },
      ]),
    }

    const accepted = Graph.update(
      remounted,
      Graph.Message.ReplaceDocument({ document: acceptedDocument })
    ).model

    expect(Graph.selectInternalNode(accepted, parentId)).toMatchObject({
      width: 180,
      height: 102,
      measurementStatus: 'unmeasured',
    })
    expect({
      nodesInitialized: Graph.selectNodesInitialized(accepted),
    }).toStrictEqual({ nodesInitialized: false })
  })

  test('a matching stale receipt cannot replace mismatched accepted geometry', () => {
    const resizing = Graph.update(
      measured(),
      Graph.Message.ResizeByKeyboard({
        nodeId: parentId,
        direction: 'bottom-right',
        delta: { x: -240, y: -160 },
      })
    ).model

    const sampled = Graph.update(
      resizing,
      Graph.Message.MeasureNode({
        measurement: {
          nodeId: parentId,
          width: 180,
          height: 102,
          generation: 0,
        },
      })
    ).model

    const released = Graph.update(
      sampled,
      Graph.Message.FinishKeyboardResize({ key: 'ArrowUp' })
    ).model

    const accepted = Graph.update(
      released,
      Graph.Message.ReplaceDocument({ document: acceptedDocument })
    ).model

    expect(Graph.selectInternalNode(accepted, parentId)).toMatchObject({
      width: 180,
      height: 102,
      measurementStatus: 'unmeasured',
    })
    expect(Graph.selectInternalNode(accepted, childId)).toMatchObject({
      width: 160,
      height: 72,
      measurementStatus: 'measured',
    })
    expect({
      nodesInitialized: Graph.selectNodesInitialized(accepted),
    }).toStrictEqual({ nodesInitialized: false })
  })

  test('fixed-CSS child measurements survive declared-size edits and constrain a fresh parent resize', () => {
    const replacement = Effect.runSync(
      decodeFlowDocument({
        ...document,
        nodes: document.nodes.map((node) =>
          node.id === childId
            ? { ...node, size: { width: 30, height: 10 } }
            : node
        ),
      })
    )

    const updated = Graph.update(
      measured(),
      Graph.Message.ReplaceDocument({ document: replacement })
    ).model

    const resizing = Graph.update(
      updated,
      Graph.Message.ResizeByKeyboard({
        nodeId: parentId,
        direction: 'bottom-right',
        delta: { x: -240, y: -160 },
      })
    ).model

    const finished = Graph.update(
      resizing,
      Graph.Message.FinishKeyboardResize({ key: 'ArrowUp' })
    )

    expect(finished.outMessage).toMatchObject({
      change: { kind: 'node-bounds', size: { width: 180, height: 102 } },
    })
    expect(Graph.selectInternalNode(finished.model, childId)).toMatchObject({
      width: 160,
      height: 72,
      measurementStatus: 'measured',
    })
    expect({
      nodesInitialized: Graph.selectNodesInitialized(finished.model),
    }).toStrictEqual({ nodesInitialized: true })
  })

  test.each(['cancel', 'reject'])(
    '%s preserves accepted geometry and cannot adopt the discarded preview on a later replacement',
    (completion) => {
      const resizing = preview(measured())

      const completed = Graph.update(
        resizing,
        completion === 'cancel'
          ? Graph.Message.CancelGesture()
          : Graph.Message.FinishKeyboardResize({ key: 'ArrowUp' })
      ).model

      const replaced = Graph.update(
        completed,
        Graph.Message.ReplaceDocument({ document })
      ).model

      expect(Graph.selectInternalNode(replaced, parentId)).toMatchObject({
        width: 300,
        height: 190,
        measurementStatus: 'measured',
      })
      expect({
        nodesInitialized: Graph.selectNodesInitialized(replaced),
      }).toStrictEqual({ nodesInitialized: true })

      const later = Graph.update(
        replaced,
        Graph.Message.ReplaceDocument({ document: acceptedDocument })
      ).model

      expect(Graph.selectInternalNode(later, parentId)).toMatchObject({
        width: 300,
        height: 190,
        measurementStatus: 'measured',
      })
    }
  )

  test('a parent-only acknowledgement does not accept an uncompensated child proposal', () => {
    const resizing = Graph.update(
      measured(),
      Graph.Message.ResizeByKeyboard({
        nodeId: parentId,
        direction: 'top-left',
        delta: { x: 100, y: 100 },
      })
    ).model

    const sampled = Graph.update(
      resizing,
      Graph.Message.MeasureNode({
        measurement: {
          nodeId: parentId,
          width: 280,
          height: 160,
          generation: 1,
        },
      })
    ).model

    const released = Graph.update(
      sampled,
      Graph.Message.FinishKeyboardResize({ key: 'ArrowDown' })
    )

    expect(released.outMessage).toMatchObject({
      change: {
        position: { x: 120, y: 130 },
        size: { width: 280, height: 160 },
        childPositions: [{ nodeId: childId, position: { x: 0, y: 0 } }],
      },
    })

    const incomplete = Effect.runSync(
      decodeFlowDocument({
        ...document,
        nodes: document.nodes.map((node) =>
          node.id === parentId
            ? {
                ...node,
                position: { x: 120, y: 130 },
                size: { width: 280, height: 160 },
              }
            : node
        ),
      })
    )

    const replaced = Graph.update(
      released.model,
      Graph.Message.ReplaceDocument({ document: incomplete })
    ).model

    expect(Graph.selectInternalNode(replaced, parentId)).toMatchObject({
      width: 300,
      height: 190,
      measurementStatus: 'measured',
    })
    expect(Graph.selectInternalNode(replaced, childId)).toMatchObject({
      absolutePosition: { x: 140, y: 160 },
      width: 160,
      height: 72,
      measurementStatus: 'measured',
    })
    expect({
      nodesInitialized: Graph.selectNodesInitialized(replaced),
    }).toStrictEqual({ nodesInitialized: true })
  })

  test('uncontrolled release retains matching buffered measurements', () => {
    const finished = Graph.update(
      preview(measured('uncontrolled')),
      Graph.Message.FinishKeyboardResize({ key: 'ArrowUp' })
    ).model

    expect(Graph.selectInternalNode(finished, parentId)).toMatchObject({
      width: 180,
      height: 102,
      measurementStatus: 'measured',
    })
    expect({
      nodesInitialized: Graph.selectNodesInitialized(finished),
    }).toStrictEqual({ nodesInitialized: true })
  })
})

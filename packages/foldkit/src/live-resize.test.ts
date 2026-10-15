import { decodeFlowDocument, NodeIdSchema } from '@flow/core'
import { Effect, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  AppMessage,
  HostAction,
  initialModel,
  update,
  wrapGraphMessage,
} from './application.ts'
import * as Graph from './graph.ts'

const document = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'a',
        label: 'A',
        position: { x: 100, y: 100 },
        size: { width: 200, height: 100 },
        selected: true,
      },
    ],
    edges: [],
  })
)

const start = () =>
  initialModel(document, { x: 0, y: 0, zoom: 1 }, [], undefined, 'full', {
    ...Graph.defaultInteractionOptions,
    nodesResizable: true,
  })

describe('shared live geometry', () => {
  it('reads keyboard preview geometry without changing accepted state', () => {
    const { model } = update(
      start(),
      wrapGraphMessage({
        message: Graph.Message.ResizeByKeyboard({
          nodeId: NodeIdSchema.make('a'),
          direction: 'top-left',
          delta: { x: -25, y: -10 },
        }),
      })
    )

    const live = Graph.selectLiveModel(model.graph)
    expect(Graph.selectInternalNode(live, 'a')).toMatchObject({
      absolutePosition: { x: 75, y: 90 },
      width: 225,
      height: 110,
    })
    expect(Graph.selectInternalNode(model.graph, 'a')).toMatchObject({
      absolutePosition: { x: 100, y: 100 },
      width: 200,
      height: 100,
    })
    expect(document.nodes[0]?.size).toStrictEqual({ width: 200, height: 100 })
  })

  it('changes snapping mid-drag while retaining the same session', () => {
    const pressed = update(
      start(),
      wrapGraphMessage({
        message: Graph.Message.PointerDown({
          pointerId: 1,
          clientX: 0,
          clientY: 0,
          nodeId: 'a',
          handleId: null,
          direction: null,
          edgeId: null,
          endpoint: null,
        }),
      })
    ).model

    const moved = update(
      pressed,
      wrapGraphMessage({
        message: Graph.Message.NodeDragMoved({
          pointerId: 1,
          clientX: 7,
          clientY: 7,
          flowX: 7,
          flowY: 7,
        }),
      })
    ).model

    const patched = update(
      moved,
      AppMessage.HostAction({
        action: HostAction.SetCanvasOptions({
          options: {
            snapToGrid: true,
            snapGrid: { x: 20, y: 20 },
            panOnScroll: true,
          },
        }),
      })
    ).model

    expect(patched.graph.pointerSession).toBe(moved.graph.pointerSession)

    const next = update(
      patched,
      wrapGraphMessage({
        message: Graph.Message.NodeDragMoved({
          pointerId: 1,
          clientX: 33,
          clientY: 27,
          flowX: 33,
          flowY: 27,
        }),
      })
    ).model

    expect(
      Graph.selectLiveDocument(next.graph).nodes[0]?.position
    ).toStrictEqual({
      x: 140,
      y: 120,
    })
    expect(
      Schema.decodeUnknownExit(Graph.CanvasOptionsSchema)({
        panOnScrollSpeed: Infinity,
      })._tag
    ).toBe('Failure')
  })
})

describe('native modifier selection', () => {
  it('toggles selection for a macOS button-zero Control contextmenu, and leaves button-two contextmenus alone', () => {
    const model = start()

    const observe = (button: number) =>
      update(
        model,
        wrapGraphMessage({
          message: Graph.Message.ObserveMouse({
            name: 'onNodeContextMenu',
            nodeId: 'a',
            edgeId: null,
            select: false,
            pointer: {
              button,
              clientX: 0,
              clientY: 0,
              ctrlKey: true,
              metaKey: false,
              shiftKey: false,
              altKey: false,
            },
          }),
        })
      ).model

    expect(observe(0).graph.document.nodes[0]?.selected).toBeFalsy()
    expect(observe(2).graph.document.nodes[0]?.selected).toBeTruthy()
  })
})

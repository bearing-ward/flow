import { FlowDocumentSchema, defaultFlowLayoutSettings } from '@flow/core'
import { Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import { AppMessage, HostAction, initialModel, update } from './application.ts'
import * as Graph from './graph.ts'

const document = S.decodeUnknownSync(FlowDocumentSchema)({
  nodes: [{ id: 'a', label: 'A', position: { x: 0, y: 20 } }],
  edges: [],
})

const request = {
  result: {
    revision: 'layout-one',
    settings: defaultFlowLayoutSettings,
    positions: new Map([['a', { x: 300, y: 80 }]]),
  },
}

const start = () =>
  update(
    initialModel(document, { x: 0, y: 0, zoom: 1 }),
    AppMessage.HostAction({
      action: HostAction.AnimateNodePositions({
        requestId: 'one',
        request,
        reducedMotion: false,
      }),
    })
  ).model

// Commands require a Runtime render context; reducer assertions inspect accepted and live models separately.
describe('Foldkit node animation messages', () => {
  it('commits the destination once and renders intermediate shared geometry without history frames', () => {
    const model = start()

    const frame = update(
      model,
      AppMessage.NodeAnimationFrame({ delta: 150 })
    ).model

    expect(frame.graph.document.nodes[0]?.position).toStrictEqual({
      x: 300,
      y: 80,
    })
    expect(
      Graph.selectLiveDocument(frame.graph).nodes[0]?.position
    ).toStrictEqual({ x: 150, y: 50 })
    expect(frame.history.past).toHaveLength(1)

    const final = update(
      frame,
      AppMessage.NodeAnimationFrame({ delta: 150 })
    ).model

    expect(final.nodeAnimation).toBeNull()
    expect(
      Graph.selectLiveDocument(final.graph).nodes[0]?.position
    ).toStrictEqual({ x: 300, y: 80 })
  })

  it('retains transaction context on a controlled destination proposal without recording or animating rejection', () => {
    const initial = initialModel(document, { x: 0, y: 0, zoom: 1 })

    const model: typeof initial = {
      ...initial,
      graph: { ...initial.graph, documentMode: 'controlled' },
    }

    const result = update(
      model,
      AppMessage.HostAction({
        action: HostAction.AnimateNodePositions({
          requestId: 'controlled-animation',
          request,
          reducedMotion: false,
        }),
      })
    )

    const publication = result.outMessage?.find(
      (item) => item.kind === 'change' && item.change?.kind === 'edit-proposal'
    )

    const proposal =
      publication?.kind === 'change' &&
      publication.change?.kind === 'edit-proposal'
        ? publication.change
        : undefined

    expect(proposal?.context).toStrictEqual({
      transactionId: 'controlled-animation',
      origin: { kind: 'local', actorId: initial.history.session },
    })
    expect(result.model.nodeAnimation).toBeNull()
    expect(result.model.graph.document).toStrictEqual(document)
    expect(result.model.history.past).toHaveLength(0)
  })

  it('serializes accepted destinations while a presentation frame is in progress', () => {
    const { model: frame } = update(
      start(),
      AppMessage.NodeAnimationFrame({ delta: 150 })
    )

    const saved = Graph.selectSavedSession(frame.graph)
    expect(saved.document.nodes[0]?.position).toStrictEqual({ x: 300, y: 80 })
    expect(
      Graph.selectLiveDocument(frame.graph).nodes[0]?.position
    ).toStrictEqual({ x: 150, y: 50 })
    expect(JSON.stringify(saved)).not.toContain('nodePresentation')
  })

  it('rebases a supersession on its displayed position', () => {
    const { model: frame } = update(
      start(),
      AppMessage.NodeAnimationFrame({ delta: 150 })
    )

    const next = update(
      frame,
      AppMessage.HostAction({
        action: HostAction.AnimateNodePositions({
          requestId: 'two',
          request: {
            ...request,
            result: {
              ...request.result,
              revision: 'layout-two',
              positions: new Map([['a', { x: 0, y: 20 }]]),
            },
          },
          reducedMotion: false,
        }),
      })
    ).model

    expect(next.nodeAnimation?.transition.revision).toBe('layout-two')
    expect(
      Graph.selectLiveDocument(next.graph).nodes[0]?.position
    ).toStrictEqual({ x: 150, y: 50 })
    expect(
      update(
        next,
        AppMessage.NodeAnimationFrame({ delta: 150 })
      ).model.graph.nodePresentation?.get('a')
    ).toStrictEqual({ x: 75, y: 35 })
  })

  it('immediately completes reduced motion without persisted progress', () => {
    const { model } = update(
      initialModel(document, { x: 0, y: 0, zoom: 1 }),
      AppMessage.HostAction({
        action: HostAction.AnimateNodePositions({
          requestId: 'reduced',
          request,
          reducedMotion: true,
        }),
      })
    )

    expect(model.nodeAnimation).toBeNull()
    expect(model.graph.nodePresentation).toBeUndefined()
    expect(model.graph.document.nodes[0]?.position).toStrictEqual({
      x: 300,
      y: 80,
    })

    const saved = Graph.selectSavedSession(model.graph)

    expect(JSON.stringify(saved)).not.toContain('nodeAnimation')
  })

  it('cancels on takeover and holds displayed coordinates until a semantic drop', () => {
    const { model: frame } = update(
      start(),
      AppMessage.NodeAnimationFrame({ delta: 150 })
    )

    const down = update(
      frame,
      AppMessage.GraphMessage({
        message: Graph.Message.PointerDown({
          pointerId: 1,
          clientX: 170,
          clientY: 70,
          nodeId: document.nodes[0]?.id ?? null,
          handleId: null,
          direction: null,
          edgeId: null,
          endpoint: null,
        }),
      })
    ).model

    expect(down.nodeAnimation).toBeNull()
    expect(down.graph.nodePresentation?.get('a')).toStrictEqual({
      x: 150,
      y: 50,
    })

    const final = update(
      down,
      AppMessage.NodeAnimationFrame({ delta: 150 })
    ).model

    expect(final.graph.document.nodes[0]?.position).toStrictEqual({
      x: 300,
      y: 80,
    })
    expect(final.history.past).toHaveLength(1)
  })
})

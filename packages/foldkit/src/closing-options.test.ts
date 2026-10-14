import { decodeFlowDocument, NodeIdSchema } from '@flow/core'
import { Effect, Predicate } from 'effect'
import { describe, expect, it } from 'vitest'

import * as Graph from './graph.ts'

const start = (
  options: Partial<Graph.GraphInteractionOptions> = {},
  mode: 'controlled' | 'uncontrolled' = 'uncontrolled'
) =>
  Graph.initialModel(
    Effect.runSync(
      decodeFlowDocument({
        nodes: [
          {
            id: 'a',
            label: 'A',
            selected: true,
            position: { x: 20, y: 20 },
            size: { width: 20, height: 20 },
          },
          {
            id: 'b',
            label: 'B',
            selected: true,
            position: { x: 70, y: 20 },
            size: { width: 20, height: 20 },
          },
          {
            id: 'fixed',
            label: 'Fixed',
            selected: true,
            draggable: false,
            position: { x: 40, y: 80 },
            size: { width: 20, height: 20 },
          },
        ],
        edges: [],
      })
    ),
    { x: 0, y: 0, zoom: 1 },
    [],
    mode,
    'uncontrolled',
    'full',
    { ...Graph.defaultInteractionOptions, ...options }
  )

const move = (model: Graph.Model, shift = false) =>
  Graph.update(
    model,
    Graph.Message.MoveNodeByKeyboard({
      nodeId: NodeIdSchema.make('a'),
      key: 'ArrowRight',
      shift,
    })
  )

describe('keyboard canvas options', () => {
  it('keeps the native press coordinates while committing auto-pan compensation', () => {
    const pressed = Graph.update(
      start({ nodeDragThreshold: 0 }),
      Graph.Message.PointerDown({
        pointerId: 1,
        clientX: 100,
        clientY: 100,
        nodeId: 'a',
        handleId: null,
        direction: null,
        edgeId: null,
        endpoint: null,
      })
    ).model

    const panned = Graph.update(
      pressed,
      Graph.Message.AutoPan({ x: -7, y: 0 })
    ).model

    expect(panned.pointerSession).toMatchObject({
      kind: 'node-drag',
      startX: 100,
      startY: 100,
      panOffset: { x: -7, y: 0 },
    })

    const released = Graph.update(
      panned,
      Graph.Message.PointerReleased({
        pointerId: 1,
        clientX: 101,
        clientY: 100,
        targetNodeId: null,
        targetHandleId: null,
      })
    ).model

    expect(released.pointerSession).toBeNull()
    expect(
      released.document.nodes.map(({ position }) => position)
    ).toStrictEqual([
      { x: 28, y: 20 },
      { x: 78, y: 20 },
      { x: 40, y: 80 },
    ])
  })

  it('keeps arrow keys with an active keyboard selection rectangle', () => {
    const initial = start()

    const selecting = Graph.update(
      initial,
      Graph.Message.KeyboardSelectionKey({
        nodeId: NodeIdSchema.make('a'),
        key: ' ',
        shift: true,
      })
    ).model

    const result = move(selecting)

    expect(result.model.document).toStrictEqual(initial.document)
    expect(result.model.gestureSession).toStrictEqual({
      kind: 'selection',
      pointerId: -2,
      startX: 30,
      startY: 30,
      currentX: 35,
      currentY: 30,
    })
    expect(result.model.ariaLiveMessage).toBeNull()
  })

  it('moves the selected draggable group with Shift acceleration and announces the focused origin', () => {
    const result = move(start(), true)

    expect(
      result.model.document.nodes.map(({ position }) => position)
    ).toStrictEqual([
      { x: 40, y: 20 },
      { x: 90, y: 20 },
      { x: 40, y: 80 },
    ])
    expect(result.model.ariaLiveMessage).toStrictEqual({
      direction: 'right',
      x: 20,
      y: 20,
    })
  })

  it('snaps keyboard moves to the configured grid and clamps the selected group to nodeExtent', () => {
    const result = move(
      start({
        snapToGrid: true,
        snapGrid: [10, 10],
        nodeExtent: [
          [0, 0],
          [100, 100],
        ],
      }),
      true
    )

    expect(
      result.model.document.nodes.map(({ position }) => position)
    ).toStrictEqual([
      { x: 30, y: 20 },
      { x: 80, y: 20 },
      { x: 40, y: 80 },
    ])
  })

  it('keeps controlled state with the owner and disables moves through disableKeyboardA11y', () => {
    const controlled = start({}, 'controlled')
    const result = move(controlled)

    expect(result.model.document).toStrictEqual(controlled.document)

    const changes = [result.outMessage]
      .flat()
      .flatMap((item) =>
        item !== undefined && Predicate.isTagged('EditCompleted')(item)
          ? [item.change]
          : []
      )

    const proposal = changes.at(0)

    const positions =
      proposal?.kind === 'edit-proposal'
        ? proposal.document.nodes.map(({ position }) => position)
        : undefined

    expect(positions).toStrictEqual([
      { x: 25, y: 20 },
      { x: 75, y: 20 },
      { x: 40, y: 80 },
    ])

    const disabled = start({ disableKeyboardA11y: true })

    expect(move(disabled).model.document).toStrictEqual(disabled.document)
    expect(move(disabled).model.ariaLiveMessage).toBeNull()
  })
})

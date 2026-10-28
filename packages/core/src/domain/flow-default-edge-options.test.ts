import { Effect, Exit, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  applyDefaultEdgeOptions,
  decodeFlowDefaultEdgeOptions,
} from './flow-default-edge-options.ts'
import { FlowEdgeSchema } from './flow.schema.ts'

describe('default edge options', () => {
  it('strictly accepts Flow-supported fields and rejects identity or unsupported fields', () => {
    expect(
      Effect.runSync(decodeFlowDefaultEdgeOptions({ label: 'default' }))
    ).toStrictEqual({ label: 'default' })

    for (const excluded of [
      'id',
      'source',
      'target',
      'sourceHandle',
      'targetHandle',
      'selected',
      'markerEndColor',
    ]) {
      expect(
        Exit.isFailure(
          Effect.runSyncExit(
            decodeFlowDefaultEdgeOptions({ [excluded]: 'value' })
          )
        )
      ).toBeTruthy()
    }
  })

  it('accepts presentation defaults and keeps stored edge values on top', () => {
    const defaults = Effect.runSync(
      decodeFlowDefaultEdgeOptions({
        animated: true,
        className: 'default-edge',
        style: { stroke: '#ff0072', strokeWidth: 2 },
        labelStyle: { fill: 'white' },
        labelShowBg: false,
        labelBgStyle: { fill: '#333' },
        labelBgPadding: [8, 4],
        labelBgBorderRadius: 4,
        markerEnd: { type: 'arrowclosed', color: '#ff0072' },
      })
    )

    const edge = S.decodeSync(FlowEdgeSchema)({
      id: 'edge-1',
      source: 'source',
      target: 'target',
      animated: false,
      style: { stroke: 'black' },
    })

    expect(applyDefaultEdgeOptions(edge, defaults)).toMatchObject({
      animated: false,
      className: 'default-edge',
      style: { stroke: 'black' },
      labelBgPadding: [8, 4],
      markerEnd: { type: 'arrowclosed', color: '#ff0072' },
    })
  })

  it('applies defaults below stored explicit values', () => {
    const edge = {
      id: 'edge-1',
      source: 'source',
      target: 'target',
      label: 'stored',
      type: 'custom',
    }

    const decoded = S.decodeSync(FlowEdgeSchema)(edge)

    expect(
      applyDefaultEdgeOptions(decoded, {
        label: 'default',
        type: 'bezier',
        strokeWidth: 2,
      })
    ).toMatchObject({
      id: 'edge-1',
      source: 'source',
      target: 'target',
      label: 'stored',
      type: 'custom',
      strokeWidth: 2,
    })
  })
})

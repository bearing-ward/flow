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
      'style',
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

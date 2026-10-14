import { Exit, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  flowClassNames,
  flowStyleDeclarations,
  FlowStyleSchema,
  flowStyleText,
} from './flow-style.schema.ts'

describe('FlowStyle', () => {
  it('accepts JSON-safe style records and rejects other values', () => {
    expect(
      S.decodeUnknownSync(FlowStyleSchema)({
        backgroundColor: '#fff',
        width: 180,
        '--accent': 'red',
      })
    ).toStrictEqual({ backgroundColor: '#fff', width: 180, '--accent': 'red' })

    for (const invalid of [
      { width: Number.NaN },
      { width: null },
      { width: { px: 1 } },
      'color: red',
    ]) {
      expect(
        Exit.isFailure(S.decodeUnknownExit(FlowStyleSchema)(invalid))
      ).toBeTruthy()
    }
  })

  it('serializes with React DOM unit and casing rules', () => {
    expect(
      flowStyleDeclarations({
        backgroundColor: 'white',
        width: 180,
        borderWidth: 0,
        opacity: 0.5,
        zIndex: 3,
        strokeWidth: 2,
        '--node-accent': 4,
        msTransition: 'none',
        color: '',
        '': 'dropped',
      })
    ).toStrictEqual([
      { property: 'background-color', value: 'white' },
      { property: 'width', value: '180px' },
      { property: 'border-width', value: '0' },
      { property: 'opacity', value: '0.5' },
      { property: 'z-index', value: '3' },
      { property: 'stroke-width', value: '2' },
      { property: '--node-accent', value: '4' },
      { property: '-ms-transition', value: 'none' },
    ])
    expect(flowStyleText({ color: 'red', padding: 10 })).toBe(
      'color: red; padding: 10px'
    )
    expect(flowStyleText()).toBe('')
  })

  it('joins class names without empty entries', () => {
    expect(
      flowClassNames('flow-node', undefined, '  custom  extra ', false, '')
    ).toBe('flow-node custom extra')
  })
})

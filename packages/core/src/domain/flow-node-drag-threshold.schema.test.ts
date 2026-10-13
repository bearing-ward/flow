import { describe, expect, it } from 'vitest'

import {
  decodeNodeDragThreshold,
  nodeDragActivated,
} from './flow-node-drag-threshold.schema.ts'

describe('node drag threshold', () => {
  it('defaults only undefined and preserves finite nonnegative values', () => {
    expect(decodeNodeDragThreshold()).toBe(1)

    for (const value of [0, -0, 1, 5, Number.MAX_VALUE]) {
      expect(decodeNodeDragThreshold(value)).toBe(value)
    }
  })

  it.each([null, '5', true, false, -1, Number.NaN, Infinity, -Infinity])(
    'rejects %s',
    (value) => {
      expect(() => decodeNodeDragThreshold(value)).toThrow(/Expected/u)
    }
  )

  it('uses strict raw distance without squared overflow', () => {
    expect(nodeDragActivated(5, 0, 0, 3, 4)).toBeFalsy()
    expect(nodeDragActivated(5, 0, 0, 3, 4.1)).toBeTruthy()
    expect(nodeDragActivated(1, 0, 0, 1, 0)).toBeFalsy()
    expect(nodeDragActivated(1e200, 0, 0, 1.1e200, 0)).toBeTruthy()
    expect(nodeDragActivated(Number.MAX_VALUE, 0, 0, 1e300, 0)).toBeFalsy()
  })
})

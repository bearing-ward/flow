import { Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  ConnectionDragThresholdSchema,
  connectionDragActivated,
  defaultConnectionDragThreshold,
} from './flow-connection-drag-threshold.schema.ts'

describe('connectionDragThreshold', () => {
  it('defaults to one client pixel and uses strict squared displacement', () => {
    expect(defaultConnectionDragThreshold).toBe(1)
    expect([
      connectionDragActivated(0, 10, 20, 10, 20),
      connectionDragActivated(1, 10, 20, 11, 20),
      connectionDragActivated(1, 10, 20, 11.1, 20),
      connectionDragActivated(8, 10, 20, 13, 24),
      connectionDragActivated(8, 10, 20, 10, 28),
      connectionDragActivated(8, 10, 20, 16, 28),
      connectionDragActivated(10, 10, 20, 16, 28),
    ]).toStrictEqual([true, false, true, false, false, true, false])
  })

  it.each([-1, null, '8', Number.NaN, Infinity, -Infinity])(
    'rejects invalid input %s',
    (input) => {
      expect(() =>
        Schema.decodeUnknownSync(ConnectionDragThresholdSchema)(input)
      ).toThrow(/Expected/u)
    }
  )

  it.each([0, 0.5, 1, 8, Number.MAX_VALUE])(
    'accepts finite nonnegative input %s',
    (input) => {
      expect(
        Schema.decodeUnknownSync(ConnectionDragThresholdSchema)(input)
      ).toBe(input)
    }
  )
})

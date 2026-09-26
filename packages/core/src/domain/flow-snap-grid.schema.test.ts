import { Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  SnapGridSchema,
  snapGroupDelta,
  snapPosition,
} from './flow-snap-grid.schema.ts'

describe('snap grid', () => {
  it('decodes only finite, positive intervals on both axes', () => {
    expect(S.decodeSync(SnapGridSchema)({ x: 10, y: 25 })).toStrictEqual({
      x: 10,
      y: 25,
    })

    for (const invalid of [0, -10, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => S.decodeSync(SnapGridSchema)({ x: invalid, y: 10 })).toThrow(
        /Expected a (?:value greater than 0|finite number)/u
      )
      expect(() => S.decodeSync(SnapGridSchema)({ x: 10, y: invalid })).toThrow(
        /Expected a (?:value greater than 0|finite number)/u
      )
    }
  })

  it('rounds both coordinates to their own intervals, including negatives', () => {
    expect(snapPosition({ x: 17, y: -37 }, { x: 10, y: 25 })).toStrictEqual({
      x: 20,
      y: -25,
    })
  })

  it("snaps the group anchor once and preserves every member's spacing", () => {
    const anchor = { x: 13, y: 27 }
    const other = { x: 48, y: 63 }
    const delta = snapGroupDelta(anchor, { x: 12, y: -9 }, { x: 10, y: 25 })
    const movedAnchor = { x: anchor.x + delta.x, y: anchor.y + delta.y }
    const movedOther = { x: other.x + delta.x, y: other.y + delta.y }

    expect(delta).toStrictEqual({ x: 17, y: -2 })
    expect(movedAnchor).toStrictEqual({ x: 30, y: 25 })
    expect({
      x: movedOther.x - movedAnchor.x,
      y: movedOther.y - movedAnchor.y,
    }).toStrictEqual({ x: other.x - anchor.x, y: other.y - anchor.y })
  })
})

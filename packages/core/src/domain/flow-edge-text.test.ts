import { describe, expect, it } from 'vitest'

import { edgeTextLayout } from './flow-edge-text.ts'

describe('edge text layout', () => {
  it('centers a measured label and pads its background like xyflow EdgeText', () => {
    expect(
      edgeTextLayout({ x: 100, y: 50, width: 40, height: 12 })
    ).toStrictEqual({
      translate: { x: 80, y: 44 },
      background: { x: -2, y: -4, width: 44, height: 20 },
      textY: 6,
      visible: true,
    })
    expect(
      edgeTextLayout({ x: 0, y: 0, width: 10, height: 10 }, [5, 1]).background
    ).toStrictEqual({ x: -5, y: -1, width: 20, height: 12 })
  })

  it('stays hidden until the text has a measured width', () => {
    expect(
      edgeTextLayout({ x: 10, y: 10, width: 0, height: 0 }).visible
    ).toBeFalsy()
  })
})

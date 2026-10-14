import { describe, expect, test } from 'vitest'

import { foldkitMiniMapLabel, foldkitMiniMapMaskPath } from './minimap.ts'

describe('Foldkit MiniMap label', () => {
  test("uses React's default title without options", () => {
    expect(foldkitMiniMapLabel({})).toBe('Mini Map')
  })

  test('reads minimap.ariaLabel from ariaLabelConfig', () => {
    expect(
      foldkitMiniMapLabel({
        ariaLabelConfig: { 'minimap.ariaLabel': 'Übersicht' },
      })
    ).toBe('Übersicht')
  })

  test('an explicit ariaLabel wins and null removes the title', () => {
    const ariaLabelConfig = { 'minimap.ariaLabel': 'Übersicht' }

    expect(
      foldkitMiniMapLabel({ ariaLabel: 'Overview', ariaLabelConfig })
    ).toBe('Overview')
    expect(
      foldkitMiniMapLabel({ ariaLabel: null, ariaLabelConfig })
    ).toBeUndefined()
  })
})

describe('Foldkit MiniMap mask', () => {
  test('cuts the viewport out of the whole minimap, as React', () => {
    expect(
      foldkitMiniMapMaskPath(
        { width: 180, height: 120 },
        { x: 10, y: 20, width: 30, height: 40 }
      )
    ).toBe('M0,0h180v120h-180z M10,20h30v40h-30z')
  })
})

import { describe, expect, it } from 'vitest'

import { foldkitMiniMapLabel } from './minimap.ts'

describe('Foldkit MiniMap label', () => {
  it("uses React's default title without options", () => {
    expect(foldkitMiniMapLabel({})).toBe('Mini Map')
  })

  it('reads minimap.ariaLabel from ariaLabelConfig', () => {
    expect(
      foldkitMiniMapLabel({
        ariaLabelConfig: { 'minimap.ariaLabel': 'Übersicht' },
      })
    ).toBe('Übersicht')
  })

  it('an explicit ariaLabel wins and null removes the title', () => {
    const ariaLabelConfig = { 'minimap.ariaLabel': 'Übersicht' }

    expect(
      foldkitMiniMapLabel({ ariaLabel: 'Overview', ariaLabelConfig })
    ).toBe('Overview')
    expect(
      foldkitMiniMapLabel({ ariaLabel: null, ariaLabelConfig })
    ).toBeUndefined()
  })
})

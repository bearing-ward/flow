import { readFileSync } from 'node:fs'

import { flowThemeStylesheet } from '@flow/core'
import { describe, expect, it } from 'vitest'

import { edgeLabelPresentation, foldkitStyle } from './presentation.ts'

describe(foldkitStyle, () => {
  it('turns a Flow style record into kebab-case h.Style declarations', () => {
    expect(
      foldkitStyle({
        backgroundColor: '#ff0',
        borderWidth: 2,
        '--accent': 'red',
      })
    ).toStrictEqual({
      'background-color': '#ff0',
      'border-width': '2px',
      '--accent': 'red',
    })
  })

  it('drops declarations h.Style cannot represent', () => {
    expect(
      foldkitStyle({
        color: 'red; background: blue',
        'bad name': 'x',
        width: 3,
      })
    ).toStrictEqual({ width: '3px' })
  })
})

describe(edgeLabelPresentation, () => {
  it('maps React EdgeText label and background styling to the HTML label', () => {
    expect(
      edgeLabelPresentation({
        labelStyle: { fill: '#f00', fontWeight: 700 },
        labelBgStyle: { fill: '#000' },
        labelBgPadding: [8, 4],
        labelBgBorderRadius: 6,
      })
    ).toStrictEqual({
      box: {
        padding: '4px 8px',
        'border-radius': '6px',
        'background-color': '#000',
      },
      text: { 'font-weight': '700', color: '#f00' },
    })
  })

  it('hides the background when labelShowBg is false', () => {
    expect(edgeLabelPresentation({ labelShowBg: false }).box).toStrictEqual({
      background: 'transparent',
      padding: '0',
    })
  })
})

describe('Foldkit theme stylesheet', () => {
  it('ships the shared light and dark theme tokens for the canvas', () => {
    const css = readFileSync(new URL('style.css', import.meta.url), 'utf-8')

    expect(css).toContain(flowThemeStylesheet('.flow-foldkit-canvas'))
  })
})

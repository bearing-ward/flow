import { Exit, Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  FlowColorModeSchema,
  flowThemeDefaults,
  flowThemeStylesheet,
  flowThemeTokens,
  flowThemeValue,
  resolveFlowColorMode,
} from './flow-theme.ts'

describe('color mode and theme tokens', () => {
  it('decodes React ColorMode values only', () => {
    for (const mode of ['light', 'dark', 'system']) {
      expect(S.decodeUnknownSync(FlowColorModeSchema)(mode)).toBe(mode)
    }

    expect(
      Exit.isFailure(S.decodeUnknownExit(FlowColorModeSchema)('auto'))
    ).toBeTruthy()
  })

  it('resolves system from the prefers-color-scheme match', () => {
    expect(resolveFlowColorMode('system', true)).toBe('dark')
    expect(resolveFlowColorMode('system', false)).toBe('light')
    expect(resolveFlowColorMode('dark', false)).toBe('dark')
    expect(resolveFlowColorMode('light', true)).toBe('light')
    expect(resolveFlowColorMode(undefined, true)).toBe('light')
  })

  it('carries React light and dark defaults for every token', () => {
    const byName = new Map(flowThemeTokens.map((token) => [token.name, token]))

    expect(byName.get('node-background-color')).toMatchObject({
      light: '#fff',
      dark: '#1e1e1e',
      reactVariable: '--xy-node-background-color',
    })
    expect(byName.get('edge-stroke')).toMatchObject({
      light: '#b1b1b7',
      dark: '#3e3e3e',
    })
    expect(byName.get('minimap-mask-background-color')?.dark).toBe(
      'rgba(60, 60, 60, 0.6)'
    )
    expect(flowThemeValue('edge-stroke')).toBe(
      'var(--flow-edge-stroke, var(--flow-edge-stroke-default))'
    )
    expect(flowThemeDefaults('dark')).toContainEqual({
      property: '--flow-background-color-default',
      value: '#141414',
    })
  })

  it('has one token per name', () => {
    expect(new Set(flowThemeTokens.map(({ name }) => name)).size).toBe(
      flowThemeTokens.length
    )
  })

  it('emits light defaults on the root and dark defaults on root.dark', () => {
    const css = flowThemeStylesheet('.flow-root')

    expect(css).toContain(
      '.flow-root {\n  --flow-background-color-default: transparent;'
    )
    expect(css).toContain(
      '.flow-root.dark {\n  --flow-background-color-default: #141414;'
    )
  })
})

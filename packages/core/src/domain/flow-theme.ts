import { Schema as S } from 'effect'

/** React Flow `ColorMode`. */
export const FlowColorModeSchema = S.Literals(['light', 'dark', 'system'])

export type FlowColorMode = typeof FlowColorModeSchema.Type

/** React Flow `ColorModeClass`: the class applied to the canvas root. */
export type FlowColorModeClass = 'light' | 'dark'

/** The media query React's `useColorModeClass` follows for `system`. */
export const flowColorModeMediaQuery = '(prefers-color-scheme: dark)'

/**
 * Resolve a color mode to the class a host applies. `system` follows the
 * host-supplied `prefers-color-scheme: dark` match; hosts subscribe to the
 * media query and re-resolve on change.
 */
export const resolveFlowColorMode = (
  mode: FlowColorMode | undefined,
  prefersDark: boolean
): FlowColorModeClass => {
  if (mode === 'system') {
    return prefersDark ? 'dark' : 'light'
  }

  return mode ?? 'light'
}

/**
 * One themable value. Hosts style with
 * `var(--flow-<name>, var(--flow-<name>-default))`; users override
 * `--flow-<name>`, the color mode switches the `-default` value.
 */
export interface FlowThemeToken {
  readonly name: string
  readonly light: string
  readonly dark: string
  /** The React Flow variable this token corresponds to. */
  readonly reactVariable: string
}

const token = (
  name: string,
  light: string,
  dark: string = light
): FlowThemeToken => ({
  name,
  light,
  dark,
  reactVariable: `--xy-${name}`,
})

/**
 * Shared theme tokens with React Flow's light and dark defaults
 * (`system/src/styles/init.css` and `style.css`).
 */
export const flowThemeTokens: readonly FlowThemeToken[] = [
  token('background-color', 'transparent', '#141414'),
  token('background-pattern-dots-color', '#91919a', '#555'),
  token('background-pattern-lines-color', '#eee', '#333'),
  token('background-pattern-cross-color', '#e2e2e2', '#333'),
  token('edge-stroke', '#b1b1b7', '#3e3e3e'),
  token('edge-stroke-width', '1'),
  token('edge-stroke-selected', '#555', '#727272'),
  token('connectionline-stroke', '#b1b1b7'),
  token('connectionline-stroke-width', '1'),
  token(
    'attribution-background-color',
    'rgba(255, 255, 255, 0.5)',
    'rgba(150, 150, 150, 0.25)'
  ),
  token('minimap-background-color', '#fff', '#141414'),
  token(
    'minimap-mask-background-color',
    'rgba(240, 240, 240, 0.6)',
    'rgba(60, 60, 60, 0.6)'
  ),
  token('minimap-mask-stroke-color', 'transparent'),
  token('minimap-mask-stroke-width', '1'),
  token('minimap-node-background-color', '#e2e2e2', '#2b2b2b'),
  token('minimap-node-stroke-color', 'transparent'),
  token('minimap-node-stroke-width', '2'),
  token('node-color', 'inherit', '#f8f8f8'),
  token('node-border', '1px solid #1a192b', '1px solid #3c3c3c'),
  token('node-background-color', '#fff', '#1e1e1e'),
  token('node-group-background-color', 'rgba(240, 240, 240, 0.25)'),
  token(
    'node-boxshadow-hover',
    '0 1px 4px 1px rgba(0, 0, 0, 0.08)',
    '0 1px 4px 1px rgba(255, 255, 255, 0.08)'
  ),
  token('node-boxshadow-selected', '0 0 0 0.5px #1a192b', '0 0 0 0.5px #999'),
  token('node-border-radius', '3px'),
  token('handle-background-color', '#1a192b', '#bebebe'),
  token('handle-border-color', '#fff', '#1e1e1e'),
  token(
    'selection-background-color',
    'rgba(0, 89, 220, 0.08)',
    'rgba(200, 200, 220, 0.08)'
  ),
  token(
    'selection-border',
    '1px dotted rgba(0, 89, 220, 0.8)',
    '1px dotted rgba(200, 200, 220, 0.8)'
  ),
  token('controls-button-background-color', '#fefefe', '#2b2b2b'),
  token('controls-button-background-color-hover', '#f4f4f4', '#3e3e3e'),
  token('controls-button-color', 'inherit', '#f8f8f8'),
  token('controls-button-color-hover', 'inherit', '#fff'),
  token('controls-button-border-color', '#eee', '#5b5b5b'),
  token('controls-box-shadow', '0 0 2px 1px rgba(0, 0, 0, 0.08)'),
  token('edge-label-background-color', '#ffffff', '#141414'),
  token('edge-label-color', 'inherit', '#f8f8f8'),
]

/** The user-facing custom property for a token: `--flow-<name>`. */
export const flowThemeVariable = (name: string): string => `--flow-${name}`

/** CSS value that reads a token with its color-mode default as fallback. */
export const flowThemeValue = (name: string): string =>
  `var(${flowThemeVariable(name)}, var(${flowThemeVariable(name)}-default))`

/** `--flow-<name>-default` declarations for one resolved color mode. */
export const flowThemeDefaults = (
  mode: FlowColorModeClass
): readonly { readonly property: string; readonly value: string }[] =>
  flowThemeTokens.map((entry) => ({
    property: `${flowThemeVariable(entry.name)}-default`,
    value: mode === 'dark' ? entry.dark : entry.light,
  }))

const themeBlock = (scope: string, mode: FlowColorModeClass): string =>
  `${scope} {\n${flowThemeDefaults(mode)
    .map(({ property, value }) => `  ${property}: ${value};`)
    .join('\n')}\n}`

/**
 * Stylesheet text declaring the light defaults on `selector` and the dark
 * defaults on `selector.dark`, matching React's `.react-flow.dark` scoping.
 */
export const flowThemeStylesheet = (selector: string): string =>
  `${themeBlock(selector, 'light')}\n\n${themeBlock(`${selector}.dark`, 'dark')}\n`

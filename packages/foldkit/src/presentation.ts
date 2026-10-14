import { flowStyleDeclarations } from '@flow/core'
import type { FlowEdge, FlowStyle } from '@flow/core'

const declarationName = /^(?:--[\w-]+|-?[a-z_][a-z\d_-]*)$/u

/**
 * Whether one declaration value stays a single declaration, which Foldkit's
 * `h.Style` requires: balanced quotes and parentheses, no `;`, `!` or
 * comment outside them.
 */
const singleDeclarationValue = (value: string): boolean => {
  let quote: string | undefined
  let depth = 0

  for (const character of value) {
    if (quote !== undefined) {
      if (character === quote) {
        quote = undefined
      }

      continue
    }

    if (character === '"' || character === "'") {
      quote = character
    } else if (character === '(') {
      depth += 1
    } else if (character === ')') {
      if (depth === 0) {
        return false
      }

      depth -= 1
    } else if (
      depth === 0 &&
      (character === ';' || character === '!' || character === '\\')
    ) {
      return false
    }
  }

  return quote === undefined && depth === 0 && !value.includes('/*')
}

const supportedDeclaration = (property: string, value: string): boolean => {
  if (!declarationName.test(property) || !singleDeclarationValue(value)) {
    return false
  }

  // Foldkit only accepts CSSStyleDeclaration properties; the browser drops
  // the rest anyway. Without CSSOM (unit tests) keep the declaration.
  const supports = globalThis.CSS?.supports

  return (
    property.startsWith('--') ||
    supports === undefined ||
    globalThis.CSS.supports(property, value)
  )
}

/**
 * A Flow `style` record as one `h.Style` record with kebab-case keys, so it
 * merges with host declarations without two spellings of one property.
 * Declarations Foldkit cannot represent are dropped.
 */
export const foldkitStyle = (
  style: FlowStyle | undefined
): Record<string, string> =>
  Object.fromEntries(
    flowStyleDeclarations(style)
      .filter(({ property, value }) => supportedDeclaration(property, value))
      .map(({ property, value }) => [property, value])
  )

/**
 * React `EdgeText` styling on Foldkit's HTML edge label: `labelStyle` styles
 * the text (`fill` becomes `color`), the label box is the background unless
 * `labelShowBg` is false, with `labelBgStyle` (`fill` becomes
 * `background-color`), `labelBgPadding` `[x, y]` and `labelBgBorderRadius`.
 */
export interface EdgeLabelPresentation {
  readonly box: Record<string, string>
  readonly text: Record<string, string>
}

export const edgeLabelPresentation = (
  edge: Pick<
    FlowEdge,
    | 'labelStyle'
    | 'labelShowBg'
    | 'labelBgStyle'
    | 'labelBgPadding'
    | 'labelBgBorderRadius'
  >
): EdgeLabelPresentation => {
  const { fill: textFill, ...text } = foldkitStyle(edge.labelStyle)

  if (textFill !== undefined) {
    text['color'] = textFill
  }

  if (edge.labelShowBg === false) {
    return { box: { background: 'transparent', padding: '0' }, text }
  }

  const { fill: backgroundFill, ...background } = foldkitStyle(
    edge.labelBgStyle
  )

  // Unset padding and radius keep Foldkit's label box (2px 5px, 3px).
  const box: Record<string, string> = {}

  if (edge.labelBgPadding !== undefined) {
    box['padding'] = `${edge.labelBgPadding[1]}px ${edge.labelBgPadding[0]}px`
  }

  if (edge.labelBgBorderRadius !== undefined) {
    box['border-radius'] = `${edge.labelBgBorderRadius}px`
  }

  if (backgroundFill !== undefined) {
    box['background-color'] = backgroundFill
  }

  return { box: { ...box, ...background }, text }
}

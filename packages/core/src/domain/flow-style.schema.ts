import { Schema as S } from 'effect'

/**
 * Serializable inline style record, the JSON-safe subset of React
 * `CSSProperties`. Keys are camelCase CSS properties (`backgroundColor`) or
 * custom properties (`--accent`); values are strings or finite numbers.
 */
export const FlowStyleSchema = S.Record(S.String, S.Union([S.String, S.Finite]))

export type FlowStyle = typeof FlowStyleSchema.Type

/** Space-separated class list, as React `className`. */
export const FlowClassNameSchema = S.String

export type FlowClassName = typeof FlowClassNameSchema.Type

// React DOM's unitless properties (react-dom/shared/isUnitlessNumber).
const unitlessProperties: ReadonlySet<string> = new Set([
  'animationIterationCount',
  'aspectRatio',
  'borderImageOutset',
  'borderImageSlice',
  'borderImageWidth',
  'boxFlex',
  'boxFlexGroup',
  'boxOrdinalGroup',
  'columnCount',
  'columns',
  'flex',
  'flexGrow',
  'flexPositive',
  'flexShrink',
  'flexNegative',
  'flexOrder',
  'gridArea',
  'gridRow',
  'gridRowEnd',
  'gridRowSpan',
  'gridRowStart',
  'gridColumn',
  'gridColumnEnd',
  'gridColumnSpan',
  'gridColumnStart',
  'fontWeight',
  'lineClamp',
  'lineHeight',
  'opacity',
  'order',
  'orphans',
  'scale',
  'tabSize',
  'widows',
  'zIndex',
  'zoom',
  'fillOpacity',
  'floodOpacity',
  'stopOpacity',
  'strokeDasharray',
  'strokeDashoffset',
  'strokeMiterlimit',
  'strokeOpacity',
  'strokeWidth',
])

/** One CSS declaration with a kebab-case property name. */
export interface FlowStyleDeclaration {
  readonly property: string
  readonly value: string
}

const kebabProperty = (property: string): string => {
  if (property.startsWith('--')) {
    return property
  }

  const kebab = property.replaceAll(
    /[A-Z]/gu,
    (letter) => `-${letter.toLowerCase()}`
  )

  // React vendor prefixes: `msTransition` -> `-ms-transition`.
  return kebab.startsWith('ms-') ? `-${kebab}` : kebab
}

const declarationValue = (property: string, value: string | number): string =>
  Number.isFinite(value) &&
  value !== 0 &&
  !property.startsWith('--') &&
  !unitlessProperties.has(property)
    ? `${value}px`
    : String(value)

/**
 * Convert a style record to CSS declarations with React DOM semantics:
 * camelCase becomes kebab-case and non-zero numbers gain `px` unless the
 * property is unitless or custom. Empty-string values are dropped.
 */
export const flowStyleDeclarations = (
  style?: FlowStyle
): readonly FlowStyleDeclaration[] =>
  Object.entries(style ?? {})
    .filter(([property, value]) => property !== '' && value !== '')
    .map(([property, value]) => ({
      property: kebabProperty(property),
      value: declarationValue(property, value),
    }))

/** Serialize a style record to a `style` attribute value. */
export const flowStyleText = (style?: FlowStyle): string =>
  flowStyleDeclarations(style)
    .map(({ property, value }) => `${property}: ${value}`)
    .join('; ')

/** Join class names, skipping empty and undefined entries. */
export const flowClassNames = (
  ...classNames: readonly (string | false | undefined)[]
): string =>
  classNames
    .filter((name): name is string => name !== undefined && name !== false)
    .flatMap((name) => name.split(/\s+/u))
    .filter((name) => name !== '')
    .join(' ')

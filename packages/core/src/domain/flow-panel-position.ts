import { Schema as S } from 'effect'

/** React Flow `PanelPosition`, including the vertical-center placements. */
export const FlowPanelPositionSchema = S.Literals([
  'top-left',
  'top-center',
  'top-right',
  'bottom-left',
  'bottom-center',
  'bottom-right',
  'center-left',
  'center-right',
])

export type FlowPanelPosition = typeof FlowPanelPositionSchema.Type

export const flowPanelPositions: readonly FlowPanelPosition[] =
  FlowPanelPositionSchema.literals

export interface FlowPanelPlacement {
  readonly vertical: 'top' | 'center' | 'bottom'
  readonly horizontal: 'left' | 'center' | 'right'
  /** React panel classes: `top left`, `center right`, and so on. */
  readonly classNames: readonly string[]
  /**
   * Absolute placement inside the canvas with React's 15px margin. Centered
   * axes use 50% plus a translate, as `.react-flow__panel.center`.
   */
  readonly style: {
    readonly top?: string
    readonly bottom?: string
    readonly left?: string
    readonly right?: string
    readonly transform?: string
  }
}

const margin = '15px'

const placements: Readonly<Record<FlowPanelPosition, FlowPanelPlacement>> = {
  'top-left': {
    vertical: 'top',
    horizontal: 'left',
    classNames: ['top', 'left'],
    style: { top: margin, left: margin },
  },
  'top-center': {
    vertical: 'top',
    horizontal: 'center',
    classNames: ['top', 'center'],
    style: { top: margin, left: '50%', transform: 'translateX(-50%)' },
  },
  'top-right': {
    vertical: 'top',
    horizontal: 'right',
    classNames: ['top', 'right'],
    style: { top: margin, right: margin },
  },
  'bottom-left': {
    vertical: 'bottom',
    horizontal: 'left',
    classNames: ['bottom', 'left'],
    style: { bottom: margin, left: margin },
  },
  'bottom-center': {
    vertical: 'bottom',
    horizontal: 'center',
    classNames: ['bottom', 'center'],
    style: { bottom: margin, left: '50%', transform: 'translateX(-50%)' },
  },
  'bottom-right': {
    vertical: 'bottom',
    horizontal: 'right',
    classNames: ['bottom', 'right'],
    style: { bottom: margin, right: margin },
  },
  'center-left': {
    vertical: 'center',
    horizontal: 'left',
    classNames: ['center', 'left'],
    style: { top: '50%', left: margin, transform: 'translateY(-50%)' },
  },
  'center-right': {
    vertical: 'center',
    horizontal: 'right',
    classNames: ['center', 'right'],
    style: { top: '50%', right: margin, transform: 'translateY(-50%)' },
  },
}

/** Split a panel position into axes, classes and inline placement. */
export const flowPanelPlacement = (
  position: FlowPanelPosition
): FlowPanelPlacement => placements[position]

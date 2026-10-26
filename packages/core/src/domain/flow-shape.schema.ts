import { Schema as S } from 'effect'

export const flowFigureNodeType = 'shape'

export const flowFigureKinds = ['circle', 'diamond', 'hexagon'] as const

export const flowFigureColors = [
  '#ff0071',
  '#1a8cff',
  '#00b884',
  '#ffb300',
] as const

export const FlowFigureKindSchema = S.Literals(flowFigureKinds)

export type FlowFigureKind = typeof FlowFigureKindSchema.Type

export const FlowFigureColorSchema = S.Literals(flowFigureColors)

export type FlowFigureColor = typeof FlowFigureColorSchema.Type

/** Reserved recipe keys inside otherwise opaque node data. Arbitrary SVG is not a figure kind. */
export const FlowFigureDataSchema = S.Struct({
  type: FlowFigureKindSchema,
  color: FlowFigureColorSchema,
})

export type FlowFigureData = typeof FlowFigureDataSchema.Type

/** Unit-square paths, scaled affinely to authored bounds by every host. */
export const flowFigurePath = (kind: FlowFigureKind): string => {
  switch (kind) {
    case 'circle': {
      return 'M 0 50 A 50 50 0 1 0 100 50 A 50 50 0 1 0 0 50 Z'
    }

    case 'diamond': {
      return 'M 50 0 L 100 50 L 50 100 L 0 50 Z'
    }

    case 'hexagon': {
      return 'M 25 0 L 75 0 L 100 50 L 75 100 L 25 100 L 0 50 Z'
    }

    default: {
      const exhaustive: never = kind

      return exhaustive
    }
  }
}

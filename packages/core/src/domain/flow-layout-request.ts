import { Effect, Schema as S } from 'effect'

import { FlowAttribute, FlowSpan } from '../telemetry/flow-telemetry.ts'
import type { FlowLayoutInput } from './flow-layout.ts'
import type { FlowDocument } from './flow.schema.ts'

const spacing = S.Finite.check(S.isBetween({ minimum: 0, maximum: 500 }))

export const FlowLayoutSettingsSchema = S.Struct({
  engine: S.Literals(['dagre', 'hierarchy', 'elk']),
  direction: S.Literals(['TB', 'LR']),
  nodeSpacing: spacing,
  rankSpacing: spacing,
})

export type FlowLayoutSettings = typeof FlowLayoutSettingsSchema.Type

export const defaultFlowLayoutSettings: FlowLayoutSettings = {
  engine: 'dagre',
  direction: 'TB',
  nodeSpacing: 30,
  rankSpacing: 60,
}

export const FlowForceSettingsSchema = S.Struct({
  strength: S.Finite.check(S.isBetween({ minimum: -2000, maximum: 0 })),
  distance: S.Finite.check(S.isBetween({ minimum: 20, maximum: 400 })),
})

export type FlowForceSettings = typeof FlowForceSettingsSchema.Type

export const defaultFlowForceSettings: FlowForceSettings = {
  strength: -1000,
  distance: 150,
}

export interface FlowLayoutRequest {
  readonly revision: string
  readonly settings: FlowLayoutSettings
  readonly input: FlowLayoutInput
}

export const FlowLayoutResultSchema = S.Struct({
  revision: S.String,
  settings: FlowLayoutSettingsSchema,
  positions: S.ReadonlyMap(S.String, S.Struct({ x: S.Finite, y: S.Finite })),
})

export type FlowLayoutResult = typeof FlowLayoutResultSchema.Type

const sameSettings = S.toEquivalence(FlowLayoutSettingsSchema)

/** Identity uses the recipes' whole-unit geometry, not transformed DOM noise. */
const layoutMeasurementIdentity = (
  input: FlowLayoutInput
): FlowLayoutInput => ({
  ...input,
  nodes: input.nodes.map((node) => ({
    ...node,
    width: Math.round(node.width),
    height: Math.round(node.height),
    handles: node.handles.map((handle) => ({
      ...handle,
      x: Math.round(handle.x),
      y: Math.round(handle.y),
      width: Math.round(handle.width),
      height: Math.round(handle.height),
    })),
  })),
})

/** Authored state and measurements invalidate requests; selection and viewport do not. */
export const flowLayoutRevision = (
  document: FlowDocument,
  input: FlowLayoutInput
): string =>
  JSON.stringify({
    nodes: document.nodes.map(
      ({ selected: _selected, measured: _measured, ...node }) => node
    ),
    edges: document.edges.map(({ selected: _selected, ...edge }) => edge),
    input: layoutMeasurementIdentity(input),
  })

/** Topology/size key for automatic relayout, excluding its own position writes. */
export const flowLayoutInputKey = (input: FlowLayoutInput): string =>
  JSON.stringify({
    nodes: layoutMeasurementIdentity(input).nodes.map(
      ({ id, width, height }) => ({ id, width, height })
    ),
    edges: input.edges,
    unmeasured: input.unmeasured,
  })

const decodeLayout = S.decodeUnknownEffect(FlowLayoutSettingsSchema)

const decodeForce = S.decodeUnknownEffect(FlowForceSettingsSchema)

export const decodeFlowLayoutSettings = Effect.fn(FlowSpan.documentDecode)(
  function* decodeFlowLayoutSettings(...args: Parameters<typeof decodeLayout>) {
    const settings = yield* decodeLayout(...args)
    yield* Effect.logInfo('Layout settings decoded').pipe(
      Effect.annotateLogs({ [FlowAttribute.inputKind]: 'layout-settings' })
    )

    return settings
  }
)

export const decodeFlowForceSettings = Effect.fn(FlowSpan.documentDecode)(
  function* decodeFlowForceSettings(...args: Parameters<typeof decodeForce>) {
    const settings = yield* decodeForce(...args)
    yield* Effect.logInfo('Force settings decoded').pipe(
      Effect.annotateLogs({ [FlowAttribute.inputKind]: 'force-settings' })
    )

    return settings
  }
)

/** Latest-request ownership is independent of engine cancellation support. */
export const createFlowLayoutSession = () => {
  let generation = 0
  let disposed = false

  return {
    cancel: () => {
      generation += 1
    },
    dispose: () => {
      disposed = true
      generation += 1
    },
    run: (
      request: FlowLayoutRequest,
      engine: (
        request: FlowLayoutRequest
      ) => Effect.Effect<FlowLayoutResult, Error>,
      currentRevision: () => string
    ) =>
      Effect.gen(function* run() {
        generation += 1
        const ticket = generation

        if (disposed) {
          return { kind: 'discarded' } as const
        }

        const output = yield* engine(request)

        const result = yield* S.decodeUnknownEffect(FlowLayoutResultSchema)(
          output
        ).pipe(Effect.mapError((error) => new Error(String(error))))

        if (
          disposed ||
          ticket !== generation ||
          result.revision !== request.revision ||
          result.revision !== currentRevision() ||
          !sameSettings(result.settings, request.settings)
        ) {
          return { kind: 'discarded' } as const
        }

        yield* Effect.logInfo('Layout result accepted').pipe(
          Effect.annotateLogs({
            [FlowAttribute.changeKind]: 'layout',
            [FlowAttribute.nodeCount]: result.positions.size,
          })
        )

        return { kind: 'accepted', result } as const
      }).pipe(Effect.withSpan(FlowSpan.editPrepare)),
  }
}

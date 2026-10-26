import { Effect } from 'effect'

import type { FlowEditTransaction } from '../domain/flow-edit.schema.ts'
import { prepareFlowEdit } from '../domain/flow-edit.ts'
import { flowHistoryDocumentsEqual } from '../domain/flow-history.ts'
import {
  createFlowNodeTransition,
  decodeFlowNodeAnimationRequest,
  finishFlowNodeTransition,
  prepareFlowNodeAnimationEdit,
  stepFlowNodeTransition,
} from '../domain/flow-node-animation.ts'
import type {
  FlowNodeAnimationResult,
  FlowNodeAnimationRequest,
  FlowNodeTransition,
} from '../domain/flow-node-animation.ts'
import type { FlowDocument, XYPosition } from '../domain/flow.schema.ts'
import { FlowAttribute, FlowSpan } from '../telemetry/flow-telemetry.ts'

/** Host composition supplies frames, presentation, accepted state and one semantic edit. */
export const createFlowNodeAnimator = (owner: {
  readonly document: () => FlowDocument
  readonly displayed: () => ReadonlyMap<string, XYPosition>
  readonly draw: (positions: ReadonlyMap<string, XYPosition>) => void
  readonly commit: (transaction: FlowEditTransaction) => Promise<void>
  readonly reducedMotion: () => boolean
  readonly schedule: (step: (delta: number) => void) => () => void
}) => {
  let disposed = false
  let held: string | undefined

  const identity = () =>
    JSON.stringify(
      owner.document().nodes.map(({ id, position }) => ({ id, position }))
    )

  let active:
    | {
        transition: FlowNodeTransition
        resolve: (result: FlowNodeAnimationResult) => void
        stop?: () => void
      }
    | undefined

  const cancel = (
    kind: FlowNodeAnimationResult['kind'] = 'cancelled',
    hold = false
  ) => {
    const previous = active

    if (previous === undefined && held === undefined) {
      return
    }

    held = hold ? identity() : undefined
    active = undefined
    previous?.stop?.()

    if (!hold) {
      owner.draw(new Map())
    }

    if (previous !== undefined) {
      previous.resolve(finishFlowNodeTransition(previous.transition, kind))
      Effect.runSync(
        Effect.logDebug('Node animation ended').pipe(
          Effect.annotateLogs({ [FlowAttribute.changeKind]: kind }),
          Effect.withSpan(FlowSpan.gestureCancel)
        )
      )
    }
  }

  return {
    cancel,
    reconcile: () => {
      if (active === undefined && held !== undefined && held !== identity()) {
        held = undefined
        owner.draw(new Map())
      }
    },
    dispose: () => {
      disposed = true
      cancel('disposed')
    },
    animate: (
      input: FlowNodeAnimationRequest
    ): Promise<FlowNodeAnimationResult> =>
      Effect.runPromise(
        Effect.gen(function* animateNodePositions() {
          const request = yield* decodeFlowNodeAnimationRequest(input)

          const transition = createFlowNodeTransition(
            request,
            owner.displayed(),
            owner.reducedMotion()
          )

          if (disposed) {
            return finishFlowNodeTransition(transition, 'disposed')
          }

          const transaction = yield* prepareFlowNodeAnimationEdit(
            owner.document(),
            request,
            transition
          )

          const destination = (yield* prepareFlowEdit(
            owner.document(),
            transaction
          )).document

          cancel('superseded', true)
          const pending = Promise.withResolvers<FlowNodeAnimationResult>()

          const run: NonNullable<typeof active> = {
            transition,
            resolve: pending.resolve,
          }

          active = run
          held = undefined
          owner.draw(transition.from)

          yield* Effect.tryPromise({
            try: () => owner.commit(transaction),
            catch: (cause) =>
              cause instanceof Error ? cause : new Error(String(cause)),
          }).pipe(
            Effect.tapError((error) =>
              Effect.gen(function* animationFailed() {
                if (active === run) {
                  cancel()
                }

                yield* Effect.logWarning('Node animation failed').pipe(
                  Effect.annotateLogs({
                    [FlowAttribute.failureMessage]: error.message,
                  }),
                  Effect.withSpan(FlowSpan.editFailure)
                )
              })
            )
          )

          if (active !== run) {
            return yield* Effect.promise(() => pending.promise)
          }

          if (!flowHistoryDocumentsEqual(owner.document(), destination)) {
            cancel()

            return yield* Effect.promise(() => pending.promise)
          }

          const step = (delta: number) => {
            if (active !== run) {
              return
            }

            const document = owner.document()

            if (
              document.nodes.some((node) => {
                const target = transition.to.get(node.id)

                return (
                  target !== undefined &&
                  (target.x !== node.position.x || target.y !== node.position.y)
                )
              })
            ) {
              cancel()

              return
            }

            const frame = stepFlowNodeTransition(
              run.transition,
              owner.reducedMotion() ? transition.duration : delta
            )

            run.transition = frame.transition
            const live = new Set<string>(document.nodes.map(({ id }) => id))
            owner.draw(
              new Map([...frame.positions].filter(([id]) => live.has(id)))
            )

            if (frame.kind === 'finished') {
              active = undefined
              run.stop?.()
              owner.draw(new Map())
              run.resolve(finishFlowNodeTransition(transition, 'finished'))
            } else {
              run.stop = owner.schedule(step)
            }
          }

          step(0)

          return yield* Effect.promise(() => pending.promise)
        }).pipe(Effect.withSpan(FlowSpan.controllerUpdate))
      ),
  }
}

import { Effect, Deferred, Schema } from 'effect'
import { Runtime, Subscription } from 'foldkit'

import { decodeFlowDocument } from '../../../packages/core/dist/public.js'
import {
  AppMessage,
  createProgramPublication,
} from '../../../packages/foldkit/src/application.ts'
import type { AppMessageData } from '../../../packages/foldkit/src/application.ts'
import {
  initialModel,
  createPointerResource,
} from '../../../packages/foldkit/src/graph.ts'

const ModelSchema = Schema.Struct({ id: Schema.String })

export const fatalPublication = async () => {
  const documentState = Effect.runSync(
    decodeFlowDocument({ nodes: [], edges: [] })
  )

  const pointer = createPointerResource(
    initialModel(documentState, { x: 0, y: 0, zoom: 1 })
  )

  const failure = new Error('Injected publication emitter failure')
  const crashed = Effect.runSync(Deferred.make<boolean>())
  const emitted: string[] = []
  let count = 0

  const lane = createProgramPublication(pointer, (item) =>
    Effect.gen(function* emitFailure() {
      count += 1

      if (count === 2) {
        return yield* Effect.die(failure)
      }

      emitted.push(item.kind)

      return AppMessage.ChangePublished()
    })
  )

  lane.enqueue([
    { kind: 'interaction', events: [] },
    { kind: 'interaction', events: [] },
  ])
  lane.enqueue([{ kind: 'interaction', events: [] }])
  const container = document.createElement('div')
  container.id = 'fatal-publication-probe'
  document.body.append(container)

  const active = Runtime.embed(
    Runtime.makeElement({
      Model: ModelSchema,
      container,
      init: () => ({ model: { id: 'fatal' } }),
      update: (model: typeof ModelSchema.Type, _message: AppMessageData) => ({
        model,
      }),
      view: (_model, h) => h.div([], ['Publication failure probe']),
      crash: {
        report: ({ error }) => {
          Effect.runSync(Deferred.succeed(crashed, error === failure))
        },
      },
      subscriptions: Subscription.make<
        typeof ModelSchema.Type,
        AppMessageData
      >()((entry) => ({
        io: entry(
          { id: Schema.String },
          {
            modelToDependencies: (model) => model,
            dependenciesToStream: () => lane.stream,
          }
        ),
      })),
    })
  )

  try {
    const originalCause = await Effect.runPromise(Deferred.await(crashed))
    let rejected = false

    try {
      lane.enqueue([])
    } catch {
      rejected = true
    }

    return { originalCause, emitted, count, rejected }
  } finally {
    active.dispose()
    container.remove()
  }
}

import { Effect, Stream } from 'effect'

import {
  WorkflowAiProvider,
  workflowAiProviderLayer,
} from './workflow-ai-provider.ts'
import {
  WorkflowAiError,
  isolateWorkflowAiValue,
} from './workflow-ai.schema.ts'

/** An original 256 by 256 solid green PNG, embedded so resolution never needs a network. */
export const localWorkflowImageAsset = Object.freeze({
  assetId: 'flow-local-green-256',
  mediaType: 'image/png',
  width: 256,
  height: 256,
  dataUrl:
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAQAAAAEACAYAAABccqhmAAADIElEQVR4nO3UIQEAIBDAwM9DFQrRHmIgduL81GadfYGm+R0A/GMAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEGYAEPYAu6wc1TSPrh4AAAAASUVORK5CYII=',
})

export const localWorkflowAiCapabilities = isolateWorkflowAiValue({
  providerId: 'flow-local',
  text: [{ modelId: 'local-text', temperatures: [0, 1] }],
  image: [{ modelId: 'local-image', sizes: [{ width: 256, height: 256 }] }],
})

export interface LocalWorkflowAiOptions {
  readonly delayMillis?: number
  readonly fail?: 'text' | 'image'
}

/** Clock delays are interruptible and use Effect's test clock in acceptance. */
export const localWorkflowAiLayer = (options: LocalWorkflowAiOptions = {}) =>
  workflowAiProviderLayer(localWorkflowAiCapabilities, {
    text: () =>
      Stream.fromIterable([
        { kind: 'chunk', text: 'A ' },
        { kind: 'chunk', text: 'quiet ' },
        { kind: 'chunk', text: 'tree.' },
        { kind: 'complete', text: 'A quiet tree.' },
      ]).pipe(
        Stream.mapEffect((event) =>
          Effect.sleep(options.delayMillis ?? 0).pipe(
            Effect.andThen(() =>
              options.fail === 'text'
                ? Effect.fail(new WorkflowAiError({ code: 'provider-failure' }))
                : Effect.succeed(event)
            )
          )
        )
      ),
    image: () =>
      Effect.sleep(options.delayMillis ?? 0).pipe(
        Effect.andThen(() =>
          options.fail === 'image'
            ? Effect.fail(new WorkflowAiError({ code: 'provider-failure' }))
            : Effect.succeed({
                assetId: localWorkflowImageAsset.assetId,
                mediaType: localWorkflowImageAsset.mediaType,
                width: localWorkflowImageAsset.width,
                height: localWorkflowImageAsset.height,
              })
        )
      ),
  })

export const makeLocalWorkflowAiProvider = (
  options: LocalWorkflowAiOptions = {}
) =>
  Effect.gen(function* localProvider() {
    return yield* WorkflowAiProvider
  }).pipe(Effect.provide(localWorkflowAiLayer(options)))

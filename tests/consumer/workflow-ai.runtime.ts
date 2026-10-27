import {
  localWorkflowAiLayer,
  startWorkflowAiSession,
  startWorkflowRun,
  makeLocalWorkflowAiProvider,
  createWorkflowAiEvaluator,
  decodeWorkflowDocument,
  aiWorkflowFixture,
} from '@flow/workflow'
import type { WorkflowAiEvent } from '@flow/workflow'
import { Effect } from 'effect'

const events: WorkflowAiEvent[] = []

await Effect.runPromise(
  Effect.scoped(
    Effect.gen(function* packedAi() {
      const session = yield* startWorkflowAiSession(
        {
          runId: 'packed-ai',
          revision: 174,
          nodeId: 'text',
          kind: 'text',
          request: {
            modelId: 'local-text',
            temperature: 0,
            system: '',
            prompt: 'A tree',
          },
        },
        (event) => events.push(event)
      )

      yield* session.await
      const final = events.at(-1)

      if (
        final?.kind !== 'text' ||
        final.event.kind !== 'complete' ||
        final.event.text !== 'A quiet tree.'
      ) {
        return yield* Effect.die(
          new Error('Packed offline text capability failed')
        )
      }

      const image = yield* startWorkflowAiSession(
        {
          runId: 'packed-image',
          revision: 174,
          nodeId: 'image',
          kind: 'image',
          request: {
            modelId: 'local-image',
            width: 256,
            height: 256,
            prompt: 'A quiet tree.',
          },
        },
        (event) => events.push(event)
      )

      yield* image.await
      const result = events.at(-1)

      if (
        result?.kind !== 'image' ||
        result.result.assetId !== 'flow-local-green-256' ||
        result.result.width !== 256 ||
        result.result.height !== 256
      ) {
        return yield* Effect.die(
          new Error('Packed offline image capability failed')
        )
      }
    })
  ).pipe(Effect.provide(localWorkflowAiLayer()))
)

const service = Effect.runSync(makeLocalWorkflowAiProvider())

const outputs: object[] = []

let terminal: string | undefined

await Effect.runPromise(
  Effect.scoped(
    Effect.gen(function* packedAiEditor() {
      const document = yield* decodeWorkflowDocument(aiWorkflowFixture)

      const session = yield* startWorkflowRun(
        { document, revision: 175 },
        {
          runId: 'packed-ai-editor',
          expectedRevision: 175,
          capabilities: service.capabilities,
          evaluate: createWorkflowAiEvaluator(service),
          onEvent: (event) => {
            if (event.kind === 'run') {
              terminal = event.state
            }

            if (
              event.kind === 'node' &&
              (event.event.nodeId === 'generate-text' ||
                event.event.nodeId === 'image-output') &&
              event.event.state === 'succeeded'
            ) {
              outputs.push({
                nodeId: event.event.nodeId,
                outputs: event.event.outputs,
              })
            }
          },
        }
      )

      yield* session.await
    })
  )
)

if (
  terminal !== 'succeeded' ||
  JSON.stringify(outputs) !==
    '[{"nodeId":"generate-text","outputs":{"output":{"kind":"text","text":"A quiet tree."}}},{"nodeId":"image-output","outputs":{"result":{"kind":"image","assetId":"flow-local-green-256","mediaType":"image/png","width":256,"height":256}}}]'
) {
  throw new Error('Packed AI editor evaluation failed')
}

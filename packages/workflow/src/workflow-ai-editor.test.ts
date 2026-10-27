import { NodeIdSchema } from '@flow/core'
import { Effect, Exit, Result, Schema as S } from 'effect'
import { TestClock } from 'effect/testing'
import { describe, expect, it } from 'vitest'

import {
  aiWorkflowFixture,
  createWorkflowAiEvaluator,
  decodeWorkflowDocument,
  localWorkflowAiCapabilities,
  makeLocalWorkflowAiProvider,
  makeWorkflowAiProvider,
  reduceWorkflowRunEvent,
  startWorkflowRun,
  WorkflowRunIdSchema,
  WorkflowValidationError,
  workflowValidationReport,
} from './public.ts'
import type {
  WorkflowRunEvent,
  WorkflowNodeEvent,
  WorkflowRunState,
  WorkflowAiProviderService,
} from './public.ts'

const document = () => Effect.runSync(decodeWorkflowDocument(aiWorkflowFixture))

const provider = () => Effect.runSync(makeLocalWorkflowAiProvider())

const collect = async (service = provider(), input = document()) => {
  const events: WorkflowRunEvent[] = []
  await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* run() {
        const session = yield* startWorkflowRun(
          { document: input, revision: 175 },
          {
            runId: 'ai-editor',
            expectedRevision: 175,
            capabilities: service.capabilities,
            evaluate: createWorkflowAiEvaluator(service),
            onEvent: (event) => events.push(event),
          }
        )

        yield* session.await
      })
    )
  )

  return events
}

const collectEffect = (input: ReturnType<typeof document>) =>
  Effect.scoped(
    startWorkflowRun(
      { document: input, revision: 175 },
      {
        runId: 'invalid',
        expectedRevision: 175,
        capabilities: localWorkflowAiCapabilities,
        onEvent: () => {
          throw new Error('Rejected run emitted events')
        },
      }
    )
  )

describe('integrated AI workflow evaluation', () => {
  it('streams exact intermediate text and feeds final text into a local image without mutating configuration', async () => {
    const input = document()
    const before = structuredClone(input)
    const events = await collect(provider(), input)
    expect(
      events.filter(
        (event) =>
          event.kind === 'node' &&
          event.event.state === 'running' &&
          event.event.text !== undefined
      )
    ).toStrictEqual([
      {
        kind: 'node',
        event: {
          runId: 'ai-editor',
          revision: 175,
          nodeId: 'generate-text',
          state: 'running',
          text: 'A ',
        },
      },
      {
        kind: 'node',
        event: {
          runId: 'ai-editor',
          revision: 175,
          nodeId: 'generate-text',
          state: 'running',
          text: 'A quiet ',
        },
      },
      {
        kind: 'node',
        event: {
          runId: 'ai-editor',
          revision: 175,
          nodeId: 'generate-text',
          state: 'running',
          text: 'A quiet tree.',
        },
      },
    ])
    expect(
      events
        .filter(
          (event) => event.kind === 'node' && event.event.state === 'succeeded'
        )
        .map((event) => (event.kind === 'node' ? event.event : null))
    ).toContainEqual({
      runId: 'ai-editor',
      revision: 175,
      nodeId: 'image-output',
      state: 'succeeded',
      outputs: {
        result: {
          kind: 'image',
          assetId: 'flow-local-green-256',
          mediaType: 'image/png',
          width: 256,
          height: 256,
        },
      },
    })
    expect(events.at(-1)).toStrictEqual({
      kind: 'run',
      runId: 'ai-editor',
      revision: 175,
      state: 'succeeded',
    })
    expect(input).toStrictEqual(before)
  })

  it('passes connected system/prompt text and final image prompt through the decoded local boundary', async () => {
    const local = provider()
    const requests: object[] = []

    const service: WorkflowAiProviderService = Effect.runSync(
      makeWorkflowAiProvider(local.capabilities, {
        text: (request) => {
          requests.push(request)

          return local.text(request)
        },
        image: (request) => {
          requests.push(request)

          return local.image(request)
        },
      })
    )

    const input = Effect.runSync(
      decodeWorkflowDocument({
        ...aiWorkflowFixture,
        edges: [
          ...aiWorkflowFixture.edges,
          {
            id: 'system-text',
            source: 'text',
            sourceHandle: 'out',
            target: 'generate-text',
            targetHandle: 'system',
            data: { workflow: { version: 1, kind: 'data' } },
          },
        ],
      })
    )

    await collect(service, input)
    expect(requests).toStrictEqual([
      {
        modelId: 'local-text',
        temperature: 0,
        system: 'A tree',
        prompt: 'A tree',
      },
      {
        modelId: 'local-image',
        width: 256,
        height: 256,
        prompt: 'A quiet tree.',
      },
    ])
  })

  it.each(['text', 'image'] as const)(
    'surfaces typed %s failure and skips downstream output',
    async (fail) => {
      const events = await collect(
        Effect.runSync(makeLocalWorkflowAiProvider({ fail }))
      )

      expect(events.at(-1)).toStrictEqual({
        kind: 'run',
        runId: 'ai-editor',
        revision: 175,
        state: 'failed',
        failure: { code: 'provider-failure' },
      })
      expect(events).toContainEqual({
        kind: 'node',
        event: {
          runId: 'ai-editor',
          revision: 175,
          nodeId: 'image-output',
          state: 'skipped',
        },
      })
    }
  )

  it('validates model, temperature and image size before starting provider work', async () => {
    const input = Effect.runSync(
      decodeWorkflowDocument({
        ...aiWorkflowFixture,
        nodes: aiWorkflowFixture.nodes.map((node) => {
          const data = node.data.workflow

          if (data.kind === 'generate-text') {
            return {
              ...node,
              data: {
                workflow: {
                  ...data,
                  config: { ...data.config, temperature: 0.5 },
                },
              },
            }
          }

          if (data.kind === 'generate-image') {
            return {
              ...node,
              data: {
                workflow: { ...data, config: { ...data.config, width: 512 } },
              },
            }
          }

          return node
        }),
      })
    )

    expect(
      workflowValidationReport(input, localWorkflowAiCapabilities).issues
    ).toStrictEqual([
      { code: 'invalid-setting', nodeId: 'generate-image', field: 'size' },
      {
        code: 'invalid-setting',
        nodeId: 'generate-text',
        field: 'temperature',
      },
    ])
    const result = await Effect.runPromise(Effect.result(collectEffect(input)))

    if (Result.isSuccess(result)) {
      throw new Error('Invalid settings started a run')
    }

    expect(result.failure).toBeInstanceOf(WorkflowValidationError)
  })

  it.each(['cancel', 'dispose'] as const)(
    'interrupts local generation on %s and emits no late output',
    async (action) => {
      const events: WorkflowRunEvent[] = []

      const service = Effect.runSync(
        makeLocalWorkflowAiProvider({ delayMillis: 1000 })
      )

      await Effect.runPromise(
        Effect.gen(function* interrupt() {
          yield* Effect.scoped(
            Effect.gen(function* acquire() {
              const session = yield* startWorkflowRun(
                { document: document(), revision: 175 },
                {
                  runId: 'controlled',
                  expectedRevision: 175,
                  capabilities: service.capabilities,
                  evaluate: createWorkflowAiEvaluator(service),
                  onEvent: (event) => events.push(event),
                }
              )

              yield* TestClock.adjust('1 second')
              expect(events.at(-1)).toMatchObject({
                kind: 'node',
                event: {
                  nodeId: 'generate-text',
                  state: 'running',
                  text: 'A ',
                },
              })

              if (action === 'cancel') {
                yield* session.cancel
                expect(
                  Exit.isFailure(yield* Effect.exit(session.await))
                ).toBeTruthy()
              }
            })
          )
          expect(events.at(-1)).toMatchObject({
            kind: 'run',
            state: 'cancelled',
          })
          const before = structuredClone(events)
          yield* TestClock.adjust('10 seconds')
          expect(events).toStrictEqual(before)
        }).pipe(Effect.provide(TestClock.layer()))
      )
    }
  )

  it('rejects obsolete streaming text and image results after replacement, revision change and terminal states', () => {
    const runId = S.decodeUnknownSync(WorkflowRunIdSchema)('new')
    const textId = S.decodeUnknownSync(NodeIdSchema)('generate-text')
    const imageId = S.decodeUnknownSync(NodeIdSchema)('generate-image')

    const state: WorkflowRunState = {
      runId,
      revision: 175,
      state: 'running',
      nodes: {
        [textId]: { runId, revision: 175, nodeId: textId, state: 'running' },
        [imageId]: { runId, revision: 175, nodeId: imageId, state: 'running' },
      },
    }

    for (const node of [
      {
        runId,
        revision: 175,
        nodeId: textId,
        state: 'running',
        text: 'late text',
      },
      {
        runId,
        revision: 175,
        nodeId: imageId,
        state: 'succeeded',
        outputs: {
          image: {
            kind: 'image',
            assetId: 'late-image',
            mediaType: 'image/png',
            width: 256,
            height: 256,
          },
        },
      },
    ] satisfies WorkflowNodeEvent[]) {
      const event = { kind: 'node', event: node } as const
      expect(reduceWorkflowRunEvent(state, event, 175)).not.toBe(state)

      const replaced = {
        ...state,
        runId: S.decodeUnknownSync(WorkflowRunIdSchema)('newer'),
      }

      expect(reduceWorkflowRunEvent(replaced, event, 175)).toBe(replaced)
      expect(reduceWorkflowRunEvent(state, event, 176)).toBe(state)
      const terminal = { ...state, state: 'cancelled' as const }
      expect(reduceWorkflowRunEvent(terminal, event, 175)).toBe(terminal)
    }
  })
})

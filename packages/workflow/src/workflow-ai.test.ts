import {
  FlowSpan,
  copyFlowSelection,
  createFlowHistory,
  flowHistoryDocument,
  projectFlowRoomDocument,
  encodeVersionedFlowDocument,
  decodeVersionedFlowDocument,
  pasteFlowGraphFragment,
  prepareFlowEdit,
} from '@flow/core'
import {
  Effect,
  Exit,
  Logger,
  Result,
  Schema as S,
  Stream,
  Tracer,
} from 'effect'
import { TestClock } from 'effect/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  aiWorkflowFixture,
  decodeWorkflowDocument,
  workflowClipboardExtension,
  localWorkflowAiCapabilities,
  localWorkflowAiLayer,
  localWorkflowImageAsset,
  makeLocalWorkflowAiProvider,
  makeWorkflowAiProvider,
  reduceWorkflowAiEvent,
  startWorkflowAiSession,
  startWorkflowRun,
  createWorkflowAiEvaluator,
  WorkflowAiEventSchema,
  WorkflowAiIdentitySchema,
} from './public.ts'
import type {
  WorkflowAiEvent,
  WorkflowAiImplementation,
  WorkflowAiState,
  WorkflowImageResult,
  WorkflowAiError,
} from './public.ts'

const textRequest = {
  modelId: 'local-text',
  temperature: 0,
  system: 'private-system',
  prompt: 'private-prompt',
}

const imageRequest = {
  modelId: 'local-image',
  width: 256,
  height: 256,
  prompt: 'private-prompt',
}

const identity = S.decodeUnknownSync(WorkflowAiIdentitySchema)({
  runId: 'test-run',
  revision: 7,
  nodeId: 'text-node',
})

const textRun = { ...identity, kind: 'text', request: textRequest }

const imageResult = {
  assetId: 'flow-local-green-256',
  mediaType: 'image/png',
  width: 256,
  height: 256,
} satisfies WorkflowImageResult

const initial = (): WorkflowAiState => ({
  identity,
  state: 'queued',
  text: '',
  image: null,
  failure: null,
})

const errorCode = <A>(result: Result.Result<A, WorkflowAiError>) =>
  Result.isFailure(result) ? result.failure.code : null

const implementation: WorkflowAiImplementation = {
  text: () =>
    Stream.fromIterable([
      { kind: 'chunk', text: 'fixture' },
      { kind: 'complete', text: 'fixture' },
    ]),
  image: () => Effect.succeed(imageResult),
}

const collect = async (
  input: Parameters<typeof startWorkflowAiSession>[0] = textRun,
  fail?: 'text' | 'image'
) => {
  const events: WorkflowAiEvent[] = []
  await Effect.runPromise(
    Effect.scoped(
      Effect.gen(function* run() {
        const session = yield* startWorkflowAiSession(input, (event) =>
          events.push(event)
        )

        yield* session.await
      })
    ).pipe(
      Effect.provide(localWorkflowAiLayer(fail === undefined ? {} : { fail }))
    )
  )

  return events
}

describe('offline AI capability contract', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => {
        throw new Error('Unexpected network request')
      })
    )
    vi.stubGlobal(
      'WebSocket',
      vi.fn(() => {
        throw new Error('Unexpected WebSocket')
      })
    )
  })
  afterEach(() => {
    if (
      vi.mocked(fetch).mock.calls.length > 0 ||
      vi.mocked(WebSocket).mock.calls.length > 0
    ) {
      throw new Error('Unexpected network traffic')
    }

    vi.unstubAllGlobals()
  })

  it('emits literal chunks and final output through the scoped Effect service', async () => {
    const events = await collect()
    expect(events).toStrictEqual([
      { ...identity, kind: 'running' },
      { ...identity, kind: 'text', event: { kind: 'chunk', text: 'A ' } },
      { ...identity, kind: 'text', event: { kind: 'chunk', text: 'quiet ' } },
      { ...identity, kind: 'text', event: { kind: 'chunk', text: 'tree.' } },
      {
        ...identity,
        kind: 'text',
        event: { kind: 'complete', text: 'A quiet tree.' },
      },
    ])

    for (const event of events) {
      expect(S.decodeUnknownSync(WorkflowAiEventSchema)(event)).toStrictEqual(
        event
      )
    }

    let projected = initial()

    for (const event of events) {
      projected = reduceWorkflowAiEvent(projected, event, 7)
    }

    expect(projected).toStrictEqual({
      identity,
      state: 'succeeded',
      text: 'A quiet tree.',
      image: null,
      failure: null,
    })
  })

  it('returns image metadata matching the embedded local PNG bytes', async () => {
    await expect(
      collect({ ...identity, kind: 'image', request: imageRequest })
    ).resolves.toStrictEqual([
      { ...identity, kind: 'running' },
      { ...identity, kind: 'image', result: imageResult },
    ])

    const bytes = Buffer.from(
      localWorkflowImageAsset.dataUrl.split(',')[1] ?? '',
      'base64'
    )

    expect([...bytes.subarray(0, 8)]).toStrictEqual([
      137, 80, 78, 71, 13, 10, 26, 10,
    ])
    expect([bytes.readUInt32BE(16), bytes.readUInt32BE(20)]).toStrictEqual([
      256, 256,
    ])
  })

  it('derives settings from decoded capabilities and detaches caller data', async () => {
    const capabilities = structuredClone(localWorkflowAiCapabilities)
    capabilities.text[0] = { modelId: 'other-local-text', temperatures: [0.25] }

    const provider = Effect.runSync(
      makeWorkflowAiProvider(capabilities, implementation)
    )

    capabilities.text.splice(0)
    await expect(
      Effect.runPromise(
        Stream.runCollect(
          provider.text({
            ...textRequest,
            modelId: 'other-local-text',
            temperature: 0.25,
          })
        )
      )
    ).resolves.toStrictEqual([
      { kind: 'chunk', text: 'fixture' },
      { kind: 'complete', text: 'fixture' },
    ])
    expect(
      errorCode(
        await Effect.runPromise(
          Effect.result(Stream.runCollect(provider.text(textRequest)))
        )
      )
    ).toBe('unsupported-setting')
  })

  it.each([
    { ...textRequest, temperature: 'bad' },
    { ...textRequest, prompt: '' },
    { ...textRequest, apiKey: 'credential-canary' },
    { ...textRequest, credentials: { token: 'credential-canary' } },
  ])(
    'rejects malformed text requests and excess credential fields',
    async (input) => {
      const provider = Effect.runSync(makeLocalWorkflowAiProvider())
      expect(
        errorCode(
          await Effect.runPromise(
            Effect.result(Stream.runCollect(provider.text(input)))
          )
        )
      ).toBe('invalid-request')
    }
  )

  it.each([
    { ...imageRequest, width: 0 },
    { ...imageRequest, key: 'credential-canary' },
  ])('rejects malformed image requests', async (input) => {
    const provider = Effect.runSync(makeLocalWorkflowAiProvider())
    expect(
      errorCode(await Effect.runPromise(Effect.result(provider.image(input))))
    ).toBe('invalid-request')
  })

  it('rejects unsupported models, temperatures and image sizes before calling the driver', async () => {
    const text = vi.fn<WorkflowAiImplementation['text']>(implementation.text)
    const image = vi.fn<WorkflowAiImplementation['image']>(implementation.image)

    const provider = Effect.runSync(
      makeWorkflowAiProvider(localWorkflowAiCapabilities, { text, image })
    )

    const textResults = await Promise.all(
      [
        { ...textRequest, modelId: 'absent' },
        { ...textRequest, temperature: 0.5 },
      ].map((input) =>
        Effect.runPromise(
          Effect.result(Stream.runCollect(provider.text(input)))
        )
      )
    )

    const imageResults = await Promise.all(
      [
        { ...imageRequest, modelId: 'absent' },
        { ...imageRequest, width: 128 },
      ].map((input) => Effect.runPromise(Effect.result(provider.image(input))))
    )

    expect(textResults.map(errorCode)).toStrictEqual([
      'unsupported-setting',
      'unsupported-setting',
    ])
    expect(imageResults.map(errorCode)).toStrictEqual([
      'unsupported-setting',
      'unsupported-setting',
    ])
    expect(text).not.toHaveBeenCalled()
    expect(image).not.toHaveBeenCalled()
  })

  it.each([
    {},
    { ...localWorkflowAiCapabilities, apiKey: 'credential-canary' },
    {
      ...localWorkflowAiCapabilities,
      text: [{ modelId: 'local', temperatures: [] }],
    },
    {
      ...localWorkflowAiCapabilities,
      image: [{ modelId: 'local', sizes: [{ width: 0, height: 1 }] }],
    },
  ])('rejects malformed capabilities', (capabilities) => {
    expect(
      errorCode(
        Effect.runSync(
          Effect.result(makeWorkflowAiProvider(capabilities, implementation))
        )
      )
    ).toBe('invalid-capabilities')
  })

  it.each([
    [{ kind: 'chunk', text: 3 }],
    [{ kind: 'chunk', text: 'a' }],
    [{ kind: 'complete', text: 'mismatch' }],
    [
      { kind: 'complete', text: '' },
      { kind: 'chunk', text: 'late' },
    ],
    [
      { kind: 'complete', text: '' },
      { kind: 'complete', text: '' },
    ],
    [{ kind: 'complete', text: '', credentials: 'credential-canary' }],
  ])(
    'rejects malformed results and invalid stream completion protocols',
    async (...raw) => {
      const provider = Effect.runSync(
        makeWorkflowAiProvider(localWorkflowAiCapabilities, {
          ...implementation,
          text: () => Stream.fromIterable<unknown>(raw),
        })
      )

      const received: unknown[] = []

      const result = await Effect.runPromise(
        Effect.result(
          Stream.runForEach(provider.text(textRequest), (event) =>
            Effect.sync(() => received.push(event))
          )
        )
      )

      expect(errorCode(result)).toBe('invalid-result')
      expect(received).not.toContainEqual({ kind: 'complete', text: '' })
    }
  )

  it.each([
    { ...imageResult, width: -1 },
    { ...imageResult, width: 128 },
    { ...imageResult, mediaType: 'text/plain' },
    { ...imageResult, credentials: 'credential-canary' },
  ])(
    'rejects malformed image results and mismatched dimensions',
    async (raw) => {
      const provider = Effect.runSync(
        makeWorkflowAiProvider(localWorkflowAiCapabilities, {
          ...implementation,
          image: () => Effect.succeed(raw),
        })
      )

      expect(
        errorCode(
          await Effect.runPromise(Effect.result(provider.image(imageRequest)))
        )
      ).toBe('invalid-result')
    }
  )

  it.each(['text', 'image'] as const)(
    'publishes typed %s provider failures without content',
    async (kind) => {
      const events = await collect(
        {
          ...identity,
          kind,
          request: kind === 'text' ? textRequest : imageRequest,
        },
        kind
      )

      expect(events).toStrictEqual([
        { ...identity, kind: 'running' },
        { ...identity, kind: 'failed', code: 'provider-failure' },
      ])
    }
  )

  it('redacts schema failures and driver defects from logs and typed failures', async () => {
    const records: unknown[] = []

    const logger = Logger.make((event) => {
      records.push(event)
    })

    await Effect.runPromise(
      Effect.gen(function* redaction() {
        const provider = yield* makeWorkflowAiProvider(
          localWorkflowAiCapabilities,
          {
            text: () =>
              Stream.die(new Error('private-prompt credential-canary')),
            image: () =>
              Effect.die(new Error('private-system credential-canary')),
          }
        )

        for (const operation of [
          Stream.runCollect(provider.text(textRequest)),
          provider.image(imageRequest),
        ]) {
          const result = yield* Effect.result<unknown, WorkflowAiError, never>(
            operation
          )

          expect(errorCode(result)).toBe('provider-failure')
          records.push(result)
        }

        yield* Effect.result(
          provider.image({ ...imageRequest, apiKey: 'credential-canary' })
        )
      }).pipe(Effect.provide(Logger.layer([logger])))
    )
    const diagnostics = JSON.stringify(records)
    expect(diagnostics).not.toContain('private-prompt')
    expect(diagnostics).not.toContain('private-system')
    expect(diagnostics).not.toContain('credential-canary')
  })

  it('uses controlled delays and cancels without late chunks or pending work', async () => {
    const events: WorkflowAiEvent[] = []
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* cancellation() {
          const session = yield* startWorkflowAiSession(textRun, (event) =>
            events.push(event)
          )

          yield* TestClock.adjust('1 second')
          expect(events).toStrictEqual([
            { ...identity, kind: 'running' },
            { ...identity, kind: 'text', event: { kind: 'chunk', text: 'A ' } },
          ])
          yield* session.cancel
          expect(events.at(-1)).toStrictEqual({
            ...identity,
            kind: 'cancelled',
          })
          const before = structuredClone(events)
          yield* TestClock.adjust('10 seconds')
          expect(events).toStrictEqual(before)
          expect(Exit.isFailure(yield* Effect.exit(session.await))).toBeTruthy()
        })
      ).pipe(
        Effect.provide(localWorkflowAiLayer({ delayMillis: 1000 })),
        Effect.provide(TestClock.layer())
      )
    )
  })

  it.each(['text', 'image'] as const)(
    'disposes %s work and prevents late output after scope closure',
    async (kind) => {
      const events: WorkflowAiEvent[] = []
      await Effect.runPromise(
        Effect.gen(function* disposal() {
          yield* Effect.scoped(
            Effect.gen(function* acquire() {
              yield* startWorkflowAiSession(
                {
                  ...identity,
                  kind,
                  request: kind === 'text' ? textRequest : imageRequest,
                },
                (event) => events.push(event)
              )
              yield* Effect.yieldNow
            })
          )
          expect(events.at(-1)).toStrictEqual({
            ...identity,
            kind: 'cancelled',
          })
          const before = structuredClone(events)
          yield* TestClock.adjust('10 seconds')
          expect(events).toStrictEqual(before)
        }).pipe(
          Effect.provide(localWorkflowAiLayer({ delayMillis: 1000 })),
          Effect.provide(TestClock.layer())
        )
      )
    }
  )

  it('rejects invalid session requests without emitting events', async () => {
    const events: WorkflowAiEvent[] = []

    const result = await Effect.runPromise(
      Effect.scoped(
        Effect.result(
          startWorkflowAiSession(
            { ...textRun, credentials: 'credential-canary' },
            (event) => events.push(event)
          )
        )
      ).pipe(Effect.provide(localWorkflowAiLayer()))
    )

    expect(errorCode(result)).toBe('invalid-request')
    expect(events).toStrictEqual([])
  })

  it('rejects late text and image from obsolete runs, revisions, nodes and terminal states', async () => {
    const events = await collect()
    const event = events.at(-1)

    if (event === undefined) {
      throw new Error('Missing fixture event')
    }

    const current: WorkflowAiState = { ...initial(), state: 'running' }

    for (const stale of [
      {
        ...event,
        runId: S.decodeUnknownSync(WorkflowAiIdentitySchema)({
          ...identity,
          runId: 'old',
        }).runId,
      },
      { ...event, revision: 6 },
      {
        ...event,
        nodeId: S.decodeUnknownSync(WorkflowAiIdentitySchema)({
          ...identity,
          nodeId: 'other',
        }).nodeId,
      },
    ]) {
      expect(reduceWorkflowAiEvent(current, stale, 7)).toBe(current)
    }

    expect(reduceWorkflowAiEvent(current, event, 8)).toBe(current)

    for (const terminal of ['succeeded', 'cancelled', 'failed'] as const) {
      const state = { ...current, state: terminal }
      expect(
        reduceWorkflowAiEvent(
          state,
          { ...identity, kind: 'image', result: imageResult },
          7
        )
      ).toBe(state)
    }
  })

  it('isolates immutable session requests, events and nested capability settings', async () => {
    const input = structuredClone(textRun)
    const events: WorkflowAiEvent[] = []
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* isolation() {
          const session = yield* startWorkflowAiSession(input, (event) =>
            events.push(event)
          )

          input.request.prompt = 'changed after acquisition'
          expect(session.request.request.prompt).toBe('private-prompt')
          expect(Object.isFrozen(session.request.request)).toBeTruthy()
          yield* session.await
          expect(Object.isFrozen(events.at(-1))).toBeTruthy()
        })
      ).pipe(Effect.provide(localWorkflowAiLayer()))
    )
    const provider = Effect.runSync(makeLocalWorkflowAiProvider())
    expect(
      Object.isFrozen(provider.capabilities.text[0]?.temperatures)
    ).toBeTruthy()
    expect(
      Object.isFrozen(provider.capabilities.image[0]?.sizes[0])
    ).toBeTruthy()
  })

  it('preserves workflow extensions, persistence, history, clipboard and room data during AI sessions', async () => {
    const document = Effect.runSync(
      decodeWorkflowDocument({
        ...aiWorkflowFixture,
        nodes: [
          {
            id: 'group',
            label: 'Group',
            position: { x: 0, y: 0 },
            size: { width: 1400, height: 500 },
            selected: true,
          },
          ...aiWorkflowFixture.nodes.map((node) => ({
            ...node,
            selected: true,
            parentId: 'group',
            extent: 'parent',
            rotation: 35,
            data: {
              ...node.data,
              tree: { version: 1, kind: 'node', expanded: true },
            },
          })),
          {
            id: 'shape',
            label: 'Shape',
            type: 'shape',
            position: { x: 30, y: 350 },
            size: { width: 40, height: 40 },
            selected: true,
            data: { type: 'diamond', color: '#ff0071' },
          },
        ],
        edges: aiWorkflowFixture.edges.map((edge) => ({
          ...edge,
          route: {
            mode: 'manual',
            points: [
              { x: 100, y: 100 },
              { x: 200, y: 200 },
            ],
          },
        })),
        bundles: [
          {
            id: 'triggers',
            edgeIds: ['trigger-text', 'trigger-image'],
            ties: [{ x: 100, y: 100 }],
          },
        ],
      })
    )

    const history = createFlowHistory(document)

    const before = {
      document: structuredClone(document),
      history: structuredClone(history),
      saved: flowHistoryDocument(document),
      room: projectFlowRoomDocument(document),
      clipboard: Effect.runSync(copyFlowSelection(document)),
    }

    await collect()
    await collect({ ...identity, kind: 'image', request: imageRequest })
    const service = Effect.runSync(makeLocalWorkflowAiProvider())
    const outputs: object[] = []
    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* integratedExtensions() {
          const run = yield* startWorkflowRun(
            { document, revision: 175 },
            {
              runId: 'extensions-175',
              expectedRevision: 175,
              capabilities: service.capabilities,
              evaluate: createWorkflowAiEvaluator(service),
              onEvent: (event) => {
                if (
                  event.kind === 'node' &&
                  event.event.nodeId === 'image-output' &&
                  event.event.state === 'succeeded'
                ) {
                  outputs.push(event.event.outputs)
                }
              },
            }
          )

          yield* run.await
        })
      )
    )
    expect(outputs).toStrictEqual([
      {
        result: {
          kind: 'image',
          assetId: 'flow-local-green-256',
          mediaType: 'image/png',
          width: 256,
          height: 256,
        },
      },
    ])
    expect({
      document,
      history,
      saved: flowHistoryDocument(document),
      room: projectFlowRoomDocument(document),
      clipboard: Effect.runSync(copyFlowSelection(document)),
    }).toStrictEqual(before)

    const restored = Effect.runSync(
      decodeVersionedFlowDocument(encodeVersionedFlowDocument(document))
    )

    expect(Effect.runSync(decodeWorkflowDocument(restored))).toStrictEqual(
      Effect.runSync(decodeWorkflowDocument(flowHistoryDocument(document)))
    )

    const pasted = pasteFlowGraphFragment(before.clipboard, document, {}, [
      workflowClipboardExtension,
    ])

    const edited = Effect.runSync(
      prepareFlowEdit(document, pasted.transaction)
    ).document

    const accepted = Effect.runSync(decodeWorkflowDocument(edited))
    expect({
      nodes: accepted.nodes.length,
      rotated: accepted.nodes.filter((node) => node.rotation === 35).length,
      bundles: accepted.bundles?.length,
      hasRun: JSON.stringify(accepted).includes('runId'),
      hasPrompt: JSON.stringify(accepted).includes('private-prompt'),
    }).toStrictEqual({
      nodes: 14,
      rotated: 10,
      bundles: 2,
      hasRun: false,
      hasPrompt: false,
    })
  })

  it('records central run and node spans while redacting session diagnostics', async () => {
    const spans: Tracer.NativeSpan[] = []
    const records: unknown[] = []

    const tracer = Tracer.make({
      span(options) {
        const span = new Tracer.NativeSpan(options)
        spans.push(span)

        return span
      },
    })

    const logger = Logger.make((entry) => {
      records.push({ message: entry.message, cause: entry.cause })
    })

    await Effect.runPromise(
      Effect.scoped(
        Effect.gen(function* diagnostics() {
          const session = yield* startWorkflowAiSession(textRun, () => {})
          yield* session.await
        })
      ).pipe(
        Effect.provide(localWorkflowAiLayer({ fail: 'text' })),
        Effect.provide(Logger.layer([logger])),
        Effect.withTracer(tracer)
      )
    )
    expect(spans.map((span) => span.name)).toContain('flow.workflow.ai.decode')
    expect(
      Object.fromEntries(
        spans.find((span) => span.name === FlowSpan.workflowAi)?.attributes ??
          []
      )
    ).toStrictEqual({
      'flow.workflow.run.id': 'test-run',
      'flow.workflow.revision': 7,
      'flow.node.id': 'text-node',
    })
    expect(records).toHaveLength(1)
    expect(JSON.stringify(records)).not.toMatch(
      /private-prompt|private-system|credential-canary/u
    )
  })
})

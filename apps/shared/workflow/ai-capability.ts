import {
  localWorkflowImageAsset,
  reduceWorkflowAiEvent,
  startWorkflowAiSession,
  WorkflowAiIdentitySchema,
  WorkflowAiProvider,
} from '@flow/workflow'
import type { WorkflowAiProviderService, WorkflowAiState } from '@flow/workflow'
import { Effect, Exit, Schema as S, Scope } from 'effect'

/** Unit 6 exercises capability composition. AI graph editing belongs to Unit 7. */
export const mountWorkflowAiCapability = (
  provider: WorkflowAiProviderService
) => {
  document.body.innerHTML = `
    <h1>Offline text and image simulation</h1>
    <p>Deterministic local provider. No credentials or remote services.</p>
    <button id="text">Generate fixture text</button>
    <button id="image">Generate fixture image</button>
    <button id="cancel">Cancel</button>
    <button id="dispose">Dispose</button>
    <p id="status" role="status" aria-label="Capability status">Ready</p>
    <output id="text-output" aria-label="Text output"></output>
    <pre id="events" aria-label="Capability events"></pre>
    <img id="image-output" alt="Local green fixture" hidden />
  `
  const status = document.querySelector('#status')
  const text = document.querySelector('#text-output')
  const events = document.querySelector('#events')
  const image = document.querySelector<HTMLImageElement>('#image-output')
  let scope: Scope.Closeable | undefined
  let generation = 0
  let disposed = false
  let state: WorkflowAiState | undefined
  const chunks: string[] = []

  const close = async () => {
    const previous = scope
    scope = undefined

    if (previous !== undefined) {
      await Effect.runPromise(Scope.close(previous, Exit.void))
    }
  }

  const start = async (kind: 'text' | 'image') => {
    generation += 1
    const token = generation
    await close()

    if (disposed || token !== generation) {
      return
    }

    const identity = S.decodeUnknownSync(WorkflowAiIdentitySchema)({
      runId: `local-${token}`,
      revision: 0,
      nodeId: kind,
    })

    state = { identity, state: 'queued', text: '', image: null, failure: null }
    chunks.length = 0

    if (image !== null) {
      image.hidden = true
    }

    if (text !== null) {
      text.textContent = ''
    }

    if (events !== null) {
      events.textContent = '[]'
    }

    const acquired = Scope.makeUnsafe()
    scope = acquired

    const model =
      kind === 'text'
        ? provider.capabilities.text[0]
        : provider.capabilities.image[0]

    const request =
      kind === 'text'
        ? {
            modelId: model?.modelId,
            temperature: provider.capabilities.text[0]?.temperatures[0],
            system: '',
            prompt: 'A tree',
          }
        : {
            modelId: model?.modelId,
            ...provider.capabilities.image[0]?.sizes[0],
            prompt: 'A quiet tree.',
          }

    await Effect.runPromise(
      startWorkflowAiSession({ ...identity, kind, request }, (event) => {
        if (disposed || generation !== token || state === undefined) {
          return
        }

        state = reduceWorkflowAiEvent(state, event, 0)

        if (status !== null) {
          status.textContent = state.state
        }

        if (text !== null) {
          text.textContent = state.text
        }

        if (event.kind === 'text' && event.event.kind === 'chunk') {
          chunks.push(event.event.text)
        }

        if (events !== null) {
          events.textContent = JSON.stringify(chunks)
        }

        if (
          image !== null &&
          state.image?.assetId === localWorkflowImageAsset.assetId
        ) {
          image.src = localWorkflowImageAsset.dataUrl
          image.width = state.image.width
          image.height = state.image.height
          image.hidden = false
        }
      }).pipe(
        Effect.provideService(WorkflowAiProvider, provider),
        Effect.provideService(Scope.Scope, acquired)
      )
    )
  }

  const bindings = [
    {
      id: '#text',
      action: () => {
        void start('text')
      },
    },
    {
      id: '#image',
      action: () => {
        void start('image')
      },
    },
    {
      id: '#cancel',
      action: () => {
        generation += 1

        if (status !== null) {
          status.textContent = 'cancelled'
        }

        void close()
      },
    },
  ]

  for (const binding of bindings) {
    document
      .querySelector(binding.id)
      ?.addEventListener('click', binding.action)
  }

  const dispose = () => {
    disposed = true
    generation += 1

    for (const binding of bindings) {
      document
        .querySelector(binding.id)
        ?.removeEventListener('click', binding.action)
    }

    document.querySelector('#dispose')?.removeEventListener('click', dispose)
    window.removeEventListener('pagehide', dispose)

    if (image !== null) {
      image.removeAttribute('src')
      image.hidden = true
    }

    if (status !== null) {
      status.textContent = 'Disposed'
    }

    void close()
  }

  document.querySelector('#dispose')?.addEventListener('click', dispose)
  window.addEventListener('pagehide', dispose)
}

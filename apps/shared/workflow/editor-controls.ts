import {
  applyFlowLayoutPositions,
  createFlowLayoutSession,
  defaultFlowLayoutSettings,
  flowLayoutRevision,
  FlowColorModeSchema,
  FlowAttribute,
  FlowSpan,
  resolveFlowColorMode,
} from '@flow/core'
import type {
  FlowColorMode,
  FlowDocument,
  FlowLayoutInput,
  Viewport,
} from '@flow/core'
import { runLayoutEngine } from '@flow/layout'
import { encodeSavedWorkflow } from '@flow/workflow'
import { Effect, Schema as S } from 'effect'

export interface WorkflowEditorOwner {
  readonly layoutInput: () => Promise<{
    readonly document: FlowDocument
    readonly input: FlowLayoutInput
  }>
  readonly fit: (signal: AbortSignal) => Promise<void>
  readonly theme: (mode: FlowColorMode) => void
}

/** Rendering is observable separately from acceptance of a Foldkit port response. */
export const waitWorkflowFrame = (
  ready: () => boolean | Promise<boolean>,
  signal: AbortSignal
): Promise<void> => {
  const { promise, resolve, reject } = Promise.withResolvers<undefined>()
  let frame = 0
  let settled = false
  const deadline = performance.now() + 10_000

  const aborted = () => {
    settled = true
    cancelAnimationFrame(frame)
    reject(new Error('Workflow editor disposed'))
  }

  const finish = (error?: Error) => {
    settled = true
    cancelAnimationFrame(frame)
    signal.removeEventListener('abort', aborted)

    if (error === undefined) {
      resolve(undefined)
    } else {
      reject(error)
    }
  }

  const check = async () => {
    try {
      if (settled) {
        return
      }

      if (signal.aborted) {
        aborted()

        return
      }

      const rendered = await ready()

      if (settled) {
        return
      }

      if (rendered) {
        finish()
      } else if (performance.now() >= deadline) {
        finish(new Error('Workflow render readiness timed out'))
      } else {
        frame = requestAnimationFrame(() => {
          void check()
        })
      }
    } catch (error) {
      finish(
        error instanceof Error ? error : new Error('Workflow render failed')
      )
    }
  }

  signal.addEventListener('abort', aborted, { once: true })
  void check()

  return promise
}

export const waitWorkflowViewport = (
  root: HTMLElement,
  viewport: Viewport,
  signal: AbortSignal
) => {
  const expected = document.createElement('div').style
  expected.transform = `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`

  return waitWorkflowFrame(
    () =>
      root.querySelector<HTMLElement>('.flow-foldkit-viewport')?.style
        .transform === expected.transform,
    signal
  )
}

export const mountWorkflowEditor = (options: {
  readonly owner: WorkflowEditorOwner
  readonly controls: Element
  readonly button: (
    parent: Element,
    label: string,
    action: () => Promise<void> | void
  ) => HTMLButtonElement
  readonly edit: (nodes: FlowDocument['nodes']) => Promise<void>
  readonly refresh: () => Promise<void>
  readonly signal: AbortSignal
}) => {
  const { owner, controls, button, signal } = options
  const session = createFlowLayoutSession()
  let theme: FlowColorMode = 'system'
  const media = matchMedia('(prefers-color-scheme: dark)')
  const label = document.createElement('label')
  label.textContent = 'Theme'
  const select = document.createElement('select')
  select.setAttribute('aria-label', 'Theme')

  for (const mode of ['system', 'light', 'dark']) {
    select.add(new Option(mode, mode))
  }

  label.append(select)
  controls.append(label)

  const setTheme = (mode: FlowColorMode) => {
    theme = mode
    select.value = mode
    owner.theme(mode)
    document.documentElement.dataset.workflowTheme = resolveFlowColorMode(
      mode,
      media.matches
    )
  }

  select.addEventListener(
    'change',
    () => setTheme(S.decodeUnknownSync(FlowColorModeSchema)(select.value)),
    { signal }
  )
  media.addEventListener('change', () => setTheme(theme), { signal })
  setTheme(theme)

  const status = document.createElement('output')
  status.setAttribute('aria-label', 'Layout status')
  controls.append(status)

  button(controls, 'Layout and fit', async () => {
    try {
      status.textContent = 'Waiting for measured nodes'
      let state = await owner.layoutInput()
      await waitWorkflowFrame(async () => {
        state = await owner.layoutInput()

        return state.input.unmeasured.length === 0
      }, signal)

      if (state.input.nodes.length === 0) {
        status.textContent = 'No visible nodes to lay out'

        return
      }

      const revision = flowLayoutRevision(state.document, state.input)
      let current = revision
      let latest = state
      status.textContent = 'ELK layout running'

      const result = await Effect.runPromise(
        session.run(
          {
            revision,
            input: state.input,
            settings: {
              ...defaultFlowLayoutSettings,
              engine: 'elk',
              direction: 'LR',
            },
          },
          (request) =>
            runLayoutEngine(request).pipe(
              Effect.flatMap((output) =>
                Effect.promise(async () => {
                  latest = await owner.layoutInput()
                  current = flowLayoutRevision(latest.document, latest.input)

                  return output
                })
              )
            ),
          () => current
        )
      )

      if (signal.aborted) {
        return
      }

      if (result.kind === 'discarded') {
        status.textContent = 'Layout discarded. The workflow changed.'

        return
      }

      await options.edit(
        applyFlowLayoutPositions(latest.document.nodes, result.result.positions)
      )
      await owner.fit(signal)
      await options.refresh()
      status.textContent = 'ELK layout complete'
    } catch (error) {
      if (!signal.aborted) {
        status.textContent = 'Layout failed'
        Effect.runSync(
          Effect.logWarning('Workflow layout failed').pipe(
            Effect.annotateLogs({
              [FlowAttribute.inputKind]: 'workflow-layout',
            }),
            Effect.withSpan(FlowSpan.editFailure)
          )
        )
      }

      throw error
    }
  })
  button(controls, 'Fit workflow', () => owner.fit(signal))

  const exported = document.createElement('textarea')
  exported.readOnly = true
  exported.setAttribute('aria-label', 'Saved workflow JSON')
  exported.id = 'workflow-export'
  document.querySelector('#accepted')?.after(exported)
  button(controls, 'Export workflow', async () => {
    const { document } = await owner.layoutInput()
    const saved = await Effect.runPromise(encodeSavedWorkflow(document, theme))
    exported.value = JSON.stringify(saved, null, 2)
    exported.focus()
    exported.select()
  })

  signal.addEventListener(
    'abort',
    () => {
      session.dispose()
      exported.remove()
    },
    { once: true }
  )

  return { setTheme }
}

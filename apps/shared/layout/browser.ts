import {
  applyFlowLayoutPositions,
  createFlowLayoutSession,
  defaultFlowForceSettings,
  defaultFlowLayoutSettings,
  flowLayoutInputKey,
  flowLayoutRevision,
  FlowAttribute,
  FlowSpan,
  orientFlowHandles,
} from '@flow/core'
import type {
  FlowDocument,
  FlowEditTransactionInput,
  FlowLayoutInput,
  FlowLayoutSettings,
  FlowNode,
  FlowTransactionContext,
  XYPosition,
} from '@flow/core'
import { createForceSimulation, runLayoutEngine } from '@flow/layout'
import { Effect } from 'effect'

import './controls.css'

export interface LayoutRecipeOwner {
  readonly edit: (transaction: FlowEditTransactionInput) => Promise<void>
  readonly toolbar: HTMLElement
  readonly status: HTMLElement
  readonly read: () => Promise<{
    readonly document: FlowDocument
    readonly input: FlowLayoutInput
  }>
  readonly write: (
    nodes: readonly FlowNode[],
    context?: FlowTransactionContext
  ) => Promise<void>
  readonly subscribe: (listener: () => void) => () => void
  readonly afterLayout: (nodes: readonly FlowNode[]) => Promise<void>
  readonly undo: () => Promise<void>
  readonly redo: () => Promise<void>
  readonly onDispose: (dispose: () => void) => void
}

declare global {
  var flowLayoutRecipe: Pick<LayoutRecipeOwner, 'read' | 'edit'> | undefined
}

const measured = (input: FlowLayoutInput) =>
  input.unmeasured.length === 0 && input.nodes.length > 0

const context = (
  gestureId: string,
  gestureMode: FlowTransactionContext['gestureMode'] = 'continuous'
): FlowTransactionContext => ({
  transactionId: crypto.randomUUID(),
  origin: { kind: 'local', actorId: 'layout-recipe' },
  gestureId,
  gestureMode,
})

const failure = (status: HTMLElement, message: string): void => {
  status.textContent = message
  status.dataset.error = message
  Effect.runSync(
    Effect.logWarning('Layout failed').pipe(
      Effect.annotateLogs({ [FlowAttribute.failureMessage]: message }),
      Effect.withSpan(FlowSpan.editFailure)
    )
  )
}

const select = (
  toolbar: HTMLElement,
  label: string,
  values: readonly string[],
  value: string,
  change: (value: string) => void
) => {
  const wrapper = document.createElement('label')
  wrapper.textContent = label
  const element = document.createElement('select')
  element.setAttribute('aria-label', label)

  for (const item of values) {
    element.add(new Option(item, item))
  }

  element.value = value
  element.addEventListener('change', () => change(element.value))
  wrapper.append(element)
  toolbar.append(wrapper)
}

const number = (
  toolbar: HTMLElement,
  label: string,
  value: number,
  min: number,
  max: number,
  change: (value: number) => void
) => {
  const wrapper = document.createElement('label')
  wrapper.textContent = label
  const element = document.createElement('input')
  element.type = 'number'
  element.min = String(min)
  element.max = String(max)
  element.value = String(value)
  element.setAttribute('aria-label', label)
  element.addEventListener('change', () => change(element.valueAsNumber))
  wrapper.append(element)
  toolbar.append(wrapper)
}

const history = (owner: LayoutRecipeOwner) => {
  for (const [label, action] of [
    ['Undo', owner.undo],
    ['Redo', owner.redo],
  ] as const) {
    const button = document.createElement('button')
    button.type = 'button'
    button.textContent = label
    button.addEventListener('click', () => {
      void action()
    })
    owner.toolbar.append(button)
  }

  const keyboard = (event: KeyboardEvent) => {
    const { target } = event

    if (
      target instanceof HTMLElement &&
      (target.isContentEditable ||
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
    ) {
      return
    }

    if (
      !(event.ctrlKey || event.metaKey) ||
      event.altKey ||
      !['z', 'y'].includes(event.key.toLowerCase())
    ) {
      return
    }

    event.preventDefault()
    event.stopImmediatePropagation()
    void (event.shiftKey || event.key.toLowerCase() === 'y'
      ? owner.redo()
      : owner.undo())
  }

  document.addEventListener('keydown', keyboard, true)
  owner.onDispose(() => document.removeEventListener('keydown', keyboard, true))
}

/** Browser controls own lifecycle; shared session owns request acceptance. */
export const mountLayoutControls = (owner: LayoutRecipeOwner) => {
  globalThis.flowLayoutRecipe = { read: owner.read, edit: owner.edit }
  const session = createFlowLayoutSession()
  let settings = defaultFlowLayoutSettings
  let key = ''
  let acceptedKey = ''
  let sequence = 0
  let disposed = false
  let layouts = 0
  let replaying = false
  owner.status.dataset.engine = settings.engine

  const request = async (force = false): Promise<void> => {
    let ticket = sequence

    try {
      const state = await owner.read()

      if (
        disposed ||
        ticket !== sequence ||
        state.input.unmeasured.length > 0
      ) {
        return
      }

      const next = flowLayoutInputKey(state.input)

      if (replaying) {
        key = next
        replaying = false

        return
      }

      if (!force && key === next) {
        return
      }

      key = next
      sequence += 1
      ticket = sequence
      const chosen = { ...settings }
      const revision = flowLayoutRevision(state.document, state.input)
      let current = revision
      let acceptedDocument = state.document
      owner.status.dataset.pending = chosen.engine

      const accepted = await Effect.runPromise(
        session.run(
          { revision, settings: chosen, input: state.input },
          (input) =>
            runLayoutEngine(input).pipe(
              Effect.flatMap((result) =>
                Effect.promise(async () => {
                  const latest = await owner.read()
                  current = flowLayoutRevision(latest.document, latest.input)
                  acceptedDocument = latest.document

                  return result
                })
              )
            ),
          () => current
        )
      )

      if (accepted.kind === 'discarded' || disposed || ticket !== sequence) {
        if (!disposed && ticket === sequence) {
          owner.status.dataset.pending = ''
        }

        return
      }

      const nodes = orientFlowHandles(
        applyFlowLayoutPositions(
          acceptedDocument.nodes,
          accepted.result.positions
        ),
        chosen.direction
      )

      await owner.write(
        nodes,
        context(
          crypto.randomUUID(),
          !force && layouts > 0 ? 'continuation' : 'continuous'
        )
      )
      await owner.afterLayout(nodes)

      if (disposed || ticket !== sequence) {
        return
      }

      acceptedKey = next
      layouts += 1
      owner.status.dataset.layouts = String(layouts)
      owner.status.dataset.engine = chosen.engine
      owner.status.dataset.direction = chosen.direction
      owner.status.dataset.pending = ''
      owner.status.dataset.error = ''
      owner.status.textContent = `${chosen.engine} ${chosen.direction}`
    } catch (error) {
      if (!disposed && ticket === sequence) {
        owner.status.dataset.pending = ''
        failure(owner.status, String(error))
      }
    }
  }

  const change = (patch: Partial<FlowLayoutSettings>) => {
    settings = { ...settings, ...patch }
    session.cancel()
    void request(true)
  }

  select(
    owner.toolbar,
    'Layout engine',
    ['dagre', 'hierarchy', 'elk'],
    settings.engine,
    (value) => {
      if (value === 'dagre' || value === 'hierarchy' || value === 'elk') {
        change({ engine: value })
      }
    }
  )
  select(
    owner.toolbar,
    'Layout direction',
    ['TB', 'LR'],
    settings.direction,
    (value) => {
      if (value === 'TB' || value === 'LR') {
        change({ direction: value })
      }
    }
  )
  number(owner.toolbar, 'Node spacing', settings.nodeSpacing, 0, 500, (value) =>
    change({ nodeSpacing: value })
  )
  number(owner.toolbar, 'Rank spacing', settings.rankSpacing, 0, 500, (value) =>
    change({ rankSpacing: value })
  )

  const replay = async (action: () => Promise<void>) => {
    replaying = true
    sequence += 1
    session.cancel()
    await action()

    if (disposed) {
      return
    }

    const state = await owner.read()
    key = flowLayoutInputKey(state.input)

    if (key === acceptedKey) {
      owner.status.dataset.error = ''
      owner.status.textContent = `${settings.engine} ${settings.direction}`
    }

    replaying = state.input.unmeasured.length > 0
  }

  history({
    ...owner,
    undo: () => replay(owner.undo),
    redo: () => replay(owner.redo),
  })

  const stop = owner.subscribe(() => {
    void request()
  })

  owner.onDispose(() => {
    disposed = true
    sequence += 1
    session.dispose()
    stop()
  })
  void request()

  return { request }
}

/** One force run is one history gesture, with explicit browser frame ownership. */
export const mountForceControls = (
  owner: LayoutRecipeOwner,
  center: XYPosition
) => {
  globalThis.flowLayoutRecipe = { read: owner.read, edit: owner.edit }
  let simulation: ReturnType<typeof createForceSimulation> | undefined
  let settings = defaultFlowForceSettings
  let gesture = crypto.randomUUID()
  let frame = 0
  let disposed = false
  let dragging = false
  let writing: Promise<void> = Promise.resolve()
  let ticks = 0
  let starting = false
  let epoch = 0
  let continuation = false
  let fitWhenSettled = true

  const report = () => {
    owner.status.dataset.ticks = String(ticks)
    owner.status.dataset.strength = String(settings.strength)
    owner.status.dataset.distance = String(settings.distance)
  }

  const write = async (
    nodes: readonly FlowNode[],
    transactionContext: FlowTransactionContext
  ) => {
    try {
      await owner.write(nodes, transactionContext)
    } catch (error) {
      if (disposed) {
        return
      }

      epoch += 1
      owner.status.dataset.running = 'false'
      failure(owner.status, String(error))
    }
  }

  const step = async (ticket: number) => {
    if (disposed || dragging || ticket !== epoch || simulation === undefined) {
      return
    }

    if (simulation.settled()) {
      const state = await owner.read()

      if (disposed || dragging || ticket !== epoch) {
        return
      }

      if (fitWhenSettled) {
        await owner.afterLayout(state.document.nodes)
      }

      fitWhenSettled = false

      if (!disposed && !dragging && ticket === epoch) {
        owner.status.dataset.running = 'false'
      }

      return
    }

    const positions = simulation.tick()
    const state = await owner.read()

    if (disposed || dragging || ticket !== epoch) {
      return
    }

    writing = write(
      applyFlowLayoutPositions(state.document.nodes, positions),
      context(gesture, continuation ? 'continuation' : 'continuous')
    )
    await writing
    continuation = false

    if (disposed || dragging || ticket !== epoch) {
      return
    }

    ticks += 1
    report()
    frame = requestAnimationFrame(() => {
      void step(ticket)
    })
  }

  const run = () => {
    if (disposed || simulation === undefined) {
      return
    }

    epoch += 1
    const ticket = epoch
    cancelAnimationFrame(frame)
    owner.status.dataset.running = 'true'
    frame = requestAnimationFrame(() => {
      void step(ticket)
    })
  }

  const update = async (patch: Partial<typeof settings>) => {
    epoch += 1
    cancelAnimationFrame(frame)
    await writing

    if (disposed || simulation === undefined) {
      return
    }

    try {
      settings = Effect.runSync(simulation.configure({ ...settings, ...patch }))
      gesture = crypto.randomUUID()
      continuation = false
      fitWhenSettled = true
      owner.status.dataset.error = ''
      report()
      run()
    } catch (error) {
      failure(owner.status, String(error))
      run()
    }
  }

  number(
    owner.toolbar,
    'Force strength',
    settings.strength,
    -2000,
    0,
    (strength) => {
      void update({ strength })
    }
  )
  number(
    owner.toolbar,
    'Link distance',
    settings.distance,
    20,
    400,
    (distance) => {
      void update({ distance })
    }
  )

  const replay = async (action: () => Promise<void>) => {
    epoch += 1
    cancelAnimationFrame(frame)
    owner.status.dataset.running = 'false'
    await writing
    await action()

    if (disposed) {
      return
    }

    const state = await owner.read()
    simulation?.restore(state.document)
  }

  history({
    ...owner,
    undo: () => replay(owner.undo),
    redo: () => replay(owner.redo),
  })

  const start = async () => {
    if (starting || simulation !== undefined || disposed) {
      return
    }

    starting = true
    const state = await owner.read()
    starting = false

    if (disposed || simulation !== undefined || !measured(state.input)) {
      return
    }

    simulation = createForceSimulation(state.input, state.document, center)
    Effect.runSync(simulation.configure(settings))
    run()
  }

  owner.status.dataset.running = 'false'
  report()

  const stop = owner.subscribe(() => {
    void start()
  })

  owner.onDispose(() => {
    disposed = true
    cancelAnimationFrame(frame)
    simulation?.dispose()
    stop()
    owner.status.dataset.running = 'false'
  })
  void start()

  return {
    pause: () => {
      dragging = true
      epoch += 1
      cancelAnimationFrame(frame)
    },
    drop: async (
      drops: readonly {
        readonly nodeId: string
        readonly position: XYPosition
      }[]
    ) => {
      await writing

      if (disposed) {
        return
      }

      for (const drop of drops) {
        simulation?.pin(drop.nodeId, drop.position)
        owner.status.dataset.pinned = `${drop.nodeId}@${Math.round(drop.position.x)},${Math.round(drop.position.y)}`
      }

      gesture = crypto.randomUUID()
      continuation = drops.length > 0
      fitWhenSettled = false
      dragging = false
      run()
    },
  }
}

import { decodeFlowDocument, FlowEditDisposedSchema } from '@flow/core'
import type { FlowDocument } from '@flow/core'
import {
  createFoldkitNodeMeasurementObserver,
  createFoldkitSnapshotClient,
  createProgram,
  defaultInteractionOptions,
  HostAction,
} from '@flow/foldkit'
import type { EditResponse, ports } from '@flow/foldkit'
import { Effect, Exit, Option, Schema as S } from 'effect'
import { Runtime } from 'foldkit'

import { sceneDefinition, SceneNameSchema } from './scenes.ts'
import type { RecipeState } from './scenes.ts'

import '@flow/foldkit/style.css'
import './edge-recipes.css'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing edge recipes root')
}

const scene = Option.getOrElse(
  S.decodeUnknownOption(SceneNameSchema)(
    new URLSearchParams(globalThis.location.search).get('scene')
  ),
  () => 'button-edge' as const
)

root.innerHTML =
  '<main class="edge-recipes-page"><div class="edge-recipes-toolbar"><output data-testid="recipe-status" aria-live="polite"></output></div><div class="edge-recipes-frame"><div data-runtime></div></div></main>'

const page = root.querySelector<HTMLElement>('.edge-recipes-page')

const toolbar = root.querySelector<HTMLElement>('.edge-recipes-toolbar')

const frame = root.querySelector<HTMLElement>('.edge-recipes-frame')

const canvas = root.querySelector<HTMLElement>('[data-runtime]')

const status = root.querySelector<HTMLOutputElement>('output')

if (
  page === null ||
  toolbar === null ||
  frame === null ||
  canvas === null ||
  status === null
) {
  throw new Error('Missing edge recipes elements')
}

page.dataset.scene = scene

canvas.id = 'flow-foldkit-edge-recipes-runtime'

const state: RecipeState = { selected: new Set(), handleCenters: new Map() }

const reducedMotionQuery = globalThis.matchMedia(
  '(prefers-reduced-motion: reduce)'
)

const definition = sceneDefinition(scene, state, {
  reducedMotion: reducedMotionQuery.matches,
  markerScope: `edge-recipes-${crypto.randomUUID().slice(0, 8)}`,
})

const initialDocument = Effect.runSync(decodeFlowDocument(definition.document))

const runtime = Runtime.embed<typeof ports, never, 'Element'>(
  createProgram(
    canvas,
    initialDocument,
    { x: 0, y: 0, zoom: 1 },
    definition.allowedTargets,
    'uncontrolled',
    'uncontrolled',
    definition.registry,
    undefined,
    'full',
    definition.defaultEdgeOptions === undefined
      ? defaultInteractionOptions
      : {
          ...defaultInteractionOptions,
          defaultEdgeOptions: definition.defaultEdgeOptions,
        }
  )
)

const send = (sent: Exit.Exit<unknown, unknown>): void => {
  if (Exit.isFailure(sent)) {
    throw new Error('Foldkit rejected an edge recipe action')
  }
}

let current: FlowDocument = initialDocument

let requestNumber = 0

const pending = new Map<string, (response: EditResponse) => void>()

const snapshots = createFoldkitSnapshotClient(runtime.ports)

const render = (document: FlowDocument): void => {
  current = document
  status.value = `edges:${document.edges.map(({ id }) => id).join(',')}`
  state.selected.clear()

  for (const flowNode of document.nodes) {
    if (flowNode.selected === true) {
      state.selected.add(flowNode.id)
    }
  }
}

render(initialDocument)

type EditOperations = Parameters<
  typeof runtime.ports.editRequests.send
>[0]['transaction']['operations']

const edit = (operations: EditOperations): void => {
  requestNumber += 1
  const requestId = `edge-recipes-${requestNumber}`
  pending.set(requestId, (response) => {
    if ('error' in response) {
      status.dataset.error = response.error._tag
    }
  })
  send(
    runtime.ports.editRequests.send({ requestId, transaction: { operations } })
  )
}

/** Absolute handle centers from the public internal-node snapshot. */
const refreshHandleCenters = async (): Promise<void> => {
  if (scene !== 'multi-connection-line') {
    return
  }

  const results = await Promise.all(
    current.nodes.map((flowNode) =>
      snapshots.requestVersioned({ nodeId: flowNode.id })
    )
  )

  for (const result of results) {
    const internal =
      result.status === 'succeeded' ? result.response.internalNode : null

    if (internal === null || internal.measurementStatus !== 'measured') {
      continue
    }

    for (const handle of internal.handles) {
      state.handleCenters.set(`${handle.nodeId}:${handle.handleId}`, {
        x: internal.absolutePosition.x + handle.offset.x,
        y: internal.absolutePosition.y + handle.offset.y,
      })
    }
  }

  status.dataset.handles = [...state.handleCenters.keys()].toSorted().join(',')
}

const stops = [
  runtime.ports.editResults.subscribe((response) => {
    pending.get(response.requestId)?.(response)
    pending.delete(response.requestId)
  }),
  runtime.ports.acceptedStates.subscribe((change) => {
    render(Effect.runSync(decodeFlowDocument(change.current.document)))
    void refreshHandleCenters()
  }),
]

// Report measured node and handle geometry; Foldkit renders from the measurements.
const measurement = createFoldkitNodeMeasurementObserver({
  owner: frame,
  zoom: () => 1,
  onMeasure: (requests) =>
    send(runtime.ports.actions.send(HostAction.MeasureNodes({ requests }))),
})

stops.push(
  runtime.ports.measurementResults.subscribe(() => {
    void refreshHandleCenters()
  })
)

// Edge with Button: the button lives in the edge label layer and deletes its edge.
root.addEventListener('click', (event) => {
  const button =
    event.target instanceof Element
      ? event.target.closest<HTMLElement>('[data-testid="button-edge-delete"]')
      : null

  const edgeId = button?.dataset.edgeId

  if (edgeId !== undefined) {
    edit([{ kind: 'delete-elements', edgeIds: [edgeId] }])
  }
})

if (scene === 'data-edge') {
  const update = document.createElement('button')
  update.type = 'button'
  update.dataset.testid = 'update-node-data'
  update.textContent = 'Set node a to beta'
  update.addEventListener('click', () =>
    edit([{ kind: 'update-node-data', nodeId: 'a', data: { value: 'beta' } }])
  )
  toolbar.prepend(update)
}

if (scene === 'animated-svg-edge') {
  // Mirror the motion preference into edge data so the edge re-renders.
  reducedMotionQuery.addEventListener('change', (event) =>
    edit([
      {
        kind: 'update-edge-data',
        edgeId: 'e-ab',
        data: { reducedMotion: event.matches },
      },
    ])
  )
}

if (scene === 'multi-connection-line') {
  // One drop connects every selected node, like React's Multi Connection Line.
  stops.push(
    runtime.ports.changes.subscribe((change) => {
      if (
        change.kind !== 'edge-add' ||
        !state.selected.has(change.edge.source)
      ) {
        return
      }

      const { edge } = change

      const extra = [...state.selected].flatMap((id) => {
        if (
          id === edge.source ||
          current.edges.some(
            (existing) =>
              existing.source === id && existing.target === edge.target
          )
        ) {
          return []
        }

        return [
          {
            id: `e-${id}-${edge.target}`,
            source: id,
            sourceHandle: edge.sourceHandle ?? 'out',
            target: edge.target,
            targetHandle: edge.targetHandle ?? 'in',
          },
        ]
      })

      if (extra.length > 0) {
        edit([{ kind: 'add-edges', edges: extra }])
      }
    })
  )
}

globalThis.addEventListener(
  'pagehide',
  () => {
    measurement.dispose()
    snapshots.dispose()

    for (const stop of stops) {
      stop()
    }

    for (const [requestId, resolve] of pending) {
      resolve({ requestId, error: FlowEditDisposedSchema.make({}) })
    }

    pending.clear()
    runtime.dispose()
  },
  { once: true }
)

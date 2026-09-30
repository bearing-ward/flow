import { decodeFlowDocument } from '@flow/core'
import type { FlowDocument } from '@flow/core'
import {
  createFoldkitBaseNode,
  createFoldkitBaseHandle,
  createFoldkitStatusIndicator,
  createFoldkitLabeledHandle,
  createFoldkitDatabaseSchema,
  createFoldkitControlButton,
  createFoldkitTooltip,
  createFoldkitAppendix,
  createFoldkitPlaceholder,
  createFoldkitNodeMeasurementObserver,
  createProgram,
  createFoldkitSnapshotClient,
  HostAction,
} from '@flow/foldkit'
import type {
  FoldkitNodeMeasurementObserver,
  FoldkitSnapshotClient,
  FoldkitSnapshotResult,
  ports,
} from '@flow/foldkit'
import { Effect, Exit } from 'effect'

import '@flow/foldkit/style.css'
import { Runtime } from 'foldkit'

declare global {
  interface Window {
    __flowFoldkitConsumer?: {
      readonly fit: () => Promise<string>
      readonly edit: () => Promise<string>
      readonly mountSecond: () => void
      readonly measure: () => Promise<string>
      readonly snapshot: (
        owner: 'first' | 'second'
      ) => Promise<FoldkitSnapshotResult>
      readonly dispose: () => void
    }
  }
}

const graphDocument: FlowDocument = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'foldkit-a',
        label: 'Foldkit A',
        type: 'consumer-node',
        position: { x: 40, y: 50 },
        data: { status: 'waiting' },
        handles: [{ id: 'out', kind: 'source', side: 'right' }],
      },
      {
        id: 'foldkit-b',
        label: 'Foldkit B',
        type: 'consumer-node',
        position: { x: 320, y: 120 },
        data: { status: 'independent' },
        handles: [{ id: 'in', kind: 'target', side: 'left' }],
      },
    ],
    edges: [],
  })
)

const rendererRegistry: Parameters<typeof createProgram>[6] = {
  nodeTypes: {
    'consumer-node': (node, h) =>
      createFoldkitBaseNode(
        node.label,
        h,
        h.div(
          [],
          [
            createFoldkitStatusIndicator('ready', h, 'Packed status'),
            createFoldkitDatabaseSchema(
              {
                name: 'users',
                fields: [
                  {
                    id: 'id',
                    name: 'id',
                    type: 'uuid',
                    kind: 'source',
                    side: 'right',
                  },
                ],
              },
              h
            ),
            ...(node.handles ?? []).flatMap((handle) => [
              createFoldkitBaseHandle({ handle, label: 'Packed handle' }, h),
              createFoldkitLabeledHandle(
                { id: handle.id, side: handle.side, label: 'Packed output' },
                h
              ),
            ]),
            h.output(
              [h.DataAttribute('status', node.id)],
              [String(node.data?.['status'] ?? '')]
            ),
          ]
        )
      ),
  },
}

const root = document.querySelector<HTMLElement>('#root')

if (root === null) {
  throw new Error('Missing Foldkit consumer root')
}

root.innerHTML =
  '<output data-accepted-state></output><div id="first" style="width:640px;height:420px"></div><div id="second" style="width:420px;height:300px"></div>'

const first = root.querySelector<HTMLElement>('#first')

const second = root.querySelector<HTMLElement>('#second')

if (first === null || second === null) {
  throw new Error('Missing Foldkit instance roots')
}

const acceptedState = document.querySelector<HTMLOutputElement>(
  '[data-accepted-state]'
)

if (acceptedState === null) {
  throw new Error('Missing accepted state output')
}

const runtimeA = Runtime.embed<typeof ports, never, 'Element'>(
  createProgram(
    first,
    graphDocument,
    { x: 0, y: 0, zoom: 1 },
    [],
    'uncontrolled',
    'uncontrolled',
    rendererRegistry
  )
)

const snapshotClientA = createFoldkitSnapshotClient(runtimeA.ports)

let snapshotClientB: FoldkitSnapshotClient | undefined

let runtimeB:
  | ReturnType<typeof Runtime.embed<typeof ports, never, 'Element'>>
  | undefined

let measurementObserver: FoldkitNodeMeasurementObserver | undefined

const mountSecondRuntime = (): void => {
  runtimeB = Runtime.embed<typeof ports, never, 'Element'>(
    createProgram(
      second,
      graphDocument,
      { x: 0, y: 0, zoom: 1 },
      [],
      'uncontrolled',
      'uncontrolled',
      rendererRegistry
    )
  )
  snapshotClientB = createFoldkitSnapshotClient(runtimeB.ports)
  acceptedState.dataset['secondRuntime'] = 'started'
  runtimeB.ports.interactionEvents.subscribe((event) => {
    acceptedState.dataset['secondRuntimeEvent'] = event[0]?.name ?? 'empty'
  })
  runtimeB.ports.acceptedStates.subscribe((state) => {
    acceptedState.dataset['secondRuntimeState'] = state.cause
  })
}

runtimeA.ports.acceptedStates.subscribe((state) => {
  acceptedState.dataset['change'] = state.cause
})

let requestNumber = 0

const requestViewport = (kind: 'fitView'): Promise<string> => {
  requestNumber += 1
  const requestId = `consumer-viewport-${requestNumber}`
  const { promise, resolve, reject } = Promise.withResolvers<string>()

  const stop = runtimeA.ports.viewportResults.subscribe((response) => {
    if (response.requestId === requestId) {
      stop()
      resolve(response.status)
    }
  })

  const sent = runtimeA.ports.viewportRequests.send({
    requestId,
    kind,
    width: 640,
    height: 420,
    originX: 0,
    originY: 0,
  })

  if (Exit.isFailure(sent)) {
    stop()
    reject(new Error('Foldkit consumer rejected viewport request'))
  }

  return promise
}

const edit = (): Promise<string> => {
  requestNumber += 1
  const requestId = `consumer-edit-${requestNumber}`
  const { promise, resolve, reject } = Promise.withResolvers<string>()

  const stop = runtimeA.ports.editResults.subscribe((response) => {
    if (response.requestId === requestId) {
      stop()
      resolve(
        'result' in response
          ? String(
              response.result.document.nodes.find(
                (node) => node.id === 'foldkit-a'
              )?.data?.['status'] ?? 'missing'
            )
          : response.error._tag
      )
    }
  })

  const sent = runtimeA.ports.editRequests.send({
    requestId,
    transaction: {
      operations: [
        {
          kind: 'update-node-data',
          nodeId: 'foldkit-a',
          data: { status: 'packed-ready' },
          replace: true,
        },
      ],
    },
  })

  if (Exit.isFailure(sent)) {
    stop()
    reject(new Error('Foldkit consumer rejected edit request'))
  }

  return promise
}

const measure = (): Promise<string> => {
  const canvas = document.querySelector<HTMLElement>(
    '.flow-foldkit-canvas[data-flow-instance]'
  )

  const node = canvas?.querySelector<HTMLElement>('[data-node-id="foldkit-a"]')

  if (
    canvas === null ||
    canvas === undefined ||
    node === null ||
    node === undefined
  ) {
    return Promise.reject(
      new Error('Foldkit consumer cannot find the rendered node to measure')
    )
  }

  measurementObserver = createFoldkitNodeMeasurementObserver({
    owner: canvas,
    selector: '[data-node-id="foldkit-a"]',
    onMeasure: ({ requestId, measurement }) => {
      const sent = runtimeA.ports.actions.send(
        HostAction.MeasureNode({ requestId, measurement })
      )

      if (Exit.isFailure(sent)) {
        throw new Error('Foldkit consumer rejected node measurement')
      }
    },
  })
  const requestId = 'packed-measurement'

  const { promise, resolve, reject } = Promise.withResolvers<string>()

  const stop = runtimeA.ports.measurementResults.subscribe((result) => {
    if (result.requestId !== requestId) {
      return
    }

    stop()
    resolve(
      `${result.status}:${result.nodeId}:${result.internalNode?.width ?? 0}:${result.internalNode?.height ?? 0}`
    )
  })

  const timeout = window.setTimeout(() => {
    stop()
    reject(new Error('Foldkit consumer measurement timed out'))
  }, 5000)

  measurementObserver?.measure(node, requestId)

  return promise.finally(() => window.clearTimeout(timeout))
}

const uiHost = document.createElement('section')

uiHost.dataset.packedUi = ''

uiHost.style.cssText = 'position:relative;z-index:2;background:white'

const action = createFoldkitControlButton(document, {
  type: 'button',
  name: 'packed-action',
  value: 'refresh',
  aria: { 'aria-label': 'Packed action' },
  children: [document.createTextNode('Refresh')],
  onClick: () => {
    uiHost.dataset.activated = 'true'
  },
})

action.dataset.packedAction = ''

const placeholder = createFoldkitPlaceholder(document, {
  label: 'Add table',
  onActivate: () => {
    uiHost.dataset.added = 'true'
  },
})

placeholder.dataset.packedPlaceholder = ''

uiHost.append(action, placeholder)

document.body.append(uiHost)

const appendix = createFoldkitAppendix(uiHost, {
  id: 'packed-details',
  title: 'Details',
  content: 'Packed details',
})

const tooltip = createFoldkitTooltip(action, 'Packed tooltip')

window.__flowFoldkitConsumer = {
  fit: () => requestViewport('fitView'),
  edit,
  mountSecond: mountSecondRuntime,
  measure,
  snapshot: (owner) => {
    if (owner === 'first') {
      return snapshotClientA.request()
    }

    if (snapshotClientB === undefined) {
      throw new Error('Second snapshot owner is not mounted')
    }

    return snapshotClientB.request()
  },
  dispose: () => {
    snapshotClientA.dispose()
    snapshotClientB?.dispose()
    tooltip.destroy()
    appendix.destroy()
    uiHost.remove()
    measurementObserver?.dispose()
    runtimeA.dispose()
    runtimeB?.dispose()
  },
}

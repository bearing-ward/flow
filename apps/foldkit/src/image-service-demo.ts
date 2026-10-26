import { flowFigureNodeType, FlowStateChangeSchema } from '@flow/core'
import {
  createProgram,
  createFoldkitImageExportRequest,
  createFoldkitFlowInstance,
  createFoldkitHistoryClient,
  createFoldkitNodeMeasurementObserver,
  defaultInteractionOptions,
  foldkitFigureNodeRenderer,
  HostAction,
} from '@flow/foldkit'
import { Schema } from 'effect'
import { Runtime } from 'foldkit'

import { installImageHost } from '../../shared/image-service/bridge.ts'

import '@flow/foldkit/style.css'

await installImageHost('foldkit', (root, prepared) => {
  const container = document.createElement('div')
  container.id = 'image-capture-runtime'
  root.append(container)

  const runtime = Runtime.embed(
    createProgram(
      container,
      prepared.document,
      prepared.viewport,
      [],
      'uncontrolled',
      'uncontrolled',
      {
        nodeTypes: {
          [flowFigureNodeType]: foldkitFigureNodeRenderer,
          'export-card': (node, h) =>
            h.div(
              [h.Class('export-card')],
              [
                h.img([
                  h.Src('/image-service/assets/flow-mark.svg'),
                  h.Attribute('alt', ''),
                ]),
                h.div(
                  [],
                  [
                    h.strong([], [node.label]),
                    h.small([], [String(node.data?.detail ?? '')]),
                  ]
                ),
              ]
            ),
        },
      },
      { minZoom: 0.01, maxZoom: 10 },
      'full',
      { ...defaultInteractionOptions, autoPanOnNodeFocus: false }
    )
  )

  const instance = createFoldkitFlowInstance(runtime.ports)
  const history = createFoldkitHistoryClient(runtime.ports)

  const observer = createFoldkitNodeMeasurementObserver({
    owner: root,
    zoom: () => prepared.viewport.zoom,
    onMeasure: (requests) =>
      runtime.ports.actions.send(HostAction.MeasureNodes({ requests })),
  })

  runtime.ports.actions.send(
    HostAction.SetEdgeRouting({ result: prepared.request.scene.edgeRouting })
  )

  return Promise.resolve({
    exportRequest: (options) =>
      createFoldkitImageExportRequest(instance, options),
    routing: (result) => {
      runtime.ports.actions.send(HostAction.SetEdgeRouting({ result }))
    },
    subscribe: (listener) =>
      runtime.ports.acceptedStates.subscribe((input) =>
        listener(
          Schema.decodeUnknownSync(FlowStateChangeSchema)(input).current
            .document
        )
      ),
    document: () =>
      instance
        .toObject()
        .then(({ viewport: _viewport, ...document }) => document),
    internals: instance.getInternalNodes,
    refresh: () => {
      for (const element of root.querySelectorAll(
        '[data-testid="flow-node"]'
      )) {
        observer.measure(element)
      }

      return Promise.resolve()
    },
    edit: async (transaction) => {
      await instance.applyEdit(transaction.operations)
    },
    history: history.getStatus,
    undo: history.undo,
    redo: history.redo,
    dispose: () => {
      observer.dispose()
      history.dispose()
      instance.dispose()
      runtime.dispose()
    },
  })
})

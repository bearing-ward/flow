import '@flow/foldkit/style.css'
import { decodeFlowDocument } from '@flow/core'
import {
  createProgram,
  flowEdgeText,
  HostAction,
  defaultInteractionOptions,
  createFoldkitNodeMeasurementObserver,
  createFoldkitInteractionHandlers,
} from '@flow/foldkit'
import { Effect } from 'effect'
import { Runtime } from 'foldkit'

import {
  edgeStackingInput,
  edgeStackingOptions,
} from '../../shared-e2e/edge-stacking-fixture.ts'

export const mountEdgeStackingFixture = (
  root: HTMLElement,
  panOnDrag: boolean
) => {
  const clicks: string[] = []
  const container = document.createElement('div')
  container.id = 'edge-stacking-fixture'
  root.replaceChildren(container)

  const runtime = Runtime.embed(
    createProgram(
      container,
      Effect.runSync(decodeFlowDocument(edgeStackingInput)),
      { x: 0, y: 0, zoom: 1 },
      [],
      'uncontrolled',
      'uncontrolled',
      {
        edgeTypes: {
          portal: (_edge, _geometry, h, labels) => {
            labels(
              h.div(
                [
                  h.DataAttribute('testid', 'default-portal-label'),
                  h.Style({ position: 'absolute', left: '40px', top: '400px' }),
                ],
                ['Portal label']
              )
            )

            return flowEdgeText(h, {
              x: 350,
              y: 400,
              label: 'SVG built-in label',
            })
          },
        },
      },
      undefined,
      'full',
      {
        ...defaultInteractionOptions,
        ...edgeStackingOptions,
        panOnDrag,
        selectionOnDrag: !panOnDrag,
      }
    )
  )

  createFoldkitNodeMeasurementObserver({
    owner: root,
    zoom: () => 1,
    onMeasure: (requests) => {
      runtime.ports.actions.send(HostAction.MeasureNodes({ requests }))
    },
  })
  createFoldkitInteractionHandlers(runtime.ports).set({
    onEdgeClick: ({ edgeId }) => clicks.push(edgeId ?? ''),
  })
  window.__flowEdgeStacking = {
    edgeClicks: () => clicks,
    coverEdge: (selected) => {
      runtime.ports.actions.send(
        HostAction.ReplaceDocument({
          document: Effect.runSync(
            decodeFlowDocument({
              ...edgeStackingInput,
              edges: edgeStackingInput.edges.map((edge) => ({
                ...edge,
                selected: edge.id === 'edge' && selected,
              })),
            })
          ),
        })
      )
    },
  }
}

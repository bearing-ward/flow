import { decodeFlowDocument } from '@flow/core'
import type { FlowEdge, Viewport } from '@flow/core'
import {
  HostAction,
  createFoldkitNodeMeasurementObserver,
  createProgram,
  defaultInteractionOptions,
  flowBaseEdge,
  flowEdgeText,
} from '@flow/foldkit'
import { Effect, Exit, Schema as S } from 'effect'
import { Runtime } from 'foldkit'

const LabelDataSchema = S.Struct({
  label: S.String,
  labelX: S.Finite,
  labelY: S.Finite,
})

const labelData = (edge: FlowEdge) =>
  S.decodeUnknownSync(LabelDataSchema)(edge.data)

const documentInput = (label: string) => ({
  nodes: [
    {
      id: 'a',
      label: 'A',
      position: { x: 40, y: 60 },
      handles: [{ id: 'out', kind: 'source', side: 'right' }],
    },
    {
      id: 'b',
      label: 'B',
      position: { x: 460, y: 260 },
      handles: [{ id: 'in', kind: 'target', side: 'left' }],
    },
  ],
  edges: [
    {
      id: 'labeled',
      type: 'labeled',
      source: 'a',
      sourceHandle: 'out',
      target: 'b',
      targetHandle: 'in',
      data: { label, labelX: 300, labelY: 160 },
    },
    {
      id: 'plain',
      type: 'plain',
      source: 'a',
      sourceHandle: 'out',
      target: 'b',
      targetHandle: 'in',
      data: { label: 'Plain', labelX: 200, labelY: 300 },
    },
    {
      id: 'text',
      type: 'text',
      source: 'a',
      sourceHandle: 'out',
      target: 'b',
      targetHandle: 'in',
      data: { label: 'Standalone', labelX: 500, labelY: 120 },
    },
  ],
})

export interface FoldkitBaseEdgeFixture {
  readonly setViewport: (viewport: Viewport) => void
  readonly setLabel: (label: string) => void
}

const send = (sent: Exit.Exit<unknown, unknown>): void => {
  if (Exit.isFailure(sent)) {
    throw new Error('Foldkit rejected a fixture action')
  }
}

export const mountFoldkitBaseEdgeFixture = (
  container: HTMLElement
): FoldkitBaseEdgeFixture => {
  let zoom = 1

  const active = Runtime.embed(
    createProgram(
      container,
      Effect.runSync(decodeFlowDocument(documentInput('Approve'))),
      { x: 0, y: 0, zoom: 1 },
      [],
      'uncontrolled',
      'uncontrolled',
      {
        edgeTypes: {
          labeled: (edge, geometry, h) =>
            flowBaseEdge(h, {
              path: geometry.path,
              ...labelData(edge),
              className: 'fixture-base-edge',
              markerEnd: 'url(#fixture-marker)',
              attributes: {
                'data-testid': 'base-edge-labeled',
                stroke: '#0f766e',
              },
            }),
          plain: (edge, geometry, h) =>
            flowBaseEdge(h, {
              path: geometry.path,
              ...labelData(edge),
              labelShowBg: false,
              interactionWidth: 0,
              attributes: { 'data-testid': 'base-edge-plain' },
            }),
          text: (edge, _geometry, h) => {
            const data = labelData(edge)

            return (
              flowEdgeText(
                h,
                {
                  x: data.labelX,
                  y: data.labelY,
                  label: data.label,
                  labelBgPadding: [6, 3],
                  labelBgBorderRadius: 5,
                  className: 'standalone-edge-text',
                },
                [
                  h.circle([
                    h.R('3'),
                    h.DataAttribute('testid', 'edge-text-child'),
                  ]),
                ]
              ) ?? h.g([], [])
            )
          },
        },
      },
      undefined,
      'full',
      defaultInteractionOptions
    )
  )

  createFoldkitNodeMeasurementObserver({
    owner: container,
    zoom: () => zoom,
    onMeasure: (requests) =>
      send(active.ports.actions.send(HostAction.MeasureNodes({ requests }))),
  })

  return {
    setViewport: (viewport) => {
      ;({ zoom } = viewport)
      send(active.ports.actions.send(HostAction.ReplaceViewport({ viewport })))
    },
    setLabel: (label) =>
      send(
        active.ports.actions.send(
          HostAction.ReplaceDocument({
            document: Effect.runSync(decodeFlowDocument(documentInput(label))),
          })
        )
      ),
  }
}

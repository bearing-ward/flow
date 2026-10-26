import {
  decodeFlowDocument,
  flowNodeHandles,
  inferHandleMeasurement,
  FlowImageExportRequestSchema,
} from '@flow/core'
import type { FlowImageExportRequest, FlowDocument } from '@flow/core'
import { Effect, Schema } from 'effect'

export const imageServiceDocument = (): FlowDocument =>
  Effect.runSync(
    decodeFlowDocument({
      nodes: [
        {
          id: 'group',
          type: 'group',
          label: 'Design group',
          position: { x: 30, y: 30 },
          size: { width: 260, height: 210 },
          handles: [],
        },
        {
          id: 'card',
          type: 'export-card',
          label: 'Chromium capture',
          parentId: 'group',
          position: { x: 25, y: 65 },
          size: { width: 205, height: 90 },
          handles: [{ id: 'out', kind: 'source', side: 'right' }],
          data: { detail: 'Real host renderer', opaque: { keep: 165 } },
        },
        {
          id: 'shape',
          type: 'shape',
          label: 'Shape',
          position: { x: 480, y: 50 },
          size: { width: 150, height: 110 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
          data: { type: 'hexagon', color: '#00b884' },
        },
        {
          id: 'source',
          label: 'Wire source',
          position: { x: 65, y: 325 },
          size: { width: 170, height: 65 },
          handles: [{ id: 'out', kind: 'source', side: 'right' }],
        },
        {
          id: 'target',
          label: 'Wire target',
          position: { x: 480, y: 320 },
          size: { width: 170, height: 65 },
          handles: [{ id: 'in', kind: 'target', side: 'left' }],
          data: { tree: { version: 1, kind: 'node', expanded: false } },
        },
        {
          id: 'collapsed',
          label: 'Collapsed child',
          position: { x: 900, y: 500 },
          size: { width: 150, height: 70 },
          data: { tree: { version: 1, kind: 'node', expanded: true } },
        },
        {
          id: 'hidden',
          label: 'Must stay hidden',
          hidden: true,
          position: { x: -1000, y: -1000 },
          size: { width: 150, height: 60 },
        },
      ],
      edges: [
        {
          id: 'manual',
          source: 'card',
          target: 'shape',
          sourceHandle: 'out',
          targetHandle: 'in',
          label: 'Manual route',
          stroke: '#e11d48',
          strokeWidth: 3,
          route: {
            mode: 'manual',
            points: [
              { x: 335, y: 140 },
              { x: 335, y: 105 },
            ],
          },
        },
        {
          id: 'wire-a',
          source: 'card',
          target: 'target',
          sourceHandle: 'out',
          targetHandle: 'in',
          stroke: '#7c3aed',
          strokeWidth: 3,
        },
        {
          id: 'wire-b',
          source: 'source',
          target: 'target',
          sourceHandle: 'out',
          targetHandle: 'in',
          stroke: '#0284c7',
          strokeWidth: 3,
        },
        { id: 'tree', source: 'target', target: 'collapsed' },
        { id: 'hidden-edge', source: 'source', target: 'hidden' },
      ],
      bundles: [
        {
          id: 'bundle',
          edgeIds: ['wire-a', 'wire-b'],
          ties: [
            { x: 340, y: 240 },
            { x: 410, y: 280 },
          ],
        },
      ],
    })
  )

export const imageServiceRequest = (
  host: FlowImageExportRequest['host'],
  document = imageServiceDocument(),
  revision = 'initial'
): FlowImageExportRequest =>
  Schema.decodeUnknownSync(FlowImageExportRequestSchema)({
    version: 1,
    host,
    revision,
    width: 800,
    height: 500,
    framing: { kind: 'fit', padding: 0.1 },
    assets: ['flow-mark.svg'],
    scene: {
      document,
      edgeRouting: null,
      measurements: document.nodes.map((node) => {
        const dimensions = node.size ?? { width: 150, height: 44 }

        return {
          nodeId: node.id,
          ...dimensions,
          handles: flowNodeHandles(node).map((handle) =>
            inferHandleMeasurement(node.id, handle, dimensions)
          ),
        }
      }),
    },
  })

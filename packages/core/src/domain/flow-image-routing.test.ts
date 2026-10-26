import { Effect, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  getEdgesGeometry,
  flowMeasurementsFromInternalNodes,
} from './flow-edge-geometry.ts'
import { prepareFlowImageExport } from './flow-image-export.ts'
import { getFlowImageCaptureRouting } from './flow-image-routing.ts'
import { FlowInternalNodeSchema } from './flow-measurement.schema.ts'
import { flowRoutingRevision } from './flow-routing-geometry.ts'

const fixture = async () => {
  const initial = await Effect.runPromise(
    prepareFlowImageExport({
      version: 1,
      host: 'vanilla',
      revision: 'route-1',
      width: 800,
      height: 500,
      framing: { kind: 'viewport', x: 0, y: 0, zoom: 1 },
      assets: [],
      scene: {
        document: {
          nodes: [
            {
              id: 'a',
              label: 'A',
              position: { x: 0, y: 0 },
              size: { width: 100, height: 50 },
              handles: [{ id: 'out', kind: 'source', side: 'right' }],
            },
            {
              id: 'b',
              label: 'B',
              position: { x: 300, y: 0 },
              size: { width: 100, height: 50 },
              handles: [{ id: 'in', kind: 'target', side: 'left' }],
            },
          ],
          edges: [
            {
              id: 'edge',
              source: 'a',
              target: 'b',
              sourceHandle: 'out',
              targetHandle: 'in',
            },
          ],
        },
        measurements: [
          {
            nodeId: 'a',
            width: 100,
            height: 50,
            handles: [
              {
                nodeId: 'a',
                handleId: 'out',
                width: 11,
                height: 11,
                offset: { x: 100, y: 25 },
              },
            ],
          },
          {
            nodeId: 'b',
            width: 100,
            height: 50,
            handles: [
              {
                nodeId: 'b',
                handleId: 'in',
                width: 11,
                height: 11,
                offset: { x: 0, y: 25 },
              },
            ],
          },
        ],
        edgeRouting: null,
      },
    })
  )

  const samples = initial.request.scene.measurements.map((sample) => {
    const node = initial.document.nodes.find(
      (item) => item.id === sample.nodeId
    )

    if (node === undefined) {
      throw new Error('Missing fixture node')
    }

    return Schema.decodeUnknownSync(FlowInternalNodeSchema)({
      node,
      width: sample.width,
      height: sample.height,
      absolutePosition: node.position,
      handles: sample.handles,
      measurementStatus: 'measured',
    })
  })

  const measurements = flowMeasurementsFromInternalNodes(samples)
  const [edge] = getEdgesGeometry(initial.document, { measurements })

  if (edge === undefined) {
    throw new Error('Missing fixture edge')
  }

  const prepared = await Effect.runPromise(
    prepareFlowImageExport({
      ...initial.request,
      scene: {
        ...initial.request.scene,
        edgeRouting: {
          revision: flowRoutingRevision(initial.document, { measurements }),
          paths: [
            {
              kind: 'routed',
              id: 'edge',
              points: [edge.source, { x: 200, y: 25 }, edge.target],
            },
          ],
        },
      },
    })
  )

  return { prepared, samples }
}

describe('capture routing', () => {
  it('retains interior waypoints and adapts a valid route to measured endpoint precision', async () => {
    const { prepared, samples } = await fixture()

    const actual = samples.map((sample) => ({
      ...sample,
      handles: sample.handles.map((handle) => ({
        ...handle,
        offset: {
          ...handle.offset,
          x: handle.offset.x + (sample.node.id === 'a' ? 0.01 : 0),
        },
      })),
    }))

    const result = getFlowImageCaptureRouting(prepared, actual)
    expect(result?.paths).toStrictEqual([
      {
        id: 'edge',
        kind: 'routed',
        points: [
          { x: 105.51, y: 25 },
          { x: 200, y: 25 },
          { x: 294.5, y: 25 },
        ],
      },
    ])
    expect(result?.revision).toBe(
      flowRoutingRevision(prepared.document, {
        measurements: flowMeasurementsFromInternalNodes(actual),
      })
    )
  })

  it('does not promote a stale routing result to the capture revision', async () => {
    const { prepared, samples } = await fixture()
    const supplied = prepared.request.scene.edgeRouting

    if (supplied === null) {
      throw new Error('Missing fixture routing')
    }

    const stale = {
      ...prepared,
      request: {
        ...prepared.request,
        scene: {
          ...prepared.request.scene,
          edgeRouting: { ...supplied, revision: 'stale' },
        },
      },
    }

    expect(getFlowImageCaptureRouting(stale, samples)).toBeNull()
  })
})

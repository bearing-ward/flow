import { Effect, Schema } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  isCurrentFlowImage,
  prepareFlowImageExport,
  FlowImageExportRequestSchema,
} from './flow-image-export.ts'
import { createFlowImageExportRequest } from './flow-image-request.ts'
import { FlowInternalNodeSchema } from './flow-measurement.schema.ts'

const input = () => ({
  version: 1,
  host: 'vanilla',
  revision: 'revision-1',
  width: 800,
  height: 500,
  framing: { kind: 'fit', padding: 0.1 },
  assets: [],
  scene: {
    document: {
      nodes: [
        { id: 'a', label: 'A', position: { x: 100, y: 100 }, handles: [] },
      ],
      edges: [],
    },
    measurements: [{ nodeId: 'a', width: 200, height: 100, handles: [] }],
    edgeRouting: null,
  },
})

describe('image export boundary', () => {
  it('decodes explicit bounds, computes fit and detaches the requested revision', async () => {
    const value = input()
    const prepared = await Effect.runPromise(prepareFlowImageExport(value))
    value.scene.document.nodes.splice(0, 1, {
      id: 'a',
      label: 'Changed later',
      position: { x: 0, y: 0 },
      handles: [],
    })
    expect(prepared.document.nodes[0]?.label).toBe('A')
    expect(prepared.document.nodes[0]?.size).toStrictEqual({
      width: 200,
      height: 100,
    })
    expect(prepared.viewport).toStrictEqual({ x: -328, y: -296, zoom: 3.64 })
    expect(prepared.request.revision).toBe('revision-1')
  })

  it('rejects missing and duplicate geometry and broken graph integrity', async () => {
    const value = input()
    await expect(
      Effect.runPromise(
        prepareFlowImageExport({
          ...value,
          scene: { ...value.scene, measurements: [] },
        })
      )
    ).rejects.toMatchObject({ reason: 'invalid-request' })
    await expect(
      Effect.runPromise(
        prepareFlowImageExport({
          ...value,
          scene: {
            ...value.scene,
            measurements: [
              ...value.scene.measurements,
              ...value.scene.measurements,
            ],
          },
        })
      )
    ).rejects.toMatchObject({ reason: 'invalid-request' })
    await expect(
      Effect.runPromise(
        prepareFlowImageExport({
          ...value,
          scene: {
            ...value.scene,
            document: {
              ...value.scene.document,
              edges: [{ id: 'broken', source: 'missing', target: 'a' }],
            },
          },
        })
      )
    ).rejects.toMatchObject({ reason: 'invalid-request' })
  })

  it('bounds size, assets, viewport and requires handles', async () => {
    const value = input()
    expect(
      Schema.is(FlowImageExportRequestSchema)({ ...value, width: 10_000 })
    ).toBeFalsy()
    expect(
      Schema.is(FlowImageExportRequestSchema)({
        ...value,
        assets: ['https://example.com/logo.svg'],
      })
    ).toBeFalsy()
    expect(
      Schema.is(FlowImageExportRequestSchema)({
        ...value,
        framing: { kind: 'viewport', x: 0, y: 0, zoom: 0 },
      })
    ).toBeFalsy()
    await expect(
      Effect.runPromise(
        prepareFlowImageExport({
          ...value,
          scene: {
            ...value.scene,
            document: {
              nodes: [
                {
                  id: 'a',
                  label: 'A',
                  position: { x: 0, y: 0 },
                  sourcePosition: 'right',
                },
              ],
              edges: [],
            },
          },
        })
      )
    ).rejects.toMatchObject({ reason: 'invalid-request' })
  })

  it('rejects a mixed document and internal-node snapshot at the public export API', async () => {
    const prepared = await Effect.runPromise(prepareFlowImageExport(input()))
    const [node] = prepared.request.scene.document.nodes

    if (node === undefined) {
      throw new Error('Missing fixture node')
    }

    const object = {
      nodes: [node],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
    }

    const internal = Schema.decodeUnknownSync(FlowInternalNodeSchema)({
      absolutePosition: node.position,
      handles: [],
      height: 100,
      width: 200,
      measurementStatus: 'measured',
      node,
    })

    const options = {
      revision: 'api-1',
      width: 800,
      height: 500,
      framing: { kind: 'fit' as const, padding: 0.1 },
      assets: [],
      edgeRouting: null,
    }

    const snapshot = createFlowImageExportRequest(
      object,
      [internal],
      'vanilla',
      options
    )

    expect(snapshot.scene.document.nodes[0]?.label).toBe('A')
    expect(() =>
      createFlowImageExportRequest(
        object,
        [{ ...internal, node: { ...node, label: 'Changed concurrently' } }],
        'vanilla',
        options
      )
    ).toThrow('Document changed while reading export geometry')
  })

  it('accepts only the current revision and request sequence', () => {
    expect(
      isCurrentFlowImage(
        { revision: '2', sequence: 2 },
        { revision: '2', sequence: 2 }
      )
    ).toBeTruthy()
    expect(
      isCurrentFlowImage(
        { revision: '1', sequence: 2 },
        { revision: '2', sequence: 2 }
      )
    ).toBeFalsy()
    expect(
      isCurrentFlowImage(
        { revision: '2', sequence: 1 },
        { revision: '2', sequence: 2 }
      )
    ).toBeFalsy()
  })
})

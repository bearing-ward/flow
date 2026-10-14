import {
  NodeIdSchema,
  createFlowSnapshot,
  emptyFlowMeasurementState,
  decodeFlowDocument,
  flowNoConnection,
  getFlowInternalNode,
  selectNodesData,
} from '@flow/core'
import type {
  FlowConnectionState,
  FlowDocument,
  FlowInteractivity,
  FlowStateChange,
  Viewport,
} from '@flow/core'
import { Effect } from 'effect'
import { describe, expect, it } from 'vitest'

import { createFlowInstanceApi } from './instance-api.ts'
import type { FlowInstanceSource } from './instance-api.ts'
import type { FlowDocumentInput, ViewportObservation } from './mount-flow.ts'

const box = (id: string, x: number, y: number, width = 100, height = 50) => ({
  id,
  label: id,
  position: { x, y },
  size: { width, height },
})

const interactivity: FlowInteractivity = {
  nodesDraggable: true,
  nodesConnectable: true,
  elementsSelectable: true,
}

/** An in-memory host: public reads over a document, with manual events. */
const fakeHost = (initial: FlowDocument) => {
  let document = initial
  let viewport: Viewport = { x: 0, y: 0, zoom: 1 }
  const stateListeners = new Set<(change: FlowStateChange) => void>()
  const viewportListeners = new Set<(event: ViewportObservation) => void>()

  const source: FlowInstanceSource = {
    getSnapshot: () => createFlowSnapshot(document, viewport),
    getNodes: () => document.nodes,
    getEdges: () => document.edges,
    getViewport: () => viewport,
    getInternalNode: (id) =>
      getFlowInternalNode(
        document,
        emptyFlowMeasurementState(),
        NodeIdSchema.make(id)
      ),
    getNodesData: (ids) =>
      selectNodesData(
        document,
        document.nodes
          .filter((node) => ids.includes(node.id))
          .map((node) => node.id)
      ),
    getInteractivity: () => interactivity,
    getConnection: (): FlowConnectionState => flowNoConnection,
    subscribeState: (listener) => {
      stateListeners.add(listener)

      return () => stateListeners.delete(listener)
    },
    subscribeViewport: (listener) => {
      viewportListeners.add(listener)

      return () => viewportListeners.delete(listener)
    },
    subscribeInteractivity: () => () => {},
    subscribeConnection: () => () => {},
  }

  return {
    source,
    setDocument: (next: FlowDocument) => {
      const previous = createFlowSnapshot(document, viewport)
      document = next

      for (const listener of stateListeners) {
        listener({
          previous,
          current: createFlowSnapshot(document, viewport),
          cause: 'document-update',
        })
      }
    },
    setViewport: (next: Viewport) => {
      viewport = next

      for (const listener of viewportListeners) {
        listener({ kind: 'change', source: 'programmatic', viewport })
      }
    },
  }
}

const documentOf = (input: FlowDocumentInput): FlowDocument =>
  Effect.runSync(decodeFlowDocument(input))

describe(createFlowInstanceApi, () => {
  const graph = documentOf({
    nodes: [
      box('a', 0, 0),
      box('b', 50, 25),
      box('c', 400, 400),
      box('inner', 10, 10, 20, 20),
    ],
    edges: [],
  })

  it('answers React intersection and bounds queries from internal nodes', () => {
    const api = createFlowInstanceApi(fakeHost(graph).source)

    expect(
      api.getIntersectingNodes({ id: 'a' }).map(({ id }) => id)
    ).toStrictEqual(['b', 'inner'])
    expect(
      api.getIntersectingNodes({ id: 'a' }, false).map(({ id }) => id)
    ).toStrictEqual(['inner'])
    expect(
      api
        .getIntersectingNodes({ x: 390, y: 390, width: 20, height: 20 })
        .map(({ id }) => id)
    ).toStrictEqual(['c'])
    expect(api.getIntersectingNodes({ id: 'missing' })).toStrictEqual([])
  })

  it('tests one node against an area and bounds several nodes', () => {
    const api = createFlowInstanceApi(fakeHost(graph).source)

    expect(
      api.isNodeIntersecting(
        { id: 'c' },
        { x: 0, y: 0, width: 100, height: 100 }
      )
    ).toBeFalsy()
    expect(
      api.isNodeIntersecting({ id: 'b' }, { x: 0, y: 0, width: 60, height: 60 })
    ).toBeTruthy()
    expect(api.getNodesBounds(['a', 'c'])).toStrictEqual({
      x: 0,
      y: 0,
      width: 500,
      height: 450,
    })
  })

  it('returns a detached toObject copy', () => {
    const api = createFlowInstanceApi(fakeHost(graph).source)
    const object = api.toObject()

    expect(object.nodes).toHaveLength(4)
    expect(object.viewport).toStrictEqual({ x: 0, y: 0, zoom: 1 })
    expect(object.nodes[0]).not.toBe(graph.nodes[0])
  })

  it('observes store selections with an equality function and node data', () => {
    const host = fakeHost(graph)
    const api = createFlowInstanceApi(host.source)
    const counts: number[] = []
    const zooms: number[] = []
    const data: string[] = []

    api.observeStore(
      (state) => state.nodes.length,
      (count) => counts.push(count)
    )
    api.observeStore(
      (state) => state.viewport.zoom,
      (zoom) => zooms.push(zoom),
      (previous, next) => Math.abs(previous - next) < 0.01
    )

    const stop = api.observeNodesData('a', (next) =>
      data.push(JSON.stringify(next))
    )

    host.setViewport({ x: 0, y: 0, zoom: 1.005 })
    host.setViewport({ x: 0, y: 0, zoom: 2 })
    host.setDocument(
      documentOf({
        nodes: [...graph.nodes, box('d', 900, 0)],
        edges: [],
      })
    )
    host.setDocument(
      documentOf({
        nodes: [{ ...box('a', 0, 0), data: { value: 1 } }],
        edges: [],
      })
    )
    stop()
    host.setDocument(graph)

    expect(zooms).toStrictEqual([2])
    expect(counts).toStrictEqual([5, 1, 4])
    expect(data).toStrictEqual([
      JSON.stringify([{ id: 'a', data: { value: 1 } }]),
    ])
  })
})

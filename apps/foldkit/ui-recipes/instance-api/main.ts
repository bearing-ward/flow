import { createFoldkitFlowInstance, createFoldkitStore } from '@flow/foldkit'

import { mountRecipeHost } from '../recipe-host.ts'

/*
 * Instance and store APIs: React Flow's `useReactFlow()`, `useStore()` and
 * `useNodesData()` as a Foldkit host uses them. The instance reads and edits
 * through the Runtime ports, so every call is asynchronous.
 */

const box = (id: string, x: number, y: number) => ({
  id,
  label: id,
  position: { x, y },
  size: { width: 120, height: 50 },
  data: { count: 0 },
})

const host = mountRecipeHost({
  page: 'instance-api-page',
  document: {
    nodes: [box('a', 40, 40), box('b', 320, 40), box('c', 40, 260)],
    edges: [{ id: 'a-b', source: 'a', target: 'b' }],
  },
})

const instance = createFoldkitFlowInstance(host.runtime.ports, {
  viewport: host.viewportClient,
})

const store = createFoldkitStore(host.runtime.ports)

const { status } = host

let zoomEvents = 0

let nodeIdEvents = 0

let observedEvents = 0

const counters = (): void => {
  status.dataset.zoomEvents = String(zoomEvents)
  status.dataset.nodeIdEvents = String(nodeIdEvents)
  status.dataset.observedEvents = String(observedEvents)
}

counters()

// `useStore((s) => s.transform[2])`: fires on zoom changes only.
store.select(
  (state) => state.transform[2],
  (zoom) => {
    zoomEvents += 1
    status.dataset.zoom = String(zoom)
    status.dataset.zoomHistory = `${status.dataset.zoomHistory ?? ''} ${zoom}`
    counters()
  }
)

// `useStore((s) => s.nodes.map((n) => n.id), shallow)`.
store.select(
  (state) => state.nodes.map(({ id }) => id),
  (ids) => {
    nodeIdEvents += 1
    status.dataset.nodeIds = ids.join(',')
    counters()
  },
  (previous, next) =>
    previous.length === next.length &&
    previous.every((id, index) => id === next[index])
)

// `useNodesData('a')`.
store.observeNodesData(['a'], ([node]) => {
  observedEvents += 1
  status.dataset.observed = JSON.stringify(node?.data ?? null)
  counters()
})

const markReady = async (): Promise<void> => {
  await store.ready
  status.dataset.ready = 'true'
}

void markReady()

let runs = 0

/** A toolbar button; `data-runs` counts finished actions for the tests. */
const action = (testId: string, label: string, run: () => Promise<void>) =>
  host.button(testId, label).addEventListener('click', async () => {
    await run()
    runs += 1
    status.dataset.runs = String(runs)
  })

action('intersections', 'Intersections of a', async () => {
  const intersecting = await instance.getIntersectingNodes('a')
  const b = await instance.getInternalNode('b')

  status.dataset.intersecting = intersecting.map(({ id }) => id).join(',')

  const intersectsB =
    b !== undefined &&
    (await instance.isNodeIntersecting('a', {
      x: b.absolutePosition.x,
      y: b.absolutePosition.y,
      width: b.width,
      height: b.height,
    }))

  status.dataset.aIntersectsB = String(intersectsB)
})

action('bounds', 'Bounds of a and c', async () => {
  const bounds = await instance.getNodesBounds(['a', 'c'])

  status.dataset.bounds = [bounds.x, bounds.y, bounds.width, bounds.height]
    .map((value) => Math.round(value))
    .join(',')
})

action('round-trip', 'toObject round trip', async () => {
  const saved = await instance.toObject()

  await instance.setEdges([])
  await instance.setNodes([])
  const cleared = await instance.getNodes()

  status.dataset.cleared = String(cleared.length)
  await instance.setNodes(saved.nodes)
  await instance.setEdges(saved.edges)
  await instance.setViewport(saved.viewport)

  const restored = await instance.toObject()

  status.dataset.roundTrip = String(
    JSON.stringify(restored) === JSON.stringify(saved)
  )
})

let edits = 0

action('edit-a', 'Edit data of a', async () => {
  edits += 1
  await instance.updateNodeData('a', { count: edits })
})

action('edit-c', 'Edit data of c', async () => {
  edits += 1
  await instance.updateNodeData('c', (node) => ({
    count: Number(node.data?.count ?? 0) + 1,
  }))
})

action('zoom', 'Zoom to 1.5', async () => {
  await instance.zoomTo(1.5)
})

action('add-node', 'Add node', async () => {
  await instance.addNodes(box('d', 320, 260))
})

host.onDispose(() => {
  store.dispose()
  instance.dispose()
})

import { Effect } from 'effect'
import { Runtime } from 'foldkit'

import { decodeFlowDocument } from '../../../packages/core/dist/public.js'
import {
  createProgram,
  createFoldkitSnapshotClient,
  defaultInteractionOptions,
} from '../../../packages/foldkit/dist/public.js'
import type { ports } from '../../../packages/foldkit/dist/public.js'
import { frames } from '../../shared-e2e/connection-threshold-harness.ts'

let sequence = 0

const createInstance = (side: string) => {
  const container = document.createElement('div')
  sequence += 1
  container.id = `node-instance-${sequence}`
  const owner = document.createElement('section')
  owner.dataset.side = side
  owner.style.cssText = 'width:440px;height:500px;position:absolute;top:0;'
  owner.style.left = side === 'left' ? '0' : '450px'
  owner.append(container)
  document.body.append(owner)

  const documentState = Effect.runSync(
    decodeFlowDocument({
      nodes: [{ id: 'source', label: side, position: { x: 60, y: 70 } }],
      edges: [],
    })
  )

  const program = createProgram(
    container,
    documentState,
    { x: 0, y: 0, zoom: 1 },
    [],
    'uncontrolled',
    'uncontrolled',
    {},
    undefined,
    'full',
    { ...defaultInteractionOptions, nodeDragThreshold: 0 }
  )

  const active = Runtime.embed<typeof ports, never, 'Element'>(program)
  const client = createFoldkitSnapshotClient(active.ports)
  const changes: string[] = []
  active.ports.changes.subscribe((change) => changes.push(change.kind))

  return {
    read: async () => {
      const snapshot = await client.requestVersioned()

      if (snapshot.status !== 'succeeded') {
        throw new Error('Missing mounted snapshot')
      }

      return {
        position: snapshot.response.snapshot.document.nodes[0]?.position,
        changes: [...changes],
      }
    },
    dispose: () => {
      client.dispose()
      active.dispose()
      owner.remove()
    },
  }
}

let instances: ReturnType<typeof createInstance>[] = []

export const mount = async () => {
  for (const instance of instances) {
    instance.dispose()
  }

  instances = [createInstance('left'), createInstance('right')]
  await frames(2)
}

export const read = () =>
  Promise.all(instances.map((instance) => instance.read()))

export const replaceLeft = async () => {
  instances[0]?.dispose()
  instances[0] = createInstance('left')
  await frames(2)
}

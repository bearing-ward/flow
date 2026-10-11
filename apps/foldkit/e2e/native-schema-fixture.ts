import {
  createFlowSnapshot,
  decodeFlowDocument,
  FlowStateChangeSchema,
} from '@flow/core'
import type { FlowDocument, FlowStateChange } from '@flow/core'
import {
  createFoldkitSnapshotClient,
  createProgram,
  HostAction,
} from '@flow/foldkit'
import type {
  LegacySnapshotFailure,
  SnapshotResponseSchema,
  ports,
} from '@flow/foldkit'
import { Effect, Exit, Schema } from 'effect'
import { Runtime } from 'foldkit'

const viewport = { x: 5, y: -7, zoom: 1.5 }

const baseNode = {
  id: 'native-node',
  label: 'Initial native',
  position: { x: 10, y: 20 },
}

const baseEdge = {
  id: 'native-edge',
  source: 'native-node',
  target: 'native-node',
}

const decode = (input: Parameters<typeof decodeFlowDocument>[0]) =>
  Effect.runSync(decodeFlowDocument(input))

const describeDocument = (document: FlowDocument) => ({
  document,
  nodeKeys: Object.keys(document.nodes[0] ?? {}),
  edgeKeys: Object.keys(document.edges[0] ?? {}),
})

/** Exercise the public mounted producer and client, never an application.update model fixture. */
export const runNativeSchemaProof = async () => {
  const owner = document.createElement('div')
  owner.style.width = '800px'
  owner.style.height = '500px'
  const mount = document.createElement('div')
  mount.id = 'native-schema-runtime'
  owner.append(mount)
  document.body.append(owner)

  const initial = decode({
    nodes: [
      {
        ...baseNode,
        connectable: false,
        ariaRole: '',
        ariaLabel: '',
        ariaDescription: '',
      },
    ],
    edges: [{ ...baseEdge, ariaRole: 'custom role', ariaLabel: '' }],
  })

  const coreSnapshot = createFlowSnapshot(initial, viewport)

  const runtime = Runtime.embed<typeof ports, never, 'Element'>(
    createProgram(mount, initial, viewport)
  )

  const client = createFoldkitSnapshotClient(runtime.ports)
  const failures: LegacySnapshotFailure[] = []
  const successes: (typeof SnapshotResponseSchema.Encoded)[] = []
  const accepted: FlowStateChange[] = []

  const stopFailure = runtime.ports.snapshotFailures.subscribe((failure) =>
    failures.push(failure)
  )

  const stopSuccess = runtime.ports.snapshots.subscribe((response) =>
    successes.push(response)
  )

  const stopAccepted = runtime.ports.acceptedStates.subscribe((change) =>
    accepted.push(Schema.decodeUnknownSync(FlowStateChangeSchema)(change))
  )

  const replace = (next: FlowDocument): Promise<FlowStateChange> => {
    const { promise, resolve } = Promise.withResolvers<FlowStateChange>()

    const stop = runtime.ports.acceptedStates.subscribe((change) => {
      stop()
      resolve(Schema.decodeUnknownSync(FlowStateChangeSchema)(change))
    })

    const sent = runtime.ports.actions.send(
      HostAction.ReplaceDocument({ document: next })
    )

    if (Exit.isFailure(sent)) {
      stop()
      throw new Error('Public typed replacement rejected')
    }

    return promise
  }

  try {
    const initialFailure = await client.request()

    const initialCounts = {
      failure: failures.length,
      success: successes.length,
      accepted: accepted.length,
    }

    const undefinedDocument = decode({
      nodes: [
        {
          ...baseNode,
          label: 'Undefined native replacement',
          connectable: undefined,
          ariaRole: undefined,
          ariaLabel: undefined,
          ariaDescription: undefined,
        },
      ],
      edges: [{ ...baseEdge, ariaRole: undefined, ariaLabel: undefined }],
    })

    const undefinedChange = await replace(undefinedDocument)
    const beforeFailure = describeDocument(undefinedChange.current.document)
    const notificationsBeforeFailure = accepted.length
    const undefinedFailure = await client.request()
    const notificationsAfterFailure = accepted.length

    const ordinary = decode({
      nodes: [
        {
          ...baseNode,
          label: 'Ordinary recovery',
          selected: true,
          ariaLabel: 'Existing',
          ariaDescription: 'Existing description',
        },
      ],
      edges: [{ ...baseEdge, selected: true, ariaLabel: 'Existing edge' }],
    })

    const recoveryChange = await replace(ordinary)
    const recovered = await client.request()

    const countsBeforeDispose = {
      failure: failures.length,
      success: successes.length,
      accepted: accepted.length,
    }

    let settled = 0
    const pendingRequest = client.request()

    const pending = (async () => {
      const result = await pendingRequest
      settled += 1

      return result
    })()

    client.dispose()
    runtime.dispose()
    const disposed = await pending
    await Promise.resolve()
    const disposedAgain = await client.request()

    const undefinedJson = JSON.stringify(undefinedDocument)

    return {
      initialFailure,
      initialCounts,
      initialRetained: describeDocument(undefinedChange.previous.document),
      coreRetained: describeDocument(coreSnapshot.document),
      coreDetached: coreSnapshot.document !== initial,
      coreFrozen: Object.isFrozen(coreSnapshot.document.nodes[0]),
      beforeFailure,
      afterFailure: describeDocument(recoveryChange.previous.document),
      undefinedSnapshot: describeDocument(
        createFlowSnapshot(undefinedDocument, viewport).document
      ),
      undefinedJson: JSON.parse(undefinedJson),
      unchangedViewport: recoveryChange.previous.viewport,
      notificationsBeforeFailure,
      notificationsAfterFailure,
      undefinedFailure,
      failures,
      successes: successes.map(({ requestId }) => requestId),
      recovered,
      countsBeforeDispose,
      countsAfterDispose: {
        failure: failures.length,
        success: successes.length,
        accepted: accepted.length,
      },
      disposed,
      disposedAgain,
      settled,
    }
  } finally {
    client.dispose()
    runtime.dispose()
    stopFailure()
    stopSuccess()
    stopAccepted()
    owner.remove()
  }
}

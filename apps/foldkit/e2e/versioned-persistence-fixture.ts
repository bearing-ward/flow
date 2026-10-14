import '@flow/foldkit/style.css'
import { decodeFlowDocument, FlowStateChangeSchema } from '@flow/core'
import type { FlowDocument } from '@flow/core'
import {
  createProgram,
  createFoldkitSnapshotClient,
  HostAction,
  prepareVersionedSavedSession,
} from '@flow/foldkit'
import type { ports, VersionedSnapshotResponseSchema } from '@flow/foldkit'
import { Effect, Exit, Predicate, Schema } from 'effect'
import { Runtime } from 'foldkit'

const data = () => ({ nested: { value: 1 }, list: [{ value: 2 }] })

const input = (extended: boolean) => {
  const node = {
    id: 'node',
    label: 'Node',
    position: { x: 20, y: 30 },
    data: data(),
    handles: [
      { id: 'out', kind: 'source', side: 'right' },
      { id: 'in', kind: 'target', side: 'left' },
    ],
  }

  const edge = {
    id: 'edge',
    source: 'node',
    target: 'node',
    sourceHandle: 'out',
    targetHandle: 'in',
    data: data(),
  }

  const document = { nodes: [node], edges: [edge] }

  if (extended) {
    Object.assign(document, { nodeOrigin: [0, 0] })
    Object.assign(node, {
      connectable: false,
      ariaRole: '',
      ariaLabel: '',
      ariaDescription: '',
    })
    Object.assign(edge, { ariaRole: '', ariaLabel: '' })
  }

  return Effect.runSync(decodeFlowDocument(document))
}

const mutate = (value: typeof Schema.JsonObject.Type | undefined) => {
  if (value === undefined || !('nested' in value) || !('list' in value)) {
    throw new Error('Missing public JSON data')
  }

  if (!Predicate.isObject(value.nested) || !Array.isArray(value.list)) {
    throw new TypeError('Invalid public JSON data')
  }

  const previousLength = value.list.length
  Object.assign(value.nested, { value: 99 })
  value.list.push({ value: 100 })

  if (
    !('value' in value.nested) ||
    value.nested.value !== 99 ||
    value.list.length !== previousLength + 1
  ) {
    throw new Error('Actual returned mutation did not occur')
  }
}

const responseData = (
  response: typeof VersionedSnapshotResponseSchema.Encoded
) => [
  response.snapshot.document.nodes[0]?.data,
  response.snapshot.document.edges[0]?.data,
  response.node?.data,
  response.internalNode?.node.data,
  response.edge?.data,
  response.nodesData[0]?.data,
  response.handleConnections[0]?.data,
  response.savedSession.document.nodes[0]?.data,
  response.savedSession.document.edges[0]?.data,
]

/** Public createProgram -> Runtime.embed -> shared typed client; no private store. */
export const runVersionedPersistenceProof = async () => {
  const owner = document.createElement('div')
  owner.id = 'versioned-persistence-runtime'
  owner.style.width = '800px'
  owner.style.height = '500px'
  document.body.append(owner)

  const runtime = Runtime.embed<typeof ports, never, 'Element'>(
    createProgram(owner, input(true), { x: 5, y: -7, zoom: 1.5 })
  )

  const client = createFoldkitSnapshotClient(runtime.ports)
  let accepted = 0
  let failures = 0
  let successes = 0

  const stopAccepted = runtime.ports.acceptedStates.subscribe(() => {
    accepted += 1
  })

  const stopFailure = runtime.ports.snapshotFailures.subscribe(() => {
    failures += 1
  })

  const stopSuccess = runtime.ports.snapshots.subscribe(() => {
    successes += 1
  })

  const query = {
    nodeId: 'node',
    edgeId: 'edge',
    nodeIds: ['node'],
    connections: { nodeId: 'node' },
    handleConnections: { nodeId: 'node', type: 'source', id: 'out' },
  } satisfies Parameters<typeof client.requestVersioned>[0]

  const read = async () => {
    const result = await client.requestVersioned(query)

    if (result.status !== 'succeeded') {
      throw new Error('Versioned Runtime read failed')
    }

    return result.response
  }

  const replace = (document: FlowDocument) => {
    const pending = Promise.withResolvers<boolean>()

    const stop = runtime.ports.acceptedStates.subscribe((change) => {
      Schema.decodeUnknownSync(FlowStateChangeSchema)(change)
      stop()
      pending.resolve(true)
    })

    const sent = runtime.ports.actions.send(
      HostAction.ReplaceDocument({ document })
    )

    if (Exit.isFailure(sent)) {
      stop()
      throw new Error('Replacement rejected')
    }

    return pending.promise
  }

  try {
    const before = structuredClone(await read())
    const initialCounts = { accepted, failures, successes }
    const firstFailure = await client.request()
    const secondFailure = await client.request()
    const afterFailures = await read()

    if (
      JSON.stringify(afterFailures.snapshot) !==
        JSON.stringify(before.snapshot) ||
      accepted !== initialCounts.accepted ||
      failures !== 2 ||
      successes !== 0
    ) {
      throw new Error('Legacy failure altered public authority')
    }

    await Promise.all(
      Array.from(
        { length: responseData(before).length },
        (_, index) => index
      ).map(async (index) => {
        const actual = await read()
        mutate(responseData(actual)[index])

        const fresh = await read()

        if (
          JSON.stringify(fresh.snapshot) !== JSON.stringify(before.snapshot) ||
          JSON.stringify(fresh.savedSession) !==
            JSON.stringify(before.savedSession) ||
          JSON.stringify(fresh.nodeConnections) !==
            JSON.stringify(before.nodeConnections) ||
          accepted !== initialCounts.accepted
        ) {
          throw new Error(
            'Versioned output mutation reached accepted authority'
          )
        }
      })
    )

    const prepared = await Effect.runPromise(
      prepareVersionedSavedSession(before.savedSession)
    )

    if (
      prepared.document.nodeOrigin?.[0] !== 0 ||
      accepted !== initialCounts.accepted
    ) {
      throw new Error('Preparation changed authority')
    }

    let invalidRejected = false

    try {
      await Effect.runPromise(
        prepareVersionedSavedSession({ ...before.savedSession, version: 99 })
      )
    } catch {
      invalidRejected = true
    }

    if (!invalidRejected || accepted !== initialCounts.accepted) {
      throw new Error('Invalid preparation changed authority')
    }

    await replace(input(false))
    const canonical = await read()
    const canonicalBefore = structuredClone(canonical)
    const acceptedBeforeMutation = accepted
    const legacy = await client.request(query)

    if (legacy.status !== 'succeeded') {
      throw new Error('Same owner did not recover on legacy channel')
    }

    for (const value of responseData(canonical)) {
      mutate(value)
    }

    for (const value of responseData(legacy.response)) {
      mutate(value)
    }

    const final = await read()

    if (
      JSON.stringify(final.snapshot) !==
        JSON.stringify(canonicalBefore.snapshot) ||
      JSON.stringify(final.savedSession) !==
        JSON.stringify(canonicalBefore.savedSession) ||
      accepted !== acceptedBeforeMutation
    ) {
      throw new Error(
        'Canonical returned data mutation changed accepted authority'
      )
    }

    return {
      firstFailure,
      secondFailure,
      initialCounts,
      before,
      afterFailures,
      canonicalBefore,
      final,
      failures,
      successes,
      accepted,
      invalidRejected,
      checkedProjections: responseData(before).length,
    }
  } finally {
    client.dispose()
    stopAccepted()
    stopFailure()
    stopSuccess()
    runtime.dispose()
    owner.remove()
  }
}

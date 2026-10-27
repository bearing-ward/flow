import '@flow/foldkit/style.css'
import { FlowStateChangeSchema } from '@flow/core'
import {
  createProgram,
  HostAction,
  createFoldkitSnapshotClient,
} from '@flow/foldkit'
import { Schema } from 'effect'
import { Runtime } from 'foldkit'

import {
  initialWorkflowDocument,
  mountWorkflowImports,
  showAcceptedWorkflow,
} from '../../shared/workflow-contracts/owner.ts'

const root = document.querySelector<HTMLElement>('#app')

if (root === null) {
  throw new Error('Missing workflow canvas')
}

const initial = await initialWorkflowDocument()

const container = document.createElement('div')

container.id = 'workflow-runtime'

root.append(container)

const runtime = Runtime.embed(
  createProgram(container, initial, { x: 0, y: 0, zoom: 0.8 })
)

const snapshots = createFoldkitSnapshotClient(runtime.ports)

const stop = runtime.ports.acceptedStates.subscribe((input) =>
  showAcceptedWorkflow(
    Schema.decodeUnknownSync(FlowStateChangeSchema)(input).current.document
  )
)

const publishSnapshot = async () => {
  const result = await snapshots.requestVersioned()

  if (result.status !== 'succeeded') {
    throw new Error(result.status)
  }

  showAcceptedWorkflow(result.response.snapshot.document)
}

await publishSnapshot()

mountWorkflowImports({
  replace: async (document) => {
    runtime.ports.actions.send(HostAction.ReplaceDocument({ document }))
    await publishSnapshot()
  },
  dispose: () => {
    stop()
    snapshots.dispose()
    runtime.dispose()
  },
})

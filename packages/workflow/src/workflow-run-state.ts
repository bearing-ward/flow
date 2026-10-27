import type {
  WorkflowRunEvent,
  WorkflowRunState,
  WorkflowNodeEvent,
} from './workflow-execution.schema.ts'

const runTransitions: Record<
  WorkflowRunState['state'],
  readonly WorkflowRunState['state'][]
> = {
  queued: ['running', 'cancelled'],
  running: ['succeeded', 'failed', 'cancelled'],
  succeeded: [],
  failed: [],
  cancelled: [],
}

const nodeTransitions: Record<
  WorkflowNodeEvent['state'] | 'absent',
  readonly WorkflowNodeEvent['state'][]
> = {
  absent: ['queued'],
  queued: ['running', 'skipped', 'cancelled'],
  running: ['running', 'succeeded', 'failed', 'cancelled'],
  succeeded: [],
  failed: [],
  cancelled: [],
  skipped: [],
}

/** A session owner selects the identity before subscribing. Events cannot select a new run. */
export const reduceWorkflowRunEvent = (
  current: WorkflowRunState,
  event: WorkflowRunEvent,
  acceptedRevision: number
): WorkflowRunState => {
  const identity = event.kind === 'node' ? event.event : event

  if (
    identity.runId !== current.runId ||
    identity.revision !== current.revision ||
    identity.revision !== acceptedRevision ||
    (current.state !== 'queued' && current.state !== 'running')
  ) {
    return current
  }

  if (event.kind === 'run') {
    return runTransitions[current.state].includes(event.state)
      ? { ...current, state: event.state }
      : current
  }

  const node = event.event
  const previous = current.nodes[node.nodeId]?.state

  return nodeTransitions[previous ?? 'absent'].includes(node.state)
    ? { ...current, nodes: { ...current.nodes, [node.nodeId]: node } }
    : current
}

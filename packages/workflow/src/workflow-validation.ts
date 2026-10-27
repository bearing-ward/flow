import type { NodeId } from '@flow/core'

import { workflowPorts } from './workflow-ports.ts'
import type {
  WorkflowDocument,
  WorkflowIssue,
  WorkflowNode,
  WorkflowEdge,
  WorkflowNodeData,
} from './workflow.schema.ts'

/** Strongly connected components report cycle members, excluding downstream dependents. */
const cycleIssues = (document: WorkflowDocument): readonly WorkflowIssue[] => {
  const executable = new Set(
    document.nodes.flatMap((node) =>
      node.data?.workflow === undefined ? [] : [node.id]
    )
  )

  const connections = document.edges.filter(
    (edge) =>
      edge.data?.workflow !== undefined &&
      executable.has(edge.source) &&
      executable.has(edge.target)
  )

  const nodes = document.nodes
    .filter((node) => node.data?.workflow !== undefined)
    .map(({ id }) => id)
    .toSorted()

  const forward = new Map<NodeId, NodeId[]>()
  const reverse = new Map<NodeId, NodeId[]>()

  for (const { source, target } of connections) {
    const targets = forward.get(source) ?? []
    const sources = reverse.get(target) ?? []
    targets.push(target)
    sources.push(source)
    forward.set(source, targets)
    reverse.set(target, sources)
  }

  const visited = new Set<NodeId>()
  const order: NodeId[] = []

  for (const start of nodes) {
    const pending = [{ id: start, exit: false }]

    while (pending.length > 0) {
      const item = pending.pop()

      if (item === undefined) {
        break
      }

      if (item.exit) {
        order.push(item.id)
        continue
      }

      if (visited.has(item.id)) {
        continue
      }

      visited.add(item.id)
      pending.push({ id: item.id, exit: true })

      for (const id of forward.get(item.id) ?? []) {
        pending.push({ id, exit: false })
      }
    }
  }

  visited.clear()
  const issues: WorkflowIssue[] = []

  for (const start of order.toReversed()) {
    if (visited.has(start)) {
      continue
    }

    const members: NodeId[] = []
    const pending = [start]

    while (pending.length > 0) {
      const id = pending.pop()

      if (id === undefined || visited.has(id)) {
        continue
      }

      visited.add(id)
      members.push(id)
      pending.push(...(reverse.get(id) ?? []))
    }

    const set = new Set(members)

    const edges = connections.filter(
      ({ source, target }) => set.has(source) && set.has(target)
    )

    if (
      members.length > 1 ||
      edges.some(({ source, target }) => source === target)
    ) {
      issues.push({
        code: 'cycle',
        nodeIds: members.toSorted(),
        edgeIds: edges.map(({ id }) => id).toSorted(),
      })
    }
  }

  return issues.toSorted((a, b) =>
    JSON.stringify(a).localeCompare(JSON.stringify(b))
  )
}

const nodeIssues = (document: WorkflowDocument): readonly WorkflowIssue[] => {
  const issues: WorkflowIssue[] = []
  const seen = new Set<NodeId>()

  for (const node of document.nodes) {
    if (seen.has(node.id)) {
      issues.push({ code: 'duplicate-node-id', nodeId: node.id })
    }

    seen.add(node.id)

    if (node.data?.workflow === undefined) {
      continue
    }

    const bindings = new Set<string>()

    for (const port of workflowPorts(node.data.workflow)) {
      if (
        bindings.has(port.id) ||
        !node.handles?.some(
          (handle) => handle.id === port.id && handle.kind === port.direction
        )
      ) {
        issues.push({ code: 'invalid-port', nodeId: node.id, portId: port.id })
      }

      bindings.add(port.id)
    }
  }

  return issues
}

const linkedPortIssues = (
  edge: WorkflowEdge,
  source: WorkflowNodeData,
  target: WorkflowNodeData,
  kind: 'data' | 'trigger',
  incoming: Map<NodeId, Set<string>>
): readonly WorkflowIssue[] => {
  const issues: WorkflowIssue[] = []

  const from = workflowPorts(source).find(
    ({ id, direction }) => id === edge.sourceHandle && direction === 'source'
  )

  const to = workflowPorts(target).find(
    ({ id, direction }) => id === edge.targetHandle && direction === 'target'
  )

  if (from === undefined) {
    issues.push({
      code: 'invalid-port',
      nodeId: edge.source,
      portId: edge.sourceHandle ?? '',
    })
  }

  if (to === undefined) {
    issues.push({
      code: 'invalid-port',
      nodeId: edge.target,
      portId: edge.targetHandle ?? '',
    })
  }

  if (from === undefined || to === undefined) {
    return issues
  }

  if (
    from.valueType !== to.valueType ||
    (from.valueType === 'trigger' ? 'trigger' : 'data') !== kind
  ) {
    issues.push({
      code: 'incompatible-ports',
      edgeId: edge.id,
      nodeId: edge.target,
      portId: to.id,
      sourceNodeId: edge.source,
      sourcePortId: from.id,
    })
  }

  const used = incoming.get(edge.target) ?? new Set<string>()

  if (used.has(to.id) && !to.multiple) {
    issues.push({
      code: 'multiple-inputs',
      edgeId: edge.id,
      nodeId: edge.target,
      portId: to.id,
    })
  }

  used.add(to.id)
  incoming.set(edge.target, used)

  return issues
}

const connectionIssues = (
  edge: WorkflowEdge,
  nodes: ReadonlyMap<NodeId, WorkflowNode>,
  incoming: Map<NodeId, Set<string>>
): readonly WorkflowIssue[] => {
  const source = nodes.get(edge.source)?.data?.workflow
  const target = nodes.get(edge.target)?.data?.workflow

  if (edge.data?.workflow === undefined) {
    return source !== undefined && target !== undefined
      ? [{ code: 'missing-connection-contract', edgeId: edge.id }]
      : []
  }

  const issues: WorkflowIssue[] = []

  for (const nodeId of [edge.source, edge.target]) {
    if (nodes.has(nodeId) && nodes.get(nodeId)?.data?.workflow === undefined) {
      issues.push({ code: 'missing-workflow-node', edgeId: edge.id, nodeId })
    }
  }

  if (source === undefined || target === undefined) {
    return issues
  }

  return [
    ...issues,
    ...linkedPortIssues(
      edge,
      source,
      target,
      edge.data.workflow.kind,
      incoming
    ),
  ]
}

/** Unit 1 structural and port integrity. Required inputs and reachability belong to Unit 3. */
export const workflowIssues = (
  document: WorkflowDocument
): readonly WorkflowIssue[] => {
  const issues = [...nodeIssues(document)]
  const nodes = new Map(document.nodes.map((node) => [node.id, node]))
  const edgeIds = new Set<string>()
  const incoming = new Map<NodeId, Set<string>>()

  for (const edge of document.edges) {
    if (edgeIds.has(edge.id)) {
      issues.push({ code: 'duplicate-edge-id', edgeId: edge.id })
    }

    edgeIds.add(edge.id)

    for (const nodeId of [edge.source, edge.target]) {
      if (!nodes.has(nodeId)) {
        issues.push({ code: 'missing-endpoint', edgeId: edge.id, nodeId })
      }
    }

    issues.push(...connectionIssues(edge, nodes, incoming))
  }

  return [...issues, ...cycleIssues(document)]
}

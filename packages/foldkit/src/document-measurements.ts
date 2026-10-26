import {
  applyNodeMeasurement,
  getFlowMeasuredNodes,
  pruneFlowMeasurements,
} from '@flow/core'
import type {
  FlowDocument,
  NodeBoundsChange,
  NodeMeasurementInput,
} from '@flow/core'

import type { Model } from './graph.ts'

export const measurementsForResize = (
  model: Model,
  document: FlowDocument,
  change: NodeBoundsChange,
  measurement?: NodeMeasurementInput
) => {
  const measurements = pruneFlowMeasurements(document, model.measurements)

  const current = getFlowMeasuredNodes(document, measurements).get(
    change.nodeId
  )

  if (
    current?.width === change.size.width &&
    current.height === change.size.height
  ) {
    return measurements
  }

  const sampled =
    measurement?.width === change.size.width &&
    measurement.height === change.size.height
      ? applyNodeMeasurement(document, measurements, measurement)
      : measurements

  const accepted = getFlowMeasuredNodes(document, sampled).get(change.nodeId)

  if (
    accepted?.width === change.size.width &&
    accepted.height === change.size.height
  ) {
    return sampled
  }

  const nodes = sampled.nodes.filter(
    ({ measurement: node }) => node.nodeId !== change.nodeId
  )

  return nodes.length === sampled.nodes.length
    ? sampled
    : { ...sampled, nodes, revision: sampled.revision + 1 }
}

export const measurementsForDocument = (
  model: Model,
  document: FlowDocument
) => {
  const pending = model.pendingResizeAcceptance

  if (pending === null) {
    const measurements = pruneFlowMeasurements(document, model.measurements)

    if (model.documentMode === 'controlled') {
      return measurements
    }

    const previous = new Map(
      model.document.nodes.map((node) => [node.id, node])
    )

    const current = new Map(document.nodes.map((node) => [node.id, node]))

    const nodes = measurements.nodes.filter(({ measurement }) => {
      const before = previous.get(measurement.nodeId)?.size
      const after = current.get(measurement.nodeId)?.size

      return (
        (before?.width === after?.width && before?.height === after?.height) ||
        (measurement.width === after?.width &&
          measurement.height === after?.height)
      )
    })

    return nodes.length === measurements.nodes.length
      ? measurements
      : { ...measurements, nodes, revision: measurements.revision + 1 }
  }

  const { change } = pending
  const nodes = new Map(document.nodes.map((node) => [node.id, node]))
  const resized = nodes.get(change.nodeId)

  const accepted =
    resized?.position.x === change.position.x &&
    resized.position.y === change.position.y &&
    resized.size?.width === change.size.width &&
    resized.size.height === change.size.height &&
    change.childPositions.every(({ nodeId, position }) => {
      const child = nodes.get(nodeId)

      return (
        child?.parentId === change.nodeId &&
        child.position.x === position.x &&
        child.position.y === position.y
      )
    })

  return accepted
    ? measurementsForResize(model, document, change, pending.measurement)
    : pruneFlowMeasurements(document, model.measurements)
}

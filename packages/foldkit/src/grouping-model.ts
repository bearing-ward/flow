import type { NodeMeasurementInput, FlowMeasurementState } from '@flow/core'
import {
  refitFlowGroups,
  getFlowMeasuredNodes,
  setNodeMeasurementGenerations,
  FlowGroupSizingSchema,
} from '@flow/core'
import { Schema } from 'effect'

import type { Model } from './graph.ts'

/** A new authored box must render before its old DOM measurement can be reused. */
export const fitGroupingModel = (previous: Model, current: Model): Model => {
  if (
    !current.document.nodes.some((node) =>
      Schema.is(FlowGroupSizingSchema)(node.data?.flowGrouping)
    )
  ) {
    return current
  }

  const previousNodes = new Map(
    previous.document.nodes.map((node) => [node.id, node])
  )

  const stale = new Set(
    current.document.nodes.flatMap((node) => {
      const old = previousNodes.get(node.id)

      return old !== undefined &&
        (old.size?.width !== node.size?.width ||
          old.size?.height !== node.size?.height ||
          old.label !== node.label ||
          old.type !== node.type ||
          JSON.stringify([old.style, old.data, old.handles]) !==
            JSON.stringify([node.style, node.data, node.handles]))
        ? [node.id]
        : []
    })
  )

  const fresh = {
    ...current.measurements,
    nodes: current.measurements.nodes.filter(
      ({ measurement }) => !stale.has(measurement.nodeId)
    ),
  }

  const document = refitFlowGroups(
    current.document,
    getFlowMeasuredNodes(current.document, fresh)
  )

  const changed = new Set([
    ...stale,
    ...document.nodes.flatMap((node) => {
      const old = previousNodes.get(node.id)

      return old !== undefined &&
        (old.size?.width !== node.size?.width ||
          old.size?.height !== node.size?.height)
        ? [node.id]
        : []
    }),
  ])

  return {
    ...current,
    document,
    measurements:
      changed.size === 0
        ? current.measurements
        : {
            ...current.measurements,
            revision: current.measurements.revision + 1,
            nodes: current.measurements.nodes.filter(
              ({ measurement }) => !changed.has(measurement.nodeId)
            ),
          },
  }
}

/** Observer batches register new DOM generations; older observer receipts stay stale. */
export const registerObserverGenerations = (
  model: Model,
  measurements: readonly NodeMeasurementInput[]
): FlowMeasurementState => {
  const current = new Map(
    model.measurements.generations.map(({ nodeId, generation }) => [
      nodeId,
      generation,
    ])
  )

  const ids = new Set(model.document.nodes.map(({ id }) => id))
  const changed = new Map<NodeMeasurementInput['nodeId'], number>()

  for (const { nodeId, generation } of measurements) {
    if (ids.has(nodeId) && generation > (current.get(nodeId) ?? -1)) {
      current.set(nodeId, generation)
      changed.set(nodeId, generation)
    }
  }

  const generations = [...changed].map(([nodeId, generation]) => ({
    nodeId,
    generation,
  }))

  return generations.length === 0
    ? model.measurements
    : setNodeMeasurementGenerations(model.measurements, generations)
}

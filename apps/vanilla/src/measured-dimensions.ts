import type { MeasuredNode, NodeChange, NodeId } from '@flow/core'

/**
 * React Flow reports every measured node size through `onNodesChange` as a
 * `{ type: 'dimensions', id, dimensions }` change, including the first
 * measurement. This tracker remembers the last reported size per node and
 * returns only the changes since the previous call.
 */
export interface MeasuredDimensionsTracker {
  readonly changes: (
    measurements: ReadonlyMap<NodeId, MeasuredNode>
  ) => NodeChange[]
}

export const createMeasuredDimensionsTracker =
  (): MeasuredDimensionsTracker => {
    const reported = new Map<NodeId, { width: number; height: number }>()

    return {
      changes: (measurements) => {
        const changes: NodeChange[] = []

        for (const nodeId of reported.keys()) {
          if (!measurements.has(nodeId)) {
            reported.delete(nodeId)
          }
        }

        for (const [id, { width, height }] of measurements) {
          const previous = reported.get(id)

          if (
            width <= 0 ||
            height <= 0 ||
            (previous?.width === width && previous.height === height)
          ) {
            continue
          }

          reported.set(id, { width, height })
          changes.push({
            id,
            type: 'dimensions',
            dimensions: { width, height },
          })
        }

        return changes
      },
    }
  }

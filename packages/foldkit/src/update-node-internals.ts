import type { NodeId } from '@flow/core'

export type FoldkitNodeInternalsRefreshResult =
  | { readonly status: 'requested' }
  | { readonly status: 'missing' }
  | { readonly status: 'disposed' }
  | { readonly status: 'failed' }

export interface FoldkitNodeInternalsRefresher {
  readonly refresh: (nodeId: NodeId) => FoldkitNodeInternalsRefreshResult
  readonly dispose: () => void
}

export interface FoldkitNodeInternalsRefresherOptions {
  /** Resolve mounted elements in the owning host; DOM lookup stays host-owned. */
  readonly resolveElement: (nodeId: NodeId) => Element | undefined
  /** Measure through the host's existing geometry path and typed Runtime action. */
  readonly measure: (element: Element) => boolean
}

/** Create an app-scoped, node-ID-addressed facade over host-owned measurement. */
export const createFoldkitNodeInternalsRefresher = (
  options: FoldkitNodeInternalsRefresherOptions
): FoldkitNodeInternalsRefresher => {
  let disposed = false

  return {
    refresh: (nodeId) => {
      if (disposed) {
        return { status: 'disposed' }
      }

      const element = options.resolveElement(nodeId)

      if (element === undefined) {
        return { status: 'missing' }
      }

      if (!options.measure(element)) {
        return { status: 'failed' }
      }

      return { status: 'requested' }
    },
    dispose: () => {
      disposed = true
    },
  }
}

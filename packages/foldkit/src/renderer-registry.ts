import { Exit } from 'effect'
import type { Runtime } from 'foldkit'

import { HostAction } from './application.ts'
import type { ports } from './application.ts'
import type { FoldkitRendererRegistry } from './graph.ts'

/** Replace the registry used by this program and schedule a Runtime render. */
export const updateFoldkitRendererRegistry = (
  registry: FoldkitRendererRegistry,
  next: FoldkitRendererRegistry,
  actions: Runtime.EmbedHandle<typeof ports>['ports']['actions']
): void => {
  Object.assign(
    registry,
    {
      nodeTypes: undefined,
      edgeTypes: undefined,
      connectionPreview: undefined,
      connectionLineType: undefined,
    },
    next
  )
  const sent = actions.send(HostAction.RefreshRenderers())

  if (Exit.isFailure(sent)) {
    throw new Error('Foldkit rejected renderer refresh')
  }
}

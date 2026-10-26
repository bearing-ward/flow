import type { FlowClipboardActions, FlowPasteOptions } from '@flow/core'
import type { Runtime } from 'foldkit'

import type { ports } from './application.ts'
import { HostAction } from './host-action.ts'

/** Commands route to the Runtime's model-owned session clipboard. */
export const createFoldkitClipboardClient = (
  runtimePorts: Pick<Runtime.EmbedHandle<typeof ports>['ports'], 'actions'>
) => ({
  copySelection: () =>
    runtimePorts.actions.send(
      HostAction.Clipboard({ command: { kind: 'copy' } })
    ),
  pasteSelection: (options: FlowPasteOptions = {}) =>
    runtimePorts.actions.send(
      HostAction.Clipboard({ command: { kind: 'paste', options } })
    ),
  setClipboardFragment: (
    input: Parameters<FlowClipboardActions['setClipboardFragment']>[0]
  ) =>
    runtimePorts.actions.send(
      HostAction.Clipboard({ command: { kind: 'set', input } })
    ),
})

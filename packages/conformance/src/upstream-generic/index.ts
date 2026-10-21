import edgesGeneral from './edges/general.ts'
import { decodeGenericConfig } from './model.ts'
import toolbarGeneral from './node-toolbar/general.ts'
import nodesGeneral from './nodes/general.ts'
import paneActivationKeys from './pane/activation-keys.ts'
import paneGeneral from './pane/general.ts'
import paneNonDefaults from './pane/non-defaults.ts'

export { toolbarOptions } from './model.ts'

export type { GenericConfig } from './model.ts'

const configs = new Map([
  ['pane/general', paneGeneral],
  ['pane/non-defaults', paneNonDefaults],
  ['pane/activation-keys', paneActivationKeys],
  ['nodes/general', nodesGeneral],
  ['edges/general', edgesGeneral],
  ['node-toolbar/general', toolbarGeneral],
  [
    'color-mode',
    decodeGenericConfig({
      document: {
        nodes: [
          {
            id: 'A',
            label: 'A',
            position: { x: 0, y: 150 },
            sourcePosition: 'right',
            targetPosition: 'left',
            type: 'input',
          },
          { id: 'B', label: 'B', position: { x: 250, y: 0 } },
          { id: 'C', label: 'C', position: { x: 250, y: 150 } },
          { id: 'D', label: 'D', position: { x: 250, y: 300 } },
        ],
        edges: ['B', 'C', 'D'].map((target) => ({
          id: `A-${target}`,
          source: 'A',
          target,
        })),
      },
      options: { fitView: true },
    }),
  ],
  [
    'backgrounds',
    decodeGenericConfig({
      document: {
        nodes: [{ id: '1', label: 'Node 1', position: { x: 50, y: 50 } }],
        edges: [],
      },
      options: {},
    }),
  ],
])

export const upstreamGenericConfig = (path: string) => {
  const config = configs.get(path)

  if (config === undefined) {
    throw new Error(`Unknown upstream config: ${path}`)
  }

  return config
}

import { decodeFlowDocument } from '@flow/core'
import type { FlowDocument } from '@flow/core'
import {
  createFoldkitBaseNode,
  createFoldkitBaseHandle,
  createFoldkitControlButton,
  createFoldkitStatusIndicator,
  createFoldkitAppendix,
  createFoldkitTooltip,
  createFoldkitLabeledHandle,
  createFoldkitDatabaseSchema,
  createFoldkitPlaceholder,
  createFoldkitNodeMeasurementObserver,
  createProgram,
  HostAction,
  ports,
} from '@flow/foldkit'
import type { FoldkitNodeMeasurementObserver } from '@flow/foldkit'
import { Effect } from 'effect'
import { Runtime } from 'foldkit'

const document: FlowDocument = Effect.runSync(
  decodeFlowDocument({
    nodes: [
      {
        id: 'foldkit-type',
        label: 'Foldkit',
        position: { x: 0, y: 0 },
        type: 'base-handle',
        handles: [{ id: 'result', kind: 'source', side: 'right' }],
      },
    ],
    edges: [],
  })
)

const rendererRegistry = {
  nodeTypes: {
    'base-handle': (node, h) =>
      createFoldkitBaseNode(
        node.label,
        h,
        h.div(
          [],
          [
            createFoldkitStatusIndicator('ready', h, 'Schema loaded'),
            createFoldkitDatabaseSchema(
              {
                name: 'users',
                fields: [
                  {
                    id: 'id',
                    name: 'id',
                    type: 'uuid',
                    kind: 'source',
                    side: 'right',
                  },
                ],
              },
              h
            ),
            ...(node.handles ?? []).flatMap((handle) => [
              createFoldkitBaseHandle({ handle, label: 'Output handle' }, h),
              createFoldkitLabeledHandle(
                { id: handle.id, label: 'Output', side: handle.side },
                h
              ),
            ]),
          ]
        )
      ),
  },
} satisfies NonNullable<Parameters<typeof createProgram>[6]>

const program = createProgram(
  null,
  document,
  { x: 0, y: 0, zoom: 1 },
  [],
  'uncontrolled',
  'uncontrolled',
  rendererRegistry
)

const hostAction = HostAction.ReplaceDocument({ document })

const portSet: typeof ports = ports

const measurement: FoldkitNodeMeasurementObserver =
  createFoldkitNodeMeasurementObserver({
    owner: globalThis.document.body,
    onMeasure: (request) => {
      void request
    },
  })

void [
  program,
  hostAction,
  portSet,
  measurement,
  createFoldkitBaseNode,
  createFoldkitBaseHandle,
  createFoldkitControlButton,
  createFoldkitStatusIndicator,
  createFoldkitAppendix,
  createFoldkitTooltip,
  createFoldkitLabeledHandle,
  createFoldkitDatabaseSchema,
  createFoldkitPlaceholder,
  Runtime,
]

export const mountPackedNodeContent = (owner: Document): (() => void) => {
  const content = owner.createElement('div')

  const button = createFoldkitControlButton(owner, {
    type: 'button',
    disabled: false,
    name: 'schema-action',
    value: 'refresh',
    aria: { 'aria-label': 'Refresh schema' },
    style: { color: 'navy', '--consumer-accent': 'blue' },
    children: [owner.createTextNode('Refresh')],
    onClick: (event) => (content.dataset.lastButton = String(event.button)),
  })

  const placeholder = createFoldkitPlaceholder(owner, {
    label: 'Add table',
    onActivate: () => {
      content.dataset.added = 'true'
    },
  })

  content.append(button, placeholder)
  owner.body.append(content)

  const appendix = createFoldkitAppendix(content, {
    id: 'packed-schema-details',
    title: 'Details',
    content: 'Caller-owned schema',
    expanded: true,
  })

  const tooltip = createFoldkitTooltip(button, 'Refresh caller-owned data')

  return () => {
    tooltip.destroy()
    appendix.destroy()
    content.remove()
  }
}

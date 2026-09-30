import {
  decodeFlowDocument,
  encodeSavedFlowDocument,
  encodeSavedFlowSession,
  SavedFlowFormatFailureCodeSchema,
  SavedFlowFormatError,
} from '@flow/core'
import type {
  FlowDocument,
  SavedFlowDocument,
  SavedFlowSession,
  SavedFlowFormatFailureCode,
} from '@flow/core'
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
  createFoldkitSnapshotClient,
  FoldkitSnapshotResultSchema,
  LegacySnapshotFailureSchema,
  HostAction,
  ports,
} from '@flow/foldkit'
import type {
  FoldkitNodeMeasurementObserver,
  FoldkitSnapshotResult,
} from '@flow/foldkit'
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

// Packed declarations must retain literal-v1 and the mandatory correlated failure port.
const savedDocument: SavedFlowDocument = encodeSavedFlowDocument(document)

const savedSession: SavedFlowSession = encodeSavedFlowSession(document, {
  x: 0,
  y: 0,
  zoom: 1,
})

const documentVersion: 1 = savedDocument.version

const sessionVersion: 1 = savedSession.version

// @ts-expect-error A legacy writer never advertises a version-2 envelope.
const unsupportedVersion: 2 = savedSession.version

const code: SavedFlowFormatFailureCode =
  'native-fields-require-versioned-session'

const formatError = new SavedFlowFormatError({ code })

const failedResult: FoldkitSnapshotResult = {
  status: 'failed',
  requestId: 'packed',
  reason: code,
}

const invalidResult: FoldkitSnapshotResult = {
  status: 'failed',
  requestId: 'invalid',
  reason: 'invalid-request',
}

// @ts-expect-error Failure codes are an exhaustive public contract.
const unsupportedCode: SavedFlowFormatFailureCode = 'unknown-format'

const mountSnapshotClient = (handle: Runtime.EmbedHandle<typeof ports>) =>
  createFoldkitSnapshotClient(handle.ports)

const incompletePorts = {
  snapshots: { subscribe: () => () => null },
  snapshotRequests: { send: () => true },
}

// @ts-expect-error The failure subscription cannot be omitted from a client owner.
createFoldkitSnapshotClient(incompletePorts)

void [
  documentVersion,
  sessionVersion,
  unsupportedVersion,
  unsupportedCode,
  formatError,
  failedResult,
  invalidResult,
  mountSnapshotClient,
  FoldkitSnapshotResultSchema,
  LegacySnapshotFailureSchema,
  SavedFlowFormatFailureCodeSchema,
]

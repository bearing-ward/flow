import type {
  FlowDocumentSchema,
  FlowInternalNodeSchema,
  FlowSnapshotSchema,
  NodeInternalsRefreshResultSchema,
  ConnectionPreviewSnapshotSchema,
  SavedFlowSessionSchema,
} from '../../packages/core/src/public.ts'

export interface HandleRefreshFixture {
  readonly refresh: (
    ids: string | readonly string[]
  ) => Promise<readonly (typeof NodeInternalsRefreshResultSchema.Encoded)[]>
  readonly internal: (
    id: string
  ) => Promise<typeof FlowInternalNodeSchema.Encoded | null>
  readonly snapshot: () => Promise<typeof FlowSnapshotSchema.Encoded>
  readonly preview: () => Promise<
    typeof ConnectionPreviewSnapshotSchema.Encoded
  >
  readonly saved: () => Promise<typeof SavedFlowSessionSchema.Encoded>
  readonly replace: (
    document: typeof FlowDocumentSchema.Encoded
  ) => Promise<void>
  readonly dispose: () => void
}

declare global {
  interface Window {
    __handleRefresh?: HandleRefreshFixture
  }
}

export const handleRefreshDocument = {
  nodes: [
    {
      id: 'parent',
      label: 'Parent',
      position: { x: 30, y: 40 },
      size: { width: 180, height: 160 },
    },
    {
      id: 'source',
      label: 'Source',
      parentId: 'parent',
      position: { x: 20, y: 30 },
      size: { width: 120, height: 80 },
      handles: [{ id: 'out', kind: 'source', side: 'right' }],
    },
    {
      id: 'target',
      label: 'Target',
      position: { x: 350, y: 110 },
      size: { width: 120, height: 80 },
      handles: [
        { id: 'in', kind: 'target', side: 'left' },
        { id: 'other', kind: 'target', side: 'left' },
      ],
    },
  ],
  edges: [
    {
      id: 'initial',
      source: 'source',
      sourceHandle: 'out',
      target: 'target',
      targetHandle: 'in',
      path: 'straight',
    },
  ],
} satisfies typeof FlowDocumentSchema.Encoded

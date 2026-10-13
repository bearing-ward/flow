import { applyFlowElementChanges } from '@flow/core'
import type { FlowDocument, FlowElementChanges } from '@flow/core'
import type { Schema } from 'effect'

import type { ElementChangesSchema } from './application.ts'

/**
 * The controlled update helper for the `elementChanges` port, React Flow's
 * `applyNodeChanges`/`applyEdgeChanges` over one document:
 * `document = applyFoldkitElementChanges(document, changes)`.
 */
export const applyFoldkitElementChanges = (
  document: FlowDocument,
  changes: Schema.Schema.Type<typeof ElementChangesSchema>
): FlowDocument =>
  // SAFETY: the port schema is core's NodeChange/EdgeChange schemas; its
  // decoded type only also admits explicit undefined for optional fields.
  applyFlowElementChanges(document, changes as FlowElementChanges)

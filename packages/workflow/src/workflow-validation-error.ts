import { Schema as S } from 'effect'

import { WorkflowIssueSchema } from './workflow.schema.ts'

const tagged = S.TaggedError

export class WorkflowValidationError extends tagged<WorkflowValidationError>()(
  'WorkflowValidationError',
  { issues: S.Array(WorkflowIssueSchema) }
) {}

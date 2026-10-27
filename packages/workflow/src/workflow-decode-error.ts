import { Schema as S } from 'effect'

const tagged = S.TaggedError

export class WorkflowDecodeError extends tagged<WorkflowDecodeError>()(
  'WorkflowDecodeError',
  { code: S.Literal('invalid-document') }
) {}

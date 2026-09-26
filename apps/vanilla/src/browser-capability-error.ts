import { Data } from 'effect'

export class BrowserCapabilityError extends Data.TaggedError(
  'BrowserCapabilityError'
)<{
  readonly capability: string
  readonly operation: string
  readonly cause: unknown
}> {}

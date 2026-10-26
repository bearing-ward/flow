import { Schema } from 'effect'

export const SavedFlowFormatFailureCodeSchema = Schema.Literals([
  'origin-requires-versioned-session',
  'native-fields-require-versioned-session',
  'noncanonical-handles-require-versioned-session',
  'presentation-fields-require-versioned-session',
  'route-requires-versioned-session',
  'bundles-require-versioned-session',
])

export type SavedFlowFormatFailureCode =
  typeof SavedFlowFormatFailureCodeSchema.Type

const tagged = Schema.TaggedError

/** A legacy save cannot represent the accepted document's explicit semantics. */
export class SavedFlowFormatError extends tagged<SavedFlowFormatError>()(
  'SavedFlowFormatError',
  { code: SavedFlowFormatFailureCodeSchema }
) {}

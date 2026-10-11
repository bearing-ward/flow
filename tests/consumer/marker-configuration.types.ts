import {
  FlowEdgeMarkerConfigurationSchema,
  FlowEdgeMarkerValueSchema,
} from '@flow/core'
import type {
  FlowEdgeMarkerSchema,
  FlowEdgeMarkerConfiguration,
  FlowEdgeMarkerValue,
  FlowEdgeMarker,
  FlowEdge,
} from '@flow/core'
import type { Effect } from 'effect'
import { Schema as S } from 'effect'

const configurationJson = S.toCodecJson(FlowEdgeMarkerConfigurationSchema)

const valueJson = S.toCodecJson(FlowEdgeMarkerValueSchema)

const caller = S.Struct({ start: S.optional(FlowEdgeMarkerValueSchema) })

export const markerConfigurationPositiveProof = (
  configuration: FlowEdgeMarkerConfiguration,
  encoded: typeof FlowEdgeMarkerConfigurationSchema.Encoded,
  value: FlowEdgeMarkerValue,
  encodedValue: typeof FlowEdgeMarkerValueSchema.Encoded,
  json: S.Json
) => {
  const toEncoded: typeof FlowEdgeMarkerConfigurationSchema.Encoded =
    configuration

  const toType: FlowEdgeMarkerConfiguration = encoded
  const valueToEncoded: typeof FlowEdgeMarkerValueSchema.Encoded = value
  const encodedToValue: FlowEdgeMarkerValue = encodedValue
  const jsonType: typeof configurationJson.Type = configuration
  const jsonValueType: typeof valueJson.Type = value
  const configurationWire: typeof configurationJson.Encoded = json
  const valueWire: typeof valueJson.Encoded = json
  const configurationWireJson: S.Json = configurationWire
  const valueWireJson: S.Json = valueWire

  const allFields: FlowEdgeMarkerConfiguration = {
    type: 'arrowclosed',
    color: null,
    width: 0,
    height: 1.25,
    strokeWidth: Number.MAX_VALUE,
    markerUnits: '',
    orient: 'custom 73',
  }

  const ownUndefined: FlowEdgeMarkerConfiguration = {
    type: 'arrow',
    color: undefined,
    width: undefined,
    height: undefined,
    strokeWidth: undefined,
    markerUnits: undefined,
    orient: undefined,
  }

  const configurationDecode: Effect.Effect<
    FlowEdgeMarkerConfiguration,
    S.SchemaError
  > = S.decodeUnknownEffect(FlowEdgeMarkerConfigurationSchema)(allFields)

  const configurationEncode: Effect.Effect<
    typeof FlowEdgeMarkerConfigurationSchema.Encoded,
    S.SchemaError
  > = S.encodeEffect(FlowEdgeMarkerConfigurationSchema)(ownUndefined)

  const valueDecode: Effect.Effect<FlowEdgeMarkerValue, S.SchemaError> =
    S.decodeUnknownEffect(FlowEdgeMarkerValueSchema)('')

  const valueEncode: Effect.Effect<
    typeof FlowEdgeMarkerValueSchema.Encoded,
    S.SchemaError
  > = S.encodeEffect(FlowEdgeMarkerValueSchema)(configuration)

  const jsonDecode: Effect.Effect<FlowEdgeMarkerConfiguration, S.SchemaError> =
    S.decodeUnknownEffect(configurationJson)(json)

  const jsonEncode: Effect.Effect<S.Json, S.SchemaError> =
    S.encodeEffect(configurationJson)(configuration)

  const jsonValueDecode: Effect.Effect<FlowEdgeMarkerValue, S.SchemaError> =
    S.decodeUnknownEffect(valueJson)(json)

  const jsonValueEncode: Effect.Effect<S.Json, S.SchemaError> =
    S.encodeEffect(valueJson)(value)

  const legacy: FlowEdgeMarker = 'arrow'
  const legacySchema: typeof FlowEdgeMarkerSchema.Type = legacy
  const callerValue: typeof caller.Type = { start: ownUndefined }

  return {
    toEncoded,
    toType,
    valueToEncoded,
    encodedToValue,
    jsonType,
    jsonValueType,
    configurationWireJson,
    valueWireJson,
    allFields,
    ownUndefined,
    configurationDecode,
    configurationEncode,
    valueDecode,
    valueEncode,
    jsonDecode,
    jsonEncode,
    jsonValueDecode,
    jsonValueEncode,
    legacySchema,
    callerValue,
  }
}

// These bodies are compiled but never called. Every directive must be consumed.
// eslint-disable-next-line anti-slop/no-known-value-widening -- compiler proof must keep the public input unknown until decoded.
const unchecked: unknown = { type: 'arrow' }

export const markerConfigurationNegativeProof = (
  configuration: FlowEdgeMarkerConfiguration
) => {
  // @ts-expect-error direct marker null is outside the live value contract
  const directNull: FlowEdgeMarkerValue = null
  // @ts-expect-error direct marker undefined belongs to a caller's optional composition
  const directUndefined: FlowEdgeMarkerValue = undefined
  // @ts-expect-error caller endpoint null is excluded
  const endpointNull: typeof caller.Type = { start: null }
  // @ts-expect-error configuration requires a kind
  const missingKind: FlowEdgeMarkerConfiguration = {}
  // @ts-expect-error kind remains exactly the two built-in literals
  const wrongKind: FlowEdgeMarkerConfiguration = { type: 'circle' }
  // @ts-expect-error color cannot be numeric
  const numericColor: FlowEdgeMarkerConfiguration = { type: 'arrow', color: 1 }
  // @ts-expect-error width null is only a canonical wire sentinel
  const nullWidth: FlowEdgeMarkerConfiguration = { type: 'arrow', width: null }

  const nullHeight: FlowEdgeMarkerConfiguration = {
    type: 'arrow',
    // @ts-expect-error height null is only a canonical wire sentinel
    height: null,
  }

  const nullStrokeWidth: FlowEdgeMarkerConfiguration = {
    type: 'arrow',
    // @ts-expect-error strokeWidth null is only a canonical wire sentinel
    strokeWidth: null,
  }

  const nullUnits: FlowEdgeMarkerConfiguration = {
    type: 'arrow',
    // @ts-expect-error markerUnits null is only a canonical wire sentinel
    markerUnits: null,
  }

  const nullOrient: FlowEdgeMarkerConfiguration = {
    type: 'arrow',
    // @ts-expect-error orient null is only a canonical wire sentinel
    orient: null,
  }

  const numericUnits: FlowEdgeMarkerConfiguration = {
    type: 'arrow',
    // @ts-expect-error units are strings
    markerUnits: 1,
  }

  const numericOrient: FlowEdgeMarkerConfiguration = {
    type: 'arrow',
    // @ts-expect-error orient is a string
    orient: 1,
  }

  const reservedFlag: FlowEdgeMarkerConfiguration = {
    type: 'arrow',
    // @ts-expect-error live wire metadata is forbidden
    colorPresence: 'explicit-undefined',
  }

  // @ts-expect-error function is not a live marker value
  const functionValue: FlowEdgeMarkerValue = () => configuration.type
  // @ts-expect-error unknown must be decoded at the boundary
  const unknownConfiguration: FlowEdgeMarkerConfiguration = unchecked
  // @ts-expect-error validating Declaration does not promise Struct fields
  const { fields } = FlowEdgeMarkerConfigurationSchema
  // @ts-expect-error validating Declaration does not promise Struct mapFields
  const { mapFields } = FlowEdgeMarkerConfigurationSchema
  // @ts-expect-error graph marker integration is not part of this foundation
  const existingEndpoint: FlowEdge['markerStart'] = configuration
  // @ts-expect-error old marker kind does not widen to arbitrary logical strings
  const existingKind: FlowEdgeMarker = 'custom:marker'

  const encodedNull: typeof FlowEdgeMarkerConfigurationSchema.Encoded = {
    type: 'arrow',
    // @ts-expect-error public ordinary Encoded cannot contain wire null numerics
    width: null,
  }

  // @ts-expect-error public ordinary value Encoded excludes null
  const encodedValueNull: typeof FlowEdgeMarkerValueSchema.Encoded = null

  return {
    directNull,
    directUndefined,
    endpointNull,
    missingKind,
    wrongKind,
    numericColor,
    nullWidth,
    nullHeight,
    nullStrokeWidth,
    nullUnits,
    nullOrient,
    numericUnits,
    numericOrient,
    reservedFlag,
    functionValue,
    unknownConfiguration,
    fields,
    mapFields,
    existingEndpoint,
    existingKind,
    encodedNull,
    encodedValueNull,
  }
}

// These constraints prove the actual inferred service requirements are never.
type NoServices<R extends never> = R

export type MarkerConfigurationDecodeServices = NoServices<
  typeof FlowEdgeMarkerConfigurationSchema.DecodingServices
>

export type MarkerConfigurationEncodeServices = NoServices<
  typeof FlowEdgeMarkerConfigurationSchema.EncodingServices
>

export type MarkerValueDecodeServices = NoServices<
  typeof FlowEdgeMarkerValueSchema.DecodingServices
>

export type MarkerValueEncodeServices = NoServices<
  typeof FlowEdgeMarkerValueSchema.EncodingServices
>

export type MarkerJsonDecodeServices = NoServices<
  typeof configurationJson.DecodingServices
>

export type MarkerJsonEncodeServices = NoServices<
  typeof configurationJson.EncodingServices
>

export type MarkerValueJsonDecodeServices = NoServices<
  typeof valueJson.DecodingServices
>

export type MarkerValueJsonEncodeServices = NoServices<
  typeof valueJson.EncodingServices
>

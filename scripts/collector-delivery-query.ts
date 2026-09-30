import { Schema } from 'effect'

import { FlowAttribute, FlowSpan } from '../packages/core/src/public.ts'

const Value = Schema.Struct({
  stringValue: Schema.optional(Schema.String),
  intValue: Schema.optional(Schema.Union([Schema.String, Schema.Number])),
  boolValue: Schema.optional(Schema.Boolean),
})

const Attribute = Schema.Struct({ key: Schema.String, value: Value })

const Attributes = Schema.Array(Attribute)

const Span = Schema.Struct({
  name: Schema.String,
  traceId: Schema.String,
  spanId: Schema.String,
  parentSpanId: Schema.optional(Schema.String),
  attributes: Schema.optional(Attributes),
})

const Log = Schema.Struct({
  traceId: Schema.optional(Schema.String),
  spanId: Schema.optional(Schema.String),
  body: Value,
  attributes: Schema.optional(Attributes),
})

const Resource = Schema.Struct({ attributes: Schema.optional(Attributes) })

const TracePayload = Schema.Struct({
  resourceSpans: Schema.Array(
    Schema.Struct({
      resource: Resource,
      scopeSpans: Schema.Array(Schema.Struct({ spans: Schema.Array(Span) })),
    })
  ),
})

const LogPayload = Schema.Struct({
  resourceLogs: Schema.Array(
    Schema.Struct({
      resource: Resource,
      scopeLogs: Schema.Array(Schema.Struct({ logRecords: Schema.Array(Log) })),
    })
  ),
})

const attribute = (
  attributes: typeof Attributes.Type | undefined,
  key: string
) => attributes?.find((item) => item.key === key)?.value.stringValue

export const queryCollectorDelivery = (
  traceLines: readonly unknown[],
  logLines: readonly unknown[],
  serviceName: string
) => {
  const spans = traceLines.flatMap((line) =>
    Schema.decodeUnknownSync(TracePayload)(line)
      .resourceSpans.filter(
        (entry) =>
          attribute(entry.resource.attributes, 'service.name') === serviceName
      )
      .flatMap((entry) => entry.scopeSpans.flatMap((scope) => scope.spans))
  )

  const logs = logLines.flatMap((line) =>
    Schema.decodeUnknownSync(LogPayload)(line)
      .resourceLogs.filter(
        (entry) =>
          attribute(entry.resource.attributes, 'service.name') === serviceName
      )
      .flatMap((entry) => entry.scopeLogs.flatMap((scope) => scope.logRecords))
  )

  const required = [
    FlowSpan.documentDecode,
    FlowSpan.documentIntegrity,
    FlowSpan.hostMount,
    FlowSpan.controllerUpdate,
    FlowSpan.gestureCancel,
    FlowSpan.hostDestroy,
  ]

  const matched = required.map((name) => {
    const candidates = spans.filter((span) => span.name === name)

    if (candidates.length === 0) {
      throw new Error(`Missing retained span ${name} for ${serviceName}`)
    }

    if (name === FlowSpan.documentDecode) {
      return { name, count: candidates.length }
    }

    const expectedBody = new Map<string, string>([
      [FlowSpan.documentIntegrity, 'Rejected flow document integrity'],
      [FlowSpan.hostMount, 'Mounted flow host'],
      [FlowSpan.controllerUpdate, 'Updated flow controller'],
      [FlowSpan.gestureCancel, 'Cancelled node gesture'],
      [FlowSpan.hostDestroy, 'Destroyed flow host'],
    ]).get(name)

    const correlated = candidates.find((span) => {
      const logSpan =
        name === FlowSpan.hostDestroy
          ? spans.find(
              (child) =>
                child.name === FlowSpan.browserLifecycleClose &&
                child.parentSpanId === span.spanId &&
                child.traceId === span.traceId
            )
          : span

      return (
        logSpan !== undefined &&
        logs.some(
          (log) =>
            log.traceId === logSpan.traceId &&
            log.spanId === logSpan.spanId &&
            log.body.stringValue === expectedBody &&
            /^[\da-f]{32}$/u.test(logSpan.traceId) &&
            /^[\da-f]{16}$/u.test(logSpan.spanId)
        )
      )
    })

    if (correlated === undefined) {
      throw new Error(`Missing correlated retained log for ${name}`)
    }

    if (
      name === FlowSpan.gestureCancel &&
      attribute(correlated.attributes, FlowAttribute.cancellationReason) !==
        'pointer-cancel'
    ) {
      throw new Error('Missing pointer cancellation reason')
    }

    if (
      name === FlowSpan.documentIntegrity &&
      attribute(correlated.attributes, FlowAttribute.documentIssue) !==
        'duplicate-node-id'
    ) {
      throw new Error('Missing decode integrity failure attribute')
    }

    return {
      name,
      count: candidates.length,
      traceId: correlated.traceId,
      spanId: correlated.spanId,
    }
  })

  return {
    serviceName,
    spanCount: spans.length,
    logCount: logs.length,
    matched,
  }
}

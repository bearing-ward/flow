import { describe, expect, it } from 'vitest'

import { FlowSpan } from '../packages/core/src/public.ts'
import { queryCollectorDelivery } from './collector-delivery-query.ts'

const serviceName = 'flow-collector-query-test'

const fixture = () => {
  const traceId = '1'.repeat(32)

  const attributes = [
    { key: 'service.name', value: { stringValue: serviceName } },
  ]

  const names = [
    FlowSpan.documentDecode,
    FlowSpan.documentIntegrity,
    FlowSpan.hostMount,
    FlowSpan.controllerUpdate,
    FlowSpan.gestureCancel,
    FlowSpan.hostDestroy,
    FlowSpan.browserLifecycleClose,
  ]

  const spans = names.map((name, index) => ({
    name,
    traceId,
    spanId: `${index + 1}`.repeat(16),
    parentSpanId: name === FlowSpan.browserLifecycleClose ? '6'.repeat(16) : '',
    attributes:
      {
        [FlowSpan.documentIntegrity]: [
          {
            key: 'flow.document.issue',
            value: { stringValue: 'duplicate-node-id' },
          },
        ],
        [FlowSpan.gestureCancel]: [
          {
            key: 'flow.cancellation.reason',
            value: { stringValue: 'pointer-cancel' },
          },
        ],
      }[name] ?? [],
  }))

  const bodies = [
    'Decoded flow document',
    'Rejected flow document integrity',
    'Mounted flow host',
    'Updated flow controller',
    'Cancelled node gesture',
    'Destroyed flow host',
  ]

  const logs = bodies.map((body, index) => ({
    body: { stringValue: body },
    traceId,
    spanId: `${index === 5 ? 7 : index + 1}`.repeat(16),
  }))

  return {
    spans,
    logs,
    traces: [
      {
        resourceSpans: [{ resource: { attributes }, scopeSpans: [{ spans }] }],
      },
    ],
    payloads: [
      {
        resourceLogs: [
          { resource: { attributes }, scopeLogs: [{ logRecords: logs }] },
        ],
      },
    ],
  }
}

describe('collector retained output query', () => {
  it('requires real retained span/log relationships including destroy child nesting', () => {
    const evidence = fixture()
    expect(
      queryCollectorDelivery(evidence.traces, evidence.payloads, serviceName)
        .matched
    ).toHaveLength(6)
  })

  it('rejects missing, malformed and foreign-run evidence', () => {
    const evidence = fixture()
    expect(() => queryCollectorDelivery([], [], serviceName)).toThrow(
      'Missing retained span'
    )
    expect(() => queryCollectorDelivery([{}], [], serviceName)).toThrow(
      'Missing key'
    )
    expect(() =>
      queryCollectorDelivery(evidence.traces, evidence.payloads, 'other-run')
    ).toThrow('Missing retained span')
  })

  it('rejects same-name logs that belong to another trace', () => {
    const evidence = fixture()

    const mount = evidence.logs.find(
      (log) => log.body.stringValue === 'Mounted flow host'
    )

    if (mount === undefined) {
      throw new Error('Missing test fixture mount log')
    }

    mount.traceId = 'f'.repeat(32)
    expect(() =>
      queryCollectorDelivery(evidence.traces, evidence.payloads, serviceName)
    ).toThrow('Missing correlated retained log for flow.host.mount')
  })

  it('rejects an integrity issue borrowed from another uncorrelated candidate', () => {
    const evidence = fixture()

    const rejection = evidence.spans.find(
      (span) => span.name === FlowSpan.documentIntegrity
    )

    if (rejection === undefined) {
      throw new Error('Missing fixture rejection span')
    }

    evidence.spans.push({ ...rejection, spanId: 'a'.repeat(16) })
    rejection.attributes = []
    expect(() =>
      queryCollectorDelivery(evidence.traces, evidence.payloads, serviceName)
    ).toThrow('Missing decode integrity failure attribute')
  })

  it('rejects destroy logs with the wrong retained parent span', () => {
    const evidence = fixture()

    const child = evidence.spans.find(
      (span) => span.name === FlowSpan.browserLifecycleClose
    )

    if (child === undefined) {
      throw new Error('Missing test fixture destroy child')
    }

    child.parentSpanId = 'f'.repeat(16)
    expect(() =>
      queryCollectorDelivery(evidence.traces, evidence.payloads, serviceName)
    ).toThrow('Missing correlated retained log for flow.host.destroy')
  })
})

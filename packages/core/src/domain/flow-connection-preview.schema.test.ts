import { Schema as S } from 'effect'
import { describe, expect, it } from 'vitest'

import {
  ConnectionPreviewStateSchema,
  createConnectionPreviewSnapshot,
} from './flow-connection-preview.schema.ts'

describe('connection preview state', () => {
  it('decodes connection state with candidate validity', () => {
    const preview = S.decodeUnknownSync(ConnectionPreviewStateSchema)({
      kind: 'connect',
      from: { x: 0, y: 10 },
      to: { x: 100, y: 20 },
      candidate: {
        source: 'source',
        sourceHandle: 'out',
        target: 'target',
        targetHandle: 'in',
      },
      valid: true,
    })

    expect(preview).toMatchObject({ kind: 'connect', valid: true })
  })

  it('requires reconnect endpoint identity', () => {
    const preview = S.decodeUnknownSync(ConnectionPreviewStateSchema)({
      kind: 'reconnect',
      from: { x: 0, y: 0 },
      to: { x: 10, y: 20 },
      candidate: null,
      valid: null,
      edgeId: 'edge-1',
      endpoint: 'target',
    })

    expect(preview).toMatchObject({
      kind: 'reconnect',
      edgeId: 'edge-1',
      endpoint: 'target',
    })
  })

  it('creates a detached frozen transient snapshot and represents idle as null', () => {
    const input = {
      kind: 'connect' as const,
      from: { x: 0, y: 10 },
      to: { x: 100, y: 20 },
      candidate: null,
      valid: null,
    }

    const snapshot = createConnectionPreviewSnapshot(input)

    expect(createConnectionPreviewSnapshot(null)).toBeNull()
    expect(snapshot).not.toBe(input)
    expect(snapshot).toStrictEqual(input)
    expect(Object.isFrozen(snapshot)).toBeTruthy()
    expect(
      snapshot?.kind === 'connect' && Object.isFrozen(snapshot.from)
    ).toBeTruthy()
  })
})

import { describe, expect, it } from 'vitest'

import * as fixture from './gesture-fixture.ts'

const dispatchCases = [
  ['node', 0, 'pointerup'],
  ['connection', 0, 'pointerup'],
  ['reconnection', 0, 'pointerup'],
  ['connection', 5, 'pointerup'],
  ['node', 0, 'pointercancel'],
] satisfies Parameters<typeof fixture.terminalDispatchReentry>[]

describe('vanilla gesture ordering', () => {
  it.each(dispatchCases)(
    'synthetic successor %s threshold %s after %s',
    async (actor, threshold, terminal) => {
      const result = await fixture.terminalDispatchReentry(
        actor,
        threshold,
        terminal
      )

      expect(result.afterA.held).toBe(1)
      expect(result.final.held).toBe(0)
      expect(result.final.changes.map((change) => change.kind)).toStrictEqual([
        ...(terminal === 'pointerup' ? ['node-position'] : []),
        {
          node: 'node-position',
          connection: 'edge-add',
          reconnection: 'edge-reconnect',
        }[actor],
      ])
      expect(result.final.captureHistory).toStrictEqual([
        { action: 'set', target: 'a', id: 7 },
        { action: 'release', target: 'a', id: 7 },
        { action: 'set', target: actor === 'node' ? 'b' : 'canvas', id: 7 },
        { action: 'release', target: actor === 'node' ? 'b' : 'canvas', id: 7 },
      ])
      expect(result.final.events.map((event) => event.name)).toStrictEqual([
        'nodeStart',
        'nodeStop',
        ...{
          node: ['nodeStart', 'nodeStop'],
          connection: ['connectStart', 'connect', 'connectEnd'],
          reconnection: ['reconnectStart', 'reconnect', 'reconnectEnd'],
        }[actor],
      ])
    }
  )

  it.each(['ordinary', 'nested', 'redispatch', 'outside', 'loss'] as const)(
    'captured Escape %s',
    async (mode) => {
      const result = await fixture.escapeDispatchProof(mode)
      expect(result.competing.held).toBe(1)
      expect(result.final.held).toBe(
        mode === 'nested' || mode === 'redispatch' ? 0 : 1
      )
      expect(result.prevented).toBeTruthy()
      expect(result.afterContinuation.held).toBe(1)
      expect(result.final.captureHistory).toStrictEqual([
        { action: 'set', target: 'a', id: 7 },
        { action: 'release', target: 'a', id: 7 },
        { action: 'set', target: 'b', id: 7 },
        { action: 'release', target: 'b', id: 7 },
        { action: 'set', target: 'c', id: 7 },
        ...(mode === 'nested' || mode === 'redispatch'
          ? [{ action: 'release', target: 'c', id: 7 }]
          : []),
      ])
    }
  )

  it.each(['connection', 'selection', 'node'] as const)(
    'frozen old %s frame cannot advance B',
    async (actor) => {
      const result = await fixture.frozenFrameProof(actor)
      expect(result.oldFrameCount).toBeGreaterThan(0)
      expect(result.after).toStrictEqual(result.before)
      expect(result.after.held).toBe(1)
    }
  )

  it('matching loss cancels only its original capture owner', async () => {
    const result = await fixture.matchingLossProof()
    expect(result.wrong).toStrictEqual(result.before)
    expect(result.stale).toStrictEqual(result.afterLoss)
    expect(result.afterLoss.held).toBe(1)
    expect(result.final.held).toBe(0)
    expect(result.final.events.map((event) => event.name)).toStrictEqual([
      'start',
      'stop',
      'start',
      'change',
      'stop',
    ])
  })
})

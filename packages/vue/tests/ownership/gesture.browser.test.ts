import { describe, expect, it } from 'vitest'

import * as fixture from './gesture-fixture.ts'

const disposalCases = [
  ['physical-connect', false],
  ['physical-connect', true],
  ['physical-reconnect', false],
  ['retained-click', false],
  ['keyboard-reconnect', false],
  ['node-control', false],
] satisfies Parameters<typeof fixture.reactiveDisposal>[]

const drainCases = [
  ['physical-connect', 'physical', 'watch', false, false],
  ['physical-connect', 'physical', 'watch', true, false],
  ['physical-reconnect', 'physical', 'watch', false, false],
  ['retained-click', 'physical', 'watch', false, false],
  ['keyboard-reconnect', 'physical', 'watch', false, false],
  ['node-control', 'physical', 'watch', false, false],
  ['none', 'physical', 'terminal', false, false],
  ['selection', 'physical', 'terminal', false, false],
  ['pan', 'physical', 'terminal', false, false],
  ['physical-connect', 'click', 'watch', false, false],
  ['physical-connect', 'reconnect', 'watch', false, false],
  ['physical-connect', 'physical', 'release', true, false],
  ['physical-connect', 'physical', 'watch', false, true],
] satisfies Parameters<typeof fixture.disposalClaimsProof>[]

const completionCases = [
  ['physical-connect', false, false, 0],
  ['physical-connect', true, false, 0],
  ['physical-connect', false, true, 0],
  ['physical-connect', false, false, 5],
  ['physical-reconnect', false, false, 0],
  ['retained-click', false, false, 0],
  ['keyboard-reconnect', false, false, 0],
] satisfies Parameters<typeof fixture.reactiveCompletionProof>[]

const keyboardCases = [
  ['editor', 'ordinary'],
  ['renderer', 'ordinary'],
  ['editor', 'escape'],
  ['editor', 'error'],
  ['editor', 'dispose'],
  ['editor', 'error-dispose'],
] satisfies Parameters<typeof fixture.keyboardPreviewProof>[]

const selectionCases = [
  ['pointer', 'none', false],
  ['pointer', 'none', true],
  ['keyboard', 'none', false],
  ['pointer', 'start', false],
  ['pointer', 'progress', true],
  ['pointer', 'end', false],
] satisfies Parameters<typeof fixture.selectionContinuationProof>[]

const assertKeyboardCancellation = (
  result: Awaited<ReturnType<typeof fixture.keyboardPreviewProof>>,
  mode: Parameters<typeof fixture.keyboardPreviewProof>[1]
) => {
  if (mode !== 'ordinary') {
    expect(result.preview).toBeNull()
    expect(result.rendered).toBeNull()
    expect(
      result.events
        .filter((event) => event.name === 'reconnectEnd')
        .map((event) => event.payload)
    ).toStrictEqual([
      {
        status: 'cancelled',
        reason: mode.includes('dispose') ? 'superseded' : 'escape',
      },
    ])
  }
}

describe('vue gesture ordering', () => {
  it.each(disposalCases)(
    'public watcher %s recursive %s',
    async (route, recursive) => {
      const result = await fixture.reactiveDisposal(route, recursive)
      expect(result.held).toBe(0)
      expect(result.frameworkError).toBeNull()
      expect(
        result.events
          .filter(
            (event) => event.name.endsWith('End') || event.name.endsWith('Stop')
          )
          .map((event) => ({ name: event.name, held: event.held }))
      ).toStrictEqual(
        {
          'node-control': ['nodeDragEnd', 'nodeDragStop'],
          'retained-click': ['connectEnd', 'clickConnectEnd'],
          'physical-connect': ['connectEnd'],
          'physical-reconnect': ['reconnectEnd'],
          'keyboard-reconnect': ['reconnectEnd'],
        }[route].map((name) => ({ name, held: 0 }))
      )
      expect(
        result.events.filter((event) => event.name === 'beforeUnmount')
      ).toHaveLength(recursive ? 2 : 1)
    }
  )

  it.each(drainCases)(
    'drain %s claim %s entry %s recursive %s controlled %s',
    async (live, claim, entry, recursive, controlled) => {
      const result = await fixture.disposalClaimsProof(
        live,
        claim,
        entry,
        recursive,
        controlled
      )

      expect(result).toMatchObject({ held: 0, frameworkError: null })
      expect(
        result.events.filter((event) => event.name === 'validate')
      ).toHaveLength(2)
      expect(
        result.events.filter((event) =>
          ['connect', 'change', 'reconnect'].includes(event.name)
        )
      ).toStrictEqual([])
      expect(
        result.events
          .filter(
            (event) => event.name.endsWith('End') || event.name.endsWith('Stop')
          )
          .map((event) => event.held)
      ).toStrictEqual(
        Array.from(
          {
            length:
              (claim === 'click' ? 4 : 2) +
              {
                'physical-connect': 1,
                'physical-reconnect': 1,
                'retained-click': 2,
                'keyboard-reconnect': 1,
                'node-control': 2,
                none: 0,
                selection: 2,
                pan: 2,
              }[live],
          },
          () => 0
        )
      )
      expect(result.repeat.after).toStrictEqual(result.repeat.before)
    }
  )

  it.each(completionCases)(
    'completion watcher %s mounted %s controlled %s threshold %s',
    async (route, mounted, controlled, threshold) => {
      const result = await fixture.reactiveCompletionProof(
        route,
        mounted,
        controlled,
        threshold
      )

      expect(result.held).toBe(0)
      expect(result.lateQuiet).toBeTruthy()

      const terminal = result.events.find(
        (event) =>
          event.name ===
          (route.endsWith('reconnect') ? 'reconnectEnd' : 'connectEnd')
      )

      expect(terminal?.payload).toMatchObject(
        mounted
          ? { status: 'accepted', reason: 'valid-connection' }
          : { status: 'cancelled', reason: 'superseded' }
      )
      expect(
        result.events.filter((event) => event.name === 'change')
      ).toHaveLength(mounted ? 1 : 0)
      expect(result.accepted.document.edges).toHaveLength(mounted ? 2 : 1)
    }
  )

  it.each(keyboardCases)('keyboard preview %s %s', async (entry, mode) => {
    const result = await fixture.keyboardPreviewProof(entry, mode)
    expect(result.captures).toStrictEqual([])
    expect(result.held).toBe(0)
    expect(result.frameworkError).toBeNull()
    expect(result.measuredTarget).toStrictEqual({ node: 'c', handle: 'out' })
    expect(
      result.events
        .filter((event) => event.name === 'validate')
        .map((event) => event.payload)
    ).toStrictEqual([
      { source: 'c', sourceHandle: 'out', target: 'b', targetHandle: 'in' },
    ])

    assertKeyboardCancellation(result, mode)
  })

  it.each(selectionCases)(
    'selection %s at %s moved %s',
    async (input, trigger, moved) => {
      const result = await fixture.selectionContinuationProof(
        input,
        trigger,
        moved
      )

      expect(result.held).toBe(trigger === 'none' ? 0 : 1)
      const cancelled = trigger === 'start' || trigger === 'progress'
      let reason = 'no-selection-movement'

      if (cancelled) {
        reason = 'escape'
      } else if (moved) {
        reason = 'selection-complete'
      } else if (input === 'keyboard') {
        reason = 'selection-below-minimum-size'
      }

      expect(
        result.events
          .filter((event) => event.name === 'selectionEnd')
          .map((event) => event.payload)
      ).toStrictEqual([
        {
          status: !cancelled && moved ? 'accepted' : 'cancelled',
          reason,
        },
      ])
      expect(
        result.events.filter((event) => event.name === 'change')
      ).toHaveLength(!cancelled && moved ? 1 : 0)
      expect(
        result.events.filter((event) => event.name === 'nodeStart')
      ).toHaveLength(trigger === 'none' ? 0 : 1)
    }
  )

  it.each(['remove', 'kind', 'metadata'] as const)(
    'reconnect current endpoint %s',
    async (mutation) => {
      const result = await fixture.continuationRoundFourReconnect(mutation)
      expect(result.validationsAtCallback).toBeGreaterThan(0)
      expect(result).toMatchObject({
        validations: result.validationsAtCallback,
        held: 0,
      })
      expect(result.events.at(-1)).toStrictEqual({
        name: 'reconnectEnd',
        payload:
          mutation === 'metadata'
            ? {
                status: 'accepted',
                reason: 'valid-reconnection',
                connection: {
                  source: 'a',
                  sourceHandle: 'out',
                  target: 'c',
                  targetHandle: 'in',
                },
              }
            : { status: 'rejected', reason: 'invalid-target' },
      })
      expect(result.changes.map((change) => change.kind)).toStrictEqual(
        mutation === 'metadata' ? ['edge-reconnect'] : []
      )
      expect(result.document.edges[0]?.target).toBe(
        mutation === 'metadata' ? 'c' : 'b'
      )
    }
  )
})

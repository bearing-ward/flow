import { describe, expect, it } from 'vitest'

import * as fixture from './gesture-fixture.ts'
import * as oracle from './gesture-oracles.ts'

describe('vanilla gesture ordering', () => {
  it.each(oracle.axisCases0)(
    'synthetic dispatch $terminal to $actor $threshold',
    async (row) => {
      expect.hasAssertions()

      const { terminal, actor, threshold } = row

      const result = await fixture.terminalDispatchReentry(
        actor,
        threshold,
        terminal
      )

      oracle.assertSyntheticDispatchTo0(result, row)
    }
  )

  it.each(oracle.caseRows1)('captured Escape $mode', async (row) => {
    expect.hasAssertions()

    const { mode } = row

    const result = await fixture.escapeDispatchProof(mode)
    oracle.assertCapturedEscape1(result, row)
  })

  it('captured preview fanout', async () => {
    expect.hasAssertions()

    const result = await fixture.previewFanoutProof()
    oracle.assertCapturedPreviewFanout2(result)
  })

  it.each(oracle.axisCases1)('aggregate $actor $terminal', async (row) => {
    expect.hasAssertions()

    const { actor, terminal } = row

    const result = await fixture.aggregateEntryProof(actor, terminal)
    oracle.assertAggregate3(result, row)
  })

  it.each(oracle.caseRows4)(
    'frozen old $actor frame cannot advance B',
    async (row) => {
      expect.hasAssertions()

      const { actor } = row

      const result = await fixture.frozenFrameProof(actor)
      oracle.assertFrozenOldFrameCannotAdvanceB4(result, row)
    }
  )

  it('old reset timer preserves successor click suppression', async () => {
    expect.hasAssertions()

    const result = await fixture.suppressionTimerProof()
    oracle.assertOldResetTimerPreservesSuccessorClickSuppression5(result)
  })

  it('matching loss cancels only its original capture owner', async () => {
    expect.hasAssertions()

    const result = await fixture.matchingLossProof()
    oracle.assertMatchingLossCancelsOnlyItsOriginalCaptureOwner6(result)
  })

  it.each(oracle.caseRows7)('node continuation $route', async (row) => {
    expect.hasAssertions()

    const { route } = row

    const result = await fixture.continuationRoundFourNode(route)
    oracle.assertNodeContinuation7(result, row)
  })
})

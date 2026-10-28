import { describe, expect, it } from 'vitest'

import * as fixture from './gesture-fixture.ts'
import * as oracle from './gesture-oracles.ts'

describe('vue gesture ordering', () => {
  it.each(oracle.caseRows0)(
    'synthetic successful $phase reentry',
    async (row) => {
      expect.hasAssertions()

      const { phase } = row

      const result = await fixture.completionReentry(phase)
      oracle.assertSyntheticSuccessfulReentry0(result, row)
    }
  )

  it.each(oracle.caseRows1)('synthetic disposal in $phase', async (row) => {
    expect.hasAssertions()

    const { phase } = row

    const result = await fixture.completionReentry(phase, true)
    oracle.assertSyntheticDisposalIn1(result, row)
  })

  it.each(oracle.axisCases0)(
    'synthetic public watcher $route recursive $recursive',
    async (row) => {
      expect.hasAssertions()

      const { route, recursive } = row

      const result = await fixture.reactiveDisposal(
        ...([route, recursive] as const)
      )

      oracle.assertSyntheticPublicWatcherRecursive2(result, row)
    }
  )

  it.each(oracle.caseRows3)('synthetic $mode continuation', async (row) => {
    expect.hasAssertions()

    const { mode } = row

    const result = await fixture.continuationReentry(mode)
    oracle.assertSyntheticContinuation3(result, row)
  })

  it.each(oracle.axisCases1)(
    'claims physical $live recursive $recursive',
    async (row) => {
      expect.hasAssertions()

      const { live, recursive } = row

      const result = await fixture.disposalClaimsProof(
        live,
        'physical',
        ['none', 'selection', 'pan'].includes(live) ? 'terminal' : 'watch',
        recursive,
        false
      )

      oracle.assertClaimsPhysicalRecursive4(result, row)
    }
  )

  it.each(oracle.axisCases2)(
    'completion watcher $route mounted $mounted controlled $controlled threshold $threshold',
    async (row) => {
      expect.hasAssertions()

      const { threshold, route, mounted, controlled } = row

      const result = await fixture.reactiveCompletionProof(
        route,
        mounted,
        controlled,
        threshold
      )

      oracle.assertCompletionWatcherMountedControlledThreshold5(result, row)
    }
  )

  it.each(oracle.axisCases3)(
    'literal drain $claimRoute $liveCase.live $liveCase.entry controlled $controlled recursive $recursive',
    async (row) => {
      expect.hasAssertions()

      const { liveCase, recursive, claimRoute, controlled } = row

      const result = await fixture.disposalClaimsProof(
        liveCase.live,
        claimRoute,
        liveCase.entry,
        recursive,
        controlled
      )

      oracle.assertLiteralDrainControlledRecursive6(result, row)
    }
  )

  it.each(oracle.axisCases4)('keyboard preview $entry $mode', async (row) => {
    expect.hasAssertions()

    const { entry, mode } = row

    const result = await fixture.keyboardPreviewProof(entry, mode)
    oracle.assertKeyboardPreview7(result, row)
  })

  it.each(oracle.axisCases5)(
    'complete stream $phase controlled $controlled reconnectB $reconnectB',
    async (row) => {
      expect.hasAssertions()

      const { phase, controlled, reconnectB } = row

      const result = await fixture.completionReentry(
        phase,
        false,
        controlled,
        reconnectB
      )

      oracle.assertCompleteStreamControlledReconnectB8(result, row)
    }
  )

  it.each(oracle.caseRows9)(
    'semantic $scenario.actor $scenario.action',
    async (row) => {
      expect.hasAssertions()

      const { scenario } = row

      const result = await fixture.semanticBoundaryProof(
        scenario.actor,
        scenario.action
      )

      oracle.assertSemantic9(result, row)
    }
  )

  it.each(oracle.caseRows10)(
    'frozen resources recursive $recursive',
    async (row) => {
      expect.hasAssertions()

      const { recursive } = row

      const result = await fixture.disposalResourceProof(recursive)
      oracle.assertFrozenResourcesRecursive10(result, row)
    }
  )

  it.each(oracle.caseRows11)(
    'retained target candidate promoted $promoted',
    async (row) => {
      expect.hasAssertions()

      const { promoted } = row

      const result = await fixture.retainedPressProof(promoted)
      oracle.assertRetainedTargetCandidatePromoted11(result, row)
    }
  )

  it.each(oracle.axisCases6)('continuation $route $phase', async (row) => {
    expect.hasAssertions()

    const { route, phase } = row

    const result = await fixture.previewContinuationProof(route, phase)
    oracle.assertContinuation12(result, row)
  })

  it.each(oracle.axisCases7)(
    'selection $input $trigger moved $moved',
    async (row) => {
      expect.hasAssertions()

      const { input, trigger, moved } = row

      const result = await fixture.selectionContinuationProof(
        input,
        trigger,
        moved
      )

      oracle.assertSelectionMoved13(result, row)
    }
  )

  it('aggregate cancellation retains entry owners across node End', async () => {
    expect.hasAssertions()

    const result = await fixture.retainedNodeCancellationProof()
    oracle.assertAggregateCancellationRetainsEntryOwnersAcrossNodeEnd14(result)
  })

  it.each(oracle.axisCases8)(
    'consumed successful first End admits B then disposal click $click controlled $controlled',
    async (row) => {
      expect.hasAssertions()

      const { controlled, click } = row

      const result = await fixture.completionReentry(
        'connectEnd',
        false,
        controlled,
        false,
        click ? 'click-dispose' : 'dispose'
      )

      oracle.assertConsumedSuccessfulFirstEndAdmitsBThenDisposalClickControlled15(
        result,
        row
      )
    }
  )

  it.each(oracle.axisCases9)(
    'disposal boundary $phase controlled $controlled',
    async (row) => {
      expect.hasAssertions()

      const { controlled, phase } = row

      const result = await fixture.completionReentry(phase, true, controlled)
      oracle.assertDisposalBoundaryControlled16(result, row)
    }
  )

  it.each(oracle.axisCases10)(
    'rejected target Enter $route threshold $threshold',
    async (row) => {
      expect.hasAssertions()

      const { route, threshold } = row

      const result = await fixture.reactiveCompletionProof(
        route,
        true,
        false,
        threshold,
        false
      )

      oracle.assertRejectedTargetEnterThreshold17(result, row)
    }
  )

  it.each(oracle.caseRows18)(
    'keyboard error ownership successor $entry',
    async (row) => {
      expect.hasAssertions()

      const { entry } = row

      const result = await fixture.keyboardPreviewProof(
        entry,
        'error-successor'
      )

      oracle.assertKeyboardErrorOwnershipSuccessor18(result, row)
    }
  )

  it.each(oracle.axisCases11)(
    'open observation $route $autoPan mounted $mounted controlled $controlled',
    async (row) => {
      expect.hasAssertions()

      const { route, autoPan, mounted, controlled } = row

      const result = await fixture.reactiveCompletionProof(
        route,
        mounted,
        controlled,
        0,
        true,
        autoPan
      )

      oracle.assertOpenObservationMountedControlled19(result, row)
    }
  )

  it.each(oracle.axisCases12)(
    'literal $mode controlled $controlled cancellation $cancelPhase',
    async (row) => {
      expect.hasAssertions()

      const { mode, controlled, cancelPhase } = row

      const result = await fixture.continuationReentry(
        mode,
        controlled,
        cancelPhase
      )

      oracle.assertLiteralControlledCancellation20(result, row)
    }
  )

  it.each(oracle.caseRows21)(
    'reconnect current endpoint $mutation',
    async (row) => {
      expect.hasAssertions()

      const { mutation } = row

      const result = await fixture.continuationRoundFourReconnect(mutation)
      oracle.assertReconnectCurrentEndpoint21(result, row)
    }
  )
})

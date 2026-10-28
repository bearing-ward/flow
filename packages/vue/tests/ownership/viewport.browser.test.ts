import { describe, expect, it } from 'vitest'

import * as fixture from './viewport-fixture.ts'
import * as oracle from './viewport-oracles.ts'

describe('vue viewport ordering', () => {
  it.each(oracle.axisCases0)(
    'viewport callback $phase controlled $controlled',
    async (row) => {
      expect.hasAssertions()

      const { phase, controlled } = row

      const result = await fixture.viewportOwnershipProof(phase, controlled)
      oracle.assertViewportCallbackControlled0(result, row)
    }
  )

  it.each(oracle.caseRows1)(
    'pan joins request controlled $controlled',
    async (row) => {
      expect.hasAssertions()

      const { controlled } = row

      const result = await fixture.viewportOwnershipProof(
        'pan-nested-request',
        controlled
      )

      oracle.assertPanJoinsRequestControlled1(result, row)
    }
  )

  it.each(oracle.caseRows2)('request resource $route', async (row) => {
    expect.hasAssertions()

    const { route } = row

    const result = await fixture.viewportRequestProof(route)
    oracle.assertRequestResource2(result, row)
  })

  it.each(oracle.caseRows3)(
    'acknowledgement bound64 key $acknowledge',
    async (row) => {
      expect.hasAssertions()

      const { acknowledge } = row

      const result = await fixture.viewportAcknowledgementProof(acknowledge)
      oracle.assertAcknowledgementBound64Key3(result, row)
    }
  )

  it.each(oracle.axisCases1)(
    'ordinary $route joined $joined controlled $controlled',
    async (row) => {
      expect.hasAssertions()

      const { route, joined, controlled } = row

      const result = await fixture.ordinaryViewportProof(
        route,
        joined,
        controlled
      )

      oracle.assertOrdinaryJoinedControlled4(result, row)
    }
  )

  it.each(oracle.caseRows5)('viewport continuation $route', async (row) => {
    expect.hasAssertions()

    const { route } = row

    const result = await fixture.continuationRoundFourViewport(route)
    oracle.assertViewportContinuation5(result, row)
  })

  it.each(oracle.caseRows6)('request error $mode', async (row) => {
    expect.hasAssertions()

    const { mode } = row

    const result = await fixture.continuationRoundFourRequestError(mode)
    oracle.assertRequestError6(result, row)
  })

  it.each(oracle.caseRows7)('decode ownership $mode', async (row) => {
    expect.hasAssertions()

    const { mode } = row

    const result = await fixture.continuationRoundFourRequestError(mode)
    oracle.assertDecodeOwnership7(result, row)
  })

  it.each(oracle.caseRows8)('viewport $route', async (row) => {
    expect.hasAssertions()

    const { route } = row

    const result = await fixture.ownershipRoundFiveViewport(route)
    oracle.assertViewport8(result, row)
  })

  it.each(oracle.caseRows9)(
    'external observation nested producing write switch mode $switchMode',
    async (row) => {
      expect.hasAssertions()

      const { switchMode } = row

      const result = await fixture.externalNestedViewportProof(switchMode)
      oracle.assertExternalObservationNestedProducingWriteSwitchMode9(
        result,
        row
      )
    }
  )
})

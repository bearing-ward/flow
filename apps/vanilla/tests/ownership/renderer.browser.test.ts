import { describe, expect, it } from 'vitest'

import * as fixture from './renderer-fixture.ts'
import * as oracle from './renderer-oracles.ts'

describe('vanilla renderer ordering', () => {
  it.each(oracle.caseRows0)('acquisition $mode', async (row) => {
    expect.hasAssertions()

    const { mode } = row

    const result = await fixture.continuationRoundFourAcquisition(mode)
    oracle.assertAcquisition0(result, row)
  })

  it.each(oracle.axisCases0)('cold $kind $action', async (row) => {
    expect.hasAssertions()

    const { kind, action } = row

    const result = await fixture.continuationRoundFourRenderer(kind, action)
    oracle.assertCold1(result, row)
  })

  it.each(oracle.axisCases1)('ready $kind $action', async (row) => {
    expect.hasAssertions()

    const { kind, action } = row

    const result = await fixture.continuationRoundFourReadyRenderer(
      kind,
      action
    )

    oracle.assertReady2(result, row)
  })

  it.each(oracle.caseRows3)('initial mount $kind', async (row) => {
    expect.hasAssertions()

    const { kind } = row

    const result = await fixture.continuationRoundFourMountError(kind)
    oracle.assertInitialMount3(result, row)
  })

  it.each(oracle.caseRows4)('callback channel $mode', async (row) => {
    expect.hasAssertions()

    const { mode } = row

    const result = await fixture.continuationRoundFourAcquisition(mode)
    oracle.assertCallbackChannel4(result, row)
  })

  it.each(oracle.caseRows5)(
    'resize primitive restoration keyboard $keyboard',
    async (row) => {
      expect.hasAssertions()

      const { keyboard } = row

      const result =
        await fixture.continuationRoundFourResizeRestoration(keyboard)

      oracle.assertResizePrimitiveRestorationKeyboard5(result, row)
    }
  )

  it.each(oracle.caseRows6)('acquisition $mode', async (row) => {
    expect.hasAssertions()

    const { mode } = row

    const result = await fixture.ownershipRoundSixAcquisition(mode)
    oracle.assertAcquisition6(result, row)
  })

  it.each(oracle.caseRows7)('native successor $mode', async (row) => {
    expect.hasAssertions()

    const { mode } = row

    const result = await fixture.ownershipRoundSixAcquisition(mode)
    oracle.assertNativeSuccessor7(result, row)
  })
})

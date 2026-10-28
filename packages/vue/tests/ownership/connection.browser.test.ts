import { describe, expect, it } from 'vitest'

import * as oracle from './connection-oracles.ts'
import * as fixture from './viewport-fixture.ts'

describe('vue connection viewport ownership', () => {
  it.each(oracle.caseRows0)(
    'connection auto-pan retains its owner $residence',
    async (row) => {
      expect.hasAssertions()

      const { residence } = row

      const result = await fixture.ownershipRoundFiveConnection(residence)
      oracle.assertConnectionAutoPanRetainsItsOwner0(result, row)
    }
  )
})

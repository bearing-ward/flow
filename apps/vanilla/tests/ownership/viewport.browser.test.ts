import { describe, expect, it } from 'vitest'

import * as fixture from './viewport-fixture.ts'
import * as oracle from './viewport-oracles.ts'

describe('vanilla viewport ordering', () => {
  it.each(oracle.axisCases0)(
    'viewport $route successor $successor',
    async (row) => {
      expect.hasAssertions()

      const { route, successor } = row

      const result = await fixture.viewportContinuationProof(route, successor)
      oracle.assertViewportSuccessor0(result, row)
    }
  )
})

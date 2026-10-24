import { test } from '@playwright/test'

import { nodeExtentAdoptionContract } from '../../shared-e2e/node-extent-adoption-contract.ts'

test.use({ viewport: { width: 500, height: 500 } })

nodeExtentAdoptionContract('vanilla')

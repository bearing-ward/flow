import { test } from '@playwright/test'

import { selectionBoundsContract } from '../../shared-e2e/node-input-contract.ts'

test.use({ viewport: { width: 1280, height: 720 } })

selectionBoundsContract('vue')

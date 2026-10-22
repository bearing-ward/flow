import { test } from '@playwright/test'

import { componentsContract } from '../../shared-e2e/upstream-component/components.ts'
import { eventsContract } from '../../shared-e2e/upstream-component/events.ts'
import { componentEvidence } from '../../shared-e2e/upstream-component/helpers.ts'
import { hooksContract } from '../../shared-e2e/upstream-component/hooks.ts'
import { viewContract } from '../../shared-e2e/upstream-component/view.ts'
import { upstreamHostAdapter } from '../../shared-e2e/upstream/adapter.ts'
// Cypress v13.6.6 packages/config/src/options.ts:451-458, component defaults.

test.use({ viewport: { width: 500, height: 500 } })

const adapter = upstreamHostAdapter('vanilla')

componentEvidence()

hooksContract(adapter)

componentsContract(adapter)

eventsContract(adapter)

viewContract(adapter)

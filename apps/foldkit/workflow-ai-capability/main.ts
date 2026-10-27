import { makeLocalWorkflowAiProvider } from '@flow/workflow'
import { Effect } from 'effect'

import { mountWorkflowAiCapability } from '../../shared/workflow/ai-capability.ts'

mountWorkflowAiCapability(
  Effect.runSync(makeLocalWorkflowAiProvider({ delayMillis: 200 }))
)

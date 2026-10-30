import { mountWorkflowAiCapability } from '../../shared/workflow/ai-capability.ts'
import { createLocalWorkflowAiProvider } from '../../shared/workflow/local-ai.ts'

mountWorkflowAiCapability(createLocalWorkflowAiProvider({ delayMillis: 200 }))
